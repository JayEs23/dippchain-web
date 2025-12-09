'use client';

import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Story Aeneid Testnet
const storyAeneid = {
  id: 1315,
  name: 'Story Aeneid Testnet',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://aeneid.storyrpc.io'] },
  },
  blockExplorers: {
    default: { name: 'StoryScan', url: 'https://aeneid.storyscan.io' },
  },
  testnet: true,
};

// Reown project ID - get yours at https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'demo';

// App metadata
const metadata = {
  name: 'DippChain',
  description: 'Creative rights protection on Story Protocol',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://dippchain.com',
  icons: ['/favicon.ico'],
};

// Initialize AppKit on client side only
if (typeof window !== 'undefined') {
  createAppKit({
    adapters: [new EthersAdapter()],
    networks: [storyAeneid],
    projectId,
    metadata,
    features: {
      analytics: false,
    },
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function Web3Providers({ children }) {
  return (
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
  );
}
