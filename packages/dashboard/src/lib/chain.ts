import { readFileSync } from "node:fs";
import path from "node:path";
import {
  BASE_FEE,
  Contract,
  TransactionBuilder,
  Address,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import type { xdr } from "@stellar/stellar-sdk";
import { NETWORKS } from "@axon-protocol/sdk";

/**
 * Server-only reads against the deployed Axon contracts.
 *
 * Contract IDs come from the process environment, falling back to the repo-root
 * `.env` that `npm run deploy:testnet` writes. This module must only be imported
 * from route handlers or other server code.
 */

type EnvMap = Record<string, string | undefined>;

let cachedFileEnv: EnvMap | null = null;

function readFileEnv(): EnvMap {
  if (cachedFileEnv) return cachedFileEnv;

  // `next dev`/`next start` run with cwd = packages/dashboard.
  const candidates = [
    path.join(process.cwd(), "../../.env"),
    path.join(process.cwd(), "../.env"),
    path.join(process.cwd(), ".env"),
  ];

  const env: EnvMap = {};
  for (const file of candidates) {
    try {
      for (const raw of readFileSync(file, "utf8").split("\n")) {
        const line = raw.trim();
        if (!line || line.startsWith("#") || !line.includes("=")) continue;
        const split = line.indexOf("=");
        const key = line.slice(0, split).trim();
        let value = line.slice(split + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        env[key] ??= value;
      }
    } catch {
      // Missing file is expected before the first deployment.
    }
  }

  cachedFileEnv = env;
  return env;
}

/** Process env wins over the local `.env` file. */
export function readEnv(key: string): string | undefined {
  return process.env[key] || readFileEnv()[key] || undefined;
}

export type Deployment = {
  network: string;
  rpcUrl: string;
  explorer: string;
  registryId?: string;
  vaultId?: string;
  policyEngineId?: string;
  agentAddress?: string;
  ownerAddress?: string;
};

export function getDeployment(): Deployment {
  const network = readEnv("STELLAR_NETWORK") ?? "testnet";
  const known = NETWORKS[network] ?? NETWORKS.testnet;
  return {
    network,
    rpcUrl: readEnv("STELLAR_RPC_URL") ?? known.rpcUrl,
    explorer:
      readEnv("STELLAR_EXPLORER_BASE") ??
      `https://stellar.expert/explorer/${network === "mainnet" ? "public" : network}`,
    registryId: readEnv("REGISTRY_CONTRACT_ID"),
    vaultId: readEnv("AGENT_VAULT_CONTRACT_ID"),
    policyEngineId: readEnv("POLICY_ENGINE_CONTRACT_ID"),
    agentAddress: readEnv("AXON_AGENT_ADDRESS"),
    ownerAddress: readEnv("AXON_OWNER_ADDRESS"),
  };
}

/**
 * Simulate a read-only contract call and decode the return value.
 *
 * Soroban requires a funded source account even for simulation, so the deployed
 * owner/agent account from `.env` is used.
 */
async function readContract<T>(contractId: string, method: string, args: xdr.ScVal[] = []): Promise<T> {
  if (!contractId) throw new Error(`${method}: missing contract id`);

  const { network, rpcUrl, ownerAddress, agentAddress } = getDeployment();
  const source = ownerAddress ?? agentAddress;
  if (!source) {
    throw new Error(
      "No funded source account configured. Run `npm run deploy:testnet` so .env contains AXON_OWNER_ADDRESS.",
    );
  }

  const passphrase = (NETWORKS[network] ?? NETWORKS.testnet).networkPassphrase;
  const server = new rpc.Server(rpcUrl);
  const account = await server.getAccount(source);

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    const reason = "error" in sim ? sim.error : "call rejected";
    throw new Error(`${method}() failed: ${reason}`);
  }

  return scValToNative(sim.result.retval) as T;
}

export type VaultConfigView = {
  owner: string;
  agent: string;
  policyEngine: string;
  token: string;
};

export type VaultPolicyView = {
  maxPerTx: string;
  maxPerPeriod: string;
  periodLedgers: number;
  allowlist: string[];
};

export type AgentView = {
  address: string;
  owner: string;
  vault: string;
  metadataUri: string;
  active: boolean;
};

export async function getVaultBalance(vaultId: string): Promise<string> {
  const value = await readContract<bigint | number>(vaultId, "balance");
  return BigInt(value).toString();
}

export async function getVaultConfig(vaultId: string): Promise<VaultConfigView> {
  const raw = await readContract<{
    owner: string;
    agent: string;
    policy_engine: string;
    token: string;
  }>(vaultId, "config");

  return {
    owner: raw.owner,
    agent: raw.agent,
    policyEngine: raw.policy_engine,
    token: raw.token,
  };
}

export async function getVaultPolicy(policyEngineId: string, vaultId: string): Promise<VaultPolicyView> {
  const raw = await readContract<{
    max_per_tx: bigint | number;
    max_per_period: bigint | number;
    period_ledgers: number;
    allowlist: Map<string, boolean> | Record<string, boolean>;
  }>(policyEngineId, "get_policy", [new Address(vaultId).toScVal()]);

  const allowlist =
    raw.allowlist instanceof Map
      ? [...raw.allowlist.keys()].map(String)
      : Object.keys(raw.allowlist ?? {});

  return {
    maxPerTx: String(raw.max_per_tx),
    maxPerPeriod: String(raw.max_per_period),
    periodLedgers: Number(raw.period_ledgers),
    allowlist,
  };
}

export async function getAgent(registryId: string, agentAddress: string): Promise<AgentView> {
  const raw = await readContract<{
    owner: string;
    vault: string;
    metadata_uri: string;
    active: boolean;
  }>(registryId, "get_agent", [new Address(agentAddress).toScVal()]);

  return {
    address: agentAddress,
    owner: raw.owner,
    vault: raw.vault,
    metadataUri: raw.metadata_uri,
    active: Boolean(raw.active),
  };
}

/** The agent registered by `contracts/deploy.sh`, read live from the registry. */
export async function getDeployedAgents(): Promise<AgentView[]> {
  const { registryId, agentAddress } = getDeployment();
  if (!registryId || !agentAddress) return [];
  return [await getAgent(registryId, agentAddress)];
}

export type VaultSpend = {
  txHash: string;
  ledger: number;
  closedAt: string;
  to: string;
  amount: string;
  memo: string;
};

// Soroban RPC discards events older than its retention window, so scans start
// inside it rather than at genesis.
const EVENT_WINDOW_LEDGERS = 9_000;

/**
 * Spend events emitted by the vault, newest first.
 *
 * The contract publishes `("spend",) -> (to, amount, memo)` on every successful
 * spend, so this is the on-chain spend ledger for the vault.
 */
export async function getVaultSpends(vaultId: string, limit = 25): Promise<VaultSpend[]> {
  if (!vaultId) return [];

  const { rpcUrl } = getDeployment();
  const server = new rpc.Server(rpcUrl);
  const latest = await server.getLatestLedger();

  const { events } = await server.getEvents({
    startLedger: Math.max(1, latest.sequence - EVENT_WINDOW_LEDGERS),
    filters: [{ type: "contract", contractIds: [vaultId] }],
    limit: 200,
  });

  return events
    .filter((event) => event.topic.length > 0 && scValToNative(event.topic[0]) === "spend")
    .map((event) => {
      const [to, amount, memo] = scValToNative(event.value) as [string, bigint, string];
      return {
        txHash: event.txHash,
        ledger: event.ledger,
        closedAt: event.ledgerClosedAt,
        to: String(to),
        amount: BigInt(amount).toString(),
        memo: String(memo),
      };
    })
    .sort((a, b) => b.ledger - a.ledger)
    .slice(0, limit);
}
