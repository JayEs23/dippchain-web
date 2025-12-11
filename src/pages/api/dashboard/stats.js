// API Route: Dashboard Stats
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

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

    // If no user found, return empty stats
    if (!user) {
      return res.status(200).json({
        success: true,
        stats: {
          totalAssets: 0,
          activeLicenses: 0,
          sentinelAlerts: 0,
          totalRevenue: 0,
          revenueChange: 0,
        },
        recentAssets: [],
        recentAlerts: [],
      });
    }

    // Get all stats in parallel
    const [
      totalAssets,
      activeLicenses,
      sentinelAlertsCount,
      revenueStats,
      recentAssets,
      recentAlerts,
      previousMonthRevenue,
    ] = await Promise.all([
      // Total assets
      prisma.asset.count({ where: { userId: user.id } }),

      // Active licenses (ACTIVE status)
      prisma.license.count({
        where: {
          creatorId: user.id,
          status: 'ACTIVE',
        },
      }),

      // Sentinel alerts (NEW and REVIEWING status)
      prisma.sentinelAlert.count({
        where: {
          userId: user.id,
          status: { in: ['NEW', 'REVIEWING'] },
        },
      }),

      // Total revenue
      prisma.revenue.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _sum: { amount: true },
      }),

      // Recent assets (last 5)
      prisma.asset.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          assetType: true,
          status: true,
          createdAt: true,
          thumbnailUrl: true,
        },
      }),

      // Recent alerts (last 5)
      prisma.sentinelAlert.findMany({
        where: { userId: user.id },
        orderBy: { detectedAt: 'desc' },
        take: 5,
        include: {
          asset: {
            select: { id: true, title: true },
          },
        },
      }),

      // Revenue from previous month for comparison
      prisma.revenue.aggregate({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 2)),
            lt: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    // Calculate total revenue
    const totalRevenue = revenueStats.reduce(
      (sum, s) => sum + parseFloat(s._sum.amount || 0),
      0
    );

    // Calculate revenue change from previous month
    const previousRevenue = parseFloat(previousMonthRevenue._sum.amount || 0);
    const revenueChange = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : totalRevenue > 0 ? 100 : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalAssets,
        activeLicenses,
        sentinelAlerts: sentinelAlertsCount,
        totalRevenue: totalRevenue.toFixed(4),
        revenueChange: revenueChange > 0 ? `+${revenueChange.toFixed(1)}` : revenueChange.toFixed(1),
      },
      recentAssets,
      recentAlerts,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      details: error.message,
    });
  }
}

