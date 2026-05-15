#!/usr/bin/env bash
# Deploy all Axon contracts to Stellar testnet and initialize them.
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
SOURCE="${ADMIN_SECRET_KEY:?ADMIN_SECRET_KEY required}"

echo "=== Axon Protocol — Contract Deployment ==="
echo "Network: $NETWORK"

build() {
  echo "Building contracts..."
  cargo build --release --target wasm32-unknown-unknown
}

deploy() {
  local name=$1
  local wasm="target/wasm32-unknown-unknown/release/${name//-/_}.wasm"
  echo "Deploying $name..."
  stellar contract deploy \
    --wasm "$wasm" \
    --source "$SOURCE" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE"
}

initialize() {
  local name=$1
  local id=$2
  shift 2
  echo "Initializing $name ($id)..."
  stellar contract invoke \
    --id "$id" \
    --source "$SOURCE" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- \
    initialize "$@"
}

build

echo ""
echo "--- Deploying contracts ---"
AGENT_VAULT_ID=$(deploy "agent-vault")
POLICY_ENGINE_ID=$(deploy "policy-engine")
REGISTRY_ID=$(deploy "registry")

echo ""
echo "--- Initializing contracts ---"
initialize "agent-vault" "$AGENT_VAULT_ID" \
  --owner "$SOURCE" \
  --agent "$SOURCE" \
  --policy-engine "$POLICY_ENGINE_ID" \
  --token "$SOURCE"

initialize "policy-engine" "$POLICY_ENGINE_ID" \
  --admin "$SOURCE"

initialize "registry" "$REGISTRY_ID" \
  --admin "$SOURCE"

echo ""
echo "=== Deployment complete ==="
echo "AgentVault:  $AGENT_VAULT_ID"
echo "PolicyEngine: $POLICY_ENGINE_ID"
echo "Registry:    $REGISTRY_ID"
