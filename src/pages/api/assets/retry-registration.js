// API Route: Retry registration for draft asset
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assetId } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    // Get asset
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check if it's actually a draft
    if (asset.status !== 'DRAFT') {
      return res.status(400).json({ 
        error: 'Asset is not a draft',
        message: `Asset status is ${asset.status}. Only DRAFT assets can be retried.`,
      });
    }

    // Return asset data for client-side registration
    return res.status(200).json({
      success: true,
      asset: {
        id: asset.id,
        title: asset.title,
        contentHash: asset.contentHash,
        watermarkId: asset.watermarkId,
        pinataCid: asset.pinataCid,
        pinataUrl: asset.pinataUrl,
        metadataHash: asset.metadataHash,
      },
      message: 'Asset ready for registration. Please complete on-chain registration.',
    });
  } catch (error) {
    console.error('Retry registration error:', error);
    return res.status(500).json({ 
      error: 'Failed to prepare asset for retry', 
      details: error.message 
    });
  }
}

