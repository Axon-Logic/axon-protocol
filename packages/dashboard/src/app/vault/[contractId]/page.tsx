"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import StatCard from "@/components/StatCard";
import Link from "next/link";

type VaultConfig = { owner: string; agent: string; policyEngine: string; token: string };
type VaultPolicy = {
  maxPerTx: string;
  maxPerPeriod: string;
  periodLedgers: number;
  allowlist: string[];
};
type VaultSpend = {
  txHash: string;
  ledger: number;
  closedAt: string;
  to: string;
  amount: string;
  memo: string;
};
type Deployment = { network: string; explorer: string };

const xlm = (stroops: string) =>
  (Number(BigInt(stroops)) / 10_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export default function VaultPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const [balance, setBalance] = useState<string | null>(null);
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [policy, setPolicy] = useState<VaultPolicy | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [spends, setSpends] = useState<VaultSpend[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [deploymentRes, balanceRes, configRes, policyRes, spendsRes] = await Promise.all([
          fetch("/api/deployment"),
          fetch(`/api/vaults/${contractId}/balance`),
          fetch(`/api/vaults/${contractId}/config`),
          fetch(`/api/vaults/${contractId}/policy`),
          fetch(`/api/vaults/${contractId}/spends`),
        ]);

        const balanceBody = await balanceRes.json();
        if (!balanceRes.ok) {
          throw new Error(balanceBody.error ?? "Failed to read vault");
        }

        const deploymentBody = await deploymentRes.json();
        const configBody = await configRes.json();
        const policyBody = await policyRes.json();
        const spendsBody = await spendsRes.json();

        if (cancelled) return;
        setBalance(balanceBody.balance);
        setConfig(configRes.ok ? (configBody as VaultConfig) : null);
        setPolicy(policyRes.ok ? (policyBody as VaultPolicy) : null);
        setDeployment(deploymentRes.ok ? (deploymentBody as Deployment) : null);
        setSpends(spendsRes.ok ? ((spendsBody.spends as VaultSpend[]) ?? []) : null);
        setError(null);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (contractId) load();
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  if (loading) return <p className="text-gray-500 text-sm">Loading vault…</p>;
  if (error) return <p className="text-red-400 text-sm">Vault unavailable: {error}</p>;
  if (balance === null) return <p className="text-red-400 text-sm">Vault not found.</p>;

  const explorer = deployment?.explorer;
  const vaultUrl = explorer ? `${explorer}/contract/${contractId}` : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-white text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Vault</h1>
        {deployment && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-axon-700 text-gray-300">
            {deployment.network}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="font-mono text-xs text-gray-400 break-all">{contractId}</p>
        {vaultUrl && (
          <a
            href={vaultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-axon-accent hover:underline"
          >
            View contract on the Stellar explorer ↗
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Balance" value={`${xlm(balance)} XLM`} sub="live on-chain balance" />
        <StatCard
          label="Agent"
          value={config ? `${config.agent.slice(0, 8)}…` : "—"}
          sub="authorized spender"
        />
      </div>

      {config && (
        <div className="bg-axon-800 border border-axon-700 rounded-lg p-4 space-y-2 text-sm">
          <h2 className="font-semibold text-gray-300">Config</h2>
          <Row label="Owner" value={config.owner} />
          <Row label="Agent" value={config.agent} />
          <Row label="Policy engine" value={config.policyEngine} />
          <Row label="Token" value={config.token} />
        </div>
      )}

      {policy && (
        <div className="bg-axon-800 border border-axon-700 rounded-lg p-4 space-y-2 text-sm">
          <h2 className="font-semibold text-gray-300">Policy</h2>
          <Row label="Max per transaction" value={`${xlm(policy.maxPerTx)} XLM`} />
          <Row label="Max per period" value={`${xlm(policy.maxPerPeriod)} XLM`} />
          <Row label="Period length" value={`${policy.periodLedgers} ledgers`} />
          <Row
            label="Allowlist"
            value={
              policy.allowlist.length === 0
                ? "any recipient"
                : `${policy.allowlist.length} address(es)`
            }
          />
        </div>
      )}

      <div className="bg-axon-800 border border-axon-700 rounded-lg p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold text-gray-300 text-sm">Spend history</h2>
          {spends && <span className="text-xs text-gray-500">{spends.length} spend(s)</span>}
        </div>

        {spends === null ? (
          <p className="text-gray-500 text-xs">Spend history unavailable.</p>
        ) : spends.length === 0 ? (
          <p className="text-gray-500 text-xs">
            No spends recorded in the current retention window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 text-left">
                  <th className="font-normal pb-2">Ledger</th>
                  <th className="font-normal pb-2">Recipient</th>
                  <th className="font-normal pb-2 text-right">Amount</th>
                  <th className="font-normal pb-2">Memo</th>
                  <th className="font-normal pb-2 text-right">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {spends.map((spend) => (
                  <tr key={spend.txHash} className="border-t border-axon-700/60">
                    <td className="py-2 font-mono text-gray-400" title={spend.closedAt}>
                      {spend.ledger}
                    </td>
                    <td className="py-2 font-mono text-gray-300">{short(spend.to)}</td>
                    <td className="py-2 text-right text-gray-200">
                      {xlm(spend.amount)} XLM
                    </td>
                    <td className="py-2 font-mono text-gray-400">{spend.memo || "—"}</td>
                    <td className="py-2 text-right">
                      {explorer ? (
                        <a
                          href={`${explorer}/tx/${spend.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-axon-accent hover:underline"
                        >
                          {spend.txHash.slice(0, 8)}… ↗
                        </a>
                      ) : (
                        <span className="font-mono text-gray-500">
                          {spend.txHash.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href={`/policy?vault=${contractId}`}
          className="px-4 py-2 text-sm rounded bg-axon-accent hover:bg-indigo-500 transition-colors"
        >
          Manage Policy
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-gray-400">
      <span className="shrink-0">{label}</span>
      <span className="font-mono text-xs text-right break-all">{value}</span>
    </div>
  );
}
