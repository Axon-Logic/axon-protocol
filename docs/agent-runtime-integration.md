# Agent Runtime — Integration Guide

The `@axon-protocol/agent-runtime` package is the off-chain execution
environment for autonomous AI agents. It polls for pending tasks, executes
them through the SDK, and supports a plugin system for custom behaviours.

## Architecture

```
                  ┌──────────────────┐
                  │  Scheduler       │
                  │  (poll loop)     │
                  └──────┬───────────┘
                         │ tasks
                         ▼
                  ┌──────────────────┐
                  │  AgentRuntime    │
                  │  (executor)      │
                  └──────┬───────────┘
                         │ SDK calls
                         ▼
                  ┌──────────────────┐
                  │ @axon-protocol   │
                  │ /sdk             │
                  └──────────────────┘
```

## Setup

```bash
cp .env.example .env
# Fill in ADMIN_SECRET_KEY, AGENT_VAULT_CONTRACT_ID, etc.

npm run dev:runtime
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ADMIN_SECRET_KEY` | Yes | Stellar secret key for signing transactions |
| `STELLAR_NETWORK` | No | `testnet` or `mainnet` (default: `testnet`) |
| `STELLAR_RPC_URL` | No | Soroban RPC URL |
| `AGENT_VAULT_CONTRACT_ID` | Yes | Deployed AgentVault contract ID |
| `REGISTRY_CONTRACT_ID` | Yes | Deployed Registry contract ID |
| `POLL_INTERVAL_MS` | No | Task poll interval (default: `5000`) |

## Runtime Methods

### `executeSpend(params)`

Execute a token spend from the agent's vault. The spend is automatically
checked against the policy engine on-chain before execution.

```typescript
import { AgentRuntime } from "@axon-protocol/agent-runtime";

const runtime = new AgentRuntime({ /* config */ });
await runtime.executeSpend({
  to: "GA...",
  amount: 100n,
  memo: "service_payment",
});
```

### `registerAgent(metadataUri)`

Register the agent and its vault in the on-chain registry.

```typescript
await runtime.registerAgent("ipfs://Qm...");
```

## Plugin System

Plugins extend the runtime with custom logic. Each plugin implements the
`AgentPlugin` interface:

```typescript
import type { AgentPlugin } from "@axon-protocol/agent-runtime";

const loggerPlugin: AgentPlugin = {
  name: "logger",
  async onSpend(params) {
    console.log("Spend executed:", params);
  },
};

runtime.use(loggerPlugin);
```

### Available Hooks

| Hook | When |
|---|---|
| `onSpend(params)` | After a spend is executed |
| `onTask(task)` | When a new task is picked up |
| `onError(err)` | When an error occurs during execution |

## Running with Docker

```bash
docker compose up agent-runtime
```

See the `docker-compose.yml` at the project root for the full setup.
