'use client';

import { wagmiAdapter, projectId } from '@/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { aeneid } from '@story-protocol/core-sdk';
import { cookieToInitialState, WagmiProvider } from 'wagmi';
import { Toaster } from 'react-hot-toast';

// Hard-disable Coinbase analytics calls that cause noisy "Failed to fetch" errors.
if (typeof window !== 'undefined' && !window.__APPKIT_ANALYTICS_DISABLED__) {
  window.__APPKIT_ANALYTICS_DISABLED__ = true;
  const blockedHosts = ['cca-lite.coinbase.com', 'cca.coinbase.com'];
  const originalFetch = window.fetch.bind(window);
  window.fetch = (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && blockedHosts.some((host) => url.includes(host))) {
      return Promise.resolve(new Response('', { status: 204, statusText: 'analytics disabled' }));
    }
    return originalFetch(...args);
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const metadata = {
  name: 'DippChain',
  description: 'Creative rights protection on Story Protocol',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://dippchain.com',
  icons: ['/icon.png'],
};

// Initialize AppKit
createAppKit({
  adapters: [wagmiAdapter],
  projectId: projectId || 'demo',
  networks: [aeneid],
  defaultNetwork: aeneid,
  metadata,
  features: { analytics: false },
});

export default function Web3Providers({ children, cookies }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig, cookies);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#111',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
