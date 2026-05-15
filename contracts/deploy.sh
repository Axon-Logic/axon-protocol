#!/usr/bin/env bash
# Deploy all Axon contracts to Stellar testnet
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
SOURCE="${ADMIN_SECRET_KEY:?ADMIN_SECRET_KEY required}"

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

build
deploy "agent-vault"
deploy "policy-engine"
deploy "registry"
