#!/usr/bin/env bash
# Upgrade a deployed Soroban contract by uploading a new WASM blob.
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
SOURCE="${ADMIN_SECRET_KEY:?ADMIN_SECRET_KEY required}"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <contract-name> <contract-id> [wasm-path]"
  echo ""
  echo "Examples:"
  echo "  $0 agent-vault CA3D..."
  echo "  $0 policy-engine CA3D... ./custom_policy_engine.wasm"
  exit 1
fi

NAME="$1"
CONTRACT_ID="$2"
WASM="${3:-target/wasm32-unknown-unknown/release/${NAME//-/_}.wasm}"

echo "=== Upgrading $NAME ==="
echo "Contract ID: $CONTRACT_ID"
echo "WASM:        $WASM"
echo "Network:     $NETWORK"
echo ""

if [ ! -f "$WASM" ]; then
  echo "Error: WASM file not found at $WASM"
  echo "Build it first: cargo build --release --target wasm32-unknown-unknown -p $NAME"
  exit 1
fi

echo "Uploading new WASM..."
HASH=$(stellar contract install \
  --wasm "$WASM" \
  --source "$SOURCE" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  2>&1 | tail -1)

echo "WASM hash: $HASH"

echo "Triggering upgrade on $CONTRACT_ID..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- \
  upgrade \
  --new_wasm_hash "$HASH"

echo ""
echo "=== Upgrade complete ==="
