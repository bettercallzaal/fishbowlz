// Minimal community config stub for FISHBOWLZ standalone

export const communityConfig = {
  name: 'FISHBOWLZ',
  adminFids: (process.env.ADMIN_FIDS || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter(Boolean) as number[],
  adminWallets: (process.env.ADMIN_WALLETS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as string[],
};
