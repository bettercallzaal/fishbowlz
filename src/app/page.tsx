'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const { login, authenticated } = useAuth();
  const primaryCta = authenticated ? (
    <Link
      href="/fishbowlz"
      className="w-full sm:w-auto text-center bg-gold text-navy font-bold px-8 py-3.5 rounded-full text-base hover:bg-[#d4941f] transition-all hover:shadow-[0_0_36px_rgba(245,166,35,0.35)] min-h-[44px] flex items-center justify-center touch-manipulation"
    >
      Enter Rooms
    </Link>
  ) : (
    <button
      onClick={() => login()}
      className="w-full sm:w-auto bg-gold text-navy font-bold px-8 py-3.5 rounded-full text-base hover:bg-[#d4941f] transition-all hover:shadow-[0_0_36px_rgba(245,166,35,0.35)] min-h-[44px] touch-manipulation"
    >
      Start with Fishbowlz
    </button>
  );

  return (
    <div className="min-h-screen bg-[#070f1e] text-white overflow-x-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full bg-gold/10 blur-[120px]" />
        <div className="absolute top-[28%] -right-24 w-[420px] h-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>🐟</span>
          <span className="text-lg font-bold tracking-tight text-white">FISHBOWLZ</span>
        </div>
        {authenticated ? (
          <Link
            href="/fishbowlz"
            className="bg-gold text-navy font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#d4941f] transition-colors"
          >
            Open Platform
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <section className="pt-8 sm:pt-14 pb-10">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-7 items-stretch">
            <div className="rounded-3xl border border-white/10 bg-linear-to-b from-white/8 to-white/2 p-6 sm:p-8 backdrop-blur">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold mb-5">
                Persistent Audio Rooms
              </p>
              <h1 className="text-[clamp(2rem,7vw,4.8rem)] font-bold leading-[0.95] tracking-tight mb-5">
                Your room ends.
                <br />
                <span className="text-gold">The conversation doesn&apos;t.</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-300 max-w-xl leading-relaxed mb-8">
                Fishbowlz is an audio-first community meeting platform where every room becomes searchable memory:
                live discussion, catch-up intelligence, replay, transcript exports, and linked media playback.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {primaryCta}
                <Link
                  href="/fishbowlz"
                  className="w-full sm:w-auto text-center border border-white/15 text-gray-200 font-medium px-8 py-3.5 rounded-full text-base hover:bg-white/5 transition-colors min-h-[44px] flex items-center justify-center touch-manipulation"
                >
                  Browse Live + Archives
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-7 text-center">
                {[
                  { label: 'Live Rooms', value: 'Real-time audio' },
                  { label: 'AI Memory', value: 'Catch-up instantly' },
                  { label: 'Replay', value: 'Persistent archive' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{item.label}</p>
                    <p className="text-sm text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-linear-to-b from-[#13213a] to-navy p-5 sm:p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Join Late Mode</p>
              <div className="rounded-2xl bg-[#0b1324] border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">What You Missed</p>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-gold/15 text-gold">Live</span>
                </div>
                <p className="text-sm text-gray-300 mb-3">12-minute catch-up generated while room is live.</p>
                <div className="space-y-2">
                  {[
                    'Summary: host aligned on launch timeline and budget.',
                    'Decisions: ship v1 replay this sprint; archive in public mode.',
                    'Action items: @ava drafts release checklist by Friday.',
                    'Key moment: audience vote flipped room mode to Meeting.',
                  ].map((line) => (
                    <div key={line} className="text-xs text-gray-300 rounded-xl bg-white/3 border border-white/10 px-3 py-2">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {[
                  'Bot listening',
                  'Transcript live',
                  'Summary processing',
                  'Archive ready',
                ].map((s, i) => (
                  <div key={s} className="rounded-xl border border-white/10 bg-white/2 px-3 py-2 text-xs text-gray-300">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${i === 3 ? 'bg-emerald-400' : 'bg-gold'}`} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-6 sm:py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              {
                title: 'Live Rooms',
                copy: 'Host discussion, meeting, classroom, concert, radio, or listening party modes.',
              },
              {
                title: 'Agent Memory',
                copy: 'AI catches you up with short summary, full summary, decisions, action items, and moments.',
              },
              {
                title: 'Replayable Sessions',
                copy: 'Revisit rooms with chaptered replay, transcript sync, and timeline jump points.',
              },
              {
                title: 'Downloadable Transcripts',
                copy: 'Switch transcript modes and export in TXT, PDF-ready view, or JSON-ready structure.',
              },
              {
                title: 'Linked Audio Playback',
                copy: 'Load external audio links for concerts, streaming shows, and curated listening rooms.',
              },
              {
                title: 'Searchable Archive',
                copy: 'Search by room, speaker, date, keywords, and content type with a missed-feed digest.',
              },
            ].map((card) => (
              <article key={card.title} className="rounded-2xl border border-white/10 bg-white/3 p-5 hover:border-gold/40 transition-colors">
                <h3 className="text-base font-semibold mb-2">{card.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{card.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-linear-to-r from-[#0f1e35] to-navy p-6 sm:p-8">
          <p className="text-xs tracking-[0.18em] uppercase text-gray-500 mb-3">Built For Persistent Community Audio</p>
          <h2 className="text-2xl sm:text-3xl font-semibold max-w-2xl mb-4">
            Fishbowlz turns every session into memory your team can return to.
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            {primaryCta}
            <Link
              href="/fishbowlz"
              className="w-full sm:w-auto text-center border border-white/15 text-gray-200 font-medium px-6 py-3 rounded-full hover:bg-white/5 transition-colors"
            >
              See Room Modes
            </Link>
          </div>
        </section>

        <footer className="border-t border-white/5 mt-12 px-1 py-7 text-center">
          <p className="text-xs text-gray-600">
            Built on{' '}
            <a href="https://farcaster.xyz" className="text-gray-500 hover:text-gold transition-colors" target="_blank" rel="noopener">
              Farcaster
            </a>
            {' '}·{' '}
            <a href="https://zaoos.com" className="text-gray-500 hover:text-gold transition-colors" target="_blank" rel="noopener">
              The ZAO
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
