'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🐟💨</div>
        <h1 className="text-2xl font-bold text-[#f5a623] mb-2">Something went wrong</h1>
        <p className="text-gray-400 mb-6">
          The fishbowl hit a snag. This has been logged and we are looking into it.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-[#f5a623] text-[#0a1628] font-semibold px-6 py-3 rounded-lg hover:bg-[#d4941f] transition-colors"
          >
            Try Again
          </button>
          <a
            href="/fishbowlz"
            className="border border-white/20 px-6 py-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            Browse Rooms
          </a>
        </div>
      </div>
    </div>
  );
}
