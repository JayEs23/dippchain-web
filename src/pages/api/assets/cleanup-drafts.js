// API Route: Clean up draft assets
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, confirm } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (confirm !== 'DELETE_ALL_DRAFTS') {
      return res.status(400).json({ 
        error: 'Confirmation required',
        message: 'Send confirm: "DELETE_ALL_DRAFTS" to proceed'
      });
    }

    // Find all draft assets for this user
    const draftAssets = await prisma.asset.findMany({
      where: {
        userId,
        status: 'DRAFT',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    if (draftAssets.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No draft assets found',
        deleted: 0,
      });
    }

    // Delete all draft assets
    const deleteResult = await prisma.asset.deleteMany({
      where: {
        userId,
        status: 'DRAFT',
      },
    });

    console.log(`Deleted ${deleteResult.count} draft assets for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} draft assets`,
      deleted: deleteResult.count,
      assets: draftAssets,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ 
      error: 'Cleanup failed', 
      details: error.message 
    });
  }
}

