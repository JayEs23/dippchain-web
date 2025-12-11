# Story Protocol Client Fixes

## Overview
This document details the critical fixes applied to `src/lib/storyProtocolClient.js` to align with Story Protocol SDK requirements and best practices.

---

## Issues Fixed

### 1. **Server Client Configuration** ✅

#### Problem
The server client was creating a fake `wallet` object and wrapping it incorrectly:
```javascript
// ❌ INCORRECT
const wallet = {
  account,
  transport: http(rpcUrl),
};
const config = {
  wallet,
  transport: custom(wallet.transport),
  chainId: 'aeneid',
};
```

#### Solution
For server-side with private key, the SDK expects `account` directly (not wrapped in wallet):
```javascript
// ✅ CORRECT
const config = {
  account: account,          // Pass account directly
  transport: http(rpcUrl),   // Use http transport directly
  chainId: 'aeneid',
};
```

**File Changed:** `src/lib/storyProtocolClient.js` (lines 117-123)

---

### 2. **Revenue Share Format** ✅

#### Problem
Revenue share was being passed as a percentage (e.g., `5` for 5%), but Story Protocol requires it multiplied by 10^6:
```javascript
// ❌ INCORRECT
commercialRevShare: 5  // Wrong format
```

#### Solution
Revenue share must be multiplied by 10^6 (5% = 5,000,000):
```javascript
// ✅ CORRECT
const commercialRevShareFormatted = commercialRevShare * 10 ** 6;
// 5% = 5,000,000
```

**File Changed:** `src/lib/storyProtocolClient.js` (lines 210-232)

**Note:** PILFlavor helpers may handle this conversion internally, but we ensure correct format explicitly.

---

### 3. **Constant Naming** ✅

#### Problem
The royalty policy constant was named `ROYALTY_POLICY`, which doesn't clearly indicate it's the LAP (License Attribution Policy) contract.

#### Solution
Renamed to `ROYALTY_POLICY_LAP` for clarity:
```javascript
// ✅ CORRECT
ROYALTY_POLICY_LAP: '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E', // LAP Royalty Policy
```

**File Changed:** `src/lib/storyProtocolClient.js` (lines 16, 31, 40, 49)

---

### 4. **Unused Imports** ✅

#### Problem
`StoryConfig` and `aeneid` were imported but not used in the file.

#### Solution
Removed unused imports:
```javascript
// ❌ BEFORE
import { StoryClient, StoryConfig, PILFlavor, aeneid } from '@story-protocol/core-sdk';

// ✅ AFTER
import { StoryClient, PILFlavor } from '@story-protocol/core-sdk';
```

**File Changed:** `src/lib/storyProtocolClient.js` (line 4)

---

### 5. **Linter Warning** ✅

#### Problem
Default export was not assigned to a variable before exporting, causing a linter warning.

#### Solution
Assigned export object to a variable:
```javascript
// ✅ CORRECT
const storyProtocolClient = {
  createStoryClientBrowser,
  createStoryClientServer,
  // ... other exports
};

export default storyProtocolClient;
```

**File Changed:** `src/lib/storyProtocolClient.js` (lines 484-498)

---

## Complete License Terms Structure

When using `PILFlavor.commercialUse()` with proper revenue share formatting, the generated license terms include all required fields:

```javascript
{
  transferable: true,
  royaltyPolicy: "0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E",
  defaultMintingFee: BigInt("10000000000000000000"), // 10 WIP
  expiration: BigInt(0),
  commercialUse: true,
  commercialAttribution: true,
  commercializerChecker: "0x0000000000000000000000000000000000000000",
  commercializerCheckerData: "0x",
  commercialRevShare: 5000000, // ✅ 5% = 5,000,000 (multiplied by 10^6)
  commercialRevCeiling: BigInt(0),
  derivativesAllowed: true,
  derivativesAttribution: true,
  derivativesApproval: false,
  derivativesReciprocal: true,
  derivativeRevCeiling: BigInt(0),
  currency: "0x1514000000000000000000000000000000000000", // WIP token
  uri: "",
}
```

---

## Testing Checklist

- [ ] Server client initializes correctly with private key
- [ ] Browser client initializes correctly with wallet provider
- [ ] Revenue share is formatted correctly (5% = 5,000,000)
- [ ] License terms include all required PIL fields
- [ ] SPG registration succeeds with proper license terms
- [ ] No linter errors or warnings

---

## Related Files

- `src/lib/storyProtocolClient.js` - Main client file (fixed)
- `src/pages/api/assets/register-ip.js` - Uses `registerIPWithSPG`
- `src/pages/api/assets/register-ip-modern.js` - Uses `registerIPWithSPG`

---

## References

- [Story Protocol SDK Documentation](https://docs.story.foundation/)
- [PIL License Terms](https://docs.story.foundation/protocol/pil)
- [Revenue Share Format](https://docs.story.foundation/protocol/pil#commercial-revenue-share)

