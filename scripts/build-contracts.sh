#!/usr/bin/env bash
# Build every Soroban contract to optimized wasm.
#
# Build order matters: agent-vault pulls in the policy-engine wasm at compile
# time via `contractimport!`, so policy-engine must be built first.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS="$ROOT/contracts"
WASM_TARGET="wasm32-unknown-unknown"
OUT_DIR="$CONTRACTS/target/$WASM_TARGET/release"

if ! rustup target list --installed 2>/dev/null | grep -qx "$WASM_TARGET"; then
  echo "error: missing Rust target '$WASM_TARGET'" >&2
  echo "       run: rustup target add $WASM_TARGET" >&2
  exit 1
fi

cd "$CONTRACTS"

echo "==> Building policy-engine (agent-vault imports its wasm)"
cargo build --release --target "$WASM_TARGET" -p policy-engine

echo "==> Building registry + agent-vault"
cargo build --release --target "$WASM_TARGET" -p registry -p agent-vault

for name in policy_engine registry agent_vault; do
  if [ ! -f "$OUT_DIR/$name.wasm" ]; then
    echo "error: expected $OUT_DIR/$name.wasm to exist after build" >&2
    exit 1
  fi
  size="$(wc -c <"$OUT_DIR/$name.wasm" | tr -d ' ')"
  printf '    %-20s %s bytes\n' "$name.wasm" "$size"
done

echo "==> Contract build complete"
