// API Route: Get royalty vault (Story Protocol royalty token) info for an IP asset
import { ethers } from 'ethers';
import prisma from '@/lib/prisma';
import { createStoryClientServer } from '@/lib/storyProtocolClient';

// Minimal ERC20 ABI for metadata & balances
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assetId } = req.query;

    if (!assetId) {
      return res.status(400).json({ error: 'assetId is required' });
    }

    // Fetch asset from DB
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        title: true,
        storyProtocolId: true,
        userId: true,
      },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (!asset.storyProtocolId) {
      return res.status(400).json({ error: 'Asset is not registered on Story Protocol yet' });
    }

    // Story Protocol client (server wallet)
    const spClient = await createStoryClientServer();

    // Get vault (royalty token) address from Story Protocol
    // SDK expects ipId as a string, not an object
    console.log('Fetching vault address for IP:', asset.storyProtocolId);
    let vaultAddress;
    
    try {
      vaultAddress = await spClient.royalty.getRoyaltyVaultAddress(asset.storyProtocolId);
      console.log('Vault address returned:', vaultAddress);
    } catch (error) {
      console.error('Error getting vault address:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch vault address',
        details: error.message || 'Unknown error occurred',
        ipId: asset.storyProtocolId,
      });
    }
    
    // If vaultAddress is not zero address, the vault is initialized
    if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('Vault not found for IP:', asset.storyProtocolId);
      return res.status(404).json({
        success: false,
        error: 'Royalty vault not found',
        details: 'Vault is created automatically when license terms are attached. Please ensure license terms are attached to this IP asset.',
        ipId: asset.storyProtocolId,
      });
    }
    
    console.log('✅ Vault found:', vaultAddress);

    // Read token metadata via RPC
    const rpcUrl = process.env.RPC_PROVIDER_URL || 'https://aeneid.storyrpc.io';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const token = new ethers.Contract(vaultAddress, ERC20_ABI, provider);

    const [name, symbol, decimals, totalSupply, ipAccountBalance] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.balanceOf(asset.storyProtocolId),
    ]);

    return res.status(200).json({
      success: true,
      vaultAddress,
      token: {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        ipAccountBalance: ipAccountBalance.toString(), // balance held by the IP Account (server-owned)
      },
      asset: {
        id: asset.id,
        title: asset.title,
        storyProtocolId: asset.storyProtocolId,
      },
    });
  } catch (error) {
    console.error('Vault lookup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch royalty vault',
      details: error.message || 'Unknown error occurred',
    });
  }
}


