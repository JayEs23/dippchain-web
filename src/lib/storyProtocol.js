// Story Protocol SDK Integration
// For IP registration, licensing, and royalty management on Story Protocol

import { ethers } from 'ethers';

// Story Protocol Contract Addresses on Aeneid Testnet
export const STORY_PROTOCOL_ADDRESSES = {
  // Core Protocol Contracts (Aeneid Testnet)
  IP_ASSET_REGISTRY: '0x77319B4031e6eF1250907aa00018B8B1c67a244b',
  LICENSING_MODULE: '0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f',
  ROYALTY_MODULE: '0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086',
  DISPUTE_MODULE: '0x3347B4d90ebe72BeFb30444C9966B2B990aE9FcB',
  
  // PIL (Programmable IP License) Templates
  PIL_TEMPLATE: '0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316',
};

// License Types matching Story Protocol PIL
export const PIL_LICENSE_TYPES = {
  NON_COMMERCIAL_SOCIAL_REMIXING: {
    id: 1,
    name: 'Non-Commercial Social Remixing',
    description: 'Free to use for non-commercial purposes with attribution',
    commercialUse: false,
    commercialAttribution: false,
    derivativesAllowed: true,
    derivativesAttribution: true,
    derivativesApproval: false,
  },
  COMMERCIAL_USE: {
    id: 2,
    name: 'Commercial Use',
    description: 'Allows commercial use with royalty sharing',
    commercialUse: true,
    commercialAttribution: true,
    derivativesAllowed: true,
    derivativesAttribution: true,
    derivativesApproval: false,
    commercialRevShare: 10, // 10% default
  },
  COMMERCIAL_REMIX: {
    id: 3,
    name: 'Commercial Remix',
    description: 'Full commercial rights with derivatives',
    commercialUse: true,
    commercialAttribution: true,
    derivativesAllowed: true,
    derivativesAttribution: true,
    derivativesApproval: false,
    commercialRevShare: 5,
  },
};

/**
 * Create IP metadata for Story Protocol registration
 */
export const createIPMetadata = ({
  title,
  description,
  creator,
  creatorAddress,
  contentHash,
  mediaUrl,
  thumbnailUrl,
  attributes = [],
}) => {
  return {
    name: title,
    description: description || '',
    image: thumbnailUrl || mediaUrl,
    external_url: mediaUrl,
    attributes: [
      { trait_type: 'Creator', value: creator || 'Unknown' },
      { trait_type: 'Creator Address', value: creatorAddress },
      { trait_type: 'Content Hash', value: contentHash },
      { trait_type: 'Platform', value: 'DippChain' },
      { trait_type: 'Registration Date', value: new Date().toISOString() },
      ...attributes,
    ],
  };
};

/**
 * Create license terms for Story Protocol
 */
export const createLicenseTerms = ({
  licenseType = 'COMMERCIAL_USE',
  commercialRevShare = 10,
  mintingFee = 0,
  currency = 'IP',
}) => {
  const pilType = PIL_LICENSE_TYPES[licenseType] || PIL_LICENSE_TYPES.COMMERCIAL_USE;
  
  return {
    ...pilType,
    commercialRevShare: commercialRevShare * 100, // Convert to basis points (10% = 1000)
    mintingFee: ethers.parseEther(mintingFee.toString()),
    currency,
  };
};

/**
 * Format Story Protocol transaction result
 */
export const formatStoryTxResult = (receipt, ipId, licenseTermsId) => {
  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    ipId: ipId || null,
    licenseTermsId: licenseTermsId || null,
    explorerUrl: `https://aeneid.storyscan.io/tx/${receipt.hash}`,
  };
};

/**
 * Get Story Protocol explorer URL for an IP asset
 */
export const getIPExplorerUrl = (ipId) => {
  return `https://aeneid.storyscan.io/address/${ipId}`;
};

/**
 * Get Story Protocol explorer URL for a transaction
 */
export const getTxExplorerUrl = (txHash) => {
  return `https://aeneid.storyscan.io/tx/${txHash}`;
};

/**
 * Validate if an address is a valid Story Protocol IP Asset
 */
export const isValidIPAsset = async (ipId, provider) => {
  try {
    const code = await provider.getCode(ipId);
    return code !== '0x';
  } catch {
    return false;
  }
};

export default {
  STORY_PROTOCOL_ADDRESSES,
  PIL_LICENSE_TYPES,
  createIPMetadata,
  createLicenseTerms,
  formatStoryTxResult,
  getIPExplorerUrl,
  getTxExplorerUrl,
  isValidIPAsset,
};

