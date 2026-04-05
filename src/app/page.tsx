import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6">
          <span className="text-6xl">🐟</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 tracking-tight">
          FISHBOWL<span className="text-[#f5a623]">Z</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-lg mb-8 leading-relaxed">
          Persistent audio rooms with hot seat rotation.
          Talk, transcribe, and archive — conversations that live beyond the session.
        </p>
        <div className="flex gap-4">
          <Link
            href="/fishbowlz"
            className="bg-[#f5a623] text-[#0a1628] font-bold px-8 py-3 rounded-xl text-lg hover:bg-[#d4941f] transition-colors"
          >
            Enter Rooms
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-12">
          {[
            '🔥 Hot Seat Rotation',
            '📝 Live Transcripts',
            '💬 Room Chat',
            '⏰ Scheduled Rooms',
            '✋ Hand Raise Queue',
            '🤖 AI Summaries',
          ].map((feature) => (
            <span
              key={feature}
              className="text-sm px-4 py-2 rounded-full bg-white/5 text-gray-300 border border-white/10"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 text-center">
        <p className="text-sm text-gray-500">
          Built on{' '}
          <a href="https://farcaster.xyz" className="text-[#f5a623] hover:underline" target="_blank" rel="noopener">
            Farcaster
          </a>
          {' '}by{' '}
          <a href="https://zaoos.com" className="text-[#f5a623] hover:underline" target="_blank" rel="noopener">
            The ZAO
          </a>
        </p>
      </footer>
    </div>
  );
}
