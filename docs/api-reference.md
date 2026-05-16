# Axon Protocol — API Reference

Base URL: `http://localhost:3000`

---

## Health

### `GET /health`

Returns a simple health check.

```json
{ "status": "ok", "service": "axon-api" }
```

---

## Agents

### `GET /agents/:address`

Get an agent's on-chain record from the registry.

**Response `200`**
```json
{
  "owner": "G...",
  "vault": "G...",
  "metadataUri": "ipfs://Qm...",
  "active": true
}
```

**Errors:** `404` — agent not found

---

### `POST /agents/register`

Register a new agent and vault pair in the registry.

**Request Body**
```json
{
  "ownerSecretKey": "S...",
  "agentAddress": "G...",
  "vaultAddress": "G...",
  "metadataUri": "ipfs://Qm..."
}
```

**Response `201`**
```json
{ "txHash": "a1b2c3d4..." }
```

**Errors:** `400` — invalid body, `500` — chain error

---

## Vaults

### `GET /vaults/:contractId/balance`

Get the token balance of a vault contract.

**Response `200`**
```json
{ "balance": "5000" }
```

**Errors:** `500` — contract query failed

---

### `POST /vaults/:contractId/spend`

Execute a spend from the vault (requires agent key).

**Request Body**
```json
{
  "agentSecretKey": "S...",
  "to": "G...",
  "amount": "500",
  "memo": "invoice_123"
}
```

**Response `200`**
```json
{ "txHash": "a1b2c3d4..." }
```

**Errors:** `400` — invalid body, `500` — chain error

---

## Error Format

```json
{ "error": "Human-readable error message" }
```
