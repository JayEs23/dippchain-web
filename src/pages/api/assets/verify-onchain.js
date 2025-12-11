// API Route: Verify on-chain registration status and sync to database
import { ethers } from 'ethers';
import prisma from '@/lib/prisma';
import { CONTRACTS } from '@/contracts/addresses';
import DippChainRegistryABI from '@/contracts/abis/DippChainRegistry.json';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assetId, contentHash, watermarkId } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    // Get asset from database
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Connect to blockchain
    const rpcUrl = process.env.RPC_PROVIDER_URL || 'https://aeneid.storyrpc.io';
    console.log('🔗 Connecting to blockchain:', rpcUrl);
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const registry = new ethers.Contract(
      CONTRACTS.DippChainRegistry,
      DippChainRegistryABI,
      provider
    );
    
    console.log('📋 DippChain Registry Address:', CONTRACTS.DippChainRegistry);

    // Get total assets count
    const totalAssets = await registry.totalAssets();
    console.log('Total assets on-chain:', totalAssets.toString());

    // Search for asset by watermark ID or content hash
    let foundTokenId = null;
    let foundData = null;

    const searchWatermarkId = watermarkId || asset.watermarkId;
    const searchContentHash = contentHash || asset.contentHash;

    console.log('🔍 Searching blockchain for asset:', {
      assetId: asset.id,
      searchWatermarkId,
      searchContentHash: searchContentHash?.slice(0, 16) + '...',
    });

    // Check recent tokens (search backwards from latest)
    const maxToCheck = Math.min(Number(totalAssets), 100); // Check last 100 tokens
    console.log(`📊 Checking last ${maxToCheck} tokens (of ${totalAssets} total)`);
    
    for (let i = Number(totalAssets); i > Number(totalAssets) - maxToCheck && i > 0; i--) {
      try {
        const tokenData = await registry.getAsset(i);
        
        // tokenData returns: [owner, contentHash, metadataUri, watermarkId, timestamp]
        const onChainWatermarkId = tokenData[3];
        const onChainContentHash = tokenData[1];

        // Match by watermark ID or content hash
        if (
          (searchWatermarkId && onChainWatermarkId === searchWatermarkId) ||
          (searchContentHash && onChainContentHash === searchContentHash)
        ) {
          foundTokenId = i;
          foundData = {
            owner: tokenData[0],
            contentHash: tokenData[1],
            metadataUri: tokenData[2],
            watermarkId: tokenData[3],
            timestamp: Number(tokenData[4]),
          };
          console.log(`✅ Found asset on-chain: Token ID ${i}`);
          break;
        }
      } catch (error) {
        // Token might not exist, continue
        continue;
      }
    }

    if (!foundTokenId) {
      console.log('❌ Asset not found on blockchain after checking last', maxToCheck, 'tokens');
      console.log('Searched for:', {
        watermarkId: searchWatermarkId,
        contentHash: searchContentHash?.slice(0, 32) + '...',
      });
      
      return res.status(404).json({
        success: false,
        error: 'Asset not found on blockchain',
        message: `Searched ${maxToCheck} most recent tokens but did not find a match. The asset may not be registered on-chain yet, or the transaction may still be pending.`,
        onChainStatus: 'NOT_REGISTERED',
        searched: {
          totalTokens: Number(totalAssets),
          checkedTokens: maxToCheck,
          watermarkId: searchWatermarkId,
          contentHashPrefix: searchContentHash?.slice(0, 16),
        },
      });
    }

    // Asset found on-chain! Sync to database
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        dippchainTokenId: foundTokenId.toString(),
        registeredOnChain: true,
        status: asset.storyProtocolId ? 'REGISTERED' : 'PROCESSING',
      },
    });

    console.log('✅ Synced on-chain data to database');

    return res.status(200).json({
      success: true,
      message: 'On-chain registration verified and synced to database',
      onChainStatus: 'REGISTERED',
      tokenId: foundTokenId.toString(),
      onChainData: foundData,
      asset: updatedAsset,
    });

  } catch (error) {
    console.error('Verify on-chain error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify on-chain status', 
      details: error.message 
    });
  }
}

