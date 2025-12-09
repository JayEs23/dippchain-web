// API Route: Create Fractionalization
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      assetId,
      tokenName,
      tokenSymbol,
      totalSupply,
      pricePerToken,
      currency = 'IP',
      creatorRetainPercentage = 20,
      tokenAddress,
      deployTxHash,
      status = 'PENDING',
    } = req.body;

    // Validate required fields
    if (!assetId || !tokenName || !tokenSymbol || !totalSupply || !pricePerToken) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['assetId', 'tokenName', 'tokenSymbol', 'totalSupply', 'pricePerToken'],
      });
    }

    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { fractionalization: true },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.fractionalization) {
      return res.status(409).json({ error: 'Asset is already fractionalized' });
    }

    // Calculate available supply (tokens for sale)
    const total = parseFloat(totalSupply);
    const retainPercent = parseFloat(creatorRetainPercentage);
    const creatorTokens = Math.floor(total * retainPercent / 100);
    const availableForSale = total - creatorTokens;

    // Create fractionalization
    const fractionalization = await prisma.fractionalization.create({
      data: {
        assetId,
        tokenName,
        tokenSymbol: tokenSymbol.toUpperCase(),
        totalSupply: total,
        availableSupply: availableForSale,
        pricePerToken: parseFloat(pricePerToken),
        currency,
        royaltyPercentage: retainPercent, // Using this field for creator retain %
        tokenAddress,
        deployTxHash,
        status: status,
      },
      include: {
        asset: {
          select: { id: true, title: true, assetType: true, userId: true },
        },
      },
    });

    // Add creator as initial holder with their retained tokens
    if (asset.userId && creatorTokens > 0) {
      await prisma.fractionHolder.create({
        data: {
          fractionalizationId: fractionalization.id,
          userId: asset.userId,
          amount: creatorTokens,
          percentageOwned: retainPercent,
        },
      });
    }

    return res.status(201).json({
      success: true,
      fractionalization,
    });
  } catch (error) {
    console.error('Create fractionalization error:', error);
    return res.status(500).json({ error: 'Failed to create fractionalization', details: error.message });
  }
}

