# 🔧 Upload & Asset Creation Fixes Applied

## Summary

All fixes have been applied based on Story Protocol documentation review. The upload flow now follows best practices and uses the correct IPA Metadata Standard.

---

## ✅ Fixes Applied

### 1. Wallet Hooks Updated (Wagmi)

**File:** `src/pages/dashboard/upload.js`

**Before (❌ Old):**
```javascript
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
const { address, isConnected } = useAppKitAccount();
const { walletProvider } = useAppKitProvider('eip155');
```

**After (✅ New):**
```javascript
import { useAccount, useWalletClient } from 'wagmi';
const { address, isConnected } = useAccount();
const { data: walletClient } = useWalletClient();
```

**Impact:**
- Now uses Wagmi hooks (recommended by Story Protocol)
- Compatible with `useStoryClient` hook
- Proper wallet client structure for Story SDK

---

### 2. IPA Metadata Standard Implementation

**File:** `src/lib/watermark.js`

**Before (❌ Incomplete):**
```javascript
return {
  name: title,
  description: description,
  image: '',
  attributes: [...],
  ipMetadata: {
    ipMetadataURI: '',
    ipMetadataHash: contentHash,
  },
};
```

**After (✅ IPA Standard):**
```javascript
const ipMetadata = {
  // Required fields
  title: title || file.name,
  description: description || '',
  
  // Media fields (required)
  image: uploadUrl || '',
  imageHash: contentHash, // SHA-256 hash
  mediaUrl: uploadUrl || '',
  mediaHash: contentHash,
  mediaType: file.type, // e.g., "image/png"
  
  // Creators array (required)
  creators: [{
    name: creator || title || 'Unknown Creator',
    address: creatorAddress || '',
    contributionPercent: 100,
  }],
  
  // Optional fields
  external_url: 'https://dippchain.io',
  attributes: [...],
};
```

**Key Changes:**
- ✅ Follows [IPA Metadata Standard](https://docs.story.foundation/concepts/ip-asset/ipa-metadata-standard)
- ✅ Includes required `creators` array
- ✅ Proper `imageHash` and `mediaHash` fields
- ✅ `mediaType` field for content type

---

### 3. Metadata Generation Updated

**File:** `src/pages/dashboard/upload.js`

**Before:**
```javascript
const metadata = await generateMetadata(processedFile, {
  title: formData.title,
  creatorAddress: address,
  // ...
});
metadata.image = uploadData.url; // Set after generation
```

**After:**
```javascript
const metadata = await generateMetadata(processedFile, {
  title: formData.title,
  creatorAddress: address,
  uploadUrl: uploadData.url, // ✅ Pass URL during generation
  // ...
});
// Image and mediaUrl already set by generateMetadata
```

**Impact:**
- Metadata includes IPFS URLs from the start
- Follows IPA standard structure
- Proper creator information

---

### 4. Removed DippChain Registry Step

**File:** `src/pages/dashboard/upload.js`

**Removed:**
- ❌ `registerOnChain()` function (DippChain Registry registration)
- ❌ `registrationResult` state
- ❌ DippChain Registry UI components
- ❌ `registerOnChain` form checkbox
- ❌ Unused imports (`DippChainRegistryABI`, `CONTRACTS`, `BrowserProvider`, `Contract`)

**Why:**
- SPG (Story Protocol Gateway) handles NFT minting internally
- No need for separate DippChain Registry step
- Simpler, faster flow

**New Flow:**
```
Upload → IPFS → Metadata → Database → Story Protocol (SPG)
                                                      ↓
                                    Mint NFT + Register IP + Attach License
                                                      ↓
                                              Ready for Fractionalization
```

---

### 5. Updated Registration API

**File:** `src/pages/api/assets/register-ip-modern.js`

**Before:**
```javascript
// Used asset.pinataUrl for metadata URI
ipMetadataURI: asset.pinataUrl,
```

**After:**
```javascript
// ✅ Use metadataHash (IPA metadata JSON) for IP metadata URI
const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
const ipMetadataURI = `https://${gateway}/ipfs/${asset.metadataHash}`;

// ✅ Use contentHash for media hash (SHA-256 of actual media file)
const ipMetadataHash = asset.contentHash?.startsWith('0x')
  ? asset.contentHash
  : `0x${asset.contentHash}`;
```

**Key Changes:**
- Uses `metadataHash` (IPA metadata JSON) instead of `pinataUrl` (media file)
- Proper hash handling with 0x prefix
- Follows Story Protocol's metadata requirements

---

### 6. Updated Frontend Registration Function

**File:** `src/pages/dashboard/upload.js`

**Before:**
```javascript
const registerOnStoryProtocol = async (assetId, tokenId) => {
  // Required tokenId from DippChain Registry
  const payload = {
    assetId,
    tokenId, // ❌ Not needed with SPG
    // ...
  };
  const response = await fetch('/api/assets/register-ip', {...});
};
```

**After:**
```javascript
const registerOnStoryProtocolSPG = async (assetId) => {
  // ✅ No tokenId needed - SPG handles NFT minting
  const payload = {
    assetId,
    licenseType: 'COMMERCIAL_USE',
    commercialRevShare: 5,
    defaultMintingFee: '10',
  };
  const response = await fetch('/api/assets/register-ip-modern', {...});
};
```

**Key Changes:**
- Removed `tokenId` parameter (SPG mints NFT internally)
- Uses `/api/assets/register-ip-modern` endpoint
- Simplified payload (backend fetches metadata from database)

---

## 📊 Updated Upload Flow

### Complete Flow (After Fixes)

```
1. USER SELECTS FILE
   ↓
2. Generate watermark ID & content hash
   ↓
3. Apply watermark (if image)
   ↓
4. Create thumbnail (if image)
   ↓
5. Upload file to IPFS (Pinata)
   POST /api/assets/upload
   ↓
6. Generate IPA Metadata Standard JSON
   ↓
7. Upload metadata to IPFS
   POST /api/assets/metadata
   ↓
8. Create asset in database
   POST /api/assets/create
   ↓
9. Register on Story Protocol (SPG)
   POST /api/assets/register-ip-modern
   - Uses SDK's registerIpAsset()
   - Mints NFT + Registers IP + Attaches License
   - Creates Royalty Vault
   ↓
10. COMPLETE ✅
   - Asset ready for fractionalization
   - Royalty tokens available
   - License terms attached
```

---

## 🔑 Key Improvements

### 1. **Simplified Flow**
- Removed unnecessary DippChain Registry step
- SPG handles everything in one transaction
- Faster registration process

### 2. **Standards Compliance**
- Follows IPA Metadata Standard
- Proper creator attribution
- Correct hash handling

### 3. **Better Integration**
- Uses Wagmi hooks (Story Protocol recommended)
- Compatible with `useStoryClient` hook
- Proper wallet client structure

### 4. **Correct Metadata Usage**
- Uses IPA metadata JSON (not media file) for IP metadata
- Uses content hash for media verification
- Proper URI construction

---

## 📝 Files Modified

1. ✅ `src/pages/dashboard/upload.js`
   - Updated wallet hooks to Wagmi
   - Removed DippChain Registry registration
   - Updated metadata generation call
   - Updated Story Protocol registration function

2. ✅ `src/lib/watermark.js`
   - Updated `generateMetadata()` to follow IPA Metadata Standard
   - Added required fields (creators, imageHash, mediaHash, mediaType)
   - Fixed linter warning

3. ✅ `src/pages/api/assets/register-ip-modern.js`
   - Updated to use `metadataHash` for IP metadata URI
   - Proper hash handling with 0x prefix
   - Uses contentHash for media hash

---

## 🎯 Next Steps

1. **Test the Upload Flow:**
   - Upload an asset
   - Verify IPA metadata structure
   - Confirm Story Protocol registration works
   - Check royalty vault creation

2. **Verify Metadata:**
   - Check IPFS metadata JSON follows IPA standard
   - Verify creator information is correct
   - Confirm hashes are properly formatted

3. **Test Fractionalization:**
   - After registration, test fractionalization
   - Verify royalty tokens are accessible
   - Check vault initialization

---

## ✅ Verification Checklist

- [x] Wallet hooks updated to Wagmi
- [x] IPA Metadata Standard implemented
- [x] DippChain Registry step removed
- [x] Registration API uses correct metadata
- [x] Frontend uses modern API endpoint
- [x] Response handling updated
- [x] Linter errors fixed
- [ ] Test complete upload flow
- [ ] Verify IPA metadata structure
- [ ] Test Story Protocol registration

---

All fixes align with Story Protocol's official documentation and best practices! 🚀

