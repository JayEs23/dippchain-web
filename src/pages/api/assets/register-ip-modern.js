// API Route: Modern Story Protocol IP Registration (SPG Method)
// This uses the Story Protocol Gateway for ONE-TRANSACTION registration
// Mints NFT + Registers IP + Attaches License in single atomic operation

import prisma from '@/lib/prisma';
import { createStoryClientServer, registerIPWithSPG, STORY_CONTRACTS, getStoryRpcUrls } from '@/lib/storyProtocolClient';
import { sendSuccess, sendError, sendValidationError, handleStoryProtocolError } from '@/lib/apiResponse';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405, { code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const {
      assetId,
      licenseType = 'COMMERCIAL_USE', // COMMERCIAL_USE, COMMERCIAL_REMIX, NON_COMMERCIAL
      commercialRevShare = 5, // 0-100%
      defaultMintingFee = '10000000000000000000', // 10 WIP in wei
    } = req.body;

    // Validate required fields
    if (!assetId) {
      return sendValidationError(res, 'Asset ID is required', ['assetId']);
    }

    console.log('📋 Starting modern IP registration for asset:', assetId);

    // Get asset from database
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return sendError(res, 'Asset not found', 404, { code: 'ASSET_NOT_FOUND' });
    }

    // Check if already registered
    if (asset.storyProtocolId) {
      console.log('⚠️  Asset already registered as IP:', asset.storyProtocolId);
      return sendSuccess(res, {
        ipId: asset.storyProtocolId,
        alreadyRegistered: true,
        message: 'Asset is already registered on Story Protocol',
        explorerUrl: `https://aeneid.storyscan.io/address/${asset.storyProtocolId}`,
      });
    }

    // Validate metadata URIs (IPA metadata standard)
    if (!asset.metadataHash) {
      return sendError(res, 'Asset must have IPFS metadata before registration', 400, {
        code: 'MISSING_METADATA',
        details: 'Upload metadata JSON to IPFS first (following IPA Metadata Standard)',
      });
    }

    // Create Story Protocol client with RPC fallback list
    const rpcUrls = getStoryRpcUrls();
    console.log('🔐 Creating Story Protocol client...');

    // ✅ Use metadataHash (IPA metadata JSON) for IP metadata URI
    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    const ipMetadataURI = `https://${gateway}/ipfs/${asset.metadataHash}`;
    
    // ✅ Use contentHash for media hash (SHA-256 of actual media file)
    const ipMetadataHash = asset.contentHash?.startsWith('0x')
      ? asset.contentHash
      : `0x${asset.contentHash || '0000000000000000000000000000000000000000000000000000000000000000'}`;

    // For NFT metadata, use the same IPA metadata (standard practice)
    const nftMetadataURI = ipMetadataURI;
    const nftMetadataHash = ipMetadataHash;

    console.log('📝 Registration parameters:');
    console.log('  - License Type:', licenseType);
    console.log('  - Revenue Share:', commercialRevShare + '%');
    console.log('  - Minting Fee:', defaultMintingFee, 'wei');
    console.log('  - IP Metadata URI:', ipMetadataURI);
    console.log('  - Media Hash:', ipMetadataHash);

    // ✅ Register IP Asset using SDK's registerIpAsset (via registerIPWithSPG wrapper) with RPC fallback + retry
    console.log('🚀 Calling registerIPWithSPG (uses SDK registerIpAsset internally)...');
    let result = null;
    let lastError = null;
    for (let i = 0; i < rpcUrls.length; i += 1) {
      const rpcUrl = rpcUrls[i];
      try {
        const client = await createStoryClientServer(rpcUrl);
        result = await registerIPWithSPG(client, {
          ipMetadataURI,
          ipMetadataHash,
          nftMetadataURI,
          nftMetadataHash,
          licenseType,
          commercialRevShare,
          defaultMintingFee,
        });
        if (result?.success) {
          break;
        }
        lastError = new Error(result?.error || 'Unknown registration error');
        console.warn(`Retrying SPG registration with next RPC (attempt ${i + 1}/${rpcUrls.length})`);
      } catch (err) {
        lastError = err;
        console.warn(`RPC attempt failed for ${rpcUrl}:`, err?.message || err);
      }
    }

    if (!result?.success) {
      console.error('❌ Registration failed:', lastError || result?.error);
      return handleStoryProtocolError(res, lastError || new Error('SPG registration failed'), 'IP Asset registration');
    }

    console.log('✅ Registration successful!');
    console.log('  - IP ID:', result.ipId);
    console.log('  - Token ID:', result.tokenId);
    console.log('  - NFT Contract:', result.nftContract);
    console.log('  - License Terms ID:', result.licenseTermsId);
    console.log('  - Transaction:', result.txHash);

    // Update asset in database
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        storyProtocolId: result.ipId,
        storyProtocolTxHash: result.txHash,
        dippchainTokenId: result.tokenId?.toString(),
        registeredOnChain: true,
        status: 'REGISTERED',
      },
    });

    console.log('💾 Database updated successfully');

    // Return success response
    return sendSuccess(res, {
      ipId: result.ipId,
      tokenId: result.tokenId?.toString(),
      nftContract: result.nftContract,
      licenseTermsId: result.licenseTermsId?.toString(),
      txHash: result.txHash,
      asset: {
        id: updatedAsset.id,
        title: updatedAsset.title,
        status: updatedAsset.status,
      },
      explorerUrl: `https://aeneid.storyscan.io/address/${result.ipId}`,
      royaltyVaultCreated: true,
      message: 'IP Asset registered successfully with license terms attached',
    }, 'IP Asset registered successfully');

  } catch (error) {
    console.error('💥 Modern IP registration error:', error);
    return sendError(res, 'Failed to register IP Asset', 500, {
      code: 'REGISTRATION_ERROR',
      details: error.message,
    });
  }
}

