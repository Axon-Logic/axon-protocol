import { Keypair, StrKey } from "@stellar/stellar-sdk";

export type AgentTask = {
  id: string;
  type: "spend" | "query" | "custom";
  payload: Record<string, unknown>;
  createdAt: number;
};

export type AgentContext = {
  agentAddress: string;
  vaultContractId: string;
  secretKey: string;
  network: string;
};

export type TaskResult = {
  taskId: string;
  success: boolean;
  txHash?: string;
  error?: string;
};

export interface AgentPlugin {
  name: string;
  handleTask(task: AgentTask, ctx: AgentContext): Promise<TaskResult>;
}

export function validateAgentContext(ctx: AgentContext): void {
  if (!StrKey.isValidEd25519PublicKey(ctx.agentAddress)) {
    throw new Error("invalid agentAddress");
  }
  if (!StrKey.isValidContract(ctx.vaultContractId)) {
    throw new Error("invalid vaultContractId");
  }
  try {
    Keypair.fromSecret(ctx.secretKey);
  } catch {
    throw new Error("invalid secretKey");
  }
  if (ctx.network !== "testnet" && ctx.network !== "mainnet") {
    throw new Error("invalid network: must be \"testnet\" or \"mainnet\"");
  }
}
