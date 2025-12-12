// API Route: Buy Tokens from Primary Market (from creator's IP Account)
import prisma from '@/lib/prisma';
import { createStoryClientServer, getStoryRpcUrls } from '@/lib/storyProtocolClient';
import { tokensToWei } from '@/lib/storyRoyaltyTokens';

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

    // Get fractionalization with asset and user
    const fractionalization = await prisma.fractionalization.findUnique({
      where: { id: fractionalizationId },
      include: { 
        asset: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!fractionalization) {
      return res.status(404).json({
        success: false,
        error: 'Fractionalization not found',
      });
    }

    // ✅ PREVENT ASSET OWNER FROM BUYING THEIR OWN PRIMARY LISTING
    const normalizedBuyerAddress = buyerAddress.toLowerCase();
    const assetOwnerAddress = fractionalization.asset.user.walletAddress?.toLowerCase();
    
    if (assetOwnerAddress && normalizedBuyerAddress === assetOwnerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Asset owners cannot purchase from their own primary market listing',
        details: 'You can only buy back tokens from secondary market listings where you are not the seller',
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

    // ✅ Validate asset has required Story Protocol data
    // Note: This should have been validated before payment, but double-check here
    // Use tokenAddress from fractionalization as fallback (it's the vault address)
    const ipId = fractionalization.asset.storyProtocolId;
    const vaultAddress = fractionalization.asset.royaltyVaultAddress || fractionalization.tokenAddress;
    
    if (!ipId) {
      console.error('❌ Asset missing storyProtocolId (should not happen for marketplace items):', {
        assetId: fractionalization.asset.id,
        assetTitle: fractionalization.asset.title,
        fractionalizationId,
        registeredOnChain: fractionalization.asset.registeredOnChain,
      });
      return res.status(400).json({
        success: false,
        error: 'Asset is not properly registered on Story Protocol',
        details: 'Asset is missing IP ID. This should not happen for items in the marketplace. Please contact support.',
        assetId: fractionalization.asset.id,
      });
    }

    if (!vaultAddress) {
      console.error('❌ Asset missing vault address (should not happen for marketplace items):', {
        assetId: fractionalization.asset.id,
        storyProtocolId: ipId,
        royaltyVaultAddress: fractionalization.asset.royaltyVaultAddress,
        tokenAddress: fractionalization.tokenAddress,
        fractionalizationStatus: fractionalization.status,
      });
      return res.status(400).json({
        success: false,
        error: 'Asset is missing royalty vault address',
        details: 'Asset is missing vault address for token transfers. This should not happen for items in the marketplace. Please contact support.',
        assetId: fractionalization.asset.id,
        storyProtocolId: ipId,
      });
    }

    // Calculate totals
    const totalPaid = parseFloat(amount) * fractionalization.pricePerToken;

    // Start transaction with increased timeout (15 seconds)
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

      // 4. Create Order record with COMPLETED status (tokens will be transferred automatically)
      const order = await tx.order.create({
        data: {
          fractionalizationId,
          listingId: null,
          buyerId: buyer.id,
          sellerId: fractionalization.asset.userId,
          amount: parseFloat(amount),
          totalPaid,
          currency: fractionalization.currency,
          txHash,
          status: 'COMPLETED', // ✅ Changed to COMPLETED - tokens transfer automatically
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

      return { order, asset: fractionalization.asset };
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot
      timeout: 15000, // Maximum time the transaction can run (15 seconds)
    });

    // ✅ AUTOMATICALLY TRANSFER TOKENS FROM IP ACCOUNT TO BUYER (async, non-blocking)
    // Do this in background - don't wait for it
    setImmediate(async () => {
      try {
        console.log('🔄 Starting background token transfer...');
        const rpcUrls = getStoryRpcUrls();
        let transferSuccess = false;

        for (const rpcUrl of rpcUrls) {
          try {
            const client = await createStoryClientServer(rpcUrl);
            const transferAmount = tokensToWei(parseFloat(amount));
            
            const transferResult = await client.royalty.transferRoyaltyTokens({
              fromIpId: ipId,
              to: buyerAddress,
              amount: transferAmount,
              txOptions: { waitForTransaction: true },
            });

            transferSuccess = true;
            console.log('✅ Tokens transferred successfully:', transferResult.txHash);
            
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
    console.error('Buy primary market error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process primary market purchase',
      details: error.message,
    });
  }
}

