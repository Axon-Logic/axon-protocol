type Props = { label: string; value: string; sub?: string };

export default function StatCard({ label, value, sub }: Props) {
  return (
    <div className="bg-axon-800 border border-axon-700 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
