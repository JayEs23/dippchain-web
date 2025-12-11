// API Route: Buy Tokens from Secondary Market (peer-to-peer)
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      listingId,
      buyerAddress,
      amount,
      txHash,
    } = req.body;

    // Validate required fields
    if (!listingId || !buyerAddress || !amount || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['listingId', 'buyerAddress', 'amount', 'txHash'],
      });
    }

    // Get listing
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        fractionalization: true,
        seller: true,
      },
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Listing is not active',
      });
    }

    // Check amount availability
    if (parseFloat(amount) > listing.amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient tokens in listing',
        available: listing.amount,
        requested: amount,
      });
    }

    const totalPaid = parseFloat(amount) * listing.pricePerToken;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ensure buyer user exists
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

      // 2. Update listing (reduce amount or mark as sold)
      const remainingAmount = listing.amount - parseFloat(amount);
      if (remainingAmount <= 0) {
        await tx.marketplaceListing.update({
          where: { id: listingId },
          data: {
            amount: 0,
            status: 'SOLD',
          },
        });
      } else {
        await tx.marketplaceListing.update({
          where: { id: listingId },
          data: {
            amount: remainingAmount,
          },
        });
      }

      // 3. Update seller's FractionHolder (reduce amount)
      const sellerHolder = await tx.fractionHolder.findFirst({
        where: {
          fractionalizationId: listing.fractionalizationId,
          userId: listing.sellerId,
        },
      });

      if (sellerHolder) {
        const newSellerAmount = sellerHolder.amount - parseFloat(amount);
        if (newSellerAmount <= 0) {
          await tx.fractionHolder.delete({
            where: { id: sellerHolder.id },
          });
        } else {
          await tx.fractionHolder.update({
            where: { id: sellerHolder.id },
            data: {
              amount: newSellerAmount,
              percentageOwned: (newSellerAmount / listing.fractionalization.totalSupply) * 100,
            },
          });
        }
      }

      // 4. Update buyer's FractionHolder (add amount)
      const buyerHolder = await tx.fractionHolder.findFirst({
        where: {
          fractionalizationId: listing.fractionalizationId,
          userId: buyer.id,
        },
      });

      if (buyerHolder) {
        await tx.fractionHolder.update({
          where: { id: buyerHolder.id },
          data: {
            amount: buyerHolder.amount + parseFloat(amount),
            percentageOwned: ((buyerHolder.amount + parseFloat(amount)) / listing.fractionalization.totalSupply) * 100,
          },
        });
      } else {
        await tx.fractionHolder.create({
          data: {
            fractionalizationId: listing.fractionalizationId,
            userId: buyer.id,
            amount: parseFloat(amount),
            percentageOwned: (parseFloat(amount) / listing.fractionalization.totalSupply) * 100,
          },
        });
      }

      // 5. Create Order record
      const order = await tx.order.create({
        data: {
          listingId,
          buyerId: buyer.id,
          amount: parseFloat(amount),
          totalPaid,
          currency: listing.currency,
          txHash,
          status: 'COMPLETED',
        },
      });

      // 6. Create Revenue record for seller (with platform fee deducted)
      const platformFeeBps = 250; // 2.5%
      const platformFee = (totalPaid * platformFeeBps) / 10000;
      const sellerAmount = totalPaid - platformFee;

      await tx.revenue.create({
        data: {
          userId: listing.sellerId,
          amount: sellerAmount,
          currency: listing.currency,
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
      message: 'Secondary market purchase completed',
    });
  } catch (error) {
    console.error('Buy secondary market error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process secondary market purchase',
      details: error.message,
    });
  }
}

