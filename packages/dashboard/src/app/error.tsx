"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-gray-400 max-w-md text-sm">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded bg-axon-accent hover:bg-indigo-500 text-sm transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
