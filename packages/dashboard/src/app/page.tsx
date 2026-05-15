"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import AgentCard from "@/components/AgentCard";
import StatCard from "@/components/StatCard";
import SkeletonCard from "@/components/SkeletonCard";
import type { AgentRecord } from "@axon-protocol/sdk";

type AgentEntry = { address: string; record: AgentRecord };

export default function DashboardPage() {
  const { connected, address } = useWallet();
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected) return;
    setLoading(true);
    // Fetch agents owned by connected wallet from the API
    fetch(`/api/agents?owner=${address}`)
      .then((r) => r.json())
      .then((data: AgentEntry[]) => setAgents(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [connected, address]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <h1 className="text-3xl font-bold">Axon Protocol</h1>
        <p className="text-gray-400 max-w-md">
          Connect your Freighter wallet to manage your AI agents and vaults.
        </p>
      </div>
    );
  }

  const active = agents.filter((a) => a.record.active).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your registered agents and vaults</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Agents" value={String(agents.length)} />
        <StatCard label="Active" value={String(active)} />
        <StatCard label="Inactive" value={String(agents.length - active)} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Agents</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <p className="text-gray-500 text-sm">No agents registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((a) => (
              <AgentCard key={a.address} address={a.address} record={a.record} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
