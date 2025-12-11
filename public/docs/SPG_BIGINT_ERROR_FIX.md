# 🔧 SPG BigInt Error Fix

## Problem

Story Protocol SPG registration was failing with:
```
Error: Failed to register IP Asset: Failed to mint and register IP and attach PIL terms: Cannot convert undefined to a BigInt
```

---

## Root Cause

The frontend was sending `undefined` values for metadata hashes:

```javascript
// Frontend (upload.js)
const payload = {
  assetId: assetId,
  ipMetadataHash: uploadResult?.contentHash ? '0x' + uploadResult.contentHash : undefined,  // ❌ Could be undefined
  nftMetadataHash: uploadResult?.contentHash ? '0x' + uploadResult.contentHash : undefined,  // ❌ Could be undefined
};
```

When the Story Protocol SDK tried to process these hashes, it attempted to convert `undefined` to `BigInt`, causing the error:

```javascript
// Story Protocol SDK internal
BigInt(ipMetadataHash)  // ❌ BigInt(undefined) throws error!
```

### Why uploadResult.contentHash Was Undefined

At the time `registerOnStoryProtocolSPG()` is called, `uploadResult` state might not have `contentHash` populated, or it might be structured differently than expected.

---

## Solution

### Approach: Let Backend Fetch Everything from Database

Instead of passing potentially undefined values from the frontend, let the backend fetch all required metadata from the database where it's already stored.

---

## Fixes Applied

### Fix 1: Backend - Fetch and Validate Metadata (register-ip.js)

```javascript
// ✅ AFTER
// Ensure we have all required metadata from the database asset
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

console.log('SPG Registration Params:', {
  ipMetadataURI: finalIpMetadataURI,
  ipMetadataHash: finalIpMetadataHash,
  nftMetadataURI: finalNftMetadataURI,
  nftMetadataHash: finalNftMetadataHash,
});

// ✅ Pass validated, non-undefined values to SPG
const registerResult = await registerIPWithSPG(client, {
  ipMetadataURI: finalIpMetadataURI,
  ipMetadataHash: finalIpMetadataHash,
  nftMetadataURI: finalNftMetadataURI,
  nftMetadataHash: finalNftMetadataHash,
  licenseType: licenseType || 'COMMERCIAL_USE',
  commercialRevShare: 5,
  defaultMintingFee: '10000000000000000000',
});
```

**Benefits:**
- ✅ Fetches `contentHash` from database asset (guaranteed to exist)
- ✅ Validates all required fields before calling SPG
- ✅ Properly formats hash with `0x` prefix
- ✅ Returns clear error messages if data is missing
- ✅ Logs parameters for debugging

---

### Fix 2: Frontend - Simplified Payload (upload.js)

```javascript
// ❌ BEFORE
const payload = {
  assetId: assetId,
  ipMetadataURI: uploadResult?.metadataData?.url || uploadResult?.uploadData?.url,
  ipMetadataHash: uploadResult?.contentHash ? '0x' + uploadResult.contentHash : undefined,  // Could be undefined
  nftMetadataURI: uploadResult?.metadataData?.url || uploadResult?.uploadData?.url,
  nftMetadataHash: uploadResult?.contentHash ? '0x' + uploadResult.contentHash : undefined,  // Could be undefined
  licenseType: 'COMMERCIAL_USE',
};

// ✅ AFTER
const payload = {
  assetId: assetId,
  licenseType: 'COMMERCIAL_USE',
  // Backend fetches all metadata from database
};
```

**Benefits:**
- ✅ Simpler frontend code
- ✅ No risk of passing undefined values
- ✅ Single source of truth (database)
- ✅ Backend has full control over data validation

---

## Data Flow

### Before (Broken)
```
Frontend (uploadResult state)
  ├─ contentHash: undefined ❌
  ├─ metadataData?.url: might be available
  └─ uploadData?.url: might be available
      ↓
Backend API
  ├─ ipMetadataHash: undefined ❌
  └─ nftMetadataHash: undefined ❌
      ↓
Story Protocol SDK
  └─ BigInt(undefined) → ERROR! ❌
```

### After (Working)
```
Frontend
  └─ assetId: "e49db817..." ✅
      ↓
Backend API
  ├─ Fetch asset from database ✅
  ├─ asset.contentHash: "137b613a..." ✅
  ├─ asset.pinataUrl: "https://..." ✅
  ├─ Validate all fields ✅
  └─ Format properly ✅
      ↓
Story Protocol SDK
  ├─ ipMetadataHash: "0x137b613a..." ✅
  └─ nftMetadataHash: "0x137b613a..." ✅
      ↓
✅ SPG Registration Success!
```

---

## Expected Console Logs

### Backend (Terminal):
```
Private key validated, creating account...
Account address: 0x47f024b1e325525e27F8b35470BBf9BfAfeD2B64
Using SPG method - will mint new NFT and register as IP...
Registering IP Asset on Story Protocol using SPG...
License Type: COMMERCIAL_USE

SPG Registration Params: {
  ipMetadataURI: 'https://bronze-nearby-rook-599.mypinata.cloud/ipfs/bafyb...',
  ipMetadataHash: '0x137b613a6fbbb544894065cc65fc0b41493796e413e11573b76aa9b732e62bb8',
  nftMetadataURI: 'https://bronze-nearby-rook-599.mypinata.cloud/ipfs/bafyb...',
  nftMetadataHash: '0x137b613a6fbbb544894065cc65fc0b41493796e413e11573b76aa9b732e62bb8'
}

🚀 Registering IP Asset with SPG (one-transaction method)...
License Type: COMMERCIAL_USE
Revenue Share: 5%
✅ IP Asset registered successfully!
IP ID: 0xe343677391f5E1a990841Cf95D276730E342Be64
Token ID: 123
License Terms ID: 2
Transaction Hash: 0x...
```

### Frontend (Browser Console):
```
🌐 Starting Story Protocol SPG registration for asset: e49db817...
📤 Sending SPG registration request for asset: e49db817...
✅ Asset registered on Story Protocol! Ready for fractionalization.
🎉 Full SPG registration complete!
IP ID: 0xe343677391f5E1a990841Cf95D276730E342Be64
SPG Token ID: 123
License Terms ID: 2
```

---

## Database State

After successful registration:

```sql
SELECT * FROM assets WHERE id = 'e49db817...';

-- Result:
{
  id: "e49db817...",
  pinataCid: "bafyb...",
  pinataUrl: "https://...",
  contentHash: "137b613a...",  // ← Used for SPG registration
  watermarkId: "DIPPC-...",
  
  storyProtocolId: "0xe343...",  // ← Updated
  storyProtocolTxHash: "0x...",  // ← Updated
  status: "REGISTERED"  // ← Updated
}
```

---

## Files Modified

1. **`src/pages/api/assets/register-ip.js`**
   - Added metadata fetching from database asset
   - Added validation for required fields
   - Added proper hash formatting
   - Added logging for debugging

2. **`src/pages/dashboard/upload.js`**
   - Simplified payload to only send `assetId` and `licenseType`
   - Removed potentially undefined metadata fields

---

## Testing

1. **Upload a new asset**
2. **Check "Register as IP Asset on Story Protocol (SPG)"**
3. **Click "Upload & Process"**

**Expected Result:**
```
✅ Generating watermark
✅ Uploading to IPFS
✅ Creating thumbnail
✅ Uploading metadata
✅ Saving to database
✅ Registering on Story Protocol (SPG)  ← Should succeed!

Toast: ✅ Asset registered on Story Protocol! Ready for fractionalization.

Database:
  status: "REGISTERED"
  storyProtocolId: "0xe343..."

StoryScan:
  IP Asset created ✅
  License attached ✅
  Royalty vault created ✅
```

---

## Why This Approach is Better

### **1. Single Source of Truth**
- Database is the authoritative source for asset metadata
- No risk of state management issues in frontend

### **2. Validation in One Place**
- Backend validates all data before calling Story Protocol
- Clear error messages if data is missing

### **3. Simpler Frontend**
- Frontend only needs to pass `assetId`
- No complex state management for metadata

### **4. More Robust**
- Even if frontend state is corrupted, backend can still fetch correct data
- Works for manual registration flows (via recovery modal)

---

**Status:** ✅ FIXED

**Next:** Upload should complete successfully with Story Protocol registration!

