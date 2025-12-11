// API Route: Create Asset in Database
import prisma from '@/lib/prisma';
import { 
  sendSuccess, 
  sendValidationError, 
  sendConflict,
  handlePrismaError 
} from '@/lib/apiResponse';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }
    });
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
      return sendValidationError(
        res, 
        'Missing required fields', 
        ['userId', 'title', 'assetType', 'pinataCid']
      );
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

    // Check for duplicate content hash (per user)
    if (contentHash) {
      const existing = await prisma.asset.findFirst({
        where: { 
          contentHash,
          userId: user.id, // Only check current user's assets
        },
      });
      
      if (existing) {
        return sendConflict(
          res,
          'You have already uploaded this content',
          { existingAssetId: existing.id, assetTitle: existing.title }
        );
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

    return sendSuccess(res, { asset }, 'Asset created successfully', 201);
  } catch (error) {
    return handlePrismaError(res, error, 'Create asset');
  }
}

