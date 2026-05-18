type SpendEvent = {
  date: string;
  recipient: string;
  amount: string;
  memo: string;
  txHash: string;
};

export default function SpendHistoryTable({ events }: { events: SpendEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No spends yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-axon-700">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Recipient</th>
            <th className="pb-2 pr-4">Amount</th>
            <th className="pb-2 pr-4">Memo</th>
            <th className="pb-2">Tx Hash</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-b border-axon-700/50 hover:bg-axon-700/20">
              <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{e.date}</td>
              <td className="py-2 pr-4 font-mono text-xs text-gray-300">
                {e.recipient.slice(0, 6)}…{e.recipient.slice(-4)}
              </td>
              <td className="py-2 pr-4 text-gray-300">{e.amount} XLM</td>
              <td className="py-2 pr-4 text-gray-400">{e.memo}</td>
              <td className="py-2">
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${e.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-axon-accent hover:underline"
                >
                  {e.txHash.slice(0, 8)}…
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
