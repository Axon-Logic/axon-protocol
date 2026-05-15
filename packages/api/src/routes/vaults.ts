import { Router } from "express";
import { z } from "zod";
import { AgentVaultClient, NETWORKS } from "@axon-protocol/sdk";

const router = Router();

const getClient = (contractId: string) =>
  new AgentVaultClient(contractId, NETWORKS[process.env.STELLAR_NETWORK ?? "testnet"]);

// GET /vaults/:contractId/balance
router.get("/:contractId/balance", async (req, res) => {
  try {
    const client = getClient(req.params.contractId);
    const balance = await client.balance();
    res.json({ balance: balance.toString() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /vaults/:contractId/spend
const SpendBody = z.object({
  agentSecretKey: z.string(),
  to: z.string(),
  amount: z.string(),
  memo: z.string().max(32),
});

router.post("/:contractId/spend", async (req, res) => {
  const parsed = SpendBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const { Keypair } = await import("@stellar/stellar-sdk");
    const client = getClient(req.params.contractId);
    const hash = await client.spend(Keypair.fromSecret(parsed.data.agentSecretKey), {
      to: parsed.data.to,
      amount: BigInt(parsed.data.amount),
      memo: parsed.data.memo,
    });
    res.json({ txHash: hash });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
