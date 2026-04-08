import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FISHBOWLZ — Persistent Audio Rooms';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a1628',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 20 }}>🐟</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#f5a623',
            marginBottom: 16,
          }}
        >
          FISHBOWLZ
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#9ca3af',
            maxWidth: 700,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Audio rooms that live forever
        </div>
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginTop: 40,
            color: '#6b7280',
            fontSize: 22,
          }}
        >
          <span>🔥 Hot Seat Rotation</span>
          <span>📝 Live Transcripts</span>
          <span>♾️ Persistent</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
