/**
 * Story Protocol Native Royalty Tokens Integration
 * 
 * Story Protocol automatically creates IP Royalty Vaults for each IP Asset.
 * These vaults ARE ERC-20 tokens (100M supply) that represent fractional ownership
 * and revenue sharing rights.
 * 
 * This library provides helpers to:
 * 1. Get the Royalty Token address for an IP Asset
 * 2. Transfer tokens from IP Account to buyers (primary market)
 * 3. Check token balances and revenue claims
 */

import { Contract } from 'ethers';
import { CONTRACTS } from '@/contracts/addresses';

// ERC-20 ABI for Royalty Token interactions
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

// Royalty Module ABI
const ROYALTY_MODULE_ABI = [
  'function ipRoyaltyVaults(address ipId) view returns (address)',
  'function payRoyaltyOnBehalf(address receiverIpId, address payerIpId, address token, uint256 amount) external',
];

// IP Account ABI (for executing transactions)
const IP_ACCOUNT_ABI = [
  'function execute(address to, uint256 value, bytes calldata data) external payable returns (bytes memory)',
  'function owner() view returns (address)',
];

/**
 * Get the Royalty Token (IP Royalty Vault) address for an IP Asset
 * @param {Object} provider - Ethers provider
 * @param {string} ipId - IP Asset ID (address)
 * @returns {Promise<string|null>} Royalty Token contract address, or null if vault doesn't exist
 */
export async function getRoyaltyTokenAddress(provider, ipId) {
  console.log('=== Fetching Royalty Vault Address ===');
  console.log('IP ID:', ipId);
  console.log('Royalty Module:', CONTRACTS.StoryProtocol.RoyaltyModule);
  
  const royaltyModule = new Contract(
    CONTRACTS.StoryProtocol.RoyaltyModule,
    ROYALTY_MODULE_ABI,
    provider
  );
  
  try {
    // Wrap the contract call in an additional try-catch for BAD_DATA errors
    let vaultAddress;
    try {
      vaultAddress = await royaltyModule.ipRoyaltyVaults(ipId);
    } catch (decodeError) {
      // Specifically handle decoding errors (empty return data)
      if (decodeError.code === 'BAD_DATA' || 
          decodeError.code === 'CALL_EXCEPTION' ||
          decodeError.message?.includes('could not decode') ||
          decodeError.message?.includes('value="0x"')) {
        console.warn(`⚠️ Royalty vault not deployed yet for IP Asset: ${ipId}`);
        console.warn('📝 The vault is created automatically when you:');
        console.warn('   1. Attach license terms to the IP Asset');
        console.warn('   2. Or manually initialize it via the Initialize Vault button');
        return null;
      }
      // Re-throw if it's a different error
      throw decodeError;
    }
    
    console.log('Vault address returned:', vaultAddress);
    
    // Check if vault exists (non-zero address)
    if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
      console.warn(`No royalty vault found for IP Asset: ${ipId}`);
      console.warn('Royalty vault is created when you attach license terms.');
      console.warn('If you just attached license terms, please wait a few moments and try again.');
      return null;
    }
    
    console.log('✅ Royalty vault found:', vaultAddress);
    return vaultAddress;
  } catch (error) {
    console.error('Unexpected error getting royalty vault address:', error);
    throw error;
  }
}

/**
 * Get Royalty Token details
 * @param {Object} provider - Ethers provider
 * @param {string} royaltyTokenAddress - Royalty Token contract address
 * @returns {Promise<Object>} Token details (name, symbol, decimals, totalSupply)
 */
export async function getRoyaltyTokenDetails(provider, royaltyTokenAddress) {
  const token = new Contract(royaltyTokenAddress, ERC20_ABI, provider);
  
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
  ]);
  
  return {
    address: royaltyTokenAddress,
    name,
    symbol,
    decimals,
    totalSupply: totalSupply.toString(),
  };
}

/**
 * Get Royalty Token balance for an account
 * @param {Object} provider - Ethers provider
 * @param {string} royaltyTokenAddress - Royalty Token contract address
 * @param {string} accountAddress - Account to check
 * @returns {Promise<string>} Token balance
 */
export async function getRoyaltyTokenBalance(provider, royaltyTokenAddress, accountAddress) {
  const token = new Contract(royaltyTokenAddress, ERC20_ABI, provider);
  const balance = await token.balanceOf(accountAddress);
  return balance.toString();
}

/**
 * Transfer Royalty Tokens from IP Account to a buyer
 * This is used for PRIMARY MARKET sales (creator selling tokens)
 * 
 * NOTE: Amount should be in wei (with 6 decimals). Use tokensToWei() to convert.
 * 
 * @param {Object} signer - Ethers signer (must be IP Account owner)
 * @param {string} ipId - IP Asset ID (address, also the IP Account address)
 * @param {string} royaltyTokenAddress - Royalty Token contract address
 * @param {string} buyerAddress - Buyer's wallet address
 * @param {string} amountInWei - Amount of tokens to transfer in wei (with 6 decimals)
 * @returns {Promise<Object>} Transaction result
 */
export async function transferRoyaltyTokensFromIPAccount(
  signer,
  ipId,
  royaltyTokenAddress,
  buyerAddress,
  amountInWei
) {
  // Create IP Account contract instance
  const ipAccount = new Contract(ipId, IP_ACCOUNT_ABI, signer);
  
  // Verify signer is the IP Account owner
  const owner = await ipAccount.owner();
  const signerAddress = await signer.getAddress();
  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error(`Only IP Account owner can transfer tokens. Owner: ${owner}, Signer: ${signerAddress}`);
  }
  
  // Encode the ERC-20 transfer call
  const token = new Contract(royaltyTokenAddress, ERC20_ABI, signer);
  const transferData = token.interface.encodeFunctionData('transfer', [buyerAddress, amountInWei]);
  
  // Execute the transfer through IP Account
  const tx = await ipAccount.execute(
    royaltyTokenAddress, // target contract
    0, // no ETH value
    transferData // encoded transfer call
  );
  
  const receipt = await tx.wait();
  
  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Approve a marketplace contract to transfer Royalty Tokens
 * Used for SECONDARY MARKET sales (peer-to-peer trading)
 * 
 * NOTE: Amount should be in wei (with 6 decimals). Use tokensToWei() to convert.
 * 
 * @param {Object} signer - Ethers signer (token holder)
 * @param {string} royaltyTokenAddress - Royalty Token contract address
 * @param {string} spenderAddress - Marketplace contract address
 * @param {string} amountInWei - Amount to approve in wei (with 6 decimals)
 * @returns {Promise<Object>} Transaction result
 */
export async function approveRoyaltyTokens(signer, royaltyTokenAddress, spenderAddress, amountInWei) {
  const token = new Contract(royaltyTokenAddress, ERC20_ABI, signer);
  const tx = await token.approve(spenderAddress, amountInWei);
  const receipt = await tx.wait();
  
  return {
    success: true,
    txHash: receipt.hash,
  };
}

/**
 * Transfer Royalty Tokens directly (for secondary market or direct transfers)
 * 
 * NOTE: Amount should be in wei (with 6 decimals). Use tokensToWei() to convert.
 * 
 * @param {Object} signer - Ethers signer (token holder)
 * @param {string} royaltyTokenAddress - Royalty Token contract address
 * @param {string} toAddress - Recipient address
 * @param {string} amountInWei - Amount to transfer in wei (with 6 decimals)
 * @returns {Promise<Object>} Transaction result
 */
export async function transferRoyaltyTokens(signer, royaltyTokenAddress, toAddress, amountInWei) {
  const token = new Contract(royaltyTokenAddress, ERC20_ABI, signer);
  const tx = await token.transfer(toAddress, amountInWei);
  const receipt = await tx.wait();
  
  return {
    success: true,
    txHash: receipt.hash,
  };
}

/**
 * Get ownership percentage based on token balance
 * @param {string} balance - Token balance (in wei, with 6 decimals)
 * @param {string} totalSupply - Total supply (default: 100M with 6 decimals)
 * @returns {number} Ownership percentage (0-100)
 */
export function calculateOwnershipPercentage(balance, totalSupply = STORY_ROYALTY_TOKEN_SUPPLY) {
  const balanceNum = BigInt(balance);
  const totalNum = BigInt(totalSupply);
  
  if (totalNum === 0n) return 0;
  
  // Calculate percentage with 2 decimal places
  const percentage = (balanceNum * 10000n) / totalNum;
  return Number(percentage) / 100;
}

/**
 * Convert human-readable token amount to wei (with 6 decimals)
 * @param {number} amount - Human-readable amount (e.g., 1000000 for 1M tokens)
 * @returns {string} Amount in wei
 */
export function tokensToWei(amount) {
  const multiplier = BigInt(10 ** STORY_ROYALTY_TOKEN_DECIMALS);
  return (BigInt(Math.floor(amount)) * multiplier).toString();
}

/**
 * Convert wei to human-readable token amount (with 6 decimals)
 * @param {string} wei - Amount in wei
 * @returns {number} Human-readable amount
 */
export function weiToTokens(wei) {
  const divisor = BigInt(10 ** STORY_ROYALTY_TOKEN_DECIMALS);
  return Number(BigInt(wei) / divisor);
}

/**
 * Constants for Story Protocol Royalty Tokens
 */
export const STORY_ROYALTY_TOKEN_SUPPLY = '100000000000000'; // 100M tokens with 6 decimals (100,000,000 * 10^6)
export const STORY_ROYALTY_TOKEN_TOTAL_TOKENS = 100000000; // 100M tokens (human-readable)
export const STORY_ROYALTY_TOKEN_DECIMALS = 6; // Story Protocol uses 6 decimals

