import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const dynamicSettings = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '',
  walletConnectors: [EthereumWalletConnectors],
  eventsCallbacks: {
    onAuthSuccess: (args) => {
      console.log('Auth success:', args);
    },
    onLogout: () => {
      console.log('User logged out');
    },
  },
  settings: {
    initialAuthenticationMode: 'connect-and-sign',
    environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '',
  },
};

export default function Web3Providers({ children }) {
  return (
    <DynamicContextProvider settings={dynamicSettings}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: 'var(--success)',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--error)',
                secondary: 'white',
              },
            },
          }}
        />
      </QueryClientProvider>
    </DynamicContextProvider>
  );
}
