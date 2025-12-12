// API Route: Buy Tokens from Secondary Market (peer-to-peer)
import prisma from '@/lib/prisma';
import { createStoryClientServer, getStoryRpcUrls } from '@/lib/storyProtocolClient';

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

    // Get listing with asset info
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        fractionalization: {
          include: {
            asset: {
              include: {
                user: true,
              },
            },
          },
        },
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

    // ✅ PREVENT BUYING FROM YOURSELF (but allow asset owner to buy from others)
    const normalizedBuyerAddress = buyerAddress.toLowerCase();
    const sellerAddress = listing.seller.walletAddress?.toLowerCase();
    
    if (sellerAddress && normalizedBuyerAddress === sellerAddress) {
      return res.status(400).json({
        success: false,
        error: 'You cannot purchase from your own listing',
        details: 'You cannot buy tokens from a listing you created',
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

    // ✅ Validate asset has required Story Protocol data
    // Use tokenAddress from fractionalization as fallback (it's the vault address)
    const ipId = listing.fractionalization.asset.storyProtocolId;
    const vaultAddress = listing.fractionalization.asset.royaltyVaultAddress || listing.fractionalization.tokenAddress;
    
    if (!ipId) {
      console.error('❌ Asset missing storyProtocolId (should not happen for marketplace items):', {
        assetId: listing.fractionalization.asset.id,
        assetTitle: listing.fractionalization.asset.title,
        listingId,
      });
      return res.status(400).json({
        success: false,
        error: 'Asset is not properly registered on Story Protocol',
        details: 'Asset is missing IP ID. This should not happen for items in the marketplace. Please contact support.',
        assetId: listing.fractionalization.asset.id,
      });
    }

    if (!vaultAddress) {
      console.error('❌ Asset missing vault address (should not happen for marketplace items):', {
        assetId: listing.fractionalization.asset.id,
        storyProtocolId: ipId,
        royaltyVaultAddress: listing.fractionalization.asset.royaltyVaultAddress,
        tokenAddress: listing.fractionalization.tokenAddress,
      });
      return res.status(400).json({
        success: false,
        error: 'Asset is missing royalty vault address',
        details: 'Asset is missing vault address for token transfers. This should not happen for items in the marketplace. Please contact support.',
        assetId: listing.fractionalization.asset.id,
        storyProtocolId: ipId,
      });
    }

    const totalPaid = parseFloat(amount) * listing.pricePerToken;

    // Start transaction with increased timeout
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

      return { order, listing };
    }, {
      maxWait: 10000,
      timeout: 15000, // 15 seconds
    });

    // ✅ AUTOMATICALLY TRANSFER TOKENS FROM SELLER TO BUYER (async, non-blocking)
    // Do this in background - don't wait for it
    const { tokensToWei } = await import('@/lib/storyRoyaltyTokens');
    
    setImmediate(async () => {
      try {
        console.log('🔄 Starting background token transfer...');
        const rpcUrls = getStoryRpcUrls();
        let transferSuccess = false;
        let transferTxHash = null;

        for (const rpcUrl of rpcUrls) {
          try {
            const client = await createStoryClientServer(rpcUrl);
            const transferAmount = tokensToWei(parseFloat(amount));
            
            const transferResult = await client.royalty.transferRoyaltyTokens({
              from: listing.seller.walletAddress,
              to: buyerAddress,
              amount: transferAmount,
              txOptions: { waitForTransaction: true },
            });

            transferTxHash = transferResult.txHash;
            transferSuccess = true;
            console.log('✅ Tokens transferred successfully:', transferTxHash);
            
            await prisma.order.update({
              where: { id: result.order.id },
              data: { status: 'COMPLETED' },
            });
            break;
          } catch (err) {
            console.error(`Token transfer failed on ${rpcUrl}:`, err);
            // Try next RPC
          }
        }

        if (!transferSuccess) {
          console.error('❌ Failed to transfer tokens automatically');
          await prisma.order.update({
            where: { id: result.order.id },
            data: { status: 'PENDING_TRANSFER' },
          });
        }
      } catch (err) {
        console.error('Background token transfer error:', err);
      }
    });

    // Return success immediately - token transfer happens in background
    return res.status(200).json({
      success: true,
      order: result.order,
      message: 'Purchase completed! Tokens are being transferred to your wallet automatically.',
      transferInProgress: true,
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

