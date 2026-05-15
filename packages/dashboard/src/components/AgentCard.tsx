import Link from "next/link";
import type { AgentRecord } from "@axon-protocol/sdk";

type Props = { address: string; record: AgentRecord };

export default function AgentCard({ address, record }: Props) {
  return (
    <Link
      href={`/vault/${record.vault}`}
      className="block bg-axon-800 border border-axon-700 hover:border-axon-accent rounded-lg p-4 transition-colors"
    >
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
  );
}
