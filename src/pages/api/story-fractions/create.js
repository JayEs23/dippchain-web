// API Route: Create Fractionalization Record using Story Protocol's Native Royalty Tokens
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      assetId,
      royaltyTokenAddress,
      tokensForSale,
      pricePerToken,
      currency = 'IP',
    } = req.body;

    // Validate required fields
    if (!assetId || !royaltyTokenAddress || !tokensForSale || !pricePerToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['assetId', 'royaltyTokenAddress', 'tokensForSale', 'pricePerToken'],
      });
    }

    // Check if asset exists and has Story Protocol ID
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    if (!asset.storyProtocolId) {
      return res.status(400).json({
        success: false,
        error: 'Asset must be registered on Story Protocol first',
      });
    }

    // Check if already fractionalized
    const existing = await prisma.fractionalization.findUnique({
      where: { assetId },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Asset is already fractionalized',
        existingId: existing.id,
      });
    }

    // Story Protocol Royalty Tokens have 100M total supply
    const totalSupply = 100000000;
    const availableSupply = parseFloat(tokensForSale);
    const creatorTokens = totalSupply - availableSupply;

    // Create fractionalization record
    const fractionalization = await prisma.fractionalization.create({
      data: {
        assetId,
        tokenName: `${asset.title} Royalty Tokens`,
        tokenSymbol: 'RT',
        totalSupply,
        availableSupply,
        pricePerToken: parseFloat(pricePerToken),
        currency,
        royaltyPercentage: 100, // 100% of revenue goes to token holders (native Story Protocol)
        tokenAddress: royaltyTokenAddress,
        status: 'DEPLOYED', // Already deployed by Story Protocol
      },
    });

    return res.status(201).json({
      success: true,
      fractionalization,
      message: 'Fractionalization record created using Story Protocol Royalty Tokens',
    });
  } catch (error) {
    console.error('Create fractionalization error:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Asset is already fractionalized',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create fractionalization record',
      details: error.message,
    });
  }
}

