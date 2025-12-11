import '@/styles/globals.css';
import Web3Providers from '@/components/Web3Providers';
import AuthGuard from '@/components/AuthGuard';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => page);

  return (
    <>
      <Head>
        <title>DippChain - Protect & Monetize Your Creative Work</title>
        <meta name="description" content="DippChain is a comprehensive creative rights, protection, and monetization ecosystem for digital creators on Story Protocol." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Web3Providers cookies={pageProps.cookies}>
        <AuthGuard>
          {getLayout(<Component {...pageProps} />)}
        </AuthGuard>
      </Web3Providers>
    </>
  );
}
