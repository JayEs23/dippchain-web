// API Route: Create Fractionalization Record using Story Protocol's Native Royalty Tokens
import prisma from '@/lib/prisma';
import { STORY_ROYALTY_TOKEN_TOTAL_TOKENS } from '@/lib/storyRoyaltyTokens';
import { createStoryClientServer, getStoryRpcUrls } from '@/lib/storyProtocolClient';

/**
 * Get or initialize the royalty vault for an IP Asset
 * Returns the vault address, initializing it if necessary
 */
async function getOrInitializeVault(ipId) {
  const rpcUrls = getStoryRpcUrls();
  let vaultAddress = null;
  let lastErr = null;

  // Try to get existing vault
  for (let i = 0; i < rpcUrls.length; i += 1) {
    const rpc = rpcUrls[i];
    try {
      const client = await createStoryClientServer(rpc);
      vaultAddress = await client.royalty.getRoyaltyVaultAddress(ipId);
      if (vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000') {
        return { vaultAddress, rpcUsed: rpc };
      }
    } catch (e) {
      lastErr = e;
      console.warn(`Vault lookup failed on RPC ${rpc}:`, e?.message || e);
    }
  }

  // Vault doesn't exist, initialize it
  console.log('Vault not found, initializing for IP:', ipId);
  for (let i = 0; i < rpcUrls.length; i += 1) {
    const rpc = rpcUrls[i];
    try {
      const client = await createStoryClientServer(rpc);
      
      // Ensure license terms are attached (idempotent)
      try {
        await client.license.attachLicenseTerms({
          ipId,
          licenseTermsId: '1', // Non-Commercial Social Remixing (zero fee)
          txOptions: { waitForTransaction: true },
        });
      } catch (attachErr) {
        console.warn('attachLicenseTerms skipped (may already be attached):', attachErr?.message || attachErr);
      }

      // Mint 1 license token to trigger vault deployment
      const mintRes = await client.license.mintLicenseTokens({
        licensorIpId: ipId,
        licenseTermsId: '1',
        amount: 1,
        receiver: client.config?.account?.address,
        txOptions: { waitForTransaction: true },
      });

      // Try to extract vault from mint logs
      const receipt = mintRes?.receipt || mintRes?.transactionReceipt || null;
      if (receipt?.logs) {
        const licenseModuleAddress = '0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f';
        const LICENSE_TOKEN_MINTED_EVENT = '0x0d96f072d487d7f8b4891a4e4cf14e8cdad444a34248230085c20808d57caa1a';
        const mintLog = receipt.logs.find((log) => {
          const isLicenseModule = log.address?.toLowerCase() === licenseModuleAddress.toLowerCase();
          const isMintEvent = log.topics?.[0]?.toLowerCase() === LICENSE_TOKEN_MINTED_EVENT.toLowerCase();
          return isLicenseModule && isMintEvent;
        });

        if (mintLog?.data && mintLog.data.length >= 66) {
          const firstParam = mintLog.data.slice(2, 66);
          const extractedVault = `0x${firstParam.slice(24)}`;
          if (/^0x[a-fA-F0-9]{40}$/.test(extractedVault)) {
            vaultAddress = extractedVault;
            return { vaultAddress, rpcUsed: rpc, initialized: true };
          }
        }
      }

      // Poll for vault (with delays for RPC indexing)
      const pollDelays = [5000, 7000, 10000];
      for (let attempt = 0; attempt < pollDelays.length; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, pollDelays[attempt]));
        }
        try {
          vaultAddress = await client.royalty.getRoyaltyVaultAddress(ipId);
          if (vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000') {
            return { vaultAddress, rpcUsed: rpc, initialized: true };
          }
        } catch (pollErr) {
          console.warn(`Vault poll attempt ${attempt + 1} failed:`, pollErr?.message || pollErr);
        }
      }
    } catch (e) {
      lastErr = e;
      console.warn('Vault initialization failed on RPC', rpc, e?.message || e);
    }
  }

  // If still no vault, return error
  throw new Error(`Failed to get or initialize vault: ${lastErr?.message || 'Vault not found after initialization attempts'}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      assetId,
      royaltyTokenAddress, // Optional - will be fetched if not provided
      tokensForSale,
      pricePerToken,
      currency = 'IP',
    } = req.body;

    // Validate required fields
    if (!assetId || !tokensForSale || !pricePerToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['assetId', 'tokensForSale', 'pricePerToken'],
      });
    }

    // Validate numeric values
    const tokensForSaleNum = parseFloat(tokensForSale);
    const pricePerTokenNum = parseFloat(pricePerToken);

    if (isNaN(tokensForSaleNum) || tokensForSaleNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'tokensForSale must be a positive number',
      });
    }

    if (isNaN(pricePerTokenNum) || pricePerTokenNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'pricePerToken must be a positive number',
      });
    }

    // Check if asset exists and has Story Protocol ID
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { user: true },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    if (!asset.storyProtocolId) {
      return res.status(400).json({
        success: false,
        error: 'Asset must be registered on Story Protocol first',
      });
    }

    // Get or initialize the royalty vault
    let finalVaultAddress = royaltyTokenAddress;
    let vaultInitialized = false;

    if (!finalVaultAddress || !/^0x[a-fA-F0-9]{40}$/.test(finalVaultAddress)) {
      // Vault address not provided or invalid, fetch/initialize it
      try {
        const vaultResult = await getOrInitializeVault(asset.storyProtocolId);
        finalVaultAddress = vaultResult.vaultAddress;
        vaultInitialized = vaultResult.initialized || false;
        console.log('Vault obtained:', { vaultAddress: finalVaultAddress, initialized: vaultInitialized });
      } catch (vaultError) {
        console.error('Failed to get or initialize vault:', vaultError);
        return res.status(500).json({
          success: false,
          error: 'Failed to get or initialize royalty vault',
          details: vaultError.message,
        });
      }
    } else {
      // Validate provided vault address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(finalVaultAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid royalty token address format',
        });
      }
    }

    // Check if already fractionalized
    const existing = await prisma.fractionalization.findUnique({
      where: { assetId },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Asset is already fractionalized',
        existingId: existing.id,
      });
    }

    // Story Protocol Royalty Tokens have exactly 100 tokens total (human-readable)
    const totalSupply = STORY_ROYALTY_TOKEN_TOTAL_TOKENS; // 100 tokens
    const availableSupply = tokensForSaleNum;
    const creatorTokens = totalSupply - availableSupply;

    // Validate tokensForSale doesn't exceed total supply
    if (availableSupply > totalSupply) {
      return res.status(400).json({
        success: false,
        error: `tokensForSale (${availableSupply}) cannot exceed total supply (${totalSupply} tokens)`,
      });
    }

    // Validate creator retains at least some tokens
    if (creatorTokens < 0) {
      return res.status(400).json({
        success: false,
        error: 'Creator must retain at least some tokens',
      });
    }

    // Create fractionalization record and creator's initial holding in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create fractionalization record
      const fractionalization = await tx.fractionalization.create({
        data: {
          assetId,
          tokenName: `${asset.title} Royalty Tokens`,
          tokenSymbol: 'RT',
          totalSupply,
          availableSupply,
          pricePerToken: pricePerTokenNum,
          currency,
          royaltyPercentage: 100, // 100% of revenue goes to token holders (native Story Protocol)
          tokenAddress: finalVaultAddress,
          status: 'DEPLOYED', // Already deployed by Story Protocol
        },
      });

      // Create initial FractionHolder record for creator with their retained tokens
      if (asset.userId && creatorTokens > 0) {
        await tx.fractionHolder.create({
          data: {
            fractionalizationId: fractionalization.id,
            userId: asset.userId,
            amount: creatorTokens,
            percentageOwned: (creatorTokens / totalSupply) * 100,
          },
        });
      }

      return fractionalization;
    });

    return res.status(201).json({
      success: true,
      fractionalization: result,
      message: vaultInitialized 
        ? 'Fractionalization created and vault initialized using Story Protocol Royalty Tokens'
        : 'Fractionalization record created using Story Protocol Royalty Tokens',
      summary: {
        totalTokens: totalSupply,
        tokensForSale: availableSupply,
        creatorTokens,
        creatorPercentage: creatorTokens > 0 ? ((creatorTokens / totalSupply) * 100).toFixed(2) : '0',
        vaultAddress: finalVaultAddress,
        vaultInitialized,
      },
    });
  } catch (error) {
    console.error('Create fractionalization error:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Asset is already fractionalized',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create fractionalization record',
      details: error.message,
    });
  }
}

