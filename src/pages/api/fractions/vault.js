// API Route: Get royalty vault (Story Protocol royalty token) info for an IP asset
import { ethers } from 'ethers';
import prisma from '@/lib/prisma';
import { createStoryClientServer, getStoryRpcUrls } from '@/lib/storyProtocolClient';
import { STORY_ROYALTY_TOKEN_TOTAL_TOKENS, weiToTokens } from '@/lib/storyRoyaltyTokens';
import { saveStoryResponse } from '@/lib/storyProtocolLogger';

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

    // Story Protocol client (server wallet) with RPC fallback
    const rpcUrls = getStoryRpcUrls();
    console.log('Fetching vault address for IP:', asset.storyProtocolId, 'RPCs:', rpcUrls);
    let vaultAddress = null;
    let lastErr = null;
    for (let i = 0; i < rpcUrls.length; i += 1) {
      const rpc = rpcUrls[i];
      try {
        const spClient = await createStoryClientServer(rpc);
        vaultAddress = await spClient.royalty.getRoyaltyVaultAddress(asset.storyProtocolId);
        if (vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000') {
          break;
        }
      } catch (e) {
        lastErr = e;
        console.warn(`Vault lookup failed on RPC ${rpc}:`, e?.message || e);
      }
    }
    if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
      const errorResponse = {
        success: false,
        error: 'Royalty vault not yet deployed',
        details: 'Vault deploys on first license token mint or first derivative registration. Mint one license token to trigger it.',
        action: 'MINT_LICENSE_TOKEN',
        ipId: asset.storyProtocolId,
        rpcTried: rpcUrls,
        lastError: lastErr?.message,
      };
      // Save error response for debugging
      await saveStoryResponse('get-vault-address-failed', errorResponse, {
        assetId: asset.id,
        ipId: asset.storyProtocolId,
        rpcTried: rpcUrls,
      });
      return res.status(404).json(errorResponse);
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

    const vaultData = {
      success: true,
      vaultAddress,
      token: {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        totalTokens: STORY_ROYALTY_TOKEN_TOTAL_TOKENS,
        ipAccountBalance: ipAccountBalance.toString(),
        ipAccountTokens: weiToTokens(ipAccountBalance),
      },
      asset: {
        id: asset.id,
        title: asset.title,
        storyProtocolId: asset.storyProtocolId,
      },
    };

    // Save vault info response for debugging
    await saveStoryResponse('get-vault-info', vaultData, {
      assetId: asset.id,
      ipId: asset.storyProtocolId,
      vaultAddress,
    });

    return res.status(200).json(vaultData);
  } catch (error) {
    console.error('Vault lookup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch royalty vault',
      details: error.message || 'Unknown error occurred',
    });
  }
}


