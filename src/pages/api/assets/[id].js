// API Route: Get, Update, Delete Single Asset
import prisma from '@/lib/prisma';
import { sendSuccess, sendError, sendNotFound } from '@/lib/apiResponse';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return sendError(res, 'Asset ID is required', 400, { code: 'MISSING_ASSET_ID' });
  }

  switch (req.method) {
    case 'GET':
      return getAsset(id, res);
    case 'PUT':
    case 'PATCH':
      return updateAsset(id, req.body, res);
    case 'DELETE':
      return deleteAsset(id, res);
    default:
      return sendError(res, 'Method not allowed', 405, { code: 'METHOD_NOT_ALLOWED' });
  }
}

async function getAsset(id, res) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, displayName: true, walletAddress: true },
        },
        licenses: true,
        fractionalization: {
          include: {
            holders: {
              select: { userId: true, amount: true, percentageOwned: true },
            },
          },
        },
        sentinelScans: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
        sentinelAlerts: {
          orderBy: { detectedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!asset) {
      return sendNotFound(res, 'Asset');
    }

    return sendSuccess(res, { asset });
  } catch (error) {
    console.error('Get asset error:', error);
    return sendError(res, 'Failed to fetch asset', 500, { code: 'FETCH_ERROR', details: error.message });
  }
}

async function updateAsset(id, data, res) {
  try {
    const {
      title,
      description,
      visibility,
      status,
      dippchainTokenId,
      dippchainTxHash,
      storyProtocolId,
      storyProtocolTxHash,
      registeredOnChain,
    } = data;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (status !== undefined) updateData.status = status;
    if (dippchainTokenId !== undefined) updateData.dippchainTokenId = String(dippchainTokenId);
    if (dippchainTxHash !== undefined) updateData.dippchainTxHash = dippchainTxHash;
    if (storyProtocolId !== undefined) updateData.storyProtocolId = storyProtocolId;
    if (storyProtocolTxHash !== undefined) updateData.storyProtocolTxHash = storyProtocolTxHash;
    if (registeredOnChain !== undefined) updateData.registeredOnChain = registeredOnChain;

    const asset = await prisma.asset.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({ success: true, asset });
  } catch (error) {
    console.error('Update asset error:', error);
    
    if (error.code === 'P2025') {
      return sendNotFound(res, 'Asset');
    }
    
    return sendError(res, 'Failed to update asset', 500, { code: 'UPDATE_ERROR', details: error.message });
  }
}

async function deleteAsset(id, res) {
  try {
    // Check if asset can be deleted (not fractionalized, etc.)
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        fractionalization: true,
        licenses: { where: { status: 'ACTIVE' } },
      },
    });

    if (!asset) {
      return sendNotFound(res, 'Asset');
    }

    if (asset.fractionalization) {
      return sendError(res, 'Cannot delete fractionalized asset', 400, { 
        code: 'FRACTIONALIZED_ASSET' 
      });
    }

    if (asset.licenses.length > 0) {
      return sendError(res, 'Cannot delete asset with active licenses', 400, { 
        code: 'ACTIVE_LICENSES' 
      });
    }

    // Soft delete - archive the asset
    await prisma.asset.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return sendSuccess(res, { message: 'Asset archived successfully' }, 'Asset archived successfully');
  } catch (error) {
    console.error('Delete asset error:', error);
    return sendError(res, 'Failed to delete asset', 500, { code: 'DELETE_ERROR', details: error.message });
  }
}

