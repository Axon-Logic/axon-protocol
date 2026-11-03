#!/usr/bin/env bash
#
# Deploy the Axon Protocol contracts to Stellar Testnet and wire them together.
#
#   Contracts : agent-vault, policy-engine, registry
#   Steps     : generate + Friendbot-fund identities -> build wasm -> deploy ->
#               initialize -> set vault policy -> register agent -> write .env
#
# Usage:
#   bash contracts/deploy.sh
#   STELLAR_NETWORK=testnet bash contracts/deploy.sh
#
# Requires: stellar-cli, cargo, rustup target wasm32-unknown-unknown, curl.
# Every identity is created in the Stellar CLI key store; no secret keys are
# passed as arguments or written by this script.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS="$ROOT/contracts"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

NETWORK="${STELLAR_NETWORK:-testnet}"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
HORIZON_URL="${STELLAR_HORIZON_URL:-https://horizon-testnet.stellar.org}"
PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
FRIENDBOT_URL="${FRIENDBOT_URL:-https://friendbot.stellar.org}"

# Identity aliases (override to reuse existing keys in the CLI key store).
OWNER_ID="${AXON_OWNER_IDENTITY:-axon-owner}"
AGENT_ID="${AXON_AGENT_IDENTITY:-axon-agent}"
RECIPIENT_ID="${AXON_RECIPIENT_IDENTITY:-axon-recipient}"

# Guardrails applied to the vault (all amounts in stroops; 1 XLM = 10^7 stroops).
POLICY_MAX_PER_TX="${POLICY_MAX_PER_TX:-10000000}"          # 1 XLM
POLICY_MAX_PER_PERIOD="${POLICY_MAX_PER_PERIOD:-50000000}"  # 5 XLM
POLICY_PERIOD_LEDGERS="${POLICY_PERIOD_LEDGERS:-17280}"     # ~1 day
AGENT_METADATA_URI="${AGENT_METADATA_URI:-ipfs://bafyaxonagentmetadata}"

WASM_DIR="$CONTRACTS/target/wasm32-unknown-unknown/release"
EXPLORER="${STELLAR_EXPLORER_BASE:-https://stellar.expert/explorer/testnet}"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m warn\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31merror\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- preflight ---
for bin in stellar cargo rustup curl; do
  command -v "$bin" >/dev/null 2>&1 || die "'$bin' is required but was not found on PATH"
done
rustup target list --installed 2>/dev/null | grep -qx "wasm32-unknown-unknown" \
  || die "missing Rust target — run: rustup target add wasm32-unknown-unknown"

# The Stellar CLI reads these for every RPC call.
export STELLAR_RPC_URL="$RPC_URL"
export STELLAR_NETWORK_PASSPHRASE="$PASSPHRASE"

# ----------------------------------------------------------------- helpers ---
# Create an identity in the CLI key store if it does not exist, then print its
# public address.
ensure_identity() {
  local name="$1"
  if ! stellar keys address "$name" >/dev/null 2>&1; then
    log "Generating identity '$name'" >&2
    stellar keys generate "$name" >/dev/null
  fi
  stellar keys address "$name"
}

# Fund an account through Friendbot. Friendbot answers 400 for accounts that
# already exist, which is fine for re-runs.
fund_with_friendbot() {
  local addr="$1" name="$2" code
  log "Funding '$name' via Friendbot ($addr)"
  for attempt in 1 2 3 4 5; do
    code="$(curl -sS -o /tmp/axon-friendbot.$$ -w '%{http_code}' \
      "$FRIENDBOT_URL/?addr=$addr" || echo 000)"
    case "$code" in
      200) log "Funded '$name'" ;;
      400) warn "Friendbot reports '$name' already funded — continuing" ;;
      *)
        [ "$attempt" = 5 ] && die "Friendbot failed for $addr (HTTP $code)"
        warn "Friendbot HTTP $code, retrying in ${attempt}s"
        sleep "$attempt"
        continue
        ;;
    esac
    rm -f "/tmp/axon-friendbot.$$"
    return 0
  done
}

# Friendbot returns once the funding transaction is submitted; wait until the
# account is visible on Horizon so contract deployment does not race it.
wait_for_account() {
  local addr="$1" name="$2"
  for _ in $(seq 1 30); do
    if curl -sf "$HORIZON_URL/accounts/$addr" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  die "account '$name' ($addr) never appeared on Horizon"
}

# Deploy one contract and echo its contract ID.
deploy_contract() {
  local name="$1"
  local wasm="$WASM_DIR/${name//-/_}.wasm"
  local id

  [ -f "$wasm" ] || die "missing wasm for $name at $wasm (run scripts/build-contracts.sh)"
  log "Deploying $name" >&2
  id="$(stellar contract deploy \
    --wasm "$wasm" \
    --source-account "$OWNER_ID" \
    --network "$NETWORK" \
    --optimize=false | tail -n 1 | tr -d '[:space:]')"

  [[ "$id" =~ ^C[A-Z2-7]{55}$ ]] || die "unexpected contract id for $name: '$id'"
  printf '%s' "$id"
}

# Invoke a contract function from the owner account.
invoke() {
  local id="$1"
  shift
  stellar contract invoke \
    --id "$id" \
    --source-account "$OWNER_ID" \
    --network "$NETWORK" \
    -- "$@"
}

# Idempotently set a key in .env without disturbing unrelated entries.
set_env() {
  local key="$1" value="$2" tmp
  tmp="$(mktemp)"
  if [ -f "$ENV_FILE" ]; then
    grep -v "^${key}=" "$ENV_FILE" >"$tmp" || true
  fi
  # Quote values so the file stays valid when sourced from bash (the network
  # passphrase contains spaces and a semicolon).
  printf '%s="%s"\n' "$key" "$value" >>"$tmp"
  mv "$tmp" "$ENV_FILE"
}

# -------------------------------------------------------------------- main ---
log "Axon Protocol deployment — network: $NETWORK, rpc: $RPC_URL"

ADMIN_ADDR="$(ensure_identity "$OWNER_ID")"
AGENT_ADDR="$(ensure_identity "$AGENT_ID")"
RECIPIENT_ADDR="$(ensure_identity "$RECIPIENT_ID")"

fund_with_friendbot "$ADMIN_ADDR" "$OWNER_ID"
fund_with_friendbot "$AGENT_ADDR" "$AGENT_ID"
fund_with_friendbot "$RECIPIENT_ADDR" "$RECIPIENT_ID"
# The agent signs spends and scripts read all three accounts, so wait for each.
wait_for_account "$ADMIN_ADDR" "$OWNER_ID"
wait_for_account "$AGENT_ADDR" "$AGENT_ID"
wait_for_account "$RECIPIENT_ADDR" "$RECIPIENT_ID"

log "Compiling contracts"
bash "$ROOT/scripts/build-contracts.sh"

# Contract IDs are deterministic per deploy; the native asset contract is fixed
# per network and is what the vault holds funds in (XLM).
TOKEN_ID="$(stellar contract id asset --asset native --network "$NETWORK" | tr -d '[:space:]')"

POLICY_ENGINE_ID="$(deploy_contract policy-engine)"
REGISTRY_ID="$(deploy_contract registry)"
AGENT_VAULT_ID="$(deploy_contract agent-vault)"

log "policy-engine : $POLICY_ENGINE_ID"
log "registry      : $REGISTRY_ID"
log "agent-vault   : $AGENT_VAULT_ID"

log "Initializing policy-engine (admin)"
invoke "$POLICY_ENGINE_ID" initialize --admin "$ADMIN_ADDR"

log "Initializing registry (admin)"
invoke "$REGISTRY_ID" initialize --admin "$ADMIN_ADDR"

log "Initializing agent-vault (owner, agent, policy-engine, token)"
invoke "$AGENT_VAULT_ID" initialize \
  --owner "$ADMIN_ADDR" \
  --agent "$AGENT_ADDR" \
  --policy_engine "$POLICY_ENGINE_ID" \
  --token "$TOKEN_ID"

log "Setting spend policy for the vault"
invoke "$POLICY_ENGINE_ID" set_policy \
  --caller "$ADMIN_ADDR" \
  --vault "$AGENT_VAULT_ID" \
  --policy "{\"max_per_tx\":\"$POLICY_MAX_PER_TX\",\"max_per_period\":\"$POLICY_MAX_PER_PERIOD\",\"period_ledgers\":$POLICY_PERIOD_LEDGERS,\"allowlist\":{}}"

log "Registering agent in the registry"
invoke "$REGISTRY_ID" register \
  --owner "$ADMIN_ADDR" \
  --agent "$AGENT_ADDR" \
  --vault "$AGENT_VAULT_ID" \
  --metadata_uri "$AGENT_METADATA_URI"

set_env STELLAR_NETWORK "$NETWORK"
set_env STELLAR_RPC_URL "$RPC_URL"
set_env STELLAR_HORIZON_URL "$HORIZON_URL"
set_env STELLAR_NETWORK_PASSPHRASE "$PASSPHRASE"
set_env AGENT_VAULT_CONTRACT_ID "$AGENT_VAULT_ID"
set_env POLICY_ENGINE_CONTRACT_ID "$POLICY_ENGINE_ID"
set_env REGISTRY_CONTRACT_ID "$REGISTRY_ID"
set_env NATIVE_TOKEN_CONTRACT_ID "$TOKEN_ID"
set_env AXON_OWNER_IDENTITY "$OWNER_ID"
set_env AXON_AGENT_IDENTITY "$AGENT_ID"
set_env AXON_RECIPIENT_IDENTITY "$RECIPIENT_ID"
set_env AXON_OWNER_ADDRESS "$ADMIN_ADDR"
set_env AXON_AGENT_ADDRESS "$AGENT_ADDR"
set_env AXON_RECIPIENT_ADDRESS "$RECIPIENT_ADDR"
set_env POLICY_MAX_PER_TX "$POLICY_MAX_PER_TX"
set_env POLICY_MAX_PER_PERIOD "$POLICY_MAX_PER_PERIOD"
set_env POLICY_PERIOD_LEDGERS "$POLICY_PERIOD_LEDGERS"

log "Wrote deployment values to ${ENV_FILE#$ROOT/}"

cat <<EOF

  Axon Protocol is live on $NETWORK

  agent-vault   $EXPLORER/contract/$AGENT_VAULT_ID
  policy-engine $EXPLORER/contract/$POLICY_ENGINE_ID
  registry      $EXPLORER/contract/$REGISTRY_ID

  owner     $ADMIN_ADDR
  agent     $AGENT_ADDR
  recipient $RECIPIENT_ADDR

  Next: run an end-to-end spend against these contracts
        npm run test:e2e

EOF
