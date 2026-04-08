import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'FISHBOWLZ — Persistent Audio Rooms',
  description: 'Hot seat audio rooms with live transcripts, chat, and rotation. Built on Farcaster.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'FISHBOWLZ',
    description: 'Persistent audio rooms with hot seat rotation',
    siteName: 'FISHBOWLZ',
    url: 'https://fishbowlz.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FISHBOWLZ — Persistent Audio Rooms',
    description: 'Hot seat audio rooms with live transcripts, chat, and rotation. Built on Farcaster.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a1628] text-white min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
