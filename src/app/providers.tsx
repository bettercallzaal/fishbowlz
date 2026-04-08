'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Skip PrivyProvider if app ID is not configured (e.g., during SSR prerender at build)
  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['farcaster', 'wallet', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#f5a623',
        },
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
