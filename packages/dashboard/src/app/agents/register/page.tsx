"use client";
import { useState } from "react";

export default function RegisterAgentPage() {
  const [form, setForm] = useState({
    ownerSecretKey: "",
    agentAddress: "",
    vaultAddress: "",
    metadataUri: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [result, setResult] = useState<{ txHash?: string; error?: string }>({});

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ txHash: data.txHash });
        setStatus("success");
      } else {
        setResult({ error: data.error ?? "Registration failed." });
        setStatus("error");
      }
    } catch (err) {
      setResult({ error: (err as Error).message });
      setStatus("error");
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Register Agent</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Owner Secret Key</label>
          <input
            type="password"
            value={form.ownerSecretKey}
            onChange={set("ownerSecretKey")}
            placeholder="S…"
            required
            className="w-full bg-axon-700 border border-axon-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-axon-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Agent Address</label>
          <input
            type="text"
            value={form.agentAddress}
            onChange={set("agentAddress")}
            placeholder="G…"
            required
            className="w-full bg-axon-700 border border-axon-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-axon-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Vault Contract ID</label>
          <input
            type="text"
            value={form.vaultAddress}
            onChange={set("vaultAddress")}
            placeholder="C…"
            required
            className="w-full bg-axon-700 border border-axon-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-axon-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Metadata URI</label>
          <input
            type="url"
            value={form.metadataUri}
            onChange={set("metadataUri")}
            placeholder="https://…"
            required
            className="w-full bg-axon-700 border border-axon-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-axon-accent"
          />
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full py-2 rounded bg-axon-accent hover:bg-indigo-500 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {status === "submitting" ? "Registering…" : "Register Agent"}
        </button>
      </form>

      {status === "success" && result.txHash && (
        <div className="text-sm text-axon-green space-y-1">
          <p>Agent registered ✓</p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-axon-accent hover:underline break-all"
          >
            {result.txHash}
          </a>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-red-400">{result.error}</p>
      )}
    </div>
  );
}
