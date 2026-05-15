# Axon Protocol

> Decentralized **Agentic Banking** infrastructure on Stellar — the financial nervous system for autonomous AI agents.

Axon Protocol gives AI agents independent spending power while enforcing strict, human-defined guardrails through on-chain policy contracts. It bridges the high-speed autonomous agent economy with institutional-grade financial security.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Agents                            │
│              (LLM-driven, autonomous processes)             │
└────────────────────────┬────────────────────────────────────┘
                         │ tasks / spend requests
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  agent-runtime                              │
│   Scheduler (poll loop) → AgentRuntime → Plugin system      │
└────────────────────────┬────────────────────────────────────┘
                         │ SDK calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     @axon-protocol/sdk                      │
│        AgentVaultClient · RegistryClient · types            │
└────────────────────────┬────────────────────────────────────┘
                         │ Soroban RPC
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Stellar / Soroban                          │
│                                                             │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  AgentVault  │→ │  PolicyEngine   │  │   Registry   │  │
│  │  (funds +    │  │  (guardrails:   │  │  (on-chain   │  │
│  │   spending)  │  │  limits, allow) │  │   directory) │  │
│  └──────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ▲
                         │ REST
┌─────────────────────────────────────────────────────────────┐
│                   @axon-protocol/api                        │
│          Express gateway · /agents · /vaults                │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Package | Description |
|---|---|
| `contracts/agent-vault` | Soroban contract — holds agent funds, enforces policy on every spend |
| `contracts/policy-engine` | Soroban contract — per-tx limits, period caps, address allowlists |
| `contracts/registry` | Soroban contract — on-chain agent ↔ vault directory |
| `packages/sdk` | TypeScript SDK — `AgentVaultClient`, `RegistryClient` |
| `packages/api` | Express REST gateway — human/system interface to the protocol |
| `packages/agent-runtime` | Agent execution environment — scheduler, plugin system, spend executor |

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- Rust + `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/axonlogic/axon-protocol
cd axon-protocol
npm install

# 2. Configure environment
cp .env.example .env
# Fill in ADMIN_SECRET_KEY and contract IDs after deployment

# 3. Build contracts
cd contracts
cargo build --release --target wasm32-unknown-unknown

# 4. Deploy contracts (testnet)
bash contracts/deploy.sh

# 5. Build TypeScript packages
npm run build

# 6. Start API gateway
npm run dev:api

# 7. Start agent runtime
npm run dev:runtime
```

---

## Core Concepts

**AgentVault** — Each agent gets a dedicated vault contract holding its allocated funds. The agent can only spend within the bounds set by its policy.

**PolicyEngine** — Human operators define guardrails: max spend per transaction, cumulative period limits, and optional recipient allowlists. The vault calls the policy engine on every spend — violations revert on-chain.

**Registry** — A permissioned on-chain directory mapping agent addresses to their vaults and off-chain metadata. Enables discovery and deactivation.

**Agent Runtime** — Off-chain execution environment that polls for tasks, executes them via the SDK, and supports a plugin system for custom agent behaviors.

---

## License

MIT © AxonLogic
