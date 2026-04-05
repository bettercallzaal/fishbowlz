import jwt from 'jsonwebtoken';
import { PrivyClient } from '@privy-io/node';

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    privyClient = new PrivyClient({
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      appSecret: process.env.PRIVY_APP_SECRET!,
    });
  }
  return privyClient;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

interface PrivyTokenPayload {
  sub?: string; // privy user id (did:privy:...)
  app_id?: string;
  // linked accounts embedded in identity token
  farcaster?: {
    fid?: number;
    username?: string;
    display_name?: string;
    pfp?: string;
  };
  email?: { address?: string };
  wallet?: { address?: string };
}

/**
 * Verify a Privy identity token (privy-id-token cookie) server-side.
 * The identity token is a JWT that Privy sets as a HttpOnly cookie.
 * We decode it without signature verification here (hackathon mode).
 * For production: use PrivyClient.users().get({ id_token }) with JWKS.
 */
export async function verifyPrivyToken(authHeader: string | null): Promise<{
  fid: number;
  username: string;
  isAdmin: boolean;
} | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  try {
    // Decode without verification to extract user data
    // The token is issued by Privy — in production, verify with JWKS
    const payload = jwt.decode(token) as PrivyTokenPayload | null;
    if (!payload) return null;

    // Verify it's for our app
    if (payload.app_id && payload.app_id !== process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      return null;
    }

    const userId = payload.sub || '';

    const fc = payload.farcaster;
    if (fc?.fid) {
      return {
        fid: fc.fid,
        username: fc.username || `fid-${fc.fid}`,
        isAdmin: false,
      };
    }

    // Fallback: pseudo-FID from user ID
    const pseudoFid = Math.abs(hashCode(userId)) % 1000000000;
    const username =
      payload.email?.address?.split('@')[0] ||
      payload.wallet?.address?.slice(0, 8) ||
      'anon';

    return {
      fid: pseudoFid,
      username,
      isAdmin: false,
    };
  } catch {
    return null;
  }
}

// Export for use in API routes that want to do full JWKS verification
export { getPrivyClient };
