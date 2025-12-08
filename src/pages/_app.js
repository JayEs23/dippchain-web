import '@/styles/globals.css';
import Web3Providers from '@/components/Web3Providers';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => page);

  return (
    <>
      <Head>
        <title>DippChain - Protect & Monetize Your Creative Work</title>
        <meta name="description" content="DippChain is a comprehensive creative rights, protection, and monetization ecosystem for digital creators." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />
      </Head>
      
      <Web3Providers>
        {getLayout(<Component {...pageProps} />)}
      </Web3Providers>
    </>
  );
}
