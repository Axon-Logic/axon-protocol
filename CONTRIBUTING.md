# Contributing to Axon Protocol

Thanks for your interest in Axon! This guide covers everything you need to build,
test and submit changes.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) / `nvm install 20` |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Rust wasm target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | ≥ 21 | [install docs](https://developers.stellar.org/docs/tools/cli/install-cli) |
| Docker | optional | needed only for `stellar contract build` / wasm optimization |

Rust components used by CI: `rustup component add rustfmt clippy`.

## Setup

```bash
git clone https://github.com/axonlogic/axon-protocol
cd axon-protocol

npm install                 # install TS workspace dependencies
cp .env.example .env        # fill in values, or let contracts/deploy.sh write them
npm run build               # contracts (wasm) + all TypeScript packages
```

## Repository layout

| Path | What lives here |
|---|---|
| `contracts/agent-vault` | Soroban contract — holds agent funds, calls the policy engine on every spend |
| `contracts/policy-engine` | Soroban contract — per-tx limits, period caps, allowlists |
| `contracts/registry` | Soroban contract — on-chain agent ↔ vault directory |
| `packages/sdk` | TypeScript SDK — `AgentVaultClient`, `RegistryClient` |
| `packages/api` | Express REST gateway |
| `packages/agent-runtime` | Scheduler, plugin system, spend executor |
| `packages/dashboard` | Next.js frontend |
| `scripts/` | Build, deployment and end-to-end helpers |

## Common commands

All commands run from the repository root.

| Command | What it does |
|---|---|
| `npm run build` | Build contracts to wasm, then all TypeScript packages |
| `npm run build:contracts` | Compile `policy-engine`, `registry`, `agent-vault` to wasm |
| `npm run build:ts` | Build every TypeScript workspace |
| `npm test` | `cargo test` + every TS workspace test suite |
| `npm run test:contracts` | Rust unit tests only |
| `npm run test:ts` | Jest suites only |
| `npm run lint` | `cargo fmt --check` + `cargo clippy -D warnings` + `tsc --noEmit` |
| `npm run lint:contracts` | Rust formatting and clippy only |
| `npm run lint:ts` | TypeScript type-checks only |
| `npm run format` | Prettier over `packages/*/src` |
| `npm run deploy:testnet` | Deploy and initialize all contracts on Testnet |
| `npm run test:e2e` | Run a real deposit + policy-checked spend on Testnet |

### Contract development notes

- **Build order matters.** `agent-vault` imports `policy_engine.wasm` at compile
  time (`contractimport!`), so the policy engine must be built first. Always use
  `npm run build:contracts` (or `scripts/build-contracts.sh`) instead of a raw
  `cargo build`; CI enforces the same order.
- **The wasm target needs the SDK's `testutils` feature *off*.** It is enabled
  only in each crate's `[dev-dependencies]`; enabling it at the workspace level
  breaks every `--target wasm32-unknown-unknown` build.
- **`contracts/Cargo.lock` is committed.** It pins transitive dependency versions
  (e.g. `ed25519-dalek`) that break the build when resolved to a newer major.
  Regenerate deliberately, and re-run the full contract test suite afterwards.
- `agent-vault` skips the policy-engine call under `cfg(test)`, so unit tests
  cover vault accounting only. Policy enforcement is covered by the
  policy-engine unit tests and by `npm run test:e2e`.

### Deploying to Testnet

```bash
npm run deploy:testnet                 # writes contract IDs into .env
npm run test:e2e                       # real transaction, prints explorer link
```

Both scripts are safe to re-run: they reuse existing identities in the Stellar
CLI key store and fund them through Friendbot. `deploy:testnet` deploys a fresh
set of contracts each run; `test:e2e` spends from the configured vault, so
repeated runs are bounded by the policy's per-period cap (reset each policy
period). Never commit `.env`.

## Workflow

1. Fork the repository and branch from `main`:
   `git checkout -b feat/short-description`
2. Make your change, including tests.
3. Run the checks that cover your change — `npm run lint` and `npm test` is the
   full local gate.
4. Open a pull request against `main` and describe the change.

## Branch naming

| Prefix | Use for |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `chore/` | Tooling, dependencies, config |
| `contract/` | Soroban contract changes |

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(sdk): add PolicyEngineClient
fix(api): handle missing vault config gracefully
docs: update quick start steps
```

## Smart contract changes

- Contract changes require tests in the same pull request.
- Run `npm run test:contracts` and `npm run lint:contracts` before pushing.
- Document storage layout changes in the PR description — they affect upgrade
  paths for already-deployed contracts.
- Prefer additive entrypoints. Removing or renaming a public function breaks
  live integrations and the SDK.

## Code style

- **TypeScript** — Prettier + ESLint; `npm run lint:ts` must pass.
- **Rust** — `cargo fmt` and `cargo clippy --all-targets -- -D warnings`; CI runs
  both with warnings treated as errors.
- Keep public APIs documented; `packages/sdk` is consumed by third parties.

## Reporting issues

Open a GitHub issue using the bug report template. Include expected vs. actual
behaviour, reproduction steps, your environment (OS, Node, Rust, Stellar CLI
versions) and any transaction hash or error output. Never paste secret keys.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind and
constructive.

## License

By contributing you agree that your code is licensed under the MIT license.
