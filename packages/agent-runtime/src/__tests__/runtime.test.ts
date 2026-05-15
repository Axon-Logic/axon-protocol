import { AgentRuntime } from "../runtime";
import { Scheduler } from "../scheduler";
import type { AgentContext, AgentPlugin, AgentTask } from "../types";

jest.mock("@axon-protocol/sdk", () => ({
  AgentVaultClient: jest.fn().mockImplementation(() => ({
    spend: jest.fn().mockResolvedValue("txhash_spend"),
  })),
  NETWORKS: { testnet: { rpcUrl: "", horizonUrl: "", networkPassphrase: "" } },
}));

jest.mock("@stellar/stellar-sdk", () => ({
  Keypair: { fromSecret: jest.fn(() => ({ publicKey: () => "GPUB" })) },
}));

const ctx: AgentContext = {
  agentAddress: "GAGENT",
  vaultContractId: "CVAULT",
  secretKey: "SKEY",
  network: "testnet",
};

const makeTask = (overrides: Partial<AgentTask> = {}): AgentTask => ({
  id: "task-1",
  type: "spend",
  payload: { to: "GRECIPIENT", amount: "100", memo: "pay" },
  createdAt: Date.now(),
  ...overrides,
});

describe("AgentRuntime", () => {
  let runtime: AgentRuntime;
  beforeEach(() => { runtime = new AgentRuntime(ctx); });

  it("executes a spend task successfully", async () => {
    const result = await runtime.execute(makeTask());
    expect(result.success).toBe(true);
    expect(result.txHash).toBe("txhash_spend");
    expect(result.taskId).toBe("task-1");
  });

  it("returns error for unknown task type", async () => {
    const result = await runtime.execute(makeTask({ type: "custom" }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown task type/);
  });

  it("returns error when spend throws", async () => {
    const { AgentVaultClient } = await import("@axon-protocol/sdk");
    (AgentVaultClient as jest.Mock).mockImplementationOnce(() => ({
      spend: jest.fn().mockRejectedValue(new Error("policy violation")),
    }));
    const result = await runtime.execute(makeTask());
    expect(result.success).toBe(false);
    expect(result.error).toBe("policy violation");
  });

  it("dispatches to registered plugin", async () => {
    const plugin: AgentPlugin = {
      name: "custom",
      handleTask: jest.fn().mockResolvedValue({ taskId: "task-1", success: true }),
    };
    runtime.registerPlugin(plugin);
    const result = await runtime.execute(makeTask({ type: "custom" }));
    expect(result.success).toBe(true);
    expect(plugin.handleTask).toHaveBeenCalledWith(
      expect.objectContaining({ type: "custom" }),
      ctx,
    );
  });

  it("registerPlugin returns runtime for chaining", () => {
    const plugin: AgentPlugin = { name: "p", handleTask: jest.fn() };
    expect(runtime.registerPlugin(plugin)).toBe(runtime);
  });
});

describe("Scheduler", () => {
  it("starts and stops without throwing", () => {
    const scheduler = new Scheduler(ctx, 100);
    scheduler.start();
    scheduler.stop();
  });

  it("calls fetchTasks on each poll", async () => {
    class TestScheduler extends Scheduler {
      calls = 0;
      protected override async fetchTasks(): Promise<AgentTask[]> {
        this.calls++;
        if (this.calls >= 2) this.stop();
        return [];
      }
    }
    const scheduler = new TestScheduler(ctx, 10);
    scheduler.start();
    await new Promise((r) => setTimeout(r, 80));
    expect(scheduler.calls).toBeGreaterThanOrEqual(2);
  });

  it("executes tasks returned by fetchTasks", async () => {
    const executed: string[] = [];
    class TestScheduler extends Scheduler {
      private done = false;
      protected override async fetchTasks(): Promise<AgentTask[]> {
        if (this.done) { this.stop(); return []; }
        this.done = true;
        return [makeTask({ id: "t-exec" })];
      }
    }
    const scheduler = new TestScheduler(ctx, 10);
    scheduler.runtime.registerPlugin({
      name: "spend",
      handleTask: async (task: AgentTask) => {
        executed.push(task.id);
        return { taskId: task.id, success: true };
      },
    });
    scheduler.start();
    await new Promise((r) => setTimeout(r, 80));
    expect(executed).toContain("t-exec");
  });
});
