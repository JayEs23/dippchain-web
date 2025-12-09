// API Route: Marketplace Listings
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return getListings(req, res);
    case 'POST':
      return createListing(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getListings(req, res) {
  try {
    const {
      status = 'ACTIVE',
      fractionalizationId,
      sellerId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { status };
    if (fractionalizationId) where.fractionalizationId = fractionalizationId;
    if (sellerId) where.sellerId = sellerId;

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
        include: {
          fractionalization: {
            include: {
              asset: {
                select: {
                  id: true,
                  title: true,
                  assetType: true,
                  thumbnailUrl: true,
                },
              },
            },
          },
        },
      }),
      prisma.marketplaceListing.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get listings error:', error);
    return res.status(500).json({ error: 'Failed to fetch listings', details: error.message });
  }
}

async function createListing(req, res) {
  try {
    const {
      fractionalizationId,
      sellerId,
      listingType = 'SECONDARY',
      amount,
      pricePerToken,
      currency = 'IP',
      expiresAt,
    } = req.body;

    if (!fractionalizationId || !sellerId || !amount || !pricePerToken) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fractionalizationId', 'sellerId', 'amount', 'pricePerToken'],
      });
    }

    const totalPrice = parseFloat(amount) * parseFloat(pricePerToken);

    const listing = await prisma.marketplaceListing.create({
      data: {
        fractionalizationId,
        sellerId,
        listingType,
        amount: parseFloat(amount),
        pricePerToken: parseFloat(pricePerToken),
        totalPrice,
        currency,
        status: 'ACTIVE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        fractionalization: {
          include: {
            asset: { select: { title: true } },
          },
        },
      },
    });

    return res.status(201).json({ success: true, listing });
  } catch (error) {
    console.error('Create listing error:', error);
    return res.status(500).json({ error: 'Failed to create listing', details: error.message });
  }
}

