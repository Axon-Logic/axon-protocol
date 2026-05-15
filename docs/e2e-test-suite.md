# Axon Protocol — E2E Test Suite

This test suite validates the full Axon Protocol stack against a live
Stellar testnet: contract deployment, initialisation, agent registration,
deposits, spends, and policy enforcement.

## Prerequisites

- Node.js ≥ 20
- Rust + `wasm32-unknown-unknown` target
- Stellar CLI (`cargo install --locked stellar-cli`)
- A funded Stellar testnet identity configured as your `ADMIN_SECRET_KEY`

## Setup

```bash
# 1. Install JS dependencies
npm install

# 2. Build and deploy contracts to testnet
cd contracts
bash deploy.sh
# Save the output contract IDs

# 3. Configure environment
cp .env.example .env
# Set ADMIN_SECRET_KEY and the contract IDs from step 2

# 4. Build all packages
npm run build
```

## Running Tests

```bash
# Unit tests (no network required)
npm test

# E2E test suite (requires testnet)
npm run test:e2e
```

## Test Scenarios

### 1. Contract Lifecycle

1. Build all three contracts (agent-vault, policy-engine, registry)
2. Deploy each contract to testnet
3. Initialise each contract with admin address
4. Verify contract state via view functions

### 2. Agent Registration

1. Register an agent in the registry
2. Look up the agent by address
3. Verify the returned record matches the registered data

### 3. Deposit & Balance

1. Fund the vault owner's Stellar account
2. Deposit tokens into the agent vault
3. Check the vault balance reflects the deposit

### 4. Policy Enforcement

1. Set a spend policy with per-tx and per-period limits
2. Execute a spend within limits → should succeed
3. Execute a spend exceeding the per-tx limit → should revert
4. Execute spends exceeding the per-period limit → should revert
5. Advance the ledger past the period → should succeed again

### 5. Agent Deactivation

1. Deactivate the agent in the registry
2. Verify the agent's active flag is `false`
3. Attempt a spend from a deactivated agent → should fail

## CI Integration

The E2E suite runs automatically on the `main` branch via the
`testnet-integration` job in `.github/workflows/ci.yml`. It requires the
following secrets to be configured in the GitHub repository:

| Secret | Description |
|---|---|
| `ADMIN_SECRET_KEY` | Testnet admin secret key |
| `STELLAR_RPC_URL` | Soroban RPC URL |
| `STELLAR_NETWORK_PASSPHRASE` | Network passphrase |
| `AGENT_VAULT_CONTRACT_ID` | Pre-deployed AgentVault ID |
| `POLICY_ENGINE_CONTRACT_ID` | Pre-deployed PolicyEngine ID |
| `REGISTRY_CONTRACT_ID` | Pre-deployed Registry ID |
