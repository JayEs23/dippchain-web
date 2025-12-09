// API Route: Sentinel Alerts
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return getAlerts(req, res);
    case 'POST':
      return createAlert(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getAlerts(req, res) {
  try {
    const {
      userId,
      assetId,
      status,
      severity,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (userId) where.userId = userId;
    if (assetId) where.assetId = assetId;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [alerts, total] = await Promise.all([
      prisma.sentinelAlert.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        skip,
        take,
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
      }),
      prisma.sentinelAlert.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    return res.status(500).json({ error: 'Failed to fetch alerts', details: error.message });
  }
}

async function createAlert(req, res) {
  try {
    const {
      assetId,
      userId,
      platform,
      sourceUrl,
      screenshotCid,
      screenshotUrl,
      similarityScore,
      watermarkFound = false,
      metadataMatch = false,
      severity = 'MEDIUM',
      evidenceCid,
      evidenceUrl,
      evidenceData,
    } = req.body;

    if (!assetId || !userId || !platform || !sourceUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['assetId', 'userId', 'platform', 'sourceUrl'],
      });
    }

    const alert = await prisma.sentinelAlert.create({
      data: {
        assetId,
        userId,
        platform,
        sourceUrl,
        screenshotCid,
        screenshotUrl,
        similarityScore: parseFloat(similarityScore) || 0,
        watermarkFound,
        metadataMatch,
        severity,
        status: 'NEW',
        evidenceCid,
        evidenceUrl,
        evidenceData,
      },
      include: {
        asset: { select: { title: true } },
      },
    });

    return res.status(201).json({ success: true, alert });
  } catch (error) {
    console.error('Create alert error:', error);
    return res.status(500).json({ error: 'Failed to create alert', details: error.message });
  }
}

