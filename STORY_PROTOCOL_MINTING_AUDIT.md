# 🔐 Story Protocol SPG Minting - Code Audit

## Complete Flow Analysis

---

## 1. Frontend Trigger

**File:** `src/pages/dashboard/upload.js` (Line ~789-805)

```javascript
const registerOnStoryProtocolSPG = async (assetId) => {
  // ✅ Validate asset ID
  if (!assetId) {
    toast.error('Asset ID not available. Cannot register on Story Protocol.');
    return;
  }

  // ✅ Call backend API - SPG handles everything
  // Backend fetches all metadata from database
  const payload = {
    assetId: assetId,
    licenseType: 'COMMERCIAL_USE',
    // No need to pass metadata - backend fetches from database
  };

  const response = await fetch('/api/assets/register-ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  // Handle response...
};
```

**Trigger:** Automatically called 500ms after asset is saved to database (if Story Protocol checkbox is checked)

---

## 2. Backend API Handler

**File:** `src/pages/api/assets/register-ip.js`

### 2.1 Asset Validation (Lines 32-54)

```javascript
// Get asset from database
let asset;

if (assetId) {
  // Fetch by ID
  asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });
}

if (!asset) {
  return res.status(404).json({ 
    error: 'Asset not found',
    details: `No asset found with ID: ${assetId}`,
  });
}
```

### 2.2 Story Protocol Client Creation (Line 56)

```javascript
// Create Story Protocol client
const client = await createStoryClientServer();
```

**What this does:**
- Loads server wallet private key from `process.env.WALLET_PRIVATE_KEY`
- Creates Viem account from private key
- Initializes Story Protocol SDK client
- Connects to Story Aeneid RPC: `https://aeneid.storyrpc.io`

### 2.3 Metadata Preparation (Lines 71-107)

```javascript
// ✅ Ensure we have all required metadata from the database asset
const finalIpMetadataURI = ipMetadataURI || asset.pinataUrl || asset.thumbnailUrl;
const finalNftMetadataURI = nftMetadataURI || asset.pinataUrl || asset.thumbnailUrl;

// ✅ CRITICAL: Ensure content hash exists and is properly formatted
let finalIpMetadataHash = ipMetadataHash;
let finalNftMetadataHash = nftMetadataHash;

if (!finalIpMetadataHash && asset.contentHash) {
  finalIpMetadataHash = asset.contentHash.startsWith('0x') 
    ? asset.contentHash 
    : `0x${asset.contentHash}`;
}

if (!finalNftMetadataHash && asset.contentHash) {
  finalNftMetadataHash = asset.contentHash.startsWith('0x') 
    ? asset.contentHash 
    : `0x${asset.contentHash}`;
}

// ✅ Validate required fields
if (!finalIpMetadataURI) {
  return res.status(400).json({
    error: 'Missing IP metadata URI',
    details: 'Asset must have pinataUrl or thumbnailUrl',
  });
}

if (!finalIpMetadataHash) {
  return res.status(400).json({
    error: 'Missing IP metadata hash',
    details: 'Asset must have contentHash',
  });
}
```

**Security Checks:**
- ✅ Validates metadata URI exists
- ✅ Validates content hash exists
- ✅ Ensures proper `0x` prefix on hashes
- ✅ Returns clear error if data is missing

### 2.4 SPG Registration Call (Lines 109-117)

```javascript
const registerResult = await registerIPWithSPG(client, {
  ipMetadataURI: finalIpMetadataURI,
  ipMetadataHash: finalIpMetadataHash,
  nftMetadataURI: finalNftMetadataURI,
  nftMetadataHash: finalNftMetadataHash,
  licenseType: licenseType || 'COMMERCIAL_USE',
  commercialRevShare: 5, // 5% royalty
  defaultMintingFee: '10000000000000000000', // 10 WIP
});
```

---

## 3. Story Protocol Client Setup

**File:** `src/lib/storyProtocolClient.js`

### 3.1 Contract Addresses (Lines 9-18)

```javascript
export const STORY_CONTRACTS = {
  // Core contracts on Story Aeneid Testnet
  SPG: '0x69415CE984A79a3Cfbcf86376be5Dd7Ec6f8F9d0',
  SPG_NFT: '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc', // ← NFT minting contract
  IP_ASSET_REGISTRY: '0x77319B4031e6eF1250907aa00018B8B1c67a244b',
  LICENSING_MODULE: '0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f',
  PIL_TEMPLATE: '0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316',
  ROYALTY_POLICY: '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E',
  CURRENCY_TOKEN: '0x1514000000000000000000000000000000000000', // $WIP
};
```

**Verification:**
- These are official Story Protocol contracts on Aeneid testnet
- SPG_NFT is the public SPG NFT contract: `0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc`
- Can be verified on: https://aeneid.storyscan.io

### 3.2 License Configuration (Lines 28-36)

```javascript
export const LICENSE_CONFIGS = {
  COMMERCIAL_USE: {
    transferable: true,
    royaltyPolicy: STORY_CONTRACTS.ROYALTY_POLICY,
    defaultMintingFee: '10000000000000000000', // 10 $WIP
    commercialUse: true,
    commercialRevShare: 5, // 5% royalty share
    derivativesAllowed: true,
    currency: STORY_CONTRACTS.CURRENCY_TOKEN,
  },
  // ... other license types
};
```

**License Terms:**
- ✅ Commercial use: **Enabled**
- ✅ Royalty share: **5%** of derivative revenues
- ✅ Minting fee: **10 $WIP** tokens
- ✅ Derivatives: **Allowed**
- ✅ Transferable: **Yes**

### 3.3 Server Client Creation (Lines 75-115)

```javascript
export const createStoryClientServer = async () => {
  if (!process.env.WALLET_PRIVATE_KEY) {
    throw new Error('WALLET_PRIVATE_KEY not set in environment variables');
  }

  // Clean up the private key
  let privateKey = process.env.WALLET_PRIVATE_KEY
    .trim()
    .replace(/['"]/g, '')
    .replace(/\s/g, '');

  // Ensure 0x prefix
  if (!privateKey.startsWith('0x')) {
    privateKey = `0x${privateKey}`;
  }

  // Validate length (66 chars with 0x)
  if (privateKey.length !== 66) {
    throw new Error(`Invalid private key length: ${privateKey.length}`);
  }

  // Validate hex format
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error('Invalid private key format');
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey);
  console.log('Account address:', account.address);

  // Configure Story Protocol client
  const config = {
    account,
    transport: http('https://aeneid.storyrpc.io'),
    chainId: 'aeneid',
  };

  const client = StoryClient.newClient(config);
  return client;
};
```

**Security Measures:**
- ✅ Validates private key format
- ✅ Validates private key length (64 hex chars)
- ✅ Ensures proper `0x` prefix
- ✅ Uses environment variable (not hardcoded)
- ✅ Logs account address for verification

---

## 4. Core SPG Minting Function

**File:** `src/lib/storyProtocolClient.js` (Lines 176-253)

### 4.1 Function Signature

```javascript
export async function registerIPWithSPG(client, {
  ipMetadataURI,      // IPFS URL to metadata
  ipMetadataHash,     // SHA-256 hash of metadata
  nftMetadataURI,     // NFT metadata URL
  nftMetadataHash,    // NFT metadata hash
  licenseType = 'COMMERCIAL_USE',
  commercialRevShare = 5,
  defaultMintingFee = '10000000000000000000', // 10 WIP
})
```

### 4.2 License Terms Preparation (Lines 185-209)

```javascript
try {
  console.log('🚀 Registering IP Asset with SPG (one-transaction method)...');
  console.log('License Type:', licenseType);
  console.log('Revenue Share:', commercialRevShare + '%');
  
  // Get license config or use custom
  let licenseTerms = LICENSE_CONFIGS[licenseType] || LICENSE_CONFIGS.COMMERCIAL_USE;
  
  // Override revenue share if provided
  if (commercialRevShare !== undefined) {
    licenseTerms = {
      ...licenseTerms,
      commercialRevShare,
    };
  }
  
  // Override minting fee if provided
  if (defaultMintingFee !== undefined) {
    licenseTerms = {
      ...licenseTerms,
      defaultMintingFee,
    };
  }
  
  console.log('License Terms:', JSON.stringify(licenseTerms, null, 2));
```

### 4.3 **THE ACTUAL MINTING CALL** (Lines 211-229)

```javascript
  // ✅ THIS IS WHERE THE NFT IS MINTED
  const response = await client.ipAsset.registerIpAsset({
    nft: {
      type: "mint", // ← MINTS NEW NFT
      spgNftContract: STORY_CONTRACTS.SPG_NFT, // ← Contract: 0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc
    },
    ipMetadata: {
      ipMetadataURI,      // IPFS metadata URL
      ipMetadataHash,     // Content hash (0x...)
      nftMetadataURI,     // NFT metadata URL
      nftMetadataHash,    // NFT metadata hash (0x...)
    },
    licenseTermsData: [{
      terms: licenseTerms, // License configuration
    }],
    txOptions: { 
      waitForTransaction: true  // Wait for blockchain confirmation
    },
  });
```

**What Happens Here:**

1. **Story Protocol SDK** calls the blockchain
2. **One transaction** performs:
   - Mints NFT on SPG_NFT contract (`0xc32A8a0...`)
   - Registers NFT as IP Asset on IP_ASSET_REGISTRY
   - Attaches PIL license terms
   - Creates royalty vault
   - Initializes revenue tracking

3. **Returns:**
   - `ipId`: IP Asset ID (e.g., `0xe343677...`)
   - `tokenId`: New NFT token ID (e.g., `123`)
   - `licenseTermsId`: License terms ID (e.g., `2`)
   - `txHash`: Transaction hash
   - `nftContract`: SPG_NFT contract address

### 4.4 Response Handling (Lines 231-252)

```javascript
  console.log('✅ IP Asset registered successfully!');
  console.log('IP ID:', response.ipId);
  console.log('Token ID:', response.tokenId);
  console.log('License Terms ID:', response.licenseTermsId);
  console.log('Transaction Hash:', response.txHash);
  
  return {
    success: true,
    ipId: response.ipId,
    tokenId: response.tokenId,
    licenseTermsId: response.licenseTermsId,
    txHash: response.txHash,
    nftContract: STORY_CONTRACTS.SPG_NFT,
  };
} catch (error) {
  console.error('❌ SPG IP registration error:', error);
  return {
    success: false,
    error: error.message || 'SPG registration failed',
    details: error.shortMessage || error.toString(),
  };
}
```

---

## 5. Database Update

**File:** `src/pages/api/assets/register-ip.js` (Lines 142-174)

```javascript
// Update asset in database with Story Protocol info
const updatedAsset = await prisma.asset.update({
  where: { id: asset.id },
  data: {
    storyProtocolId: ipId,
    storyProtocolTxHash: txHash,
    status: 'REGISTERED',
  },
});

console.log('✅ IP Asset registered successfully!');
console.log('IP ID:', ipId);
console.log('SPG Token ID:', spgTokenId);
console.log('SPG NFT Contract:', spgNftContract);
console.log('License Terms ID:', licenseTermsId);

return res.status(200).json({
  success: true,
  ipId,
  txHash,
  licenseAttached: true,
  spgTokenId: spgTokenId || null,
  spgNftContract: spgNftContract || null,
  licenseTermsId: licenseTermsId || null,
  asset: updatedAsset,
  explorerUrl: `https://aeneid.storyscan.io/address/${ipId}`,
});
```

---

## 6. Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND (upload.js)                                              │
│    registerOnStoryProtocolSPG(assetId)                               │
│    ↓                                                                  │
│    POST /api/assets/register-ip                                      │
│    Body: { assetId, licenseType: 'COMMERCIAL_USE' }                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│ 2. BACKEND API (register-ip.js)                                      │
│    ✅ Fetch asset from PostgreSQL database                           │
│    ✅ Validate asset.contentHash exists                              │
│    ✅ Validate asset.pinataUrl exists                                │
│    ✅ Format content hash with 0x prefix                             │
│    ↓                                                                  │
│    createStoryClientServer()                                         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│ 3. STORY PROTOCOL CLIENT (storyProtocolClient.js)                    │
│    ✅ Load server wallet private key from env                        │
│    ✅ Create Viem account: 0x47f024...                               │
│    ✅ Connect to Story RPC: https://aeneid.storyrpc.io              │
│    ✅ Initialize Story Protocol SDK client                           │
│    ↓                                                                  │
│    registerIPWithSPG(client, {...params})                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│ 4. STORY PROTOCOL SDK (@story-protocol/core-sdk)                     │
│    client.ipAsset.registerIpAsset({                                  │
│      nft: {                                                           │
│        type: "mint", ← MINTS NEW NFT                                 │
│        spgNftContract: 0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc    │
│      },                                                               │
│      ipMetadata: {                                                    │
│        ipMetadataURI: "https://...ipfs/bafyb...",                   │
│        ipMetadataHash: "0x137b613a...",                              │
│      },                                                               │
│      licenseTermsData: [{                                             │
│        terms: { commercialUse: true, commercialRevShare: 5, ... }    │
│      }],                                                              │
│    })                                                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│ 5. BLOCKCHAIN TRANSACTION (Story Aeneid Testnet)                     │
│                                                                       │
│    Transaction executes on Story Protocol Gateway:                   │
│    ├─ Contract: SPG (0x69415CE984A79a3Cfbcf86376be5Dd7Ec6f8F9d0)    │
│    ├─ Function: registerIpAsset(...)                                 │
│    ├─ Signer: Server Wallet (0x47f024...)                            │
│    └─ Gas: Paid by server wallet                                     │
│                                                                       │
│    ONE TRANSACTION PERFORMS:                                         │
│    ├─ ✅ Mint NFT on SPG_NFT (0xc32A8a0...)                          │
│    │    - Token ID: 123 (example)                                    │
│    │    - Owner: Server Wallet (0x47f024...)                         │
│    ├─ ✅ Register as IP Asset                                        │
│    │    - IP ID: 0xe343677... (computed address)                     │
│    │    - Metadata: IPFS CID + hash                                  │
│    ├─ ✅ Attach PIL License Terms                                    │
│    │    - Commercial Use: true                                       │
│    │    - Royalty Share: 5%                                          │
│    │    - Minting Fee: 10 WIP                                        │
│    └─ ✅ Create Royalty Vault                                        │
│         - Vault Address: 0x... (auto-generated)                      │
│         - Tracks revenue for IP Asset                                │
│                                                                       │
│    Transaction confirmed in ~2-5 seconds                             │
│    Transaction Hash: 0xb67ec585...                                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│ 6. RESPONSE & DATABASE UPDATE                                        │
│                                                                       │
│    SDK Returns:                                                       │
│    ├─ ipId: "0xe343677..."                                          │
│    ├─ tokenId: 123                                                   │
│    ├─ licenseTermsId: 2                                              │
│    ├─ txHash: "0xb67ec585..."                                       │
│    └─ nftContract: "0xc32A8a0..."                                    │
│    ↓                                                                  │
│    UPDATE assets                                                      │
│    SET storyProtocolId = '0xe343677...',                             │
│        storyProtocolTxHash = '0xb67ec585...',                        │
│        status = 'REGISTERED'                                         │
│    WHERE id = assetId;                                               │
│    ↓                                                                  │
│    Return success to frontend                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Security Analysis

### ✅ **What's Secure:**

1. **Private Key Management:**
   - Stored in environment variable
   - Never logged or exposed
   - Validated before use
   - Proper hex format enforcement

2. **Data Validation:**
   - Content hash verified to exist
   - Metadata URI verified to exist
   - Proper `0x` prefix on hashes
   - Clear error messages on missing data

3. **Transaction Signing:**
   - Server wallet signs transaction
   - User doesn't need to approve (better UX)
   - Server controls gas payment

4. **Story Protocol SDK:**
   - Official SDK from Story Protocol
   - Handles all blockchain interactions
   - Built-in error handling
   - Transaction confirmation waiting

5. **Contract Addresses:**
   - Official Story Protocol contracts
   - Verified on StoryScan
   - Public SPG NFT contract

### ⚠️ **Considerations:**

1. **NFT Ownership:**
   - NFT owned by **server wallet**, not user
   - User doesn't own the NFT directly
   - User owns the asset in the database
   - **For Buildathon:** This is acceptable
   - **For Production:** Consider user-owned NFTs

2. **Server Wallet Balance:**
   - Server wallet needs **$WIP tokens** for gas
   - Must monitor balance
   - Each mint costs gas

3. **Private Key Security:**
   - Environment variable must be secured
   - Server must be secure
   - No key rotation implemented

---

## 8. Testing & Verification

### On-Chain Verification:

1. **SPG NFT Contract:**
   ```
   https://aeneid.storyscan.io/nft/0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc/[TOKEN_ID]
   ```

2. **IP Asset:**
   ```
   https://aeneid.storyscan.io/address/[IP_ID]
   ```

3. **Transaction:**
   ```
   https://aeneid.storyscan.io/tx/[TX_HASH]
   ```

### Expected Results:

- ✅ NFT minted on SPG_NFT contract
- ✅ Owner: Server wallet address
- ✅ IP Asset registered
- ✅ License: Commercial Use (5% royalty)
- ✅ Royalty vault created
- ✅ Status: Active

---

## 9. Summary

### **What Gets Minted:**

- **1 NFT** on Story Protocol's SPG_NFT contract (`0xc32A8a0...`)
- **Token ID:** Auto-generated by contract (e.g., 123)
- **Owner:** Server wallet (`0x47f024...`)
- **Metadata:** Points to IPFS (your asset)
- **Purpose:** IP licensing, royalties, fractionalization

### **What Gets Registered:**

- **IP Asset ID:** Computed address (e.g., `0xe343677...`)
- **License:** Commercial Use, 5% royalty
- **Royalty Vault:** Auto-created for revenue tracking
- **Status:** Active and ready for derivatives

### **What You Control:**

- ✅ Asset metadata (stored in your database + IPFS)
- ✅ License type (COMMERCIAL_USE by default)
- ✅ Royalty percentage (5% by default)
- ✅ Minting fee (10 WIP by default)

### **What Story Protocol Controls:**

- ✅ NFT contract (SPG_NFT)
- ✅ IP Asset registry
- ✅ License module
- ✅ Royalty distribution
- ✅ Derivative tracking

---

**Audit Date:** December 10, 2025  
**Network:** Story Aeneid Testnet  
**SDK Version:** @story-protocol/core-sdk (latest)

