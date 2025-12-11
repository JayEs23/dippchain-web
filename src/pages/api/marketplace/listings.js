// API Route: Get Marketplace Listings (Primary + Secondary)
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      type, // 'primary', 'secondary', or 'all'
      status = 'ACTIVE',
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get primary market listings (fractionalized assets with available supply)
    let primaryListings = [];
    if (type === 'primary' || type === 'all' || !type) {
      const fractionalizations = await prisma.fractionalization.findMany({
        where: {
          status: 'DEPLOYED',
          availableSupply: { gt: 0 },
        },
        include: {
          asset: {
            select: {
              id: true,
              title: true,
              description: true,
              thumbnailUrl: true,
              assetType: true,
              storyProtocolId: true,
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
        orderBy: { createdAt: 'desc' },
      });

      primaryListings = fractionalizations.map(frac => ({
        id: frac.id,
        type: 'PRIMARY',
        fractionalizationId: frac.id,
        assetId: frac.assetId,
        asset: frac.asset,
        tokenAddress: frac.tokenAddress,
        tokenName: frac.tokenName,
        tokenSymbol: frac.tokenSymbol,
        amount: frac.availableSupply,
        pricePerToken: frac.pricePerToken,
        currency: frac.currency,
        totalPrice: frac.availableSupply * frac.pricePerToken,
        seller: frac.asset.user,
        createdAt: frac.createdAt,
      }));
    }

    // Get secondary market listings (peer-to-peer sales)
    let secondaryListings = [];
    if (type === 'secondary' || type === 'all' || !type) {
      const listings = await prisma.marketplaceListing.findMany({
        where: {
          status,
          listingType: 'SECONDARY',
        },
        include: {
          fractionalization: {
            include: {
              asset: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  thumbnailUrl: true,
                  assetType: true,
                  storyProtocolId: true,
                },
              },
            },
          },
          seller: {
            select: {
              id: true,
              displayName: true,
              walletAddress: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      secondaryListings = listings.map(listing => ({
        id: listing.id,
        type: 'SECONDARY',
        fractionalizationId: listing.fractionalizationId,
        assetId: listing.fractionalization.assetId,
        asset: listing.fractionalization.asset,
        tokenAddress: listing.fractionalization.tokenAddress,
        tokenName: listing.fractionalization.tokenName,
        tokenSymbol: listing.fractionalization.tokenSymbol,
        amount: listing.amount,
        pricePerToken: listing.pricePerToken,
        currency: listing.currency,
        totalPrice: listing.totalPrice,
        seller: listing.seller,
        createdAt: listing.createdAt,
      }));
    }

    // Combine and sort
    const allListings = [...primaryListings, ...secondaryListings].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Apply pagination to combined results
    const paginatedListings = allListings.slice(skip, skip + take);

    return res.status(200).json({
      success: true,
      listings: paginatedListings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allListings.length,
        totalPages: Math.ceil(allListings.length / take),
      },
    });
  } catch (error) {
    console.error('Get marketplace listings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch listings',
      details: error.message,
    });
  }
}
