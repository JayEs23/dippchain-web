// API Route: Attach License Terms to Story Protocol IP Asset
import { createStoryClientServer, attachLicenseTerms, PIL_LICENSE_TERMS } from '@/lib/storyProtocolClient';
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      assetId,
      ipId,
      licenseType = 'COMMERCIAL_USE',
    } = req.body;

    // Validate required fields
    if (!assetId || !ipId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['assetId', 'ipId'],
      });
    }

    // Get asset from database with user info
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        user: {
          select: {
            walletAddress: true,
          },
        },
      },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    if (!asset.storyProtocolId || asset.storyProtocolId !== ipId) {
      return res.status(400).json({
        success: false,
        error: 'Asset is not registered on Story Protocol or IP ID mismatch',
      });
    }

    // Verify ownership (the server-side wallet must own the asset)
    // In production, you'd verify the request is signed by the asset owner
    // For now, we rely on the client-side check
    console.log('Asset owner:', asset.user.walletAddress);
    console.log('Note: Ensure the server wallet has permission to attach license terms');
    
    // Add a note in the response if the asset owner is different
    const ownerNote = asset.user.walletAddress 
      ? `Asset owned by: ${asset.user.walletAddress}` 
      : null;

    // Create Story Protocol client
    const client = await createStoryClientServer();

    // Map license type to PIL terms
    const licenseTermsMap = {
      'NON_COMMERCIAL_SOCIAL': PIL_LICENSE_TERMS.NON_COMMERCIAL_SOCIAL_REMIXING,
      'COMMERCIAL_USE': PIL_LICENSE_TERMS.COMMERCIAL_USE,
      'COMMERCIAL_REMIX': PIL_LICENSE_TERMS.COMMERCIAL_REMIX,
    };

    const licenseTermsId = licenseTermsMap[licenseType] || PIL_LICENSE_TERMS.COMMERCIAL_USE;

    console.log('Attaching license terms to IP:', ipId);
    console.log('License type:', licenseType, '| License terms ID:', licenseTermsId.toString());

    // Attach license terms (this creates the Royalty Vault)
    const result = await attachLicenseTerms(client, {
      ipId,
      licenseTermsId,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to attach license terms',
      });
    }

    console.log('License terms attached successfully! Tx hash:', result.txHash);
    console.log('Royalty vault should now be created for IP:', ipId);

    return res.status(200).json({
      success: true,
      txHash: result.txHash,
      ipId,
      message: 'License terms attached successfully. Royalty vault is now created.',
      note: ownerNote,
    });
  } catch (error) {
    console.error('Attach license error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach license terms',
      details: error.message,
    });
  }
}

