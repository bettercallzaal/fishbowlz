import { cache } from 'react';
import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData } from '@/types';
import { ENV } from '@/lib/env';
import { communityConfig } from '@/../community.config';
import { verifyPrivyToken } from './privy-server';

const ADMIN_FIDS: readonly number[] = communityConfig.adminFids;
const ADMIN_WALLETS: readonly string[] = communityConfig.adminWallets;

export interface SessionPayload {
  fid?: number;
  walletAddress?: string;
  authMethod?: 'farcaster' | 'wallet';
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  signerUuid?: string | null;
  isAdmin?: boolean;
}

const sessionOptions = {
  password: ENV.SESSION_SECRET,
  cookieName: 'zaoos_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionPayload>> {
  const cookieStore = await cookies();
  return getIronSession<SessionPayload>(cookieStore, sessionOptions);
}

export const getSessionData = cache(async (): Promise<SessionData | null> => {
  const cookieStore = await cookies();

  // 1. Try Privy identity token cookie (Privy sets 'privy-id-token' automatically)
  const privyTokenCookie = cookieStore.get('privy-id-token');
  if (privyTokenCookie?.value) {
    const privyData = await verifyPrivyToken(`Bearer ${privyTokenCookie.value}`);
    if (privyData) {
      return {
        fid: privyData.fid,
        walletAddress: null,
        authMethod: 'farcaster',
        username: privyData.username,
        displayName: privyData.username,
        pfpUrl: '',
        signerUuid: null,
        isAdmin: ADMIN_FIDS.includes(privyData.fid) || privyData.isAdmin,
        authenticated: true,
      };
    }
  }

  // 2. Fall back to iron-session
  const session = await getSession();
  // Valid session: has either FID or wallet address
  if (!session.fid && !session.walletAddress) return null;
  return {
    fid: session.fid || 0,
    walletAddress: session.walletAddress || null,
    authMethod: session.authMethod || 'farcaster',
    username: session.username || '',
    displayName: session.displayName || '',
    pfpUrl: session.pfpUrl || '',
    signerUuid: session.signerUuid || null,
    isAdmin: session.isAdmin || false,
    authenticated: true,
  };
});

export async function saveSession(data: {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  walletAddress?: string;
  authMethod?: 'farcaster' | 'wallet';
  signerUuid?: string | null;
}) {
  const session = await getSession();
  session.fid = data.fid;
  session.walletAddress = data.walletAddress || undefined;
  session.authMethod = data.authMethod || 'farcaster';
  session.username = data.username;
  session.displayName = data.displayName;
  session.pfpUrl = data.pfpUrl;
  session.signerUuid = data.signerUuid || null;
  session.isAdmin = ADMIN_FIDS.includes(data.fid) ||
    (data.walletAddress ? ADMIN_WALLETS.includes(data.walletAddress.toLowerCase()) : false);
  await session.save();
}

export async function saveWalletSession(data: {
  walletAddress: string;
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}) {
  const session = await getSession();
  session.walletAddress = data.walletAddress.toLowerCase();
  session.authMethod = 'wallet';
  session.fid = data.fid || 0;
  session.username = data.username || '';
  session.displayName = data.displayName || data.walletAddress.slice(0, 6) + '...' + data.walletAddress.slice(-4);
  session.pfpUrl = data.pfpUrl || '';
  session.signerUuid = null;
  session.isAdmin = (data.fid ? ADMIN_FIDS.includes(data.fid) : false) ||
    ADMIN_WALLETS.includes(data.walletAddress.toLowerCase());
  await session.save();
}

export async function clearSession() {
  const session = await getSession();
  session.destroy();
}

export function isAdmin(fid: number): boolean {
  return ADMIN_FIDS.includes(fid);
}
