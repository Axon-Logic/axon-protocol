import { AgentVaultClient, NETWORKS } from "@axon-protocol/sdk";
import { Keypair } from "@stellar/stellar-sdk";
import type { AgentContext, AgentPlugin, AgentTask, TaskResult } from "./types.js";

export class AgentRuntime {
  private plugins = new Map<string, AgentPlugin>();

  constructor(private ctx: AgentContext) {}

  registerPlugin(plugin: AgentPlugin): this {
    this.plugins.set(plugin.name, plugin);
    return this;
  }

  async execute(task: AgentTask): Promise<TaskResult> {
    const plugin = this.plugins.get(task.type);
    if (plugin) return plugin.handleTask(task, this.ctx);

    // Built-in spend handler
    if (task.type === "spend") {
      return this.handleSpend(task);
    }

    return { taskId: task.id, success: false, error: `unknown task type: ${task.type}` };
  }

  private async handleSpend(task: AgentTask): Promise<TaskResult> {
    const { to, amount, memo } = task.payload as { to: string; amount: string; memo: string };
    try {
      const client = new AgentVaultClient(
        this.ctx.vaultContractId,
        NETWORKS[this.ctx.network ?? "testnet"],
      );
      const txHash = await client.spend(Keypair.fromSecret(this.ctx.secretKey), {
        to,
        amount: BigInt(amount),
        memo,
      });
      return { taskId: task.id, success: true, txHash };
    } catch (err) {
      return { taskId: task.id, success: false, error: (err as Error).message };
    }
  }
}
