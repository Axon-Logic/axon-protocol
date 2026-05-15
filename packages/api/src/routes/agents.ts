import { Router } from "express";
import { z } from "zod";
import { RegistryClient, NETWORKS } from "@axon-protocol/sdk";

const router = Router();

const getClient = () =>
  new RegistryClient(
    process.env.REGISTRY_CONTRACT_ID ?? "",
    NETWORKS[process.env.STELLAR_NETWORK ?? "testnet"],
  );

// GET /agents/:address
router.get("/:address", async (req, res) => {
  try {
    const record = await getClient().getAgent(req.params.address);
    if (!record) return res.status(404).json({ error: "agent not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /agents/register
const RegisterBody = z.object({
  ownerSecretKey: z.string(),
  agentAddress: z.string(),
  vaultAddress: z.string(),
  metadataUri: z.string().url(),
});

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const { Keypair } = await import("@stellar/stellar-sdk");
    const hash = await getClient().register(
      Keypair.fromSecret(parsed.data.ownerSecretKey),
      parsed.data.agentAddress,
      parsed.data.vaultAddress,
      parsed.data.metadataUri,
    );
    res.status(201).json({ txHash: hash });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
