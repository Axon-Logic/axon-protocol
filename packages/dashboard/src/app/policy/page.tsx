"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

function PolicyForm() {
  const params = useSearchParams();
  const vaultId = params.get("vault") ?? "";

  const [form, setForm] = useState({
    maxPerTx: "",
    maxPerPeriod: "",
    periodLedgers: "17280",
    allowlist: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch(`/api/vaults/${vaultId}/policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxPerTx: form.maxPerTx,
          maxPerPeriod: form.maxPerPeriod,
          periodLedgers: Number(form.periodLedgers),
          allowlist: form.allowlist.split("\n").map((s) => s.trim()).filter(Boolean),
        }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Policy Manager</h1>
      {vaultId && <p className="text-xs text-gray-500 font-mono break-all">vault: {vaultId}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: "maxPerTx", label: "Max per transaction (stroops)" },
          { key: "maxPerPeriod", label: "Max per period (stroops)" },
          { key: "periodLedgers", label: "Period length (ledgers)" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm text-gray-400 mb-1">{label}</label>
            <input
              type="number"
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full bg-axon-700 border border-axon-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-axon-accent"
              required
            />
          </div>
        ))}

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Allowlist (one address per line, empty = any)
          </label>
          <textarea
            value={form.allowlist}
            onChange={(e) => setForm((f) => ({ ...f, allowlist: e.target.value }))}
            rows={4}
            className="w-full bg-axon-700 border border-axon-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-axon-accent"
          />
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full py-2 rounded bg-axon-accent hover:bg-indigo-500 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {status === "saving" ? "Saving…" : "Save Policy"}
        </button>

        {status === "saved" && <p className="text-axon-green text-sm">Policy saved ✓</p>}
        {status === "error" && <p className="text-red-400 text-sm">Failed to save policy.</p>}
      </form>
    </div>
  );
}

export default function PolicyPage() {
  return (
    <Suspense fallback={<p className="text-gray-500 text-sm">Loading…</p>}>
      <PolicyForm />
    </Suspense>
  );
}
