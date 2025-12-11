// API Route: Get Pending Token Transfers for Seller
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sellerAddress } = req.query;

    if (!sellerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Seller address is required',
      });
    }

    // Find seller user
    const seller = await prisma.user.findUnique({
      where: { walletAddress: sellerAddress.toLowerCase() },
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found',
      });
    }

    // Get all pending primary market orders where this user is the seller
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING_TRANSFER', // New status for orders awaiting token transfer
        sellerId: seller.id,
      },
      include: {
        buyer: {
          select: {
            walletAddress: true,
            displayName: true,
          },
        },
        fractionalization: {
          include: {
            asset: {
              select: {
                title: true,
                storyProtocolId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      pendingTransfers: pendingOrders.map(order => ({
        orderId: order.id,
        buyerAddress: order.buyer.walletAddress,
        buyerName: order.buyer.displayName || 'Anonymous',
        assetTitle: order.fractionalization.asset.title,
        ipId: order.fractionalization.asset.storyProtocolId,
        tokenAddress: order.fractionalization.tokenAddress,
        amount: parseFloat(order.amount),
        totalPaid: parseFloat(order.totalPaid),
        currency: order.currency,
        paymentTxHash: order.txHash,
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get pending transfers error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending transfers',
      details: error.message,
    });
  }
}

