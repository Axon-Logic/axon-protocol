"use client";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { address, connected, connecting, connect, disconnect, network } = useWallet();

  const expected = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";
  const mismatch = connected && network && !network.toLowerCase().includes(expected);

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

      <div className="flex items-center gap-4">
        <ThemeToggle />

        {connected ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-mono">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
            {mismatch && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                network mismatch
              </span>
            )}
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
      </div>
    </nav>
  );
}
