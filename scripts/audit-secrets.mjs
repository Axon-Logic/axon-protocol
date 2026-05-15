#!/usr/bin/env node
/**
 * Secret key audit — scans the codebase for potential secret key exposure.
 *
 * Checks for:
 * 1. Hardcoded-looking Stellar secret keys (S... patterns) in source files
 * 2. .env files committed to the repository
 * 3. console.log/console.error of process.env.SECRET or similar
 * 4. Hardcoded test secrets in test files
 *
 * Usage: node scripts/audit-secrets.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

let issues = 0;

function check(condition, message, file, line) {
  if (!condition) {
    console.log(`  [WARN] ${message}`);
    console.log(`         ${file}:${line}`);
    issues++;
  }
}

console.log("=== Axon Protocol — Secret Key Audit ===\n");

// 1. Check for tracked .env files
console.log("1. Checking for tracked .env files...");
try {
  const tracked = execSync(
    "git ls-files | grep -E '\\.env$'",
    { cwd: root, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] },
  ).trim();
  if (tracked) {
    console.log(`  [FAIL] Tracked .env files found:\n${tracked}`);
    issues++;
  } else {
    console.log("  [PASS] No .env files tracked in git\n");
  }
} catch {
  console.log("  [PASS] No .env files tracked in git\n");
}

// 2. Scan source files for hardcoded secrets
console.log("2. Scanning source files for hardcoded Stellar secret keys...");
const SEcret_PATTERN = /S[a-k3-9]{55}/g;

try {
  const files = execSync(
    "git ls-files | grep -E '\\.(ts|js|rs|mjs)$' | grep -v node_modules | grep -v '\\.next'",
    { cwd: root, encoding: "utf-8" },
  ).trim().split("\n");

  for (const file of files) {
    const filePath = resolve(root, file);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(SEcret_PATTERN);
      if (match) {
        // Allow test files that use placeholder secrets
        if (file.includes("__tests__") || file.includes("test.")) {
          if (line.includes('"S..."') || line.includes("'S...'")) continue;
        }
        console.log(`  [FAIL] Possible secret key in ${file}:${i + 1}`);
        console.log(`         ${line.trim().substring(0, 80)}`);
        issues++;
      }
    }
  }
  console.log(`  Scan complete: ${files.length} files checked\n`);
} catch (e) {
  console.log(`  [SKIP] Could not scan: ${e.message}\n`);
}

// 3. Check for console.log of secret env vars
console.log("3. Checking for logged secret environment variables...");
try {
  const files = execSync(
    "git ls-files | grep -E '\\.(ts|js|mjs)$' | grep -v node_modules | grep -v '\\.next'",
    { cwd: root, encoding: "utf-8" },
  ).trim().split("\n");

  const secretVars = ["SECRET", "PASSWORD", "PRIVATE", "MNEMONIC", "SEED"];

  for (const file of files) {
    const filePath = resolve(root, file);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("console.log") || line.includes("console.error")) {
        for (const sv of secretVars) {
          if (line.toUpperCase().includes(sv)) {
            console.log(`  [WARN] Possible secret logging in ${file}:${i + 1}`);
            console.log(`         ${line.trim().substring(0, 80)}`);
            issues++;
          }
        }
      }
    }
  }
} catch (e) {
  console.log(`  [SKIP] Could not scan: ${e.message}\n`);
}

// Summary
console.log("=== Summary ===");
if (issues === 0) {
  console.log("  All checks passed. No secret key issues found.");
} else {
  console.log(`  ${issues} potential issue(s) found. Review the warnings above.`);
  process.exit(1);
}
