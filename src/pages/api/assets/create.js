// API Route: Create Asset in Database
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      title,
      description,
      assetType,
      originalFileName,
      fileSize,
      mimeType,
      pinataCid,
      pinataUrl,
      thumbnailCid,
      thumbnailUrl,
      watermarkId,
      metadataHash,
      contentHash,
      visibility = 'PRIVATE',
    } = req.body;

    // Validate required fields
    if (!userId || !title || !assetType || !pinataCid) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['userId', 'title', 'assetType', 'pinataCid']
      });
    }

    // Normalize wallet address
    const normalizedAddress = userId.toLowerCase();

    // Find user by wallet address or ID
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { walletAddress: normalizedAddress },
        ],
      },
    });

    // Auto-create user if doesn't exist
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            email: `${normalizedAddress}@wallet.local`,
            walletAddress: normalizedAddress,
            displayName: `User ${userId.slice(0, 6)}...${userId.slice(-4)}`,
          },
        });
      } catch (createError) {
        // Handle race condition - user was created between check and create
        if (createError.code === 'P2002') {
          user = await prisma.user.findFirst({
            where: { walletAddress: normalizedAddress },
          });
        } else {
          throw createError;
        }
      }
    }

    // Check for duplicate content hash
    if (contentHash) {
      const existing = await prisma.asset.findFirst({
        where: { contentHash },
      });
      
      if (existing) {
        return res.status(409).json({ 
          error: 'Asset with this content already exists',
          existingAssetId: existing.id,
        });
      }
    }

    // Create asset
    const asset = await prisma.asset.create({
      data: {
        userId: user.id,
        title,
        description,
        assetType,
        originalFileName,
        fileSize: parseInt(fileSize) || 0,
        mimeType,
        pinataCid,
        pinataUrl,
        thumbnailCid,
        thumbnailUrl,
        watermarkId,
        metadataHash,
        contentHash,
        visibility,
        status: 'DRAFT',
      },
    });

    return res.status(201).json({
      success: true,
      asset,
    });
  } catch (error) {
    console.error('Create asset error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Asset already exists with this identifier' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to create asset', 
      details: error.message 
    });
  }
}

