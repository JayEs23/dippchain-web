// API Route: Modern Story Protocol IP Registration (SPG Method)
// This uses the Story Protocol Gateway for ONE-TRANSACTION registration
// Mints NFT + Registers IP + Attaches License in single atomic operation

import prisma from '@/lib/prisma';
import { createStoryClientServer, registerIPWithSPG, STORY_CONTRACTS, getStoryRpcUrls } from '@/lib/storyProtocolClient';
import { sendSuccess, sendError, sendValidationError, handleStoryProtocolError } from '@/lib/apiResponse';
import { saveStoryResponse } from '@/lib/storyProtocolLogger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405, { code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const {
      assetId,
      licenseType = 'COMMERCIAL_USE', // COMMERCIAL_USE, COMMERCIAL_REMIX, NON_COMMERCIAL
      commercialRevShare = 5, // 0-100%
      defaultMintingFee = '10000000000000000000', // 10 WIP in wei
    } = req.body;

    // Validate required fields
    if (!assetId) {
      return sendValidationError(res, 'Asset ID is required', ['assetId']);
    }

    console.log('📋 Starting modern IP registration for asset:', assetId);

    // Get asset from database
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return sendError(res, 'Asset not found', 404, { code: 'ASSET_NOT_FOUND' });
    }

    // Check if already registered
    if (asset.storyProtocolId) {
      console.log('⚠️  Asset already registered as IP:', asset.storyProtocolId);
      return sendSuccess(res, {
        ipId: asset.storyProtocolId,
        alreadyRegistered: true,
        message: 'Asset is already registered on Story Protocol',
        explorerUrl: `https://aeneid.storyscan.io/address/${asset.storyProtocolId}`,
      });
    }

    // Validate metadata URIs (IPA metadata standard)
    if (!asset.metadataHash) {
      return sendError(res, 'Asset must have IPFS metadata before registration', 400, {
        code: 'MISSING_METADATA',
        details: 'Upload metadata JSON to IPFS first (following IPA Metadata Standard)',
      });
    }

    // Create Story Protocol client with RPC fallback list
    const rpcUrls = getStoryRpcUrls();
    console.log('🔐 Creating Story Protocol client...');

    // ✅ Use metadataHash (IPA metadata JSON) for IP metadata URI
    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    const ipMetadataURI = `https://${gateway}/ipfs/${asset.metadataHash}`;
    
    // ✅ Use contentHash for media hash (SHA-256 of actual media file)
    const ipMetadataHash = asset.contentHash?.startsWith('0x')
      ? asset.contentHash
      : `0x${asset.contentHash || '0000000000000000000000000000000000000000000000000000000000000000'}`;

    // For NFT metadata, use the same IPA metadata (standard practice)
    const nftMetadataURI = ipMetadataURI;
    const nftMetadataHash = ipMetadataHash;

    console.log('📝 Registration parameters:');
    console.log('  - License Type:', licenseType);
    console.log('  - Revenue Share:', commercialRevShare + '%');
    console.log('  - Minting Fee:', defaultMintingFee, 'wei');
    console.log('  - IP Metadata URI:', ipMetadataURI);
    console.log('  - Media Hash:', ipMetadataHash);

    // ✅ Register IP Asset using SDK's registerIpAsset (via registerIPWithSPG wrapper) with RPC fallback + retry
    console.log('🚀 Calling registerIPWithSPG (uses SDK registerIpAsset internally)...');
    let result = null;
    let lastError = null;
    for (let i = 0; i < rpcUrls.length; i += 1) {
      const rpcUrl = rpcUrls[i];
      try {
        const client = await createStoryClientServer(rpcUrl);
        result = await registerIPWithSPG(client, {
          ipMetadataURI,
          ipMetadataHash,
          nftMetadataURI,
          nftMetadataHash,
          licenseType,
          commercialRevShare,
          defaultMintingFee,
        });
        if (result?.success) {
          break;
        }
        lastError = new Error(result?.error || 'Unknown registration error');
        console.warn(`Retrying SPG registration with next RPC (attempt ${i + 1}/${rpcUrls.length})`);
      } catch (err) {
        lastError = err;
        console.warn(`RPC attempt failed for ${rpcUrl}:`, err?.message || err);
      }
    }

    if (!result?.success) {
      console.error('❌ Registration failed:', lastError || result?.error);
      // Save failed response for debugging
      await saveStoryResponse('register-ip-failed', result || lastError, {
        assetId,
        ipId: null,
        txHash: null,
        error: lastError?.message || result?.error,
      });
      return handleStoryProtocolError(res, lastError || new Error('SPG registration failed'), 'IP Asset registration');
    }

    console.log('✅ Registration successful!');
    console.log('  - IP ID:', result.ipId);
    console.log('  - Token ID:', result.tokenId);
    console.log('  - NFT Contract:', result.nftContract);
    console.log('  - License Terms ID:', result.licenseTermsId);
    console.log('  - Transaction:', result.txHash);

    // Ensure tokenId is captured (should always be present from SPG)
    if (!result.tokenId) {
      console.warn('⚠️  Warning: tokenId missing from SPG registration response');
    }

    // ✅ Mint a license token to activate the royalty vault
    // IMPORTANT: Just attaching license terms doesn't create the vault - minting a license token does!
    console.log('🔍 Minting license token to activate royalty vault...');
    let vaultAddress = null;
    let licenseTokenMintTxHash = null;
    const rpcUrlsForVault = getStoryRpcUrls();
    const licenseTermsId = result.licenseTermsId?.toString() || '1'; // Use the license terms ID from SPG registration
    
    // Mint 1 license token to trigger vault deployment
    for (const rpcUrl of rpcUrlsForVault) {
      try {
        const vaultClient = await createStoryClientServer(rpcUrl);
        
        // Mint 1 license token - this triggers the vault deployment
        console.log(`Minting license token with terms ID: ${licenseTermsId}`);
        const mintResult = await vaultClient.license.mintLicenseTokens({
          licensorIpId: result.ipId,
          licenseTermsId: licenseTermsId,
          amount: 1,
          receiver: vaultClient.config?.account?.address, // Mint to server wallet
          txOptions: { waitForTransaction: true },
        });
        
        licenseTokenMintTxHash = mintResult?.txHash || mintResult?.hash || null;
        console.log('✅ License token minted, transaction:', licenseTokenMintTxHash);
        
        // Now fetch the vault address (with retries since RPC may need time to index)
        for (let attempt = 0; attempt < 5; attempt++) {
          if (attempt > 0) {
            // Wait progressively longer: 2s, 4s, 6s, 8s
            const delay = attempt * 2000;
            console.log(`Waiting ${delay}ms before vault lookup attempt ${attempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          try {
            vaultAddress = await vaultClient.royalty.getRoyaltyVaultAddress(result.ipId);
            
            if (vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000') {
              console.log('✅ Royalty vault address found:', vaultAddress);
              break;
            }
          } catch (vaultErr) {
            console.warn(`Vault lookup attempt ${attempt + 1} failed:`, vaultErr?.message);
          }
        }
        
        if (vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000') {
          break;
        }
      } catch (mintErr) {
        console.warn(`License token mint failed on ${rpcUrl}:`, mintErr?.message);
        // Try next RPC
      }
    }
    
    // Only save non-zero vault address
    if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️  Warning: Could not fetch royalty vault address after minting license token.');
      console.warn('   The vault should be available shortly. You can fetch it later via /api/fractions/vault');
      vaultAddress = null; // Set to null instead of zero address
    } else {
      console.log('✅ Royalty vault activated and address saved:', vaultAddress);
    }

    // Save Story Protocol response for debugging
    await saveStoryResponse('register-ip', result, {
      assetId,
      ipId: result.ipId,
      tokenId: result.tokenId?.toString(),
      nftContract: result.nftContract,
      licenseTermsId: result.licenseTermsId?.toString(),
      txHash: result.txHash,
      licenseType,
      commercialRevShare,
    });

    // Update asset in database with SPG NFT details
    // ✅ Save NFT ID, license terms ID, and royalty vault address for fractionalization
    // Note: licenseTermsId might be undefined from SPG response, but we can get it from the mint transaction
    const licenseTermsIdToSave = result.licenseTermsId?.toString() || licenseTermsId || null;
    
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        storyProtocolId: result.ipId,
        storyProtocolTxHash: result.txHash,
        storyNftTokenId: result.tokenId?.toString() || null,
        storyNftContract: result.nftContract || null,
        licenseTermsId: licenseTermsIdToSave, // ✅ Save license terms ID (from SPG or mint)
        royaltyVaultAddress: vaultAddress || null, // ✅ Save vault address (ERC-20 token contract)
        dippchainTokenId: result.tokenId?.toString() || null, // legacy field
        registeredOnChain: true,
        status: 'REGISTERED',
      },
    });

    console.log('💾 Database updated successfully');

    // Return success response
    return sendSuccess(res, {
      ipId: result.ipId,
      tokenId: result.tokenId?.toString(),
      nftContract: result.nftContract,
      licenseTermsId: result.licenseTermsId?.toString(),
      royaltyVaultAddress: vaultAddress, // ✅ Include vault address in response
      txHash: result.txHash,
      licenseTokenMintTxHash: licenseTokenMintTxHash, // ✅ Transaction that activated the vault
      nftExplorerUrl: `https://aeneid.storyscan.io/token/${result.nftContract}/instance/${result.tokenId?.toString()}`,
      asset: {
        id: updatedAsset.id,
        title: updatedAsset.title,
        status: updatedAsset.status,
      },
      explorerUrl: `https://aeneid.storyscan.io/address/${result.ipId}`,
      royaltyVaultCreated: !!vaultAddress,
      vaultAddressFetched: !!vaultAddress,
      message: vaultAddress 
        ? 'IP Asset registered successfully. License token minted to activate vault. Royalty vault address saved.'
        : 'IP Asset registered successfully. License token minted. Royalty vault address will be available shortly.',
    }, 'IP Asset registered successfully');

  } catch (error) {
    console.error('💥 Modern IP registration error:', error);
    return sendError(res, 'Failed to register IP Asset', 500, {
      code: 'REGISTRATION_ERROR',
      details: error.message,
    });
  }
}

