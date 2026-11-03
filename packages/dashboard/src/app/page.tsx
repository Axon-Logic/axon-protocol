"use client";
import { useEffect, useState } from "react";
import AgentCard from "@/components/AgentCard";
import StatCard from "@/components/StatCard";
import SkeletonCard from "@/components/SkeletonCard";
import type { AgentRecord } from "@axon-protocol/sdk";

type AgentEntry = { address: string; record: AgentRecord };

export default function DashboardPage() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/agents")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load agents");
        return data as AgentEntry[];
      })
      .then((data) => {
        setAgents(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const active = agents.filter((a) => a.record.active).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Live on-chain agents and vaults from the deployed registry
        </p>
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
        ) : error ? (
          <p className="text-red-400 text-sm">
            {error}
            <span className="block text-gray-500 mt-1">
              Run <code className="text-gray-300">npm run deploy:testnet</code> to populate .env with
              contract IDs.
            </span>
          </p>
        ) : agents.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No agent configured. Run <code className="text-gray-300">npm run deploy:testnet</code> to
            register one.
          </p>
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
