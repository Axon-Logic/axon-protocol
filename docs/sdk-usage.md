# @axon-protocol/sdk — Usage Guide

The Axon Protocol SDK provides TypeScript clients for interacting with the
Soroban smart contracts: agent vaults, the policy engine, and the on-chain
registry.

## Installation

```bash
npm install @axon-protocol/sdk
```

## Initialisation

```typescript
import { AgentVaultClient, RegistryClient, NETWORKS } from "@axon-protocol/sdk";

const network = NETWORKS.testnet;

const vaultClient = new AgentVaultClient(
  "CA3D...",         // agent-vault contract ID
  network,
);

const registryClient = new RegistryClient(
  "CB4E...",         // registry contract ID
  network,
);
```

## AgentVaultClient

### Deposit

Deposit tokens into an agent's vault. Only the vault owner can deposit.

```typescript
import { Keypair } from "@stellar/stellar-sdk";

const ownerKeypair = Keypair.fromSecret("S...");
const txHash = await vaultClient.deposit(ownerKeypair, 1000n);
// => "a1b2c3d4..."
```

### Spend

Execute a spend from the vault. The agent keypair must match the agent
address configured during vault initialisation. The spend is automatically
checked against the policy engine.

```typescript
const agentKeypair = Keypair.fromSecret("S...");
const txHash = await vaultClient.spend(agentKeypair, {
  to: "GA7QNFHDH73F7X7YD5C5FZ7Q7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7",
  amount: 500n,
  memo: "invoice_123",
});
```

### Balance

Check the vault's current token balance.

```typescript
const balance = await vaultClient.balance();
// => 5000n
```

## RegistryClient

### Register

Register a new agent with its associated vault.

```typescript
const ownerKeypair = Keypair.fromSecret("S...");
const txHash = await registryClient.register(
  ownerKeypair,
  "GAGENT...",       // agent Stellar address
  "GVAULT...",       // vault contract ID
  "ipfs://Qm123...", // metadata URI
);
```

### Get Agent

Retrieve agent details from the on-chain registry.

```typescript
const agent = await registryClient.getAgent("GAGENT...");
// => { owner: "G...", vault: "G...", metadataUri: "ipfs://...", active: true }
```

## Error Handling

All client methods throw on failure. Catch and inspect the error:

```typescript
try {
  await vaultClient.spend(agentKeypair, { to, amount, memo });
} catch (err) {
  if (err.message.includes("exceeds max per-tx limit")) {
    // Handle policy violation
  }
}
```

## Networks

The `NETWORKS` constant provides pre-configured network settings:

| Key | Network |
|-----|---------|
| `testnet` | Soroban Testnet |
| `mainnet` | Stellar Mainnet / Soroban |

```typescript
const { rpcUrl, horizonUrl, networkPassphrase } = NETWORKS.testnet;
```
