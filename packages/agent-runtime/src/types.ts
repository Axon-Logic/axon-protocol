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
