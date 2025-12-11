# Story Protocol Native Royalty Tokens Integration Guide

## 🔍 The Discovery

Story Protocol **already provides native fractional ownership tokens** (ERC-20) through their IP Royalty Vault system. Each IP Asset automatically gets:

- **100,000,000 Royalty Tokens** (ERC-20)
- Freely tradeable on secondary markets
- Proportional revenue sharing from derivatives/licensing
- Native integration with Story Protocol's royalty distribution

## ❌ What We Were Doing Wrong

We built **duplicate contracts**:
- `RoyaltyToken.sol` - Redundant ERC-20 token
- `FractionalizationManager.sol` - Redundant token creation
- `RoyaltyVault.sol` - Redundant revenue distribution

These recreated functionality that Story Protocol already provides natively.

## ✅ The Correct Architecture

### Story Protocol Native Flow

```
1. Register IP Asset on Story Protocol
   ↓
2. Story automatically creates IP Royalty Vault (ERC-20 token, 100M supply)
   ↓
3. IP Account (owner) receives all 100M tokens
   ↓
4. Owner transfers tokens to buyers (primary market)
   ↓
5. Buyers trade tokens peer-to-peer (secondary market)
   ↓
6. Revenue flows to IP Royalty Vault
   ↓
7. Token holders claim proportional shares
```

### Key Contracts (Story Protocol)

| Contract | Address | Purpose |
|----------|---------|---------|
| IP Asset Registry | `0x24E9a27d92e294F327ad93E884dE0fD6Bd856902` | IP registration |
| Royalty Module | `0xEa6eD700b11DfF703665CCAF55887ca56134Ae3B` | Revenue distribution |
| Licensing Module | `0x5a7D9Fa17DE09350F481A53B470D798c1c1b0acb` | PIL licensing |

## 📋 Implementation Steps

### 1. Get Royalty Token Address

After registering an IP Asset, get its Royalty Token address:

```javascript
import { getRoyaltyTokenAddress, getRoyaltyTokenDetails } from '@/lib/storyRoyaltyTokens';

// ipId is the Story Protocol IP Asset ID (address)
const royaltyTokenAddress = await getRoyaltyTokenAddress(provider, ipId);

const tokenDetails = await getRoyaltyTokenDetails(provider, royaltyTokenAddress);
// {
//   address: '0x...',
//   name: 'IP Royalty Token',
//   symbol: 'IPRT',
//   decimals: 6,
//   totalSupply: '100000000'
// }
```

### 2. Primary Market: Creator Sells Tokens

Transfer tokens from IP Account to buyers:

```javascript
import { transferRoyaltyTokensFromIPAccount } from '@/lib/storyRoyaltyTokens';

// Creator wants to sell 80M tokens (80%), keep 20M (20%)
const tokensToSell = '80000000';

// Transfer tokens from IP Account to buyer
const result = await transferRoyaltyTokensFromIPAccount(
  signer, // Must be IP Account owner
  ipId, // IP Asset ID (also the IP Account address)
  royaltyTokenAddress,
  buyerAddress,
  tokensToSell
);
```

### 3. Secondary Market: Peer-to-Peer Trading

Token holders can trade directly:

```javascript
import { transferRoyaltyTokens, approveRoyaltyTokens } from '@/lib/storyRoyaltyTokens';

// Direct transfer
await transferRoyaltyTokens(
  signer,
  royaltyTokenAddress,
  recipientAddress,
  amount
);

// Or approve marketplace contract
await approveRoyaltyTokens(
  signer,
  royaltyTokenAddress,
  marketplaceAddress,
  amount
);
```

### 4. Check Token Balances

```javascript
import { getRoyaltyTokenBalance, calculateOwnershipPercentage } from '@/lib/storyRoyaltyTokens';

const balance = await getRoyaltyTokenBalance(
  provider,
  royaltyTokenAddress,
  userAddress
);

const ownershipPercent = calculateOwnershipPercentage(balance, '100000000');
// e.g., 25.50% if balance is 25,500,000 tokens
```

### 5. Revenue Claims

Token holders claim their share of licensing revenue directly from the IP Royalty Vault:

```javascript
// The IP Royalty Vault contract has a claim() function
// Revenue from derivatives/licenses accumulates in the vault
// Token holders call claim() to receive their proportional share
```

## 🛠️ Migration Plan

### Option 1: Use Story Protocol Natively (Recommended)

**Pros:**
- No custom contracts to maintain
- Native integration with Story Protocol
- Automatic revenue distribution
- Standard ERC-20 tokens (compatible with all wallets/exchanges)

**Cons:**
- Less control over pricing/vesting
- Fixed 100M supply
- No custom governance features

**Implementation:**
1. ✅ Update `src/contracts/addresses.js` with Story Protocol contracts
2. ✅ Create `src/lib/storyRoyaltyTokens.js` helper library
3. ✅ Create `src/pages/api/story-fractions/create.js` API route
4. ⏳ Update `src/pages/dashboard/fractions/create.js` to use Story tokens
5. ⏳ Update marketplace to support Story Protocol Royalty Tokens
6. ⏳ Remove deprecated custom contracts

### Option 2: Hybrid Approach (If Custom Features Needed)

Keep `FractionalizationManager` as a **wrapper** that:
- Holds Story Protocol Royalty Tokens in custody
- Issues custom tokens with special features (vesting, custom pricing, governance)
- Maps custom tokens to Story tokens 1:1
- Forwards claims to Story Protocol

**Use this only if you need:**
- Custom vesting schedules
- Special pricing mechanisms
- Additional governance features
- Compliance/KYC requirements

## 📊 Database Schema Updates

The existing `Fractionalization` model works with Story Protocol tokens:

```prisma
model Fractionalization {
  tokenAddress      String?   // Story Protocol IP Royalty Vault address
  totalSupply       Float     // Always 100,000,000 for Story tokens
  availableSupply   Float     // Tokens creator wants to sell
  status            String    // "DEPLOYED" (Story already deployed it)
  // ... rest of fields
}
```

## 🚀 Frontend Flow

### Create Fractionalization Page

```javascript
// 1. User selects asset (must have storyProtocolId)
// 2. Get Royalty Token address from Story Protocol
const royaltyTokenAddress = await getRoyaltyTokenAddress(provider, asset.storyProtocolId);

// 3. User sets how many tokens to sell (0-100M) and price
const tokensForSale = 80000000; // 80%
const pricePerToken = 0.5; // 0.5 IP per token

// 4. Create fractionalization record in DB
await fetch('/api/story-fractions/create', {
  method: 'POST',
  body: JSON.stringify({
    assetId: asset.id,
    royaltyTokenAddress,
    tokensForSale,
    pricePerToken,
  }),
});

// 5. For each buyer, transfer tokens from IP Account
await transferRoyaltyTokensFromIPAccount(
  signer,
  asset.storyProtocolId,
  royaltyTokenAddress,
  buyerAddress,
  amountPurchased
);
```

## 🔗 Resources

- [Story Protocol Docs](https://docs.story.foundation/)
- [IP Royalty Vault Guide](https://docs.story.foundation/docs/ip-royalty-vault)
- [Claim Revenue Tutorial](https://docs.story.foundation/docs/claim-revenue)
- [IP Account Transactions](https://docs.story.foundation/docs/ip-account#executing-transactions)

## ⚠️ Important Notes

1. **IP Account Ownership**: Only the IP Account owner can transfer tokens from the IP Account. Ensure your user owns the IP before attempting primary sales.

2. **100M Fixed Supply**: Story Protocol Royalty Tokens have a fixed 100M supply. You cannot mint more.

3. **Decimals**: Story Royalty Tokens use 6 decimals, not 18 like most ERC-20 tokens.

4. **Revenue Source**: Revenue flows from derivatives and licensing, not from primary token sales. Primary sales are direct creator-to-buyer transactions.

5. **Gas Costs**: Transferring tokens from IP Account requires executing a transaction through the IP Account contract, which costs more gas than a direct ERC-20 transfer.

## 🎯 Next Steps

1. Update the frontend to use Story Protocol's native Royalty Tokens
2. Test primary market transfers (IP Account → Buyer)
3. Test secondary market transfers (Buyer → Buyer)
4. Implement revenue claim UI
5. Update marketplace to support Royalty Token trading
6. Deprecate custom contracts once migration is complete

