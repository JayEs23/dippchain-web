// Story Protocol SDK Client
// Handles IP Asset registration, licensing, and royalties on Story Protocol

import { StoryClient, PILFlavor } from '@story-protocol/core-sdk';
import { http, parseEther, custom } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Story Protocol Aeneid Testnet addresses
export const STORY_CONTRACTS = {
  // Core contracts on Aeneid
  SPG: '0x69415CE984A79a3Cfbcf86376be5Dd7Ec6f8F9d0', // Story Protocol Gateway
  SPG_NFT: '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc', // Public SPG NFT Contract for minting
  IP_ASSET_REGISTRY: '0x77319B4031e6eF1250907aa00018B8B1c67a244b',
  LICENSING_MODULE: '0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f',
  PIL_TEMPLATE: '0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316',
  ROYALTY_POLICY_LAP: '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E', // LAP Royalty Policy
  CURRENCY_TOKEN: '0x1514000000000000000000000000000000000000', // $WIP native token
};

// PIL License Terms IDs on Aeneid
export const PIL_LICENSE_TERMS = {
  NON_COMMERCIAL_SOCIAL_REMIXING: 1n,
  COMMERCIAL_USE: 2n,
  COMMERCIAL_REMIX: 3n,
};

// Predefined license configurations for easy use
export const LICENSE_CONFIGS = {
  COMMERCIAL_USE: {
    transferable: true,
    royaltyPolicy: STORY_CONTRACTS.ROYALTY_POLICY_LAP,
    defaultMintingFee: '10000000000000000000', // 10 $WIP
    commercialUse: true,
    commercialRevShare: 5, // 5%
    derivativesAllowed: true,
    currency: STORY_CONTRACTS.CURRENCY_TOKEN,
  },
  COMMERCIAL_REMIX: {
    transferable: true,
    royaltyPolicy: STORY_CONTRACTS.ROYALTY_POLICY_LAP,
    defaultMintingFee: '15000000000000000000', // 15 $WIP
    commercialUse: true,
    commercialRevShare: 10, // 10%
    derivativesAllowed: true,
    currency: STORY_CONTRACTS.CURRENCY_TOKEN,
  },
  NON_COMMERCIAL: {
    transferable: true,
    royaltyPolicy: STORY_CONTRACTS.ROYALTY_POLICY_LAP,
    defaultMintingFee: '0', // Free
    commercialUse: false,
    commercialRevShare: 0,
    derivativesAllowed: true,
    currency: STORY_CONTRACTS.CURRENCY_TOKEN,
  },
};

/**
 * Create Story Protocol client for browser (using wallet provider)
 * 
 * @param {Object} walletClient - Viem wallet client from Wagmi (via useWalletClient)
 * @returns {Promise<StoryClient>} Story Protocol client instance
 */
export const createStoryClientBrowser = async (walletClient) => {
  if (!walletClient) {
    throw new Error('Wallet client is required');
  }

  // ✅ Correct Story SDK config structure
  const config = {
    wallet: walletClient,                    // Pass wallet client directly
    transport: custom(walletClient.transport), // Use custom() with wallet's transport
    chainId: 'aeneid',                        // Story Aeneid Testnet
  };

  const client = StoryClient.newClient(config);
  return client;
};

/**
 * Create Story Protocol client for server (using private key)
 */
const getRpcUrlList = () => {
  const raw =
    process.env.RPC_PROVIDER_URLS ||
    process.env.RPC_PROVIDER_URL ||
    'https://aeneid.storyrpc.io';
  return raw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
};

export const getStoryRpcUrls = getRpcUrlList;

export const createStoryClientServer = async (rpcOverride) => {
  if (!process.env.WALLET_PRIVATE_KEY) {
    throw new Error('WALLET_PRIVATE_KEY not set in environment variables');
  }

  // Clean up the private key - remove quotes, whitespace, etc.
  let privateKey = process.env.WALLET_PRIVATE_KEY
    .trim()
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\s/g, '');  // Remove whitespace

  // Ensure 0x prefix
  if (!privateKey.startsWith('0x')) {
    privateKey = `0x${privateKey}`;
  }

  // Validate length (should be 66 chars with 0x prefix, or 64 without)
  if (privateKey.length !== 66) {
    console.error('Private key length:', privateKey.length, '(expected 66 with 0x prefix)');
    console.error('Private key preview:', privateKey.slice(0, 10) + '...' + privateKey.slice(-4));
    throw new Error(`Invalid private key length: ${privateKey.length}. Expected 66 characters (including 0x prefix)`);
  }

  // Validate hex format
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error('Invalid private key format. Must be 64 hex characters (with 0x prefix)');
  }

  console.log('Private key validated, creating account...');
  const account = privateKeyToAccount(privateKey);
  console.log('Account address:', account.address);

  const rpcCandidates = getRpcUrlList();
  const rpcUrl = rpcOverride || rpcCandidates[0] || 'https://aeneid.storyrpc.io';
  
  // ✅ Correct Story SDK config structure for server
  // For server-side with private key, pass account directly (not wrapped in wallet)
  const config = {
    account: account,          // ✅ Pass account directly (not wallet)
    transport: http(rpcUrl),   // ✅ Use http transport directly
    chainId: 'aeneid',         // Story Aeneid Testnet
  };

  const client = StoryClient.newClient(config);
  return client;
};

/**
 * Register an NFT as an IP Asset on Story Protocol
 */
export const registerIPAsset = async (client, {
  nftContract,
  tokenId,
  ipMetadataURI,
  ipMetadataHash,
  nftMetadataURI,
  nftMetadataHash,
}) => {
  try {
    const response = await client.ipAsset.register({
      nftContract,
      tokenId,
      ipMetadata: {
        ipMetadataURI,
        ipMetadataHash,
        nftMetadataURI,
        nftMetadataHash,
      },
      txOptions: { waitForTransaction: true },
    });

    return {
      success: true,
      ipId: response.ipId,
      txHash: response.txHash,
    };
  } catch (error) {
    console.error('IP Asset registration error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Register IP Asset using SPG (Story Protocol Gateway) - RECOMMENDED METHOD
 * This is the modern, optimized way to register IP with license terms in ONE transaction.
 * 
 * Benefits:
 * - Single transaction (faster, cheaper)
 * - Automatically creates royalty vault
 * - Mints NFT + Registers IP + Attaches License in one go
 * - Required for fractionalization
 * 
 * @param {Object} client - Story Protocol client
 * @param {Object} params - Registration parameters
 * @param {string} params.ipMetadataURI - IPFS URI for IP metadata
 * @param {string} params.ipMetadataHash - Hash of IP metadata
 * @param {string} params.nftMetadataURI - IPFS URI for NFT metadata
 * @param {string} params.nftMetadataHash - Hash of NFT metadata
 * @param {string} params.licenseType - Type of license ('COMMERCIAL_USE', 'COMMERCIAL_REMIX', 'NON_COMMERCIAL')
 * @param {number} params.commercialRevShare - Revenue share percentage (default: 5)
 * @param {string} params.defaultMintingFee - Minting fee in wei (default: 10 WIP)
 * @returns {Promise<Object>} Registration result with ipId, txHash, tokenId, licenseTermsId
 */
export async function registerIPWithSPG(client, {
  ipMetadataURI,
  ipMetadataHash,
  nftMetadataURI,
  nftMetadataHash,
  licenseType = 'COMMERCIAL_USE',
  commercialRevShare = 5,
  defaultMintingFee = '10', // 10 WIP (will be parsed to wei)
}) {
  try {
    console.log('🚀 Registering IP Asset with SPG (one-transaction method)...');
    console.log('License Type:', licenseType);
    console.log('Revenue Share:', commercialRevShare + '%');
    console.log('Minting Fee:', defaultMintingFee, 'WIP');
    
    // ✅ Use PILFlavor helper to generate complete license terms
    // This automatically fills in ALL required PIL term fields
    let licenseTerms;
    
    // ✅ Revenue share must be multiplied by 10^6 (5% = 5,000,000)
    // PILFlavor helpers may handle this, but we'll ensure correct format
    const commercialRevShareFormatted = commercialRevShare * 10 ** 6;
    
    switch (licenseType) {
      case 'COMMERCIAL_REMIX':
        licenseTerms = PILFlavor.commercialRemix({
          commercialRevShare: commercialRevShareFormatted, // ✅ 5% = 5,000,000
          defaultMintingFee: parseEther(defaultMintingFee.toString()),
          currency: STORY_CONTRACTS.CURRENCY_TOKEN,
        });
        break;
      
      case 'NON_COMMERCIAL':
        licenseTerms = PILFlavor.nonCommercialSocialRemixing();
        break;
      
      case 'COMMERCIAL_USE':
      default:
        licenseTerms = PILFlavor.commercialUse({
          commercialRevShare: commercialRevShareFormatted, // ✅ 5% = 5,000,000
          defaultMintingFee: parseEther(defaultMintingFee.toString()),
          currency: STORY_CONTRACTS.CURRENCY_TOKEN,
        });
        break;
    }
    
    console.log('✅ License terms generated using PILFlavor helper');
    console.log('Commercial Rev Share:', commercialRevShare + '%');
    console.log('Minting Fee:', defaultMintingFee, 'WIP');
    
    // Register IP Asset using SPG with license terms
    const response = await client.ipAsset.registerIpAsset({
      nft: {
        type: "mint", // Mint new NFT
        spgNftContract: STORY_CONTRACTS.SPG_NFT, // Use public SPG NFT contract
      },
      ipMetadata: {
        ipMetadataURI,
        ipMetadataHash,
        nftMetadataURI,
        nftMetadataHash,
      },
      licenseTermsData: [{
        terms: licenseTerms, // ✅ Complete PIL terms from PILFlavor helper
      }],
      txOptions: { 
        waitForTransaction: true 
      },
    });
    
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
}

/**
 * Register an NFT as an IP Asset with Royalty Vault initialization (LEGACY METHOD)
 * This is the old two-step process - use registerIPWithSPG instead for better performance
 * 
 * NOTE: Attaching license terms automatically creates the royalty vault
 */
export const registerIPWithRoyalties = async (client, {
  nftContract,
  tokenId,
  ipMetadataURI,
  ipMetadataHash,
  nftMetadataURI,
  nftMetadataHash,
  licenseTermsId = PIL_LICENSE_TERMS.COMMERCIAL_USE,
}) => {
  try {
    // Step 1: Register IP Asset
    const registerResponse = await client.ipAsset.register({
      nftContract,
      tokenId,
      ipMetadata: {
        ipMetadataURI,
        ipMetadataHash,
        nftMetadataURI,
        nftMetadataHash,
      },
      txOptions: { waitForTransaction: true },
    });

    const ipId = registerResponse.ipId;
    console.log('IP Asset registered:', ipId);

    // Step 2: Attach License Terms (this creates the royalty vault)
    const licenseResponse = await client.license.attachLicenseTerms({
      ipId,
      licenseTermsId,
      txOptions: { waitForTransaction: true },
    });
    
    console.log('License terms attached, royalty vault created:', licenseResponse.txHash);

    return {
      success: true,
      ipId,
      txHash: registerResponse.txHash,
      licenseTxHash: licenseResponse.txHash,
    };
  } catch (error) {
    console.error('IP registration with royalties error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Attach PIL license terms to an IP Asset
 */
export const attachLicenseTerms = async (client, {
  ipId,
  licenseTermsId = PIL_LICENSE_TERMS.COMMERCIAL_USE,
}) => {
  try {
    const response = await client.license.attachLicenseTerms({
      ipId,
      licenseTermsId,
      txOptions: { waitForTransaction: true },
    });

    return {
      success: true,
      txHash: response.txHash,
    };
  } catch (error) {
    console.error('Attach license error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Mint license tokens for an IP Asset
 */
export const mintLicenseTokens = async (client, {
  licensorIpId,
  licenseTermsId,
  amount = 1,
  receiver,
}) => {
  try {
    const response = await client.license.mintLicenseTokens({
      licensorIpId,
      licenseTermsId,
      amount,
      receiver,
      txOptions: { waitForTransaction: true },
    });

    return {
      success: true,
      licenseTokenIds: response.licenseTokenIds,
      txHash: response.txHash,
    };
  } catch (error) {
    console.error('Mint license error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Register derivative IP (remix/derivative work)
 */
export const registerDerivative = async (client, {
  childIpId,
  parentIpIds,
  licenseTermsIds,
}) => {
  try {
    const response = await client.ipAsset.registerDerivative({
      childIpId,
      parentIpIds,
      licenseTermsIds,
      txOptions: { waitForTransaction: true },
    });

    return {
      success: true,
      txHash: response.txHash,
    };
  } catch (error) {
    console.error('Register derivative error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Collect royalty tokens from an IP Asset
 */
export const collectRoyaltyTokens = async (client, {
  parentIpId,
  royaltyVaultIpId,
}) => {
  try {
    const response = await client.royalty.collectRoyaltyTokens({
      parentIpId,
      royaltyVaultIpId,
      txOptions: { waitForTransaction: true },
    });

    return {
      success: true,
      royaltyTokensCollected: response.royaltyTokensCollected,
      txHash: response.txHash,
    };
  } catch (error) {
    console.error('Collect royalty error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Raise a dispute against an IP Asset
 */
export const raiseDispute = async (client, {
  targetIpId,
  disputeEvidenceHash, // IPFS CID of evidence
  targetTag = 'IMPROPER_REGISTRATION',
}) => {
  try {
    const response = await client.dispute.raiseDispute({
      targetIpId,
      disputeEvidenceHash,
      targetTag,
      txOptions: { waitForTransaction: true },
    });

    return {
      success: true,
      disputeId: response.disputeId,
      txHash: response.txHash,
    };
  } catch (error) {
    console.error('Raise dispute error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const storyProtocolClient = {
  createStoryClientBrowser,
  createStoryClientServer,
  registerIPAsset,
  registerIPWithSPG,
  registerIPWithRoyalties,
  attachLicenseTerms,
  mintLicenseTokens,
  registerDerivative,
  collectRoyaltyTokens,
  raiseDispute,
  STORY_CONTRACTS,
  PIL_LICENSE_TERMS,
  LICENSE_CONFIGS,
};

export default storyProtocolClient;

