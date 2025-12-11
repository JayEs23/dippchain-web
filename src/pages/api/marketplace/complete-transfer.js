// API Route: Mark Order as Completed After Token Transfer
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, transferTxHash } = req.body;

    if (!orderId || !transferTxHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['orderId', 'transferTxHash'],
      });
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        fractionalization: {
          include: {
            asset: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.status !== 'PENDING_TRANSFER') {
      return res.status(400).json({
        success: false,
        error: `Order is in ${order.status} status, not PENDING_TRANSFER`,
      });
    }

    // Update order to completed
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      order: updatedOrder,
      message: 'Order marked as completed',
    });
  } catch (error) {
    console.error('Complete transfer error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete transfer',
      details: error.message,
    });
  }
}

