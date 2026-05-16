export default function SkeletonCard() {
  return (
    <div className="bg-axon-800 border border-axon-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-axon-700 rounded" />
        <div className="h-5 w-16 bg-axon-700 rounded-full" />
      </div>
      <div className="h-3 w-24 bg-axon-700 rounded mt-3" />
      <div className="h-8 w-full bg-axon-700 rounded mt-3" />
    </div>
  );
}
