'use client';

import { useEffect } from 'react';
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
      return Promise.resolve(new Response(null, { status: 204, statusText: 'analytics disabled' }));
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

export default function Web3Providers({ children, cookies }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig, cookies);

  // Initialize AppKit only once on client side after mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if AppKit is already initialized
    if (window.__APPKIT_INITIALIZED__) {
      return;
    }

    try {
      createAppKit({
        adapters: [wagmiAdapter],
        projectId: projectId || 'demo',
        networks: [aeneid],
        defaultNetwork: aeneid,
        metadata,
        features: { 
          analytics: false,
          email: false, // Disable email login to avoid conflicts
        },
        themeMode: 'light',
        themeVariables: {
          '--w3m-accent': '#0a0a0a',
          '--w3m-border-radius-master': '8px',
        },
      });
      
      // Mark as initialized
      window.__APPKIT_INITIALIZED__ = true;
      console.log('✅ AppKit initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AppKit:', error);
    }
  }, []);

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
