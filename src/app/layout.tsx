import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { IssueReporter } from '@/components/feedback/IssueReporter';

export const metadata: Metadata = {
  title: 'FISHBOWLZ — Persistent Audio Rooms',
  description: 'Hot seat audio rooms with live transcripts, chat, and rotation. Built on Farcaster.',
  openGraph: {
    title: 'FISHBOWLZ',
    description: 'Persistent audio rooms with hot seat rotation',
    siteName: 'FISHBOWLZ',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a1628] text-white min-h-screen antialiased">
        <Providers>
          {children}
          <IssueReporter />
        </Providers>
      </body>
    </html>
  );
}
