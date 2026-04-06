'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const { login, authenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐟</span>
          <span className="text-lg font-bold tracking-tight text-white">FISHBOWLZ</span>
        </div>
        {authenticated ? (
          <Link
            href="/fishbowlz"
            className="bg-[#f5a623] text-[#0a1628] font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#d4941f] transition-colors"
          >
            Enter Rooms
          </Link>
        ) : (
          <button
            onClick={() => login()}
            className="bg-white/10 text-white font-medium px-5 py-2 rounded-full text-sm hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            Sign In
          </button>
        )}
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center max-w-3xl mx-auto w-full">
        <div className="mb-8 relative">
          <div className="w-24 h-24 rounded-full bg-[#f5a623]/10 flex items-center justify-center border border-[#f5a623]/20">
            <span className="text-5xl">🐟</span>
          </div>
          <div className="absolute -inset-4 rounded-full bg-[#f5a623]/5 blur-xl -z-10" />
        </div>

        <h1 className="text-[clamp(2rem,7vw,5rem)] font-bold leading-[0.95] tracking-tight mb-6 text-white">
          Audio rooms that<br />
          <span className="text-[#f5a623]">live forever</span>
        </h1>

        <p className="text-lg text-gray-400 max-w-lg mb-10 leading-relaxed">
          Hot seat rotation. Live transcripts. Persistent archives.
          Conversations that matter don&apos;t disappear when the room ends.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center justify-center">
          {authenticated ? (
            <Link
              href="/fishbowlz"
              className="w-full sm:w-auto text-center bg-[#f5a623] text-[#0a1628] font-bold px-8 py-3.5 rounded-full text-base hover:bg-[#d4941f] transition-all hover:shadow-[0_0_30px_rgba(245,166,35,0.3)] min-h-[44px] flex items-center justify-center touch-manipulation"
            >
              Enter Rooms →
            </Link>
          ) : (
            <button
              onClick={() => login()}
              className="w-full sm:w-auto bg-[#f5a623] text-[#0a1628] font-bold px-8 py-3.5 rounded-full text-base hover:bg-[#d4941f] transition-all hover:shadow-[0_0_30px_rgba(245,166,35,0.3)] min-h-[44px] touch-manipulation"
            >
              Get Started →
            </button>
          )}
          <Link
            href="/fishbowlz"
            className="w-full sm:w-auto text-center border border-white/10 text-gray-300 font-medium px-8 py-3.5 rounded-full text-base hover:bg-white/5 transition-colors min-h-[44px] flex items-center justify-center touch-manipulation"
          >
            Browse Rooms
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {[
          { icon: '🔥', title: 'Hot Seat', desc: 'Speakers rotate in and out. Everyone gets a turn.' },
          { icon: '📝', title: 'Transcribed', desc: 'Every word captured. Search, export, share.' },
          { icon: '♾️', title: 'Persistent', desc: 'Rooms live on. Revisit conversations anytime.' },
        ].map((f) => (
          <div key={f.title} className="text-center">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-white mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 sm:px-6 py-8 text-center">
        <p className="text-xs text-gray-600">
          Built on{' '}
          <a href="https://farcaster.xyz" className="text-gray-500 hover:text-[#f5a623] transition-colors" target="_blank" rel="noopener">
            Farcaster
          </a>
          {' '}·{' '}
          <a href="https://zaoos.com" className="text-gray-500 hover:text-[#f5a623] transition-colors" target="_blank" rel="noopener">
            The ZAO
          </a>
        </p>
      </footer>
    </div>
  );
}
