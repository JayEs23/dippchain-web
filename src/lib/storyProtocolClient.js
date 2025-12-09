// Story Protocol SDK Client
// Handles IP Asset registration, licensing, and royalties on Story Protocol

import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Story Protocol Aeneid Testnet addresses
export const STORY_CONTRACTS = {
  // Core contracts on Aeneid
  SPG: '0x69415CE984A79a3Cfbcf86376be5Dd7Ec6f8F9d0', // Story Protocol Gateway
  IP_ASSET_REGISTRY: '0x77319B4031e6eF1250907aa00018B8B1c67a244b',
  LICENSING_MODULE: '0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f',
  PIL_TEMPLATE: '0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316',
};

// PIL License Terms IDs on Aeneid
export const PIL_LICENSE_TERMS = {
  NON_COMMERCIAL_SOCIAL_REMIXING: 1n,
  COMMERCIAL_USE: 2n,
  COMMERCIAL_REMIX: 3n,
};

/**
 * Create Story Protocol client for browser (using wallet provider)
 */
export const createStoryClientBrowser = async (walletClient) => {
  const config = {
    account: walletClient.account,
    transport: http('https://aeneid.storyrpc.io'),
    chainId: 'aeneid',
  };

  const client = StoryClient.newClient(config);
  return client;
};

/**
 * Create Story Protocol client for server (using private key)
 */
export const createStoryClientServer = async () => {
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

  const config = {
    account,
    transport: http('https://aeneid.storyrpc.io'),
    chainId: 'aeneid',
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

export default {
  createStoryClientBrowser,
  createStoryClientServer,
  registerIPAsset,
  attachLicenseTerms,
  mintLicenseTokens,
  registerDerivative,
  collectRoyaltyTokens,
  raiseDispute,
  STORY_CONTRACTS,
  PIL_LICENSE_TERMS,
};

