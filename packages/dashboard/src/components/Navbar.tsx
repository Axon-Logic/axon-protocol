"use client";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";

export default function Navbar() {
  const { address, connected, connecting, connect, disconnect } = useWallet();

  return (
    <nav className="border-b border-axon-700 bg-axon-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-axon-accent font-bold text-lg tracking-tight">
          ⬡ Axon
        </Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
          Agents
        </Link>
        <Link href="/policy" className="text-sm text-gray-400 hover:text-white transition-colors">
          Policies
        </Link>
      </div>

      {connected ? (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
          <button
            onClick={disconnect}
            className="text-xs px-3 py-1.5 rounded border border-axon-700 hover:border-red-500 hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="text-sm px-4 py-1.5 rounded bg-axon-accent hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {connecting ? "Connecting…" : "Connect Freighter"}
        </button>
      )}
    </nav>
  );
}
