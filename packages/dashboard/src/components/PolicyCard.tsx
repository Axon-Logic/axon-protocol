type SpendPolicy = {
  maxPerTx: string;
  maxPerPeriod: string;
  periodLedgers: number;
  allowlist: string[];
  spent?: string;
};

function stroopsToXlm(stroops: string) {
  return (BigInt(stroops) / 10_000_000n).toString();
}

export default function PolicyCard({ policy }: { policy: SpendPolicy | null }) {
  if (!policy) {
    return (
      <div className="bg-axon-800 border border-axon-700 rounded-lg p-4 text-sm text-gray-500">
        No policy set.
      </div>
    );
  }

  const spent = BigInt(policy.spent ?? "0");
  const maxPerPeriod = BigInt(policy.maxPerPeriod);
  const usagePct = maxPerPeriod > 0n ? Number((spent * 100n) / maxPerPeriod) : 0;

  return (
    <div className="bg-axon-800 border border-axon-700 rounded-lg p-4 space-y-3 text-sm">
      <div className="flex justify-between text-gray-400">
        <span>Max per transaction</span>
        <span className="font-mono text-gray-200">{stroopsToXlm(policy.maxPerTx)} XLM</span>
      </div>
      <div className="flex justify-between text-gray-400">
        <span>Max per period</span>
        <span className="font-mono text-gray-200">{stroopsToXlm(policy.maxPerPeriod)} XLM</span>
      </div>
      <div className="flex justify-between text-gray-400">
        <span>Period length</span>
        <span className="font-mono text-gray-200">{policy.periodLedgers} ledgers</span>
      </div>
      <div className="flex justify-between text-gray-400">
        <span>Allowlist</span>
        <span className="text-gray-200">
          {policy.allowlist.length === 0 ? "any" : `${policy.allowlist.length} address(es)`}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Budget usage</span>
          <span>{stroopsToXlm(policy.spent ?? "0")} / {stroopsToXlm(policy.maxPerPeriod)} XLM</span>
        </div>
        <div className="w-full bg-axon-700 rounded-full h-2">
          <div
            className="bg-axon-accent h-2 rounded-full transition-all"
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
