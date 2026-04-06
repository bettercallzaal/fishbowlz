'use client';

import { useState, useCallback, useRef } from 'react';

const EMOJIS = ['🔥', '👏', '💯', '❤️', '😂', '🐟'];

interface FloatingReaction {
  id: number;
  emoji: string;
  x: number; // random horizontal position (0-100%)
}

interface ReactionsProps {
  roomId: string;
}

export function Reactions({ roomId }: ReactionsProps) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const counterRef = useRef(0);

  const addReaction = useCallback((emoji: string) => {
    const id = ++counterRef.current;
    const x = 10 + Math.random() * 80; // 10-90% horizontal range
    setReactions((prev) => [...prev, { id, emoji, x }]);

    // Remove after animation completes (2s)
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);

    // Optional: log reaction event (fire-and-forget)
    fetch('/api/fishbowlz/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'reaction',
        eventData: { emoji, roomId },
        roomId,
      }),
    }).catch(() => {});
  }, [roomId]);

  return (
    <>
      {/* Floating reactions container — sits above the sticky bottom bar (h-16 = 64px) */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-4 w-16 h-64 pointer-events-none z-40 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute animate-float-up text-2xl"
            style={{ left: `${r.x}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Reaction buttons */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => addReaction(emoji)}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-90 transition-all text-xl touch-manipulation"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
