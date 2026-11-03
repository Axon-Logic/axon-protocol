#!/usr/bin/env node
/**
 * testnet-e2e.mjs — end-to-end authorized spend on Stellar Testnet.
 *
 * Proves the full Axon flow against contracts deployed by contracts/deploy.sh:
 *
 *   1. fund       owner deposits XLM into the agent's vault
 *   2. authorize  agent submits an in-policy spend; the vault calls policy-engine
 *   3. reject     an over-limit spend is refused by the policy engine (simulated,
 *                 never submitted — so it cannot move funds)
 *   4. confirm    every submitted transaction is polled to on-chain status and
 *                 the explorer link is printed
 *
 * Usage:
 *   npm run test:e2e                  # after `npm run deploy:testnet`
 *   DEPOSIT_STROOPS=40000000 SPEND_STROOPS=1000000 npm run test:e2e
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  rpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import { AgentVaultClient, NETWORKS } from "@axon-protocol/sdk";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = process.env.ENV_FILE ?? path.join(ROOT, ".env");

// Amounts in stroops (1 XLM = 10_000_000 stroops).
const DEPOSIT = BigInt(process.env.DEPOSIT_STROOPS ?? "30000000"); // 3 XLM
const SPEND = BigInt(process.env.SPEND_STROOPS ?? "5000000"); // 0.5 XLM

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

const step = (n, msg) => console.log(`\n${c.bold(`[${n}/4]`)} ${msg}`);
const ok = (msg) => console.log(`  ${c.green("✓")} ${msg}`);
const info = (msg) => console.log(`  ${c.dim(msg)}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const xlm = (stroops) => `${Number(stroops) / 1e7} XLM`;

function loadEnv(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return false;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const split = line.indexOf("=");
    const key = line.slice(0, split).trim();
    let value = line.slice(split + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Real environment variables win over the .env file.
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `missing ${key}. Run \`npm run deploy:testnet\` first, or export it manually.`,
    );
  }
  return value;
}

/** Resolve a signing key from an env secret, else from the Stellar CLI store. */
function resolveKeypair(secretEnv, identityEnv, fallbackIdentity, label) {
  if (process.env[secretEnv]) return Keypair.fromSecret(process.env[secretEnv]);
  const identity = process.env[identityEnv] ?? fallbackIdentity;
  try {
    const secret = execFileSync("stellar", ["keys", "secret", identity], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return Keypair.fromSecret(secret);
  } catch {
    throw new Error(
      `cannot resolve the ${label} key. Set ${secretEnv}, or create the ` +
        `'${identity}' identity in the Stellar CLI key store (npm run deploy:testnet).`,
    );
  }
}

async function main() {
  const loaded = loadEnv(ENV_FILE);
  console.log(c.bold("\nAxon Protocol — Testnet end-to-end spend"));
  info(loaded ? `env: ${path.relative(ROOT, ENV_FILE)}` : "env: process environment only");

  const vaultId = requireEnv("AGENT_VAULT_CONTRACT_ID");
  const networkName = process.env.STELLAR_NETWORK ?? "testnet";
  const base = NETWORKS[networkName];
  if (!base) throw new Error(`unknown network '${networkName}'`);

  const network = {
    ...base,
    rpcUrl: process.env.STELLAR_RPC_URL || base.rpcUrl,
  };
  const explorer =
    process.env.STELLAR_EXPLORER_BASE ?? "https://stellar.expert/explorer/testnet";

  const owner = resolveKeypair(
    "OWNER_SECRET_KEY",
    "AXON_OWNER_IDENTITY",
    "axon-owner",
    "owner",
  );
  const agent = resolveKeypair(
    "AGENT_SECRET_KEY",
    "AXON_AGENT_IDENTITY",
    "axon-agent",
    "agent",
  );
  const recipientAddress = requireEnv("AXON_RECIPIENT_ADDRESS");

  const server = new rpc.Server(network.rpcUrl);
  const vault = new AgentVaultClient(vaultId, network);
  const token = new Contract(requireEnv("NATIVE_TOKEN_CONTRACT_ID"));

  console.log(`  vault     ${vaultId}`);
  console.log(`  owner     ${owner.publicKey()}`);
  console.log(`  agent     ${agent.publicKey()}`);
  console.log(`  recipient ${recipientAddress}`);

  // -- helpers -------------------------------------------------------------

  /** Poll an RPC until the transaction reaches a final on-chain status. */
  async function confirm(hash, label) {
    const deadline = Date.now() + 90_000;
    process.stdout.write(`  ${c.dim(`waiting for ${label} ${hash.slice(0, 10)}…`)}`);
    while (Date.now() < deadline) {
      let res = null;
      try {
        res = await server.getTransaction(hash);
      } catch {
        res = null; // not indexed yet
      }
      if (res?.status === "SUCCESS") {
        process.stdout.write("\r\x1b[K");
        ok(`${label} confirmed`);
        info(`${explorer}/tx/${hash}`);
        return res;
      }
      if (res?.status === "FAILED") {
        process.stdout.write("\r\x1b[K");
        throw new Error(`${label} failed on-chain: ${explorer}/tx/${hash}`);
      }
      await sleep(1500);
    }
    process.stdout.write("\r\x1b[K");
    throw new Error(`timed out waiting for ${label}: ${hash}`);
  }

  /** Simulate a read-only contract call and decode its return value. */
  async function read(contractId, method, args) {
    const account = await server.getAccount(owner.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: network.networkPassphrase,
    })
      .addOperation(new Contract(contractId).call(method, ...args))
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
      throw new Error(`${method}() simulation failed`);
    }
    return scValToNative(sim.result.retval);
  }

  const nativeBalance = (address) =>
    read(token.contractId(), "balance", [new Address(address).toScVal()]);

  // -- 1. fund the vault ---------------------------------------------------

  step(1, `Fund the agent vault with ${xlm(DEPOSIT)}`);
  const startBalance = await vault.balance(owner.publicKey());
  info(`vault balance before: ${xlm(startBalance)}`);

  const depositHash = await vault.deposit(owner, DEPOSIT);
  await confirm(depositHash, "deposit");

  const fundedBalance = await vault.balance(owner.publicKey());
  if (fundedBalance !== startBalance + DEPOSIT) {
    throw new Error(
      `expected vault balance ${startBalance + DEPOSIT}, got ${fundedBalance}`,
    );
  }
  ok(`vault balance is now ${xlm(fundedBalance)}`);

  // -- 2. authorized, in-policy spend -------------------------------------

  step(2, `Agent spends ${xlm(SPEND)} through the policy engine`);
  const recipientBefore = await nativeBalance(recipientAddress);

  const spendHash = await vault.spend(agent, {
    to: recipientAddress,
    amount: SPEND,
    memo: "api_call",
  });
  await confirm(spendHash, "spend");

  const afterSpend = await vault.balance(owner.publicKey());
  const recipientAfter = await nativeBalance(recipientAddress);

  if (afterSpend !== fundedBalance - SPEND) {
    throw new Error(`expected vault balance ${fundedBalance - SPEND}, got ${afterSpend}`);
  }
  if (recipientAfter !== recipientBefore + SPEND) {
    throw new Error(
      `recipient did not receive funds (${recipientBefore} -> ${recipientAfter})`,
    );
  }
  ok(`vault balance is now ${xlm(afterSpend)}`);
  ok(`recipient received ${xlm(SPEND)}`);

  // -- 3. guardrail rejection ---------------------------------------------

  step(3, "Over-limit spend is rejected by the policy engine");
  const maxPerTx = BigInt(requireEnv("POLICY_MAX_PER_TX"));
  const overLimit = maxPerTx + 1n;

  const account = await server.getAccount(agent.publicKey());
  const probe = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(
      new Contract(vaultId).call(
        "spend",
        new Address(recipientAddress).toScVal(),
        nativeToScVal(overLimit, { type: "i128" }),
        nativeToScVal("api_call", { type: "symbol" }),
      ),
    )
    .setTimeout(30)
    .build();

  const probeSim = await server.simulateTransaction(probe);
  if (rpc.Api.isSimulationSuccess(probeSim)) {
    throw new Error(
      `guardrail failed: a ${xlm(overLimit)} spend passed a ${xlm(maxPerTx)} per-tx limit`,
    );
  }
  ok(`rejected ${xlm(overLimit)} spend (per-tx limit ${xlm(maxPerTx)})`);
  info("simulated only — nothing was submitted, no funds moved");

  // -- 4. summary ----------------------------------------------------------

  step(4, "Done");
  const summary = {
    contracts: {
      agentVault: vaultId,
      policyEngine: process.env.POLICY_ENGINE_CONTRACT_ID,
      registry: process.env.REGISTRY_CONTRACT_ID,
    },
    deposit: { hash: depositHash, url: `${explorer}/tx/${depositHash}` },
    spend: { hash: spendHash, url: `${explorer}/tx/${spendHash}`, amount: SPEND.toString() },
    vaultBalance: afterSpend.toString(),
  };

  console.log(`\n  ${c.bold("Verified spend transaction")}`);
  console.log(`  hash ${c.green(spendHash)}`);
  console.log(`  url  ${summary.spend.url}\n`);
  info(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(`\n${c.red("✗")} ${err.message}\n`);
  process.exit(1);
});
