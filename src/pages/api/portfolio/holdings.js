// API Route: Get User's Portfolio Holdings
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        holdings: [],
        totalValue: 0,
        message: 'No holdings found',
      });
    }

    // Get all FractionHolder records for this user
    const holdings = await prisma.fractionHolder.findMany({
      where: { userId: user.id },
      include: {
        fractionalization: {
          include: {
            asset: {
              select: {
                id: true,
                title: true,
                assetType: true,
                thumbnailUrl: true,
                storyProtocolId: true,
                royaltyVaultAddress: true,
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    walletAddress: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { acquiredAt: 'desc' },
    });

    // Calculate total portfolio value
    let totalValue = 0;
    const holdingsWithValue = holdings.map((holding) => {
      const currentValue = parseFloat(holding.amount) * parseFloat(holding.fractionalization.pricePerToken);
      totalValue += currentValue;
      
      return {
        id: holding.id,
        fractionalizationId: holding.fractionalizationId,
        amount: parseFloat(holding.amount),
        percentageOwned: parseFloat(holding.percentageOwned),
        acquiredAt: holding.acquiredAt,
        asset: holding.fractionalization.asset,
        fractionalization: {
          id: holding.fractionalization.id,
          tokenName: holding.fractionalization.tokenName,
          tokenSymbol: holding.fractionalization.tokenSymbol,
          totalSupply: parseFloat(holding.fractionalization.totalSupply),
          pricePerToken: parseFloat(holding.fractionalization.pricePerToken),
          currency: holding.fractionalization.currency,
          status: holding.fractionalization.status,
          tokenAddress: holding.fractionalization.tokenAddress,
        },
        currentValue,
      };
    });

    return res.status(200).json({
      success: true,
      holdings: holdingsWithValue,
      totalValue,
      totalHoldings: holdings.length,
    });
  } catch (error) {
    console.error('Get portfolio holdings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio holdings',
      details: error.message,
    });
  }
}

