import type { AgentTask, AgentContext } from "./types.js";
import { AgentRuntime } from "./runtime.js";

/**
 * Minimal task scheduler — polls a task queue and dispatches to the runtime.
 * Replace `fetchTasks` with your queue implementation (SQS, Redis, HTTP, etc.)
 */
export class Scheduler {
  private running = false;
  protected runtime: AgentRuntime;

  constructor(
    private ctx: AgentContext,
    private pollIntervalMs = 5000,
  ) {
    this.runtime = new AgentRuntime(ctx);
  }

  start(): void {
    this.running = true;
    console.log(`[scheduler] agent ${this.ctx.agentAddress} started, polling every ${this.pollIntervalMs}ms`);
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const tasks = await this.fetchTasks();
        for (const task of tasks) {
          const result = await this.runtime.execute(task);
          console.log(`[scheduler] task ${task.id} result:`, result);
        }
      } catch (err) {
        console.error("[scheduler] poll error:", err);
      }
      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
  }

  // Override this to connect to a real task source
  protected async fetchTasks(): Promise<AgentTask[]> {
    return [];
  }
}
