// API Route: Diagnose draft asset to determine recovery path
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assetId } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    // Get full asset data
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Analyze what exists and what's missing
    const diagnosis = {
      assetId: asset.id,
      status: asset.status,
      completedSteps: [],
      failedStep: null,
      missingData: [],
      canRecover: true,
      recoveryAction: null,
      reason: null,
    };

    // Check Step 1: File Upload to IPFS
    if (asset.pinataCid && asset.pinataUrl) {
      diagnosis.completedSteps.push({
        step: 1,
        name: 'IPFS Upload',
        data: {
          cid: asset.pinataCid,
          url: asset.pinataUrl,
        },
      });
    } else {
      diagnosis.failedStep = {
        step: 1,
        name: 'IPFS Upload',
        reason: 'File not uploaded to IPFS',
      };
      diagnosis.missingData.push('pinataCid', 'pinataUrl');
      diagnosis.canRecover = false;
      diagnosis.recoveryAction = 'RE_UPLOAD';
      diagnosis.reason = 'The file was never uploaded to IPFS. You need to upload the asset again.';
      return res.status(200).json({ success: true, diagnosis });
    }

    // Check Step 2: Watermark & Content Hash
    if (asset.watermarkId && asset.contentHash) {
      diagnosis.completedSteps.push({
        step: 2,
        name: 'Watermark & Hash',
        data: {
          watermarkId: asset.watermarkId,
          contentHash: asset.contentHash,
        },
      });
    } else {
      diagnosis.failedStep = {
        step: 2,
        name: 'Watermark & Hash Generation',
        reason: 'Watermark ID or content hash missing',
      };
      diagnosis.missingData.push(!asset.watermarkId ? 'watermarkId' : null, !asset.contentHash ? 'contentHash' : null).filter(Boolean);
      diagnosis.canRecover = false;
      diagnosis.recoveryAction = 'RE_UPLOAD';
      diagnosis.reason = 'Watermark or content hash was not generated properly. You need to upload the asset again.';
      return res.status(200).json({ success: true, diagnosis });
    }

    // Check Step 3: DippChain Registry (On-chain)
    if (asset.dippchainTokenId && asset.dippchainTxHash) {
      diagnosis.completedSteps.push({
        step: 3,
        name: 'DippChain Registration',
        data: {
          tokenId: asset.dippchainTokenId,
          txHash: asset.dippchainTxHash,
          registered: asset.registeredOnChain,
        },
      });
    } else {
      // Database shows not registered, but check if it might be registered on-chain
      // (transaction succeeded but database update failed)
      diagnosis.failedStep = {
        step: 3,
        name: 'DippChain On-Chain Registration',
        reason: 'Token ID not found in database (may need blockchain verification)',
      };
      diagnosis.missingData.push('dippchainTokenId', 'dippchainTxHash');
      diagnosis.canRecover = true;
      diagnosis.recoveryAction = 'VERIFY_ONCHAIN';
      diagnosis.reason = 'The token ID is missing from our database. This could mean: (1) The asset was never registered on-chain, OR (2) The blockchain transaction succeeded but our database update failed. We will check the blockchain to verify the actual status.';
      diagnosis.recoveryData = {
        contentHash: asset.contentHash,
        metadataUri: asset.pinataUrl,
        watermarkId: asset.watermarkId,
      };
      return res.status(200).json({ success: true, diagnosis });
    }

    // Check Step 4: Story Protocol
    if (asset.storyProtocolId && asset.storyProtocolTxHash) {
      diagnosis.completedSteps.push({
        step: 4,
        name: 'Story Protocol Registration',
        data: {
          ipId: asset.storyProtocolId,
          txHash: asset.storyProtocolTxHash,
        },
      });
      
      // If we get here, all steps are complete but status is still DRAFT
      diagnosis.failedStep = {
        step: 5,
        name: 'Status Update',
        reason: 'All registration complete but status not updated',
      };
      diagnosis.canRecover = true;
      diagnosis.recoveryAction = 'UPDATE_STATUS';
      diagnosis.reason = 'All registrations are complete but the status is stuck as DRAFT. This can be fixed automatically.';
      return res.status(200).json({ success: true, diagnosis });
    } else {
      diagnosis.failedStep = {
        step: 4,
        name: 'Story Protocol Registration',
        reason: 'Asset not registered on Story Protocol',
      };
      diagnosis.missingData.push('storyProtocolId', 'storyProtocolTxHash');
      diagnosis.canRecover = true;
      diagnosis.recoveryAction = 'REGISTER_STORY_PROTOCOL';
      diagnosis.reason = 'The asset is registered on-chain but not on Story Protocol. You can complete the Story Protocol registration.';
      diagnosis.recoveryData = {
        tokenId: asset.dippchainTokenId,
        ipMetadataURI: asset.pinataUrl,
        ipMetadataHash: asset.contentHash,
      };
      return res.status(200).json({ success: true, diagnosis });
    }

  } catch (error) {
    console.error('Diagnosis error:', error);
    return res.status(500).json({ 
      error: 'Failed to diagnose asset', 
      details: error.message 
    });
  }
}

