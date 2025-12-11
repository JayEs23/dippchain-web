// API Route: Create Secondary Market Listing
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fractionalizationId,
      sellerAddress,
      amount,
      pricePerToken,
      currency = 'IP',
    } = req.body;

    // Validate required fields
    if (!fractionalizationId || !sellerAddress || !amount || !pricePerToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['fractionalizationId', 'sellerAddress', 'amount', 'pricePerToken'],
      });
    }

    // Get fractionalization
    const fractionalization = await prisma.fractionalization.findUnique({
      where: { id: fractionalizationId },
    });

    if (!fractionalization) {
      return res.status(404).json({
        success: false,
        error: 'Fractionalization not found',
      });
    }

    // Ensure seller user exists
    let seller = await prisma.user.findUnique({
      where: { walletAddress: sellerAddress.toLowerCase() },
    });

    if (!seller) {
      seller = await prisma.user.create({
        data: {
          email: `${sellerAddress.toLowerCase()}@dippchain.xyz`,
          walletAddress: sellerAddress.toLowerCase(),
          displayName: `User_${sellerAddress.slice(2, 8)}`,
        },
      });
    }

    // Verify seller owns enough tokens (check FractionHolder)
    const holder = await prisma.fractionHolder.findFirst({
      where: {
        fractionalizationId,
        userId: seller.id,
      },
    });

    if (!holder || holder.amount < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient token balance',
        balance: holder?.amount || 0,
        requested: amount,
      });
    }

    // Create secondary market listing
    const listing = await prisma.marketplaceListing.create({
      data: {
        fractionalizationId,
        sellerId: seller.id,
        amount: parseFloat(amount),
        pricePerToken: parseFloat(pricePerToken),
        totalPrice: parseFloat(amount) * parseFloat(pricePerToken),
        currency,
        listingType: 'SECONDARY',
        status: 'ACTIVE',
      },
      include: {
        fractionalization: {
          include: {
            asset: true,
          },
        },
        seller: {
          select: {
            id: true,
            displayName: true,
            walletAddress: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      listing,
      message: 'Secondary market listing created',
    });
  } catch (error) {
    console.error('Create listing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create listing',
      details: error.message,
    });
  }
}

