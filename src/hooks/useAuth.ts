'use client';

import { usePrivy } from '@privy-io/react-auth';

interface FishbowlUser {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  wallet?: string;
  email?: string;
  isAdmin?: boolean;
  authenticated?: boolean;
}

const NO_OP = async () => {};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

function useAuthWithPrivy() {
  const { user, ready, authenticated, login, logout: privyLogout } = usePrivy();

  const fishbowlUser: FishbowlUser | null = (() => {
    if (!user || !authenticated) return null;

    // Try Farcaster first
    const fc = user.farcaster;
    if (fc?.fid) {
      return {
        fid: fc.fid,
        username: fc.username || `fid-${fc.fid}`,
        displayName: fc.displayName ?? fc.username ?? undefined,
        pfpUrl: fc.pfp || undefined,
        wallet: user.wallet?.address,
        email: user.email?.address,
        isAdmin: false,
        authenticated: true,
      };
    }

    // Fallback for wallet/email users (no FID)
    const pseudoFid = Math.abs(hashCode(user.id)) % 1000000000;
    return {
      fid: pseudoFid,
      username:
        user.email?.address?.split('@')[0] ||
        user.wallet?.address?.slice(0, 8) ||
        'anon',
      displayName: user.email?.address?.split('@')[0] || 'Anonymous',
      wallet: user.wallet?.address,
      email: user.email?.address,
      isAdmin: false,
      authenticated: true,
    };
  })();

  const logout = async () => {
    await privyLogout();
    window.location.href = '/';
  };

  return {
    user: fishbowlUser,
    loading: !ready,
    authenticated,
    login,
    logout,
    privyUser: user,
  };
}

function useAuthNoOp() {
  return {
    user: null as FishbowlUser | null,
    loading: false,
    authenticated: false,
    login: NO_OP,
    logout: NO_OP,
    privyUser: null,
  };
}

// When NEXT_PUBLIC_PRIVY_APP_ID is not set (build time SSR), use no-op auth
// At runtime the env var will always be set
export const useAuth = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  ? useAuthWithPrivy
  : useAuthNoOp;
