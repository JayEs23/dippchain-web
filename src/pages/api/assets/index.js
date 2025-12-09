// API Route: Get User Assets
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      userId, 
      status, 
      assetType, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Normalize wallet address if provided
    const normalizedAddress = userId.toLowerCase();

    // Find user by ID or wallet address
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { walletAddress: normalizedAddress },
        ],
      },
    });

    // If no user found, return empty results
    if (!user) {
      return res.status(200).json({
        success: true,
        assets: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Build where clause using actual user ID
    const where = { userId: user.id };
    if (status) where.status = status;
    if (assetType) where.assetType = assetType;

    // Get assets with pagination
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
        include: {
          licenses: {
            select: { id: true, status: true },
          },
          fractionalization: {
            select: { id: true, status: true, tokenSymbol: true },
          },
          _count: {
            select: { sentinelAlerts: true },
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      assets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get assets error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch assets', 
      details: error.message 
    });
  }
}

