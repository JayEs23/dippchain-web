# Marketplace Implementation - Primary + Secondary Trading

## Overview

This implementation uses **Story Protocol's native Royalty Tokens** for both primary and secondary market trading, eliminating the need for custom fractionalization contracts.

## Architecture

### Primary Market (Creator → Buyers)
- **Seller**: Original IP creator
- **Tokens**: Held in IP Account (100M total)
- **Mechanism**: Transfer from IP Account to buyers
- **Payment**: Direct to creator
- **Use Case**: Initial fundraising, creator selling ownership shares

### Secondary Market (Peer-to-Peer)
- **Seller**: Any token holder
- **Tokens**: Held in user wallets
- **Mechanism**: Standard ERC-20 transfer
- **Payment**: Direct to seller (minus 2.5% platform fee)
- **Use Case**: Trading, price discovery, liquidity

## Flow Diagrams

### Primary Market Flow

```
1. Creator uploads asset → Registers on Story Protocol
2. Story Protocol creates IP Royalty Vault (100M ERC-20 tokens)
3. IP Account receives all 100M tokens
4. Creator decides to sell 80M tokens, keep 20M
5. Creator lists 80M tokens at X IP per token
   ↓
6. Buyer browses marketplace, finds listing
7. Buyer enters amount to buy (e.g., 1M tokens)
8. Buyer clicks "Buy Tokens"
   ↓
9. Frontend calls transferRoyaltyTokensFromIPAccount()
   - Creator (IP Account owner) must sign transaction
   - Tokens transfer from IP Account → Buyer wallet
   ↓
10. Buyer sends payment (IP tokens) to creator
11. Database updated: availableSupply -= 1M, FractionHolder created for buyer
12. Purchase complete!
```

### Secondary Market Flow

```
1. Token holder decides to sell 500K tokens
2. Holder creates listing: 500K tokens at Y IP per token
3. Listing appears in marketplace with "SECONDARY" badge
   ↓
4. Buyer browses marketplace, finds listing
5. Buyer enters amount to buy (e.g., 100K tokens)
6. Buyer clicks "Buy Tokens"
   ↓
7. Buyer sends payment (IP tokens) to seller
8. Seller transfers tokens to buyer (ERC-20 transfer)
9. Database updated: listing amount reduced, FractionHolder records updated
10. Platform fee (2.5%) deducted from seller's revenue
11. Purchase complete!
```

## Database Schema

### Fractionalization (Primary Market)
```prisma
model Fractionalization {
  id                String
  assetId           String   @unique
  tokenAddress      String   // Story Protocol Royalty Token address
  tokenName         String
  tokenSymbol       String
  totalSupply       Float    // Always 100,000,000 for Story tokens
  availableSupply   Float    // How many tokens creator has left to sell
  pricePerToken     Float
  currency          String   @default("IP")
  status            String   @default("DEPLOYED")
  createdAt         DateTime
  updatedAt         DateTime
}
```

### MarketplaceListing (Secondary Market)
```prisma
model MarketplaceListing {
  id                  String
  fractionalizationId String
  sellerId            String
  amount              Float    // How many tokens seller wants to sell
  pricePerToken       Float
  totalPrice          Float
  currency            String   @default("IP")
  listingType         String   @default("SECONDARY")
  status              String   @default("ACTIVE") // ACTIVE, SOLD, CANCELED
  createdAt           DateTime
  updatedAt           DateTime
}
```

### FractionHolder (Token Ownership Tracking)
```prisma
model FractionHolder {
  id                  String
  fractionalizationId String
  userId              String
  amount              Float      // How many tokens they own
  percentageOwned     Float      // % of 100M total
  createdAt           DateTime
  updatedAt           DateTime
}
```

## API Routes

### `/api/story-fractions/create` (POST)
**Purpose**: Create fractionalization record using Story Protocol tokens

**Input**:
```json
{
  "assetId": "uuid",
  "royaltyTokenAddress": "0x...", // Story Protocol IP Royalty Vault address
  "tokensForSale": 80000000,      // 80M tokens for sale
  "pricePerToken": 0.00001,       // Price in IP
  "currency": "IP"
}
```

**Output**:
```json
{
  "success": true,
  "fractionalization": { /* Fractionalization record */ },
  "message": "Fractionalization record created using Story Protocol Royalty Tokens"
}
```

### `/api/marketplace/listings` (GET)
**Purpose**: Get all marketplace listings (primary + secondary)

**Query Params**:
- `type`: `'all'`, `'primary'`, or `'secondary'`
- `status`: `'ACTIVE'`, `'SOLD'`, etc.
- `page`: Pagination
- `limit`: Results per page

**Output**:
```json
{
  "success": true,
  "listings": [
    {
      "id": "...",
      "type": "PRIMARY",              // or "SECONDARY"
      "fractionalizationId": "...",
      "assetId": "...",
      "asset": { /* Asset details */ },
      "tokenAddress": "0x...",        // Story Protocol Royalty Token
      "tokenName": "...",
      "tokenSymbol": "RT",
      "amount": 80000000,             // Tokens available
      "pricePerToken": 0.00001,
      "currency": "IP",
      "totalPrice": 800,
      "seller": { /* Creator or token holder */ },
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": { /* Pagination info */ }
}
```

### `/api/marketplace/buy-primary` (POST)
**Purpose**: Buy tokens from primary market (from creator)

**Input**:
```json
{
  "fractionalizationId": "uuid",
  "buyerAddress": "0x...",
  "amount": 1000000,           // 1M tokens
  "txHash": "0x..."            // Payment transaction hash
}
```

**Process**:
1. Verify fractionalization exists and has enough tokens
2. Update `availableSupply` in Fractionalization
3. Create/update `FractionHolder` record for buyer
4. Create `Order` record
5. Create `Revenue` record for creator

**Output**:
```json
{
  "success": true,
  "order": { /* Order record */ },
  "message": "Primary market purchase completed"
}
```

### `/api/marketplace/create-listing` (POST)
**Purpose**: Create secondary market listing

**Input**:
```json
{
  "fractionalizationId": "uuid",
  "sellerAddress": "0x...",
  "amount": 500000,            // 500K tokens to sell
  "pricePerToken": 0.00002,    // Higher than primary market price
  "currency": "IP"
}
```

**Process**:
1. Verify seller owns enough tokens (check `FractionHolder`)
2. Create `MarketplaceListing` record

**Output**:
```json
{
  "success": true,
  "listing": { /* MarketplaceListing record */ },
  "message": "Secondary market listing created"
}
```

### `/api/marketplace/buy-secondary` (POST)
**Purpose**: Buy tokens from secondary market (peer-to-peer)

**Input**:
```json
{
  "listingId": "uuid",
  "buyerAddress": "0x...",
  "amount": 100000,            // 100K tokens
  "txHash": "0x..."            // Payment transaction hash
}
```

**Process**:
1. Verify listing exists and is active
2. Update listing (reduce amount or mark as SOLD)
3. Update seller's `FractionHolder` (reduce amount)
4. Update/create buyer's `FractionHolder` (add amount)
5. Create `Order` record
6. Create `Revenue` record for seller (minus 2.5% platform fee)

**Output**:
```json
{
  "success": true,
  "order": { /* Order record */ },
  "message": "Secondary market purchase completed"
}
```

## Frontend Components

### `/dashboard/fractions/create`
**Purpose**: Create fractionalization using Story Protocol tokens

**Features**:
- Select eligible asset (must have `storyProtocolId`)
- Fetch Royalty Token address from Story Protocol
- Set how many tokens to sell (slider: 0-100%)
- Set price per token
- Visual breakdown: tokens you keep vs. tokens for sale
- Creates fractionalization record in database

**User Experience**:
1. User selects asset
2. System fetches Story Protocol Royalty Token details
3. User drags slider to set retention percentage (e.g., 20%)
   - Shows: "You keep 20M tokens, Sell 80M tokens"
4. User sets price per token (e.g., 0.00001 IP)
5. User clicks "Create Fractionalization"
6. Success! Tokens now listed in marketplace

### `/dashboard/marketplace`
**Purpose**: Buy tokens from primary or secondary markets

**Features**:
- Filter tabs: All Markets, Primary Market, Secondary Market
- Listing cards show:
  - Asset thumbnail
  - Market type badge (Primary/Secondary)
  - Available tokens
  - Price per token
  - Input field: amount to buy
  - Total cost calculation
  - "Buy Tokens" button
- Handles blockchain transactions
- Updates database records

**User Experience - Primary Market**:
1. Buyer browses marketplace
2. Finds asset in "Primary Market" (creator selling)
3. Enters amount to buy (e.g., 1M tokens)
4. Clicks "Buy Tokens"
5. Wallet prompts:
   a. Transfer tokens from IP Account (creator must sign)
   b. Send payment to creator
6. Success! Buyer now owns tokens and receives revenue share

**User Experience - Secondary Market**:
1. Buyer browses marketplace
2. Finds listing in "Secondary Market" (peer-to-peer)
3. Enters amount to buy (e.g., 100K tokens)
4. Clicks "Buy Tokens"
5. Wallet prompts:
   a. Send payment to seller
   b. (Seller transfers tokens separately - could be automated with escrow)
6. Success! Buyer now owns tokens

## Smart Contract Interactions

### Primary Market: Transfer from IP Account

```javascript
import { transferRoyaltyTokensFromIPAccount } from '@/lib/storyRoyaltyTokens';

// Creator (IP Account owner) must sign this transaction
const result = await transferRoyaltyTokensFromIPAccount(
  signer,                          // Creator's signer
  asset.storyProtocolId,           // IP Account address (same as IP ID)
  royaltyTokenAddress,             // Story Protocol Royalty Token address
  buyerAddress,                    // Buyer's wallet address
  amount.toString()                // Amount of tokens to transfer
);
```

**What happens under the hood**:
1. Creates `IPAccount` contract instance
2. Encodes `transfer(buyer, amount)` call for Royalty Token
3. Calls `IPAccount.execute(royaltyToken, 0, transferData)`
4. IP Account executes the transfer
5. Buyer receives tokens

### Secondary Market: Direct ERC-20 Transfer

```javascript
import { transferRoyaltyTokens } from '@/lib/storyRoyaltyTokens';

// Seller transfers tokens directly to buyer
const result = await transferRoyaltyTokens(
  signer,                          // Seller's signer
  royaltyTokenAddress,             // Story Protocol Royalty Token address
  buyerAddress,                    // Buyer's wallet address
  amount.toString()                // Amount of tokens to transfer
);
```

**What happens under the hood**:
1. Creates `RoyaltyToken` (ERC-20) contract instance
2. Calls `token.transfer(buyer, amount)`
3. Standard ERC-20 transfer
4. Buyer receives tokens

## Revenue Distribution

### How Token Holders Earn

1. **Licensing Revenue**: When someone licenses the IP (derivatives, remixes):
   - Revenue flows to Story Protocol's Royalty Module
   - Royalty Module distributes to IP Royalty Vault
   - Token holders claim proportional shares

2. **Primary Sales**: When creator sells tokens:
   - Buyer pays creator directly
   - Creator receives immediate capital

3. **Secondary Sales**: When token holders trade:
   - Buyer pays seller directly
   - Platform takes 2.5% fee

### Claiming Revenue (Future Implementation)

```javascript
// Token holder claims their share of accumulated revenue
const royaltyVault = new Contract(royaltyTokenAddress, VAULT_ABI, signer);
await royaltyVault.claim();
```

## Key Advantages

### Using Story Protocol Royalty Tokens

✅ **No Custom Contracts**: Uses Story's battle-tested, audited contracts
✅ **Native Integration**: Automatic revenue distribution from Story Protocol
✅ **Standard ERC-20**: Compatible with all wallets, exchanges, DeFi
✅ **100M Supply**: Sufficient granularity for fractional ownership
✅ **Immutable**: Tokens can't be frozen or censored

### Primary + Secondary Markets

✅ **Creator Fundraising**: Sell tokens upfront for capital
✅ **Price Discovery**: Secondary market finds fair value
✅ **Liquidity**: Token holders can exit positions
✅ **Governance**: Token voting power (future)
✅ **Revenue Sharing**: All holders benefit from IP success

## Security Considerations

### Primary Market
- ⚠️ **IP Account Control**: Only IP Account owner can sell from primary market
- ⚠️ **Payment Verification**: Ensure payment received before token transfer
- ⚠️ **Supply Limits**: Can't sell more than `availableSupply`

### Secondary Market
- ⚠️ **Token Balance**: Seller must own tokens they're listing
- ⚠️ **Atomic Swaps**: Consider using escrow for atomic token-payment swaps
- ⚠️ **Platform Fee**: Ensure fee calculation is correct (2.5%)

### General
- ⚠️ **Wallet Verification**: Verify user owns wallet address
- ⚠️ **Transaction Finality**: Wait for block confirmations
- ⚠️ **Database Sync**: Keep database in sync with blockchain state

## Future Enhancements

### Escrow for Secondary Market
- Implement atomic swaps (payment + token transfer in one transaction)
- Use smart contract to hold tokens until payment received

### Automated Market Maker (AMM)
- Create liquidity pools for instant token swaps
- Similar to Uniswap, but for Royalty Tokens

### Fractional Governance
- Token holders vote on IP decisions
- Weighted by token balance

### Revenue Dashboard
- Show accumulated revenue per token
- One-click claim interface
- Revenue history and projections

### Advanced Order Types
- Limit orders
- Stop-loss orders
- Bulk purchasing discounts

## Testing Checklist

### Primary Market
- [ ] Creator can list tokens for sale
- [ ] Buyer can purchase tokens
- [ ] Payment goes to creator
- [ ] Tokens transfer from IP Account to buyer
- [ ] Database records updated correctly
- [ ] `availableSupply` decrements
- [ ] `FractionHolder` created for buyer

### Secondary Market
- [ ] Token holder can create listing
- [ ] Listing appears in marketplace
- [ ] Buyer can purchase from listing
- [ ] Payment goes to seller (minus fee)
- [ ] Tokens transfer from seller to buyer
- [ ] Database records updated correctly
- [ ] Listing amount decrements or marks as SOLD
- [ ] `FractionHolder` records updated for both parties

### Edge Cases
- [ ] Buying more than available
- [ ] Buying with insufficient funds
- [ ] Double-spending prevention
- [ ] Concurrent purchases
- [ ] Wallet disconnection during transaction
- [ ] Transaction failure handling

## Conclusion

This implementation leverages **Story Protocol's native Royalty Tokens** for both primary and secondary trading, providing a robust, scalable marketplace for fractional IP ownership without custom fractionalization contracts. Both markets work seamlessly together, enabling creators to raise capital while providing liquidity for investors.

