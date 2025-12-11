// API Route: Register Asset as IP on Story Protocol
import prisma from '@/lib/prisma';
import { 
  createStoryClientServer, 
  registerIPWithSPG,
} from '@/lib/storyProtocolClient';

// ✅ Global BigInt serializer for JSON responses
// Story Protocol SDK returns BigInt values that need to be serialized
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      assetId, 
      tokenId, // Token ID from DippChainRegistry (OPTIONAL for SPG method)
      ipMetadataURI,
      ipMetadataHash,
      nftMetadataURI,
      nftMetadataHash,
      licenseType = 'COMMERCIAL_USE',
      commercialRevShare = 5, // Revenue share percentage (default: 5%)
      defaultMintingFee = '10', // Minting fee in WIP (default: 10 WIP)
    } = req.body;

    // ✅ BUILDATHON: tokenId is optional when using SPG method
    // SPG mints its own NFT, so we don't need a DippChain token ID

    // Get asset from database
    let asset;
    
    if (assetId) {
      // If assetId provided, fetch by ID
      asset = await prisma.asset.findUnique({
        where: { id: assetId },
      });
    } else {
      // Otherwise, find by tokenId (dippchainTokenId)
      asset = await prisma.asset.findFirst({
        where: { dippchainTokenId: String(tokenId) },
      });
    }

    if (!asset) {
      return res.status(404).json({ 
        error: 'Asset not found',
        details: assetId 
          ? `No asset found with ID: ${assetId}`
          : `No asset found with token ID: ${tokenId}`,
      });
    }

    // Create Story Protocol client
    const client = await createStoryClientServer();

    // ✅ BUILDATHON: Skip "already registered" check for SPG method
    // SPG always mints a NEW NFT, so there's no existing NFT to check
    console.log('Using SPG method - will mint new NFT and register as IP...');
    
    let ipId;
    let txHash;

    // ✅ Register IP Asset using SPG (Story Protocol Gateway)
    // This mints a NEW NFT on Story Protocol's SPG contract + registers IP + attaches license in ONE transaction
    // Benefits: No ownership issues, one transaction, automatic royalty vault, ready for fractionalization
    console.log('Registering IP Asset on Story Protocol using SPG...');
    
    // ✅ Ensure we have all required metadata from the database asset
    const finalIpMetadataURI = ipMetadataURI || asset.pinataUrl || asset.thumbnailUrl;
    const finalNftMetadataURI = nftMetadataURI || asset.pinataUrl || asset.thumbnailUrl;
    
    // ✅ CRITICAL: Ensure content hash exists and is properly formatted
    let finalIpMetadataHash = ipMetadataHash;
    let finalNftMetadataHash = nftMetadataHash;
    
    if (!finalIpMetadataHash && asset.contentHash) {
      finalIpMetadataHash = asset.contentHash.startsWith('0x') ? asset.contentHash : `0x${asset.contentHash}`;
    }
    
    if (!finalNftMetadataHash && asset.contentHash) {
      finalNftMetadataHash = asset.contentHash.startsWith('0x') ? asset.contentHash : `0x${asset.contentHash}`;
    }
    
    // ✅ Validate required fields
    if (!finalIpMetadataURI) {
      return res.status(400).json({
        error: 'Missing IP metadata URI',
        details: 'Asset must have pinataUrl or thumbnailUrl',
      });
    }
    
    if (!finalIpMetadataHash) {
      return res.status(400).json({
        error: 'Missing IP metadata hash',
        details: 'Asset must have contentHash',
      });
    }
    
    console.log('SPG Registration Params:', {
      ipMetadataURI: finalIpMetadataURI,
      ipMetadataHash: finalIpMetadataHash,
      nftMetadataURI: finalNftMetadataURI,
      nftMetadataHash: finalNftMetadataHash,
    });
    
    // ✅ Validate and format parameters
    const finalLicenseType = licenseType || 'COMMERCIAL_USE';
    const finalCommercialRevShare = Number(commercialRevShare) || 5; // Default 5%
    const finalDefaultMintingFee = String(defaultMintingFee) || '10'; // Default 10 WIP
    
    console.log('SPG Registration Configuration:', {
      licenseType: finalLicenseType,
      commercialRevShare: finalCommercialRevShare + '%',
      defaultMintingFee: finalDefaultMintingFee + ' WIP',
    });
    
    const registerResult = await registerIPWithSPG(client, {
      ipMetadataURI: finalIpMetadataURI,
      ipMetadataHash: finalIpMetadataHash,
      nftMetadataURI: finalNftMetadataURI,
      nftMetadataHash: finalNftMetadataHash,
      licenseType: finalLicenseType,
      commercialRevShare: finalCommercialRevShare, // Will be formatted to 5,000,000 (5 * 10^6) in registerIPWithSPG
      defaultMintingFee: finalDefaultMintingFee, // Will be parsed to wei in registerIPWithSPG
    });

    if (!registerResult.success) {
      console.error('SPG registration failed:', registerResult.error);
      return res.status(500).json({ 
        error: 'Failed to register IP Asset',
        details: registerResult.error || registerResult.details,
      });
    }
    
    ipId = registerResult.ipId;
    txHash = registerResult.txHash;
    const spgTokenId = registerResult.tokenId;
    const spgNftContract = registerResult.nftContract;
    const licenseTermsId = registerResult.licenseTermsId;
    
    console.log('✅ IP registered successfully with SPG!');
    console.log('IP ID:', ipId);
    console.log('SPG Token ID:', spgTokenId);
    console.log('SPG NFT Contract:', spgNftContract);
    console.log('License Terms ID:', licenseTermsId);
    
    // License is already attached by SPG method
    const licenseAttached = true;

    // Update asset in database with Story Protocol info
    console.log('Updating asset in database...');
    console.log('Asset object:', { id: asset?.id, title: asset?.title });
    console.log('Using asset.id:', asset?.id);
    
    if (!asset || !asset.id) {
      console.error('ERROR: Asset or asset.id is undefined!', { asset });
      return res.status(500).json({
        error: 'Cannot update database',
        details: 'Asset ID not found. Asset may not have been fetched correctly.',
      });
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: asset.id },
      data: {
        storyProtocolId: ipId,
        storyProtocolTxHash: txHash,
        status: 'REGISTERED',
      },
    });

    console.log('✅ IP Asset registered successfully!');
    console.log('IP ID:', ipId);
    console.log('Transaction:', txHash);
    console.log('License attached:', licenseAttached);
    console.log('SPG Token ID:', spgTokenId || 'N/A');
    console.log('SPG NFT Contract:', spgNftContract || 'N/A');
    console.log('License Terms ID:', licenseTermsId || 'N/A');
    console.log('Database updated for asset:', updatedAsset.id);

    // ✅ Convert BigInt values to strings for JSON serialization
    return res.status(200).json({
      success: true,
      ipId,
      txHash,
      licenseAttached,
      spgTokenId: spgTokenId ? spgTokenId.toString() : null, // ✅ BigInt to string
      spgNftContract: spgNftContract || null,
      licenseTermsId: licenseTermsId ? licenseTermsId.toString() : null, // ✅ BigInt to string
      asset: updatedAsset,
      explorerUrl: `https://aeneid.storyscan.io/address/${ipId}`,
    });
  } catch (error) {
    console.error('Story Protocol registration error:', error);
    return res.status(500).json({ 
      error: 'Story Protocol registration failed', 
      details: error.message 
    });
  }
}

