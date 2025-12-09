// API Route: Get, Update License
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'License ID is required' });
  }

  switch (req.method) {
    case 'GET':
      return getLicense(id, res);
    case 'PUT':
    case 'PATCH':
      return updateLicense(id, req.body, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getLicense(id, res) {
  try {
    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            title: true,
            assetType: true,
            thumbnailUrl: true,
            pinataUrl: true,
            watermarkId: true,
            pinataCid: true,
          },
        },
        creator: {
          select: { id: true, displayName: true, walletAddress: true },
        },
        template: true,
      },
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    return res.status(200).json({ success: true, license });
  } catch (error) {
    console.error('Get license error:', error);
    return res.status(500).json({ error: 'Failed to fetch license', details: error.message });
  }
}

async function updateLicense(id, data, res) {
  try {
    const { status, onChainLicenseId, txHash, licenseeId } = data;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (onChainLicenseId !== undefined) updateData.onChainLicenseId = onChainLicenseId;
    if (txHash !== undefined) updateData.txHash = txHash;
    if (licenseeId !== undefined) updateData.licenseeId = licenseeId;

    const license = await prisma.license.update({
      where: { id },
      data: updateData,
      include: {
        asset: { select: { id: true, title: true } },
      },
    });

    return res.status(200).json({ success: true, license });
  } catch (error) {
    console.error('Update license error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'License not found' });
    }
    
    return res.status(500).json({ error: 'Failed to update license', details: error.message });
  }
}

