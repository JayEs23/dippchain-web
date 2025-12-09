// API Route: Create License
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      assetId,
      creatorId,
      licenseeId,
      licenseType,
      templateId,
      terms,
      price,
      currency = 'IP',
      startDate,
      endDate,
      isExclusive = false,
    } = req.body;

    // Validate required fields
    if (!assetId || !creatorId || !licenseType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['assetId', 'creatorId', 'licenseType'],
      });
    }

    // Check if asset exists and belongs to creator
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.userId !== creatorId) {
      return res.status(403).json({ error: 'Only asset owner can create licenses' });
    }

    // Check for existing exclusive license
    if (isExclusive) {
      const existingExclusive = await prisma.license.findFirst({
        where: {
          assetId,
          isExclusive: true,
          status: 'ACTIVE',
        },
      });

      if (existingExclusive) {
        return res.status(409).json({
          error: 'Asset already has an active exclusive license',
        });
      }
    }

    // Create license
    const license = await prisma.license.create({
      data: {
        assetId,
        creatorId,
        licenseeId,
        licenseType,
        templateId,
        terms,
        price: price ? parseFloat(price) : null,
        currency,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isExclusive,
        status: licenseeId ? 'ACTIVE' : 'PENDING',
      },
      include: {
        asset: {
          select: { id: true, title: true, assetType: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      license,
    });
  } catch (error) {
    console.error('Create license error:', error);
    return res.status(500).json({ error: 'Failed to create license', details: error.message });
  }
}

