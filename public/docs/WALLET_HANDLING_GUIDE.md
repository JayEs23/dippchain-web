# 🔐 DippChain Wallet Handling Guide

Complete overview of wallet connection, provider setup, and Story Protocol client initialization.

---

## 📋 Table of Contents

1. [Wallet Provider Setup](#1-wallet-provider-setup)
2. [Wallet Hooks & Context](#2-wallet-hooks--context)
3. [Story Protocol Client Initialization](#3-story-protocol-client-initialization)
4. [User Sync Flow](#4-user-sync-flow)
5. [Usage Examples](#5-usage-examples)

---

## 1. Wallet Provider Setup

### 1.1 Web3Providers Component

**File:** `src/components/Web3Providers.jsx`

This is the root provider that wraps your entire app and initializes wallet connectivity.

```javascript
'use client';

import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { aeneid } from '@story-protocol/core-sdk'; // ✅ Use SDK's built-in chain config

// Reown (WalletConnect) Project ID
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'demo';

// App metadata
const metadata = {
  name: 'DippChain',
  description: 'Creative rights protection on Story Protocol',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://dippchain.com',
  icons: ['/favicon.ico'],
};

// ✅ Use WagmiAdapter with Story Protocol's built-in aeneid chain config
const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks: [aeneid], // Use SDK's built-in chain config (not manual definition)
});

// Initialize AppKit on client side only
if (typeof window !== 'undefined') {
  createAppKit({
    adapters: [wagmiAdapter],  // ✅ Uses WagmiAdapter (recommended by Story Protocol)
    projectId,                 // Reown Project ID
    metadata,                  // App metadata
    features: {
      analytics: false,
    },
  });
}
```

**Key Points:**
- Uses **Reown AppKit** (formerly WalletConnect)
- **WagmiAdapter** for Wagmi integration (✅ Recommended by Story Protocol)
- Uses **Story SDK's built-in `aeneid` chain config** (not manual definition)
- Initialized only on client-side (browser)
- SSR support enabled for Next.js

### 1.2 App Integration

**File:** `src/pages/_app.js`

```javascript
import Web3Providers from '@/components/Web3Providers';

export default function App({ Component, pageProps }) {
  return (
    <Web3Providers>
      <Component {...pageProps} />
    </Web3Providers>
  );
}
```

**Flow:**
1. `_app.js` wraps all pages with `Web3Providers`
2. `Web3Providers` initializes Reown AppKit
3. Provides React Query client for data fetching
4. Includes toast notifications

---

## 2. Wallet Hooks & Context

### 2.1 useAppKitAccount Hook

**Package:** `@reown/appkit/react`

This is the primary hook for accessing wallet connection state.

```javascript
import { useAppKitAccount } from '@reown/appkit/react';

function MyComponent() {
  const { address, isConnected } = useAppKitAccount();
  
  // address: string | undefined - Connected wallet address
  // isConnected: boolean - Connection status
}
```

**Used in:**
- `src/pages/dashboard/fractions/create.js`
- `src/pages/dashboard/upload.js`
- `src/pages/dashboard/marketplace/index.js`
- `src/pages/dashboard/assets/index.js`
- And many other dashboard pages

### 2.2 useWalletClient Hook (Wagmi)

**Package:** `wagmi`

Gets the wallet client for Story Protocol SDK integration.

```javascript
import { useWalletClient } from 'wagmi';

function MyComponent() {
  const { data: walletClient } = useWalletClient();
  
  // Use walletClient directly with Story Protocol SDK
  if (walletClient) {
    const storyClient = await createStoryClientBrowser(walletClient);
  }
}
```

**Note:** For Ethers.js interactions, you can still use `useAppKitProvider` if needed, but Story Protocol operations should use `useWalletClient` from Wagmi.

### 2.3 useUserSync Hook

**File:** `src/hooks/useUserSync.js`

Custom hook that syncs wallet connection with database user.

```javascript
import { useUserSync } from '@/hooks/useUserSync';

function MyComponent() {
  const { 
    user,           // Database user object
    loading,       // Sync loading state
    error,          // Sync error
    syncUser,       // Manual sync function
    isConnected,    // Wallet connection status
    walletAddress   // Connected wallet address
  } = useUserSync();
}
```

**What it does:**
1. Watches wallet connection via `useAppKitAccount`
2. Automatically calls `/api/users/connect` when wallet connects
3. Creates or fetches user from database
4. Caches user in localStorage
5. Clears cache when wallet disconnects

**Flow:**
```
Wallet Connects
    ↓
useAppKitAccount detects connection
    ↓
useUserSync calls syncUser(address)
    ↓
POST /api/users/connect
    ↓
Database: Find or create user by walletAddress
    ↓
Store user in localStorage
    ↓
Component receives user object
```

---

## 3. Story Protocol Client Initialization

### 3.1 Browser Client (User Wallet)

**File:** `src/lib/storyProtocolClient.js`

```javascript
import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { custom } from 'viem';

/**
 * Create Story Protocol client for browser (using wallet provider)
 * 
 * ✅ CORRECTED: Uses proper Story SDK config structure
 * 
 * @param {Object} walletClient - Viem wallet client from Wagmi (via useWalletClient)
 * @returns {Promise<StoryClient>} Story Protocol client instance
 */
export const createStoryClientBrowser = async (walletClient) => {
  if (!walletClient) {
    throw new Error('Wallet client is required');
  }

  // ✅ Correct Story SDK config structure (per official docs)
  const config = {
    wallet: walletClient,                    // Pass wallet client directly
    transport: custom(walletClient.transport), // Use custom() with wallet's transport
    chainId: 'aeneid',                        // Story Aeneid Testnet
  };

  const client = StoryClient.newClient(config);
  return client;
};
```

**Usage Pattern:**
```javascript
import { useWalletClient } from 'wagmi';
import { createStoryClientBrowser } from '@/lib/storyProtocolClient';

function MyComponent() {
  // 1. Get wallet client from Wagmi
  const { data: walletClient } = useWalletClient();
  
  // 2. Create Story Protocol client
  if (walletClient) {
    const storyClient = await createStoryClientBrowser(walletClient);
    
    // 3. Use client for transactions
    const result = await storyClient.ipAsset.registerIpAsset({...});
  }
}
```

**⚠️ Note:** This function is **defined but not currently used** in the codebase. All Story Protocol operations are done server-side. However, it's now correctly configured for future use.

### 3.2 Server Client (Platform Wallet)

**File:** `src/lib/storyProtocolClient.js`

```javascript
import { StoryClient } from '@story-protocol/core-sdk';
import { http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Create Story Protocol client for server (using private key)
 * 
 * Uses platform's server wallet for all Story Protocol operations
 * 
 * @returns {Promise<StoryClient>} Story Protocol client instance
 */
export const createStoryClientServer = async () => {
  // 1. Load private key from environment
  if (!process.env.WALLET_PRIVATE_KEY) {
    throw new Error('WALLET_PRIVATE_KEY not set in environment variables');
  }

  // 2. Clean and validate private key
  let privateKey = process.env.WALLET_PRIVATE_KEY
    .trim()
    .replace(/['"]/g, '')  // Remove quotes
    .replace(/\s/g, '');   // Remove whitespace

  // 3. Ensure 0x prefix
  if (!privateKey.startsWith('0x')) {
    privateKey = `0x${privateKey}`;
  }

  // 4. Validate format (66 chars with 0x prefix)
  if (privateKey.length !== 66) {
    throw new Error(`Invalid private key length: ${privateKey.length}`);
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error('Invalid private key format');
  }

  // 5. Create Viem account
  const account = privateKeyToAccount(privateKey);
  console.log('Account address:', account.address);

  // 6. Create Story Protocol client
  const rpcUrl = process.env.RPC_PROVIDER_URL || 'https://aeneid.storyrpc.io';
  
  // ✅ Correct Story SDK config structure for server
  // For server-side, we create a wallet-like object with account and transport
  const wallet = {
    account,
    transport: http(rpcUrl),
  };
  
  const config = {
    wallet,                                    // Pass wallet object
    transport: custom(wallet.transport),       // Use custom() with wallet's transport
    chainId: 'aeneid',                        // Story Aeneid Testnet
  };

  const client = StoryClient.newClient(config);
  return client;
};
```

**Used in:**
- `src/pages/api/assets/register-ip.js` - IP asset registration
- `src/pages/api/assets/register-ip-modern.js` - Modern SPG registration
- `src/pages/api/story/initialize-vault.js` - Vault initialization
- `src/pages/api/fractions/vault.js` - Vault info fetching
- `src/pages/api/fractions/transfer.js` - Token transfers

**Key Points:**
- Uses **server wallet** (platform-controlled)
- Private key stored in `WALLET_PRIVATE_KEY` environment variable
- All Story Protocol operations are **server-side only**
- Server wallet owns the IP Accounts created via SPG

---

## 4. User Sync Flow

### 4.1 User Connect API

**File:** `src/pages/api/users/connect.js`

```javascript
export default async function handler(req, res) {
  const { walletAddress, email, displayName } = req.body;

  // Normalize address to lowercase
  const normalizedAddress = walletAddress.toLowerCase();

  // Find or create user
  let user = await prisma.user.findFirst({
    where: { walletAddress: normalizedAddress },
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: email || `${normalizedAddress}@wallet.local`,
        walletAddress: normalizedAddress,
        displayName: displayName || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      },
    });
  }

  return res.json({ success: true, user });
}
```

**Flow:**
1. User connects wallet via Reown AppKit
2. Frontend calls `/api/users/connect` with wallet address
3. Backend finds or creates user in database
4. Returns user object
5. Frontend stores user in localStorage

### 4.2 Complete User Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CONNECTS WALLET                                      │
│    User clicks "Connect Wallet" in UI                       │
│    Reown AppKit modal opens                                  │
│    User selects wallet (MetaMask, WalletConnect, etc.)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. REOWN APPKIT INITIALIZES                                  │
│    createAppKit() called in Web3Providers                   │
│    Wallet connection established                             │
│    useAppKitAccount() returns { address, isConnected }       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. useUserSync HOOK DETECTS CONNECTION                       │
│    useEffect watches isConnected and address                 │
│    Calls syncUser(address) automatically                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. API CALL: POST /api/users/connect                         │
│    Body: { walletAddress: "0x..." }                         │
│    Backend normalizes address to lowercase                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. DATABASE OPERATION                                         │
│    Find user by walletAddress                                │
│    If not found: Create new user                            │
│    If found: Return existing user                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RESPONSE & CACHING                                         │
│    API returns { success: true, user: {...} }               │
│    Frontend stores user in localStorage                      │
│    useUserSync hook updates state                            │
│    Components can now access user data                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Usage Examples

### 5.1 Basic Wallet Connection

```javascript
import { useAppKitAccount } from '@reown/appkit/react';

function MyComponent() {
  const { address, isConnected } = useAppKitAccount();

  if (!isConnected) {
    return <button>Connect Wallet</button>;
  }

  return <div>Connected: {address}</div>;
}
```

### 5.2 User Sync with Database

```javascript
import { useUserSync } from '@/hooks/useUserSync';

function MyComponent() {
  const { user, loading, error, walletAddress } = useUserSync();

  if (loading) return <div>Loading user...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>Please connect wallet</div>;

  return (
    <div>
      <h1>Welcome, {user.displayName}</h1>
      <p>Wallet: {walletAddress}</p>
    </div>
  );
}
```

### 5.3 Story Protocol Client (Browser)

```javascript
import { useWalletClient } from 'wagmi';
import { createStoryClientBrowser } from '@/lib/storyProtocolClient';

function MyComponent() {
  const { data: walletClient } = useWalletClient();

  const handleRegisterIP = async () => {
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }

    // Create Story Protocol client
    const storyClient = await createStoryClientBrowser(walletClient);

    // Register IP Asset
    const result = await storyClient.ipAsset.registerIpAsset({
      nft: { type: 'mint', spgNftContract: '0x...' },
      ipMetadata: { ipMetadataURI: 'https://...', ipMetadataHash: '0x...' },
    });

    console.log('IP registered:', result.ipId);
  };
}
```

### 5.4 Direct Contract Interactions (Ethers.js - Legacy)

```javascript
// Note: For Story Protocol, use useWalletClient instead
// This is only for direct Ethers.js contract interactions if needed

import { useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider, Contract } from 'ethers';

function MyComponent() {
  const { walletProvider } = useAppKitProvider('eip155');

  const handleTransfer = async () => {
    // Convert to Ethers provider
    const provider = new BrowserProvider(walletProvider);
    const signer = await provider.getSigner();

    // Interact with contract
    const contract = new Contract(contractAddress, abi, signer);
    const tx = await contract.transfer(recipient, amount);
    await tx.wait();
  };
}
```

### 5.4 Story Protocol Server-Side Operation

```javascript
// API Route: src/pages/api/assets/register-ip.js
import { createStoryClientServer, registerIPWithSPG } from '@/lib/storyProtocolClient';

export default async function handler(req, res) {
  // Create server-side Story Protocol client
  const client = await createStoryClientServer();

  // Register IP Asset (uses server wallet)
  const result = await registerIPWithSPG(client, {
    ipMetadataURI: 'https://...',
    ipMetadataHash: '0x...',
    licenseType: 'COMMERCIAL_USE',
  });

  return res.json({ success: true, ipId: result.ipId });
}
```

### 5.5 Token Transfers (Primary Market)

```javascript
// Frontend: src/pages/dashboard/marketplace/index.js
import { useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider } from 'ethers';
import { transferRoyaltyTokensFromIPAccount, tokensToWei } from '@/lib/storyRoyaltyTokens';

function MarketplacePage() {
  const { walletProvider } = useAppKitProvider('eip155');

  const handleBuyPrimary = async (listing) => {
    // Get Ethers signer
    const provider = new BrowserProvider(walletProvider);
    const signer = await provider.getSigner();

    // Transfer tokens from IP Account to buyer
    const amountWei = tokensToWei(amount);
    const result = await transferRoyaltyTokensFromIPAccount(
      signer,
      ipId,              // IP Account address
      tokenAddress,      // Royalty Token address
      buyerAddress,      // Buyer's wallet
      amountWei         // Amount in wei (6 decimals)
    );

    console.log('Transfer complete:', result.txHash);
  };
}
```

---

## 🔑 Environment Variables

Required environment variables for wallet functionality:

```bash
# Reown (WalletConnect) Project ID
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id_here

# Server wallet private key (for Story Protocol operations)
WALLET_PRIVATE_KEY=0x...

# Optional: Custom RPC URL
RPC_PROVIDER_URL=https://aeneid.storyrpc.io
```

## 📦 Required Dependencies

After the fixes, ensure these packages are installed:

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi @wagmi/core @story-protocol/core-sdk viem
```

**Key Changes:**
- ✅ Added `@reown/appkit-adapter-wagmi` (replaces EthersAdapter for Story Protocol)
- ✅ Added `wagmi` and `@wagmi/core` (required for WagmiAdapter)
- ✅ Using Story SDK's built-in `aeneid` chain config

---

## 📝 Key Architecture Decisions

### Why Server-Side Story Protocol Operations?

1. **IP Account Ownership**: SPG mints NFTs to a server-controlled wallet
2. **Gas Costs**: Platform pays for registration transactions
3. **Security**: Private keys never exposed to frontend
4. **Consistency**: All IP assets registered with same wallet

### Story SDK Config Structure

**✅ Correct (per Story Protocol docs):**
```javascript
const config = {
  wallet: walletClient,                    // Pass wallet client directly
  transport: custom(walletClient.transport), // Use custom() with wallet's transport
  chainId: 'aeneid',
};
```

**❌ Incorrect (old implementation):**
```javascript
const config = {
  account: walletClient.account,           // Wrong: should be 'wallet'
  transport: http('https://...'),          // Wrong: should use custom() with wallet's transport
  chainId: 'aeneid',
};
```

### Why Reown AppKit + Wagmi?

1. **Multi-Wallet Support**: MetaMask, WalletConnect, Coinbase Wallet, etc.
2. **Wagmi Integration**: Recommended by Story Protocol for SDK compatibility
3. **Modern UX**: Built-in connection modal
4. **Chain Management**: Automatic network switching
5. **Story SDK Compatibility**: Proper wallet client structure for Story Protocol

### Why Two Client Types?

1. **Browser Client** (`createStoryClientBrowser`): For user-initiated transactions (currently unused)
2. **Server Client** (`createStoryClientServer`): For platform operations (IP registration, vault management)

---

## 🚨 Important Notes

1. **Server Wallet Security**: The `WALLET_PRIVATE_KEY` must be kept secure and never exposed to frontend
2. **IP Account Ownership**: All IP Accounts created via SPG are owned by the server wallet
3. **User Wallet**: Users connect their wallets for:
   - Viewing their assets
   - Purchasing fractions
   - Secondary market trading
   - But NOT for IP registration (done server-side)
4. **Browser Client**: `createStoryClientBrowser` exists but is not currently used in the codebase

---

## 🔄 Current Flow Summary

```
User Wallet (Frontend)
    ↓
Reown AppKit Connection
    ↓
useAppKitAccount / useAppKitProvider
    ↓
User Sync → Database
    ↓
UI Interactions (view, purchase, trade)
    ↓
API Calls → Backend
    ↓
Server Wallet (Backend)
    ↓
Story Protocol Operations (register, vault, transfer)
```

---

This guide covers all wallet handling in DippChain. For specific implementation details, refer to the source files mentioned above.

