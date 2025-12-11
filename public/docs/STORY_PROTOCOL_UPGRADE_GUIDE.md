# 🚀 Story Protocol Integration Upgrade Guide

**Modern One-Transaction Registration with License Terms**

---

## 📋 What Changed?

### Before (Old Two-Step Method)
```javascript
// Step 1: Register IP Asset
const registerResult = await registerIPAsset(client, {...});

// Step 2: Attach License Terms  
const licenseResult = await attachLicenseTerms(client, {...});
```

**Problems:**
- Two separate transactions (slower, more expensive)
- Royalty vault created in step 2
- More room for errors
- Used custom NFT contract (DippChainRegistry)

### After (New SPG Method) ✨
```javascript
// ONE transaction does everything!
const result = await registerIPWithSPG(client, {
  ipMetadataURI,
  ipMetadataHash,
  nftMetadataURI,
  nftMetadataHash,
  licenseType: 'COMMERCIAL_USE',
  commercialRevShare: 5,
  defaultMintingFee: '10000000000000000000', // 10 WIP
});
```

**Benefits:**
- ✅ Single atomic transaction
- ✅ Mints NFT + Registers IP + Attaches License
- ✅ Auto-creates royalty vault
- ✅ Required for fractionalization
- ✅ Uses Story Protocol Gateway (SPG)
- ✅ Faster and cheaper
- ✅ More reliable

---

## 🎯 Implementation

### 1. Updated Files

**New/Modified Files:**
- ✅ `src/lib/storyProtocolClient.js` - Added `registerIPWithSPG()` and `LICENSE_CONFIGS`
- ✅ `src/pages/api/assets/register-ip-modern.js` - New modern API endpoint
- ✅ `src/components/upload/EnhancedUploadFlow.jsx` - Upload with progress tracking

**Key Additions:**
```javascript
// New license configurations
export const LICENSE_CONFIGS = {
  COMMERCIAL_USE: {
    transferable: true,
    commercialUse: true,
    commercialRevShare: 5, // 5%
    derivativesAllowed: true,
    defaultMintingFee: '10000000000000000000', // 10 WIP
  },
  COMMERCIAL_REMIX: {
    commercialRevShare: 10, // 10%
    defaultMintingFee: '15000000000000000000', // 15 WIP
  },
  NON_COMMERCIAL: {
    commercialUse: false,
    defaultMintingFee: '0', // Free
  },
};
```

---

## 🔧 How to Use

### Option A: Use the New API Endpoint

```javascript
// Frontend: Call modern API endpoint
const response = await fetch('/api/assets/register-ip-modern', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assetId: 'your-asset-id',
    licenseType: 'COMMERCIAL_USE',      // or COMMERCIAL_REMIX, NON_COMMERCIAL
    commercialRevShare: 5,              // 0-100%
    defaultMintingFee: '10000000000000000000', // in wei
  }),
});

const result = await response.json();

if (result.success) {
  console.log('IP ID:', result.data.ipId);
  console.log('Token ID:', result.data.tokenId);
  console.log('License Terms ID:', result.data.licenseTermsId);
  console.log('Royalty Vault:', 'Created ✅');
}
```

### Option B: Use the SDK Directly

```javascript
import { createStoryClientServer, registerIPWithSPG } from '@/lib/storyProtocolClient';

const client = await createStoryClientServer();

const result = await registerIPWithSPG(client, {
  ipMetadataURI: 'https://gateway.pinata.cloud/ipfs/...',
  ipMetadataHash: '0x...',
  nftMetadataURI: 'https://gateway.pinata.cloud/ipfs/...',
  nftMetadataHash: '0x...',
  licenseType: 'COMMERCIAL_USE',
  commercialRevShare: 5,
  defaultMintingFee: '10000000000000000000',
});

if (result.success) {
  console.log('Registered!', result.ipId);
}
```

### Option C: Use Enhanced Upload Flow Component

```javascript
import EnhancedUploadFlow from '@/components/upload/EnhancedUploadFlow';

<EnhancedUploadFlow
  file={selectedFile}
  formData={{
    userId: address,
    title: 'My Artwork',
    description: 'Amazing piece',
    visibility: 'PUBLIC',
    registerStoryProtocol: true,
    licenseType: 'COMMERCIAL_USE',
    commercialRevShare: 5,
    mintingFee: '10000000000000000000',
  }}
  assetType="IMAGE"
  onComplete={(result) => {
    console.log('Upload complete!', result);
    // Navigate to next page
  }}
  onError={(error) => {
    console.error('Upload failed:', error);
  }}
/>
```

---

## 📊 License Type Options

### COMMERCIAL_USE (Recommended for Fractionalization)
- ✅ Commercial use allowed
- ✅ Derivatives allowed
- 💰 5% revenue share
- 💵 10 WIP minting fee
- **Best for:** NFTs, Digital Art, Music

### COMMERCIAL_REMIX
- ✅ Commercial use allowed
- ✅ Derivatives allowed
- 💰 10% revenue share
- 💵 15 WIP minting fee
- **Best for:** Remixable content, Templates

### NON_COMMERCIAL
- ❌ No commercial use
- ✅ Derivatives allowed
- 💰 0% revenue share
- 💵 Free minting
- **Best for:** Educational content, Open source

### Custom License
```javascript
{
  transferable: true,
  royaltyPolicy: '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E',
  defaultMintingFee: '20000000000000000000', // 20 WIP
  commercialUse: true,
  commercialRevShare: 15, // 15%
  derivativesAllowed: true,
  currency: '0x1514000000000000000000000000000000000000',
}
```

---

## 🎨 UI Integration Example

### Update Upload Page

```javascript
// pages/dashboard/upload.js

import { useState } from 'react';
import EnhancedUploadFlow from '@/components/upload/EnhancedUploadFlow';
import { useAppKitAccount } from '@reown/appkit/react';

export default function UploadPage() {
  const { address } = useAppKitAccount();
  const [showUploadFlow, setShowUploadFlow] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    licenseType: 'COMMERCIAL_USE',
    commercialRevShare: 5,
    registerStoryProtocol: true,
  });

  if (showUploadFlow) {
    return (
      <EnhancedUploadFlow
        file={selectedFile}
        formData={{
          ...formData,
          userId: address,
        }}
        assetType="IMAGE"
        onComplete={(result) => {
          router.push(`/dashboard/assets/${result.uploadResult.asset.id}`);
        }}
      />
    );
  }

  return (
    <form onSubmit={() => setShowUploadFlow(true)}>
      {/* Your form fields */}
      
      {/* License Type Selector */}
      <select
        value={formData.licenseType}
        onChange={(e) => setFormData({...formData, licenseType: e.target.value})}
      >
        <option value="COMMERCIAL_USE">Commercial Use (5% royalty)</option>
        <option value="COMMERCIAL_REMIX">Commercial Remix (10% royalty)</option>
        <option value="NON_COMMERCIAL">Non-Commercial (Free)</option>
      </select>

      {/* Revenue Share Slider */}
      <input
        type="range"
        min="0"
        max="100"
        value={formData.commercialRevShare}
        onChange={(e) => setFormData({...formData, commercialRevShare: parseInt(e.target.value)})}
      />
      <span>{formData.commercialRevShare}% Revenue Share</span>

      <button type="submit">Upload & Register</button>
    </form>
  );
}
```

---

## ✅ Migration Checklist

### For Developers

- [ ] Update `src/lib/storyProtocolClient.js` (done ✅)
- [ ] Create new API endpoint `/api/assets/register-ip-modern` (done ✅)
- [ ] Add `EnhancedUploadFlow` component (done ✅)
- [ ] Update upload page to use new flow
- [ ] Add license type selector to UI
- [ ] Add revenue share configuration
- [ ] Test complete flow
- [ ] Update fractionalization to check for royalty vault

### For Testing

- [ ] Upload test asset
- [ ] Verify single transaction
- [ ] Check IP ID returned
- [ ] Verify license terms attached
- [ ] Confirm royalty vault created
- [ ] Test fractionalization works
- [ ] Verify on Story Explorer

---

## 🔍 Verification

### Check Registration Success

```bash
# 1. Check transaction on Story Explorer
https://aeneid.storyscan.io/tx/YOUR_TX_HASH

# 2. Verify IP Asset
https://aeneid.storyscan.io/address/YOUR_IP_ID

# 3. Check License Terms Attached
# Look for "License Terms" section on explorer

# 4. Verify Royalty Vault Created
# Look for "Royalty Vault" address on explorer
```

### Programmatic Verification

```javascript
// Check if royalty vault exists
import { getRoyaltyTokenAddress } from '@/lib/storyRoyaltyTokens';

const royaltyTokenAddress = await getRoyaltyTokenAddress(
  provider,
  ipId
);

if (royaltyTokenAddress) {
  console.log('✅ Royalty vault exists:', royaltyTokenAddress);
  console.log('✅ Ready for fractionalization!');
} else {
  console.log('❌ No royalty vault found');
}
```

---

## 🐛 Troubleshooting

### Issue: "Royalty vault not found"
**Solution**: The vault is created when license terms are attached. Use the new SPG method which does this automatically.

### Issue: "Cannot fractionalize asset"
**Solution**: Ensure asset was registered with license terms attached (use modern endpoint).

### Issue: "Transaction failed"
**Solution**: 
1. Check wallet has enough IP tokens for gas
2. Verify metadata URIs are accessible
3. Check Story Protocol RPC is responding
4. Retry with same parameters (idempotent)

### Issue: "License terms not attached"
**Solution**: Use `/api/assets/register-ip-modern` endpoint, not the old `/api/assets/register-ip`.

---

## 📚 Additional Resources

- [Story Protocol Docs](https://docs.story.foundation)
- [SPG Contract on Aeneid](https://aeneid.storyscan.io/address/0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc)
- [Register IP Asset Tutorial](https://docs.story.foundation/developers/typescript-sdk/register-ip-asset)
- [License Terms Guide](https://docs.story.foundation/concepts/licensing)

---

## 🎉 Summary

✅ **New modern one-transaction method implemented**
✅ **Automatic royalty vault creation**
✅ **Enhanced UI with progress indicators**
✅ **Ready for fractionalization**
✅ **Better UX and reliability**

**Next Steps:**
1. Integrate `EnhancedUploadFlow` into upload page
2. Test complete flow
3. Update fractionalization page if needed
4. Deploy and celebrate! 🎨🔗

