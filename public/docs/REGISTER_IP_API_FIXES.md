# Register IP API Route Fixes

## Overview
This document details the fixes applied to `src/pages/api/assets/register-ip.js` to align with Story Protocol SDK requirements and improve API flexibility.

---

## Issues Fixed

### 1. **Hardcoded License Parameters** ✅

#### Problem
The API was hardcoding `commercialRevShare: 5` and `defaultMintingFee: '10'` instead of accepting them from the request body, making it less flexible.

```javascript
// ❌ BEFORE - Hardcoded values
const registerResult = await registerIPWithSPG(client, {
  // ... other params
  licenseType: licenseType || 'COMMERCIAL_USE',
  commercialRevShare: 5, // Hardcoded
  defaultMintingFee: '10', // Hardcoded
});
```

#### Solution
Accept `commercialRevShare` and `defaultMintingFee` from the request body with sensible defaults:

```javascript
// ✅ AFTER - Accept from request body
const { 
  // ... other params
  licenseType = 'COMMERCIAL_USE',
  commercialRevShare = 5, // Revenue share percentage (default: 5%)
  defaultMintingFee = '10', // Minting fee in WIP (default: 10 WIP)
} = req.body;

// Validate and format parameters
const finalLicenseType = licenseType || 'COMMERCIAL_USE';
const finalCommercialRevShare = Number(commercialRevShare) || 5;
const finalDefaultMintingFee = String(defaultMintingFee) || '10';

const registerResult = await registerIPWithSPG(client, {
  // ... other params
  licenseType: finalLicenseType,
  commercialRevShare: finalCommercialRevShare, // Will be formatted to 5,000,000 (5 * 10^6) in registerIPWithSPG
  defaultMintingFee: finalDefaultMintingFee, // Will be parsed to wei in registerIPWithSPG
});
```

**File Changed:** `src/pages/api/assets/register-ip.js` (lines 22-32, 115-134)

**Benefits:**
- API is now flexible and accepts custom license parameters
- Maintains backward compatibility with defaults
- Proper validation and type conversion

---

### 2. **Unused Imports** ✅

#### Problem
The file imported several unused functions and constants:
- `registerIPAsset` (legacy method, not used)
- `attachLicenseTerms` (not needed with SPG method)
- `PIL_LICENSE_TERMS` (not used)
- `CONTRACTS` (not used)

#### Solution
Removed all unused imports:

```javascript
// ❌ BEFORE
import { 
  createStoryClientServer, 
  registerIPAsset, 
  registerIPWithSPG,
  attachLicenseTerms,
  PIL_LICENSE_TERMS 
} from '@/lib/storyProtocolClient';
import { CONTRACTS } from '@/contracts/addresses';

// ✅ AFTER
import { 
  createStoryClientServer, 
  registerIPWithSPG,
} from '@/lib/storyProtocolClient';
```

**File Changed:** `src/pages/api/assets/register-ip.js` (lines 3-6)

**Benefits:**
- Cleaner imports
- Reduced bundle size
- Better code clarity

---

### 3. **Improved Logging** ✅

#### Problem
License configuration logging was incomplete and inconsistent.

#### Solution
Added comprehensive logging for registration configuration:

```javascript
// ✅ AFTER
console.log('SPG Registration Configuration:', {
  licenseType: finalLicenseType,
  commercialRevShare: finalCommercialRevShare + '%',
  defaultMintingFee: finalDefaultMintingFee + ' WIP',
});
```

**File Changed:** `src/pages/api/assets/register-ip.js` (lines 120-124)

**Benefits:**
- Better debugging information
- Clear visibility into registration parameters
- Easier troubleshooting

---

## API Request Body

### Required Parameters
- `assetId` (string, optional): Asset ID from database
- `tokenId` (string, optional): DippChain token ID (not needed for SPG method)

### Optional Parameters
- `ipMetadataURI` (string, optional): IPFS URI for IP metadata (falls back to `asset.pinataUrl`)
- `ipMetadataHash` (string, optional): Hash of IP metadata (falls back to `asset.contentHash`)
- `nftMetadataURI` (string, optional): IPFS URI for NFT metadata (falls back to `asset.pinataUrl`)
- `nftMetadataHash` (string, optional): Hash of NFT metadata (falls back to `asset.contentHash`)
- `licenseType` (string, optional): License type - `'COMMERCIAL_USE'`, `'COMMERCIAL_REMIX'`, or `'NON_COMMERCIAL'` (default: `'COMMERCIAL_USE'`)
- `commercialRevShare` (number, optional): Revenue share percentage (default: `5`)
- `defaultMintingFee` (string, optional): Minting fee in WIP (default: `'10'`)

### Example Request

```javascript
POST /api/assets/register-ip
Content-Type: application/json

{
  "assetId": "123",
  "licenseType": "COMMERCIAL_USE",
  "commercialRevShare": 10,  // 10% revenue share
  "defaultMintingFee": "15"   // 15 WIP minting fee
}
```

---

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "ipId": "0x...",
  "txHash": "0x...",
  "licenseAttached": true,
  "spgTokenId": "123",
  "spgNftContract": "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc",
  "licenseTermsId": "456",
  "asset": { /* updated asset object */ },
  "explorerUrl": "https://aeneid.storyscan.io/address/0x..."
}
```

### Error Response (400/404/500)
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## How Revenue Share Formatting Works

1. **API receives:** `commercialRevShare: 5` (percentage)
2. **API validates:** Converts to number, defaults to 5 if invalid
3. **Passes to `registerIPWithSPG`:** `commercialRevShare: 5`
4. **`registerIPWithSPG` formats:** `5 * 10 ** 6 = 5,000,000` (Story Protocol format)
5. **PILFlavor generates:** Complete license terms with all required fields

---

## Testing Checklist

- [ ] API accepts `commercialRevShare` from request body
- [ ] API accepts `defaultMintingFee` from request body
- [ ] API uses defaults when parameters not provided
- [ ] Revenue share is correctly formatted (5% = 5,000,000)
- [ ] Minting fee is correctly parsed to wei
- [ ] License terms include all required PIL fields
- [ ] SPG registration succeeds with custom parameters
- [ ] No unused imports remain
- [ ] Logging provides clear debugging information

---

## Related Files

- `src/pages/api/assets/register-ip.js` - Main API route (fixed)
- `src/lib/storyProtocolClient.js` - Story Protocol client (handles revenue share formatting)
- `src/pages/api/assets/register-ip-modern.js` - Alternative modern API route

---

## References

- [Story Protocol SDK Documentation](https://docs.story.foundation/)
- [PIL License Terms](https://docs.story.foundation/protocol/pil)
- [SPG Registration Guide](./STORY_PROTOCOL_CLIENT_FIXES.md)

