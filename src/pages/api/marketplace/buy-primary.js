// API Route: Buy Tokens from Primary Market (from creator's IP Account)
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fractionalizationId,
      buyerAddress,
      amount,
      txHash,
    } = req.body;

    // Validate required fields
    if (!fractionalizationId || !buyerAddress || !amount || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['fractionalizationId', 'buyerAddress', 'amount', 'txHash'],
      });
    }

    // Get fractionalization
    const fractionalization = await prisma.fractionalization.findUnique({
      where: { id: fractionalizationId },
      include: { asset: true },
    });

    if (!fractionalization) {
      return res.status(404).json({
        success: false,
        error: 'Fractionalization not found',
      });
    }

    // Check availability
    if (fractionalization.availableSupply < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient tokens available',
        available: fractionalization.availableSupply,
        requested: amount,
      });
    }

    // Calculate totals
    const totalPaid = parseFloat(amount) * fractionalization.pricePerToken;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update fractionalization available supply
      await tx.fractionalization.update({
        where: { id: fractionalizationId },
        data: {
          availableSupply: fractionalization.availableSupply - parseFloat(amount),
        },
      });

      // 2. Ensure buyer user exists
      let buyer = await tx.user.findUnique({
        where: { walletAddress: buyerAddress.toLowerCase() },
      });

      if (!buyer) {
        buyer = await tx.user.create({
          data: {
            email: `${buyerAddress.toLowerCase()}@dippchain.xyz`,
            walletAddress: buyerAddress.toLowerCase(),
            displayName: `User_${buyerAddress.slice(2, 8)}`,
          },
        });
      }

      // 3. Create or update FractionHolder record
      const existingHolder = await tx.fractionHolder.findFirst({
        where: {
          fractionalizationId,
          userId: buyer.id,
        },
      });

      if (existingHolder) {
        await tx.fractionHolder.update({
          where: { id: existingHolder.id },
          data: {
            amount: existingHolder.amount + parseFloat(amount),
            percentageOwned: ((existingHolder.amount + parseFloat(amount)) / fractionalization.totalSupply) * 100,
          },
        });
      } else {
        await tx.fractionHolder.create({
          data: {
            fractionalizationId,
            userId: buyer.id,
            amount: parseFloat(amount),
            percentageOwned: (parseFloat(amount) / fractionalization.totalSupply) * 100,
          },
        });
      }

      // 4. Create Order record with PENDING_TRANSFER status
      // For primary market sales, there's no listing (direct purchase from creator)
      const order = await tx.order.create({
        data: {
          fractionalizationId, // Link directly to fractionalization for primary sales
          listingId: null, // No listing for primary market purchases
          buyerId: buyer.id,
          sellerId: fractionalization.asset.userId, // Track seller for fulfillment
          amount: parseFloat(amount),
          totalPaid,
          currency: fractionalization.currency,
          txHash,
          status: 'PENDING_TRANSFER', // Wait for seller to transfer tokens
        },
      });

      // 5. Create Revenue record for creator
      await tx.revenue.create({
        data: {
          userId: fractionalization.asset.userId,
          amount: totalPaid,
          currency: fractionalization.currency,
          source: 'FRACTION_SALE',
          sourceId: order.id,
          claimed: false,
        },
      });

      return order;
    });

    return res.status(200).json({
      success: true,
      order: result,
      message: 'Primary market purchase completed',
    });
  } catch (error) {
    console.error('Buy primary market error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process primary market purchase',
      details: error.message,
    });
  }
}

