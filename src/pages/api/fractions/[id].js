// API Route: Get/Update Single Fractionalization
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Fractionalization ID is required' });
  }

  switch (req.method) {
    case 'GET':
      return getFractionalization(id, res);
    case 'PUT':
    case 'PATCH':
      return updateFractionalization(id, req.body, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getFractionalization(id, res) {
  try {
    const fractionalization = await prisma.fractionalization.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            title: true,
            assetType: true,
            thumbnailUrl: true,
            pinataUrl: true,
            userId: true,
            user: {
              select: { displayName: true, walletAddress: true },
            },
          },
        },
        holders: {
          include: {
            user: {
              select: { displayName: true, walletAddress: true },
            },
          },
          orderBy: { percentageOwned: 'desc' },
        },
        listings: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
        revenues: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!fractionalization) {
      return res.status(404).json({ error: 'Fractionalization not found' });
    }

    return res.status(200).json({ success: true, fractionalization });
  } catch (error) {
    console.error('Get fractionalization error:', error);
    return res.status(500).json({ error: 'Failed to fetch fractionalization', details: error.message });
  }
}

async function updateFractionalization(id, data, res) {
  try {
    const { status, tokenAddress, deployTxHash, availableSupply } = data;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (tokenAddress !== undefined) updateData.tokenAddress = tokenAddress;
    if (deployTxHash !== undefined) updateData.deployTxHash = deployTxHash;
    if (availableSupply !== undefined) updateData.availableSupply = parseFloat(availableSupply);

    const fractionalization = await prisma.fractionalization.update({
      where: { id },
      data: updateData,
      include: {
        asset: { select: { id: true, title: true } },
      },
    });

    return res.status(200).json({ success: true, fractionalization });
  } catch (error) {
    console.error('Update fractionalization error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Fractionalization not found' });
    }
    
    return res.status(500).json({ error: 'Failed to update fractionalization', details: error.message });
  }
}

