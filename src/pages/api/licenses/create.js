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

    // Check if asset exists and get owner info
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check ownership - creatorId might be wallet address or user ID
    const isOwner = asset.userId === creatorId || 
                    asset.user.walletAddress?.toLowerCase() === creatorId?.toLowerCase();
    
    if (!isOwner) {
      return res.status(403).json({ 
        error: 'Only asset owner can create licenses',
        debug: {
          assetUserId: asset.userId,
          assetWalletAddress: asset.user.walletAddress,
          providedCreatorId: creatorId,
        },
      });
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

    // Use the asset owner's internal user ID for the license
    const actualCreatorId = asset.userId;

    // Validate template exists if provided (skip default/hardcoded IDs)
    let validTemplateId = null;
    if (templateId && !templateId.includes('-')) {
      // Looks like a UUID, check if it exists
      try {
        const templateExists = await prisma.licenseTemplate.findUnique({
          where: { id: templateId },
        });
        
        if (templateExists) {
          validTemplateId = templateId;
        } else {
          console.warn('Template not found:', templateId);
        }
      } catch (err) {
        console.warn('Template validation error:', err.message);
      }
    } else if (templateId) {
      console.log('Skipping default template ID:', templateId);
    }

    // Create license data object
    const licenseData = {
      assetId,
      creatorId: actualCreatorId, // Use internal user ID from asset
      licenseType,
      terms,
      currency,
      isExclusive,
      status: licenseeId ? 'ACTIVE' : 'PENDING',
    };

    // Only include optional fields if they have values
    if (licenseeId) licenseData.licenseeId = licenseeId;
    if (validTemplateId) licenseData.templateId = validTemplateId;
    if (price) licenseData.price = parseFloat(price);
    if (startDate) licenseData.startDate = new Date(startDate);
    if (endDate) licenseData.endDate = new Date(endDate);

    // Create license
    const license = await prisma.license.create({
      data: licenseData,
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

