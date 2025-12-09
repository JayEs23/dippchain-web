// API Route: Register Asset on DippChain Registry (On-Chain)
import { ethers } from 'ethers';
import prisma from '@/lib/prisma';
import { CONTRACTS } from '@/contracts/addresses';
import DippChainRegistryABI from '@/contracts/abis/DippChainRegistry.json';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assetId, txHash, tokenId } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    // If txHash is provided, update the asset with on-chain registration data
    if (txHash) {
      const asset = await prisma.asset.update({
        where: { id: assetId },
        data: {
          dippchainTxHash: txHash,
          dippchainTokenId: tokenId?.toString(),
          registeredOnChain: true,
          status: 'REGISTERED',
        },
      });

      return res.status(200).json({
        success: true,
        asset,
        message: 'Asset registered on-chain',
      });
    }

    // Otherwise, return the contract info for client-side registration
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    return res.status(200).json({
      success: true,
      contractAddress: CONTRACTS.DippChainRegistry,
      abi: DippChainRegistryABI,
      asset: {
        id: asset.id,
        contentHash: asset.contentHash,
        metadataCid: asset.pinataCid,
        watermarkId: asset.watermarkId,
      },
    });
  } catch (error) {
    console.error('Register asset error:', error);
    return res.status(500).json({ 
      error: 'Registration failed', 
      details: error.message 
    });
  }
}

