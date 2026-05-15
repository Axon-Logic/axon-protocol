"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import StatCard from "@/components/StatCard";
import Link from "next/link";

type VaultData = { balance: string; config: { owner: string; agent: string } | null };

export default function VaultPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/vaults/${contractId}/balance`).then((r) => r.json()),
      fetch(`/api/vaults/${contractId}/config`).then((r) => r.json()),
    ])
      .then(([{ balance }, config]) => setVault({ balance, config }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [contractId]);

  if (loading) return <p className="text-gray-500 text-sm">Loading vault…</p>;
  if (!vault) return <p className="text-red-400 text-sm">Vault not found.</p>;

  const xlm = (BigInt(vault.balance) / 10_000_000n).toString();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-white text-sm">← Back</Link>
        <h1 className="text-2xl font-bold">Vault</h1>
      </div>

      <p className="font-mono text-xs text-gray-400 break-all">{contractId}</p>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Balance" value={`${xlm} XLM`} sub="on-chain balance" />
        <StatCard
          label="Agent"
          value={vault.config ? vault.config.agent.slice(0, 8) + "…" : "—"}
          sub="authorized spender"
        />
      </div>

      {vault.config && (
        <div className="bg-axon-800 border border-axon-700 rounded-lg p-4 space-y-2 text-sm">
          <h2 className="font-semibold text-gray-300">Config</h2>
          <div className="flex justify-between text-gray-400">
            <span>Owner</span>
            <span className="font-mono text-xs">{vault.config.owner}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Agent</span>
            <span className="font-mono text-xs">{vault.config.agent}</span>
          </div>
        </div>
      )}

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
