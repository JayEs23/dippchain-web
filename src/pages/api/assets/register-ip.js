// API Route: Register Asset as IP on Story Protocol
import prisma from '@/lib/prisma';
import { 
  createStoryClientServer, 
  registerIPAsset, 
  attachLicenseTerms,
  PIL_LICENSE_TERMS 
} from '@/lib/storyProtocolClient';
import { CONTRACTS } from '@/contracts/addresses';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      assetId, 
      tokenId, // Token ID from DippChainRegistry
      ipMetadataURI,
      ipMetadataHash,
      nftMetadataURI,
      nftMetadataHash,
      licenseType = 'COMMERCIAL_USE',
    } = req.body;

    if (!assetId || !tokenId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['assetId', 'tokenId']
      });
    }

    // Get asset from database
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Create Story Protocol client
    const client = await createStoryClientServer();

    // Register the NFT as an IP Asset
    console.log('Registering IP Asset on Story Protocol...');
    const registerResult = await registerIPAsset(client, {
      nftContract: CONTRACTS.DippChainRegistry,
      tokenId: BigInt(tokenId),
      ipMetadataURI: ipMetadataURI || asset.pinataUrl,
      ipMetadataHash: ipMetadataHash || `0x${asset.contentHash}`,
      nftMetadataURI: nftMetadataURI || asset.pinataUrl,
      nftMetadataHash: nftMetadataHash || `0x${asset.contentHash}`,
    });

    if (!registerResult.success) {
      return res.status(500).json({ 
        error: 'Failed to register IP Asset',
        details: registerResult.error,
      });
    }

    // Attach license terms
    console.log('Attaching license terms...');
    const licenseTermsId = PIL_LICENSE_TERMS[licenseType] || PIL_LICENSE_TERMS.COMMERCIAL_USE;
    const licenseResult = await attachLicenseTerms(client, {
      ipId: registerResult.ipId,
      licenseTermsId,
    });

    // Update asset in database with Story Protocol info
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        storyProtocolId: registerResult.ipId,
        storyProtocolTxHash: registerResult.txHash,
        status: 'REGISTERED',
      },
    });

    return res.status(200).json({
      success: true,
      ipId: registerResult.ipId,
      txHash: registerResult.txHash,
      licenseAttached: licenseResult.success,
      licenseTxHash: licenseResult.txHash,
      asset: updatedAsset,
      explorerUrl: `https://aeneid.storyscan.io/address/${registerResult.ipId}`,
    });
  } catch (error) {
    console.error('Story Protocol registration error:', error);
    return res.status(500).json({ 
      error: 'Story Protocol registration failed', 
      details: error.message 
    });
  }
}

