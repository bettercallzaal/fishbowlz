// Standalone types for FISHBOWLZ — extracted from ZAO OS @/types

export interface SessionData {
  fid: number;
  walletAddress: string | null;
  authMethod: 'farcaster' | 'wallet';
  username: string;
  displayName: string;
  pfpUrl: string;
  signerUuid: string | null;
  isAdmin: boolean;
  authenticated?: boolean;
}
