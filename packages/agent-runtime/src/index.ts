import "dotenv/config";
import { Scheduler } from "./scheduler.js";
import type { AgentContext } from "./types.js";

const ctx: AgentContext = {
  agentAddress: process.env.AGENT_ADDRESS ?? "",
  vaultContractId: process.env.AGENT_VAULT_CONTRACT_ID ?? "",
  secretKey: process.env.AGENT_SECRET_KEY ?? "",
  network: process.env.STELLAR_NETWORK ?? "testnet",
};

const scheduler = new Scheduler(ctx, Number(process.env.AGENT_POLL_INTERVAL_MS ?? 5000));
scheduler.start();

process.on("SIGTERM", () => { scheduler.stop(); process.exit(0); });
process.on("SIGINT",  () => { scheduler.stop(); process.exit(0); });
