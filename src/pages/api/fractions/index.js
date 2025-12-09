// API Route: Get Fractionalizations
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    if (status) where.status = status;
    
    // If userId provided, get fractionalizations where user is a holder
    if (userId) {
      where.OR = [
        { asset: { userId } },
        { holders: { some: { userId } } },
      ];
    }

    const [fractionalizations, total] = await Promise.all([
      prisma.fractionalization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          asset: {
            select: {
              id: true,
              title: true,
              assetType: true,
              thumbnailUrl: true,
              pinataUrl: true,
              userId: true,
              dippchainTokenId: true,
            },
          },
          holders: {
            select: {
              userId: true,
              amount: true,
              percentageOwned: true,
            },
          },
          _count: {
            select: { listings: true },
          },
        },
      }),
      prisma.fractionalization.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      fractionalizations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get fractionalizations error:', error);
    return res.status(500).json({ error: 'Failed to fetch fractionalizations', details: error.message });
  }
}

