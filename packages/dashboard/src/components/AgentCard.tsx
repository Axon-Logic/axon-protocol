"use client";
import { useState } from "react";
import Link from "next/link";
import type { AgentRecord } from "@axon-protocol/sdk";

type Props = { address: string; record: AgentRecord };

export default function AgentCard({ address, record }: Props) {
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`Deactivate agent ${address}?`)) return;
    setDeactivating(true);
    try {
      await fetch(`/api/agents/${address}/deactivate`, { method: "POST" });
      window.location.reload();
    } catch {
      alert("Failed to deactivate agent");
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="block bg-axon-800 border border-axon-700 rounded-lg p-4 transition-colors">
      <Link href={`/vault/${record.vault}`} className="block">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-gray-300">
            {address.slice(0, 8)}…{address.slice(-6)}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              record.active
                ? "bg-axon-green/20 text-axon-green"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {record.active ? "active" : "inactive"}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2 font-mono">
          vault: {record.vault.slice(0, 10)}…
        </p>
      </Link>
      {record.active && (
        <button
          onClick={handleDeactivate}
          disabled={deactivating}
          className="mt-3 w-full text-xs py-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
        >
          {deactivating ? "Deactivating…" : "Deactivate Agent"}
        </button>
      )}
    </div>
  );
}
