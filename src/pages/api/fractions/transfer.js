// API Route: Primary transfer of royalty tokens from IP Account (server-owned) to a recipient
// This is for primary allocation/sale where the platform controls the IP Account (SPG flow).
import { ethers } from 'ethers';
import prisma from '@/lib/prisma';
import { createStoryClientServer } from '@/lib/storyProtocolClient';

// Helper: ensure BigInt serialization
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assetId, recipient, amountTokens } = req.body;

    if (!assetId || !recipient || !amountTokens) {
      return res.status(400).json({
        error: 'assetId, recipient, and amountTokens are required',
      });
    }

    // Fetch asset
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, storyProtocolId: true, title: true },
    });

    if (!asset || !asset.storyProtocolId) {
      return res.status(404).json({ error: 'Asset not registered on Story Protocol' });
    }

    // Story Protocol client (server wallet)
    const spClient = await createStoryClientServer();

    // Get royalty vault (token) address
    const vaultAddress = await spClient.royalty.getRoyaltyVaultAddress({
      ipId: asset.storyProtocolId,
    });

    if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
      return res.status(404).json({
        error: 'Royalty vault not found',
        details: 'Ensure license is attached and retry.',
      });
    }

    // Story Royalty Tokens use 6 decimals; convert human-readable amount to wei-like units
    const DECIMALS = 6n;
    const multiplier = 10n ** DECIMALS;
    const amountWei = BigInt(Math.floor(Number(amountTokens))) * multiplier;

    // Transfer from IP Account (server-owned) to recipient
    const tx = await spClient.ipAccount.transferErc20({
      ipId: asset.storyProtocolId,
      tokens: [
        {
          address: vaultAddress,
          amount: amountWei,
          target: recipient,
        },
      ],
      txOptions: { waitForTransaction: true },
    });

    return res.status(200).json({
      success: true,
      txHash: tx?.txHash || tx?.hash || null, // SDK returns txHash
      vaultAddress,
      amountWei: amountWei.toString(),
      recipient,
      asset: {
        id: asset.id,
        title: asset.title,
        storyProtocolId: asset.storyProtocolId,
      },
    });
  } catch (error) {
    console.error('Primary transfer error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to transfer royalty tokens',
      details: error.message,
    });
  }
}


