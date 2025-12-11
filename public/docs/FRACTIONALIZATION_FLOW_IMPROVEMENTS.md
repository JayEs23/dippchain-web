# Fractionalization Flow Improvements

## Summary of Changes

### 1. ✅ Deleted Unused Route
- **Removed**: `/api/fractions/create.js` (legacy route for custom token deployment)
- **Reason**: Not using Story Protocol's native royalty tokens
- **Status**: No longer needed, all fractionalization now uses Story Protocol

### 2. ✅ Improved `/api/story-fractions/create.js`

#### Issues Fixed:
1. **Incorrect Total Supply**: Was using hardcoded `100000000` (base units) instead of `100` (human-readable tokens)
   - **Fixed**: Now uses `STORY_ROYALTY_TOKEN_TOTAL_TOKENS` constant (100 tokens)

2. **Missing Validation**:
   - Added validation for `tokensForSale` and `pricePerToken` (must be positive numbers)
   - Added validation for `royaltyTokenAddress` format (must be valid Ethereum address)
   - Added validation that `tokensForSale` doesn't exceed total supply (100 tokens)
   - Added validation that creator retains at least some tokens

3. **Missing Creator FractionHolder Record**:
   - **Fixed**: Now creates a `FractionHolder` record for the creator with their retained tokens
   - Uses database transaction to ensure atomicity

4. **Better Error Handling**:
   - More descriptive error messages
   - Proper validation error responses
   - Transaction rollback on errors

#### New Response Format:
```json
{
  "success": true,
  "fractionalization": { ... },
  "message": "Fractionalization record created using Story Protocol Royalty Tokens",
  "summary": {
    "totalTokens": 100,
    "tokensForSale": 50,
    "creatorTokens": 50,
    "creatorPercentage": "50.00"
  }
}
```

### 3. ✅ Verified Fractionalization Flow

#### Current Flow:
1. **Frontend** (`/dashboard/fractions/create`):
   - User selects an asset registered on Story Protocol
   - If vault not found, user can initialize it via `/api/story/initialize-vault`
   - After vault is found, user sets:
     - `tokensForSale`: Number of tokens to sell (0-100)
     - `pricePerToken`: Price per token in IP
   - Calls `/api/story-fractions/create` to create DB record

2. **Backend** (`/api/story-fractions/create`):
   - Validates all inputs
   - Checks asset exists and is registered on Story Protocol
   - Checks asset is not already fractionalized
   - Creates `Fractionalization` record with:
     - `totalSupply`: 100 (human-readable tokens)
     - `availableSupply`: tokensForSale
     - `tokenAddress`: Story Protocol royalty vault address
     - `status`: 'DEPLOYED' (vault already exists on-chain)
   - Creates `FractionHolder` record for creator with retained tokens

3. **Database**:
   - `Fractionalization` table stores the fractionalization metadata
   - `FractionHolder` table tracks token ownership
   - Creator's initial holding is automatically recorded

#### Story Protocol Integration:
- Uses Story Protocol's native **IP Royalty Vault** (ERC-20 tokens)
- Each IP has exactly **100 Royalty Tokens** (with 6 decimals = 100 * 10^6 base units)
- Vault is automatically deployed when:
  - License terms are attached to IP Asset, OR
  - First license token is minted, OR
  - First derivative is registered

## Constants Reference

From `src/lib/storyRoyaltyTokens.js`:
- `STORY_ROYALTY_TOKEN_TOTAL_TOKENS`: 100 (human-readable)
- `STORY_ROYALTY_TOKEN_DECIMALS`: 6
- `STORY_ROYALTY_TOKEN_TOTAL_SUPPLY`: 100,000,000 (base units = 100 * 10^6)

## Next Steps

1. ✅ All fractionalization now uses Story Protocol's native royalty tokens
2. ✅ Creator's retained tokens are properly tracked in database
3. ✅ Validation ensures data integrity
4. ⚠️ **TODO**: Verify marketplace buy/sell flows work with Story Protocol tokens
5. ⚠️ **TODO**: Test end-to-end: create → list → buy → transfer

## Notes

- The `totalSupply` in the database is stored as human-readable tokens (100), not base units
- When transferring tokens on-chain, use `tokensToWei()` helper to convert to base units
- The vault address is the ERC-20 token contract address for the IP's royalty vault

