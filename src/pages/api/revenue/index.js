// API Route: Revenue
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      status,
      source,
      page = 1,
      limit = 20,
    } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { userId };
    if (status) where.status = status;
    if (source) where.source = source;

    const [revenues, total, stats] = await Promise.all([
      prisma.revenue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          asset: { select: { id: true, title: true, assetType: true } },
          fractionalization: { select: { id: true, tokenSymbol: true } },
        },
      }),
      prisma.revenue.count({ where }),
      // Aggregate stats
      prisma.revenue.groupBy({
        by: ['status'],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    // Calculate totals
    const totalEarned = stats.reduce((sum, s) => sum + parseFloat(s._sum.amount || 0), 0);
    const claimable = stats.find(s => s.status === 'CLAIMABLE')?._sum.amount || 0;
    const claimed = stats.find(s => s.status === 'CLAIMED')?._sum.amount || 0;

    return res.status(200).json({
      success: true,
      revenues,
      stats: {
        totalEarned,
        claimable: parseFloat(claimable),
        claimed: parseFloat(claimed),
        pending: totalEarned - parseFloat(claimable) - parseFloat(claimed),
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    return res.status(500).json({ error: 'Failed to fetch revenue', details: error.message });
  }
}

