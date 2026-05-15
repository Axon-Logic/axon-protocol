# Contributing to Axon Protocol

Thanks for your interest! Here's how to get started.

## Prerequisites

- Node.js ≥ 20
- Rust + `wasm32-unknown-unknown` target (`rustup target add wasm32-unknown-unknown`)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)

## Setup

```bash
git clone https://github.com/axonlogic/axon-protocol
cd axon-protocol
cp .env.example .env
npm install
npm run build
```

## Project Structure

| Path | What lives here |
|---|---|
| `contracts/` | Soroban smart contracts (Rust) |
| `packages/sdk` | TypeScript SDK |
| `packages/api` | Express REST gateway |
| `packages/agent-runtime` | Agent execution environment |
| `packages/dashboard` | Next.js frontend |

## Workflow

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run tests: `npm test`
4. Run lint: `npm run lint`
5. Open a pull request against `main`

## Branch Naming

| Prefix | Use for |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `chore/` | Tooling, deps, config |
| `contract/` | Soroban contract changes |

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(sdk): add PolicyEngineClient
fix(api): handle missing vault config gracefully
docs: update quick start steps
```

## Smart Contract Changes

- All contract changes require tests in the same PR
- Run `cargo test` inside `contracts/` before submitting
- Document any storage layout changes — they affect upgrade paths

## Code Style

- TypeScript: Prettier + ESLint (run `npm run lint`)
- Rust: `cargo fmt` and `cargo clippy`

## Reporting Issues

Open a GitHub issue with:
- What you expected
- What happened
- Steps to reproduce
- Environment (OS, Node version, network)

## License

By contributing you agree your code will be licensed under MIT.
