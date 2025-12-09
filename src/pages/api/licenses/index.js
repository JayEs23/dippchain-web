// API Route: Get Licenses
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      assetId,
      status,
      role = 'creator', // 'creator' or 'licensee'
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    
    if (userId) {
      if (role === 'licensee') {
        where.licenseeId = userId;
      } else {
        where.creatorId = userId;
      }
    }
    
    if (assetId) where.assetId = assetId;
    if (status) where.status = status;

    const [licenses, total] = await Promise.all([
      prisma.license.findMany({
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
            },
          },
          creator: {
            select: { id: true, displayName: true, walletAddress: true },
          },
          template: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.license.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      licenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get licenses error:', error);
    return res.status(500).json({ error: 'Failed to fetch licenses', details: error.message });
  }
}

