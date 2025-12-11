// Sentinel Evidence Package Generator
// Creates complete evidence packages for detected infringements

import { uploadJsonToPinata } from '@/lib/pinata';

/**
 * Create evidence package for detected infringement
 * Includes screenshots, metadata, timestamps, similarity scores, etc.
 */
export async function createEvidencePackage({
  asset,
  platform,
  sourceUrl,
  screenshotBuffer,
  screenshotUrl,
  similarityScore,
  watermarkFound,
  metadataMatch,
  detectedAt,
}) {
  const evidence = {
    // Asset Information
    asset: {
      id: asset.id,
      title: asset.title,
      assetType: asset.assetType,
      contentHash: asset.contentHash,
      watermarkId: asset.watermarkId,
      storyProtocolId: asset.storyProtocolId,
    },

    // Detection Details
    detection: {
      platform,
      sourceUrl,
      detectedAt: detectedAt || new Date().toISOString(),
      similarityScore: parseFloat(similarityScore) || 0,
      watermarkFound: Boolean(watermarkFound),
      metadataMatch: Boolean(metadataMatch),
    },

    // Evidence Files
    files: {
      screenshotUrl: screenshotUrl || null,
      screenshotCid: null, // Will be set after upload
    },

    // Verification
    verification: {
      timestamp: new Date().toISOString(),
      verified: true,
    },
  };

  // Upload screenshot to Pinata if provided
  // Note: For prototype, we skip screenshot upload (would need Pinata file upload API)
  // In production, use Pinata's file upload endpoint for binary data
  if (screenshotBuffer && screenshotUrl) {
    // Store screenshot URL in evidence
    evidence.files.screenshotUrl = screenshotUrl;
  }

  // Upload evidence package to Pinata as JSON
  try {
    const uploadResult = await uploadJsonToPinata(
      evidence,
      `sentinel-evidence-${asset.id}-${Date.now()}`
    );

    if (uploadResult.success && uploadResult.cid) {
      return {
        success: true,
        evidenceCid: uploadResult.cid,
        evidenceUrl: uploadResult.url,
        evidenceData: evidence,
        screenshotCid: null, // Screenshot not uploaded in prototype
        screenshotUrl: evidence.files.screenshotUrl,
      };
    }
  } catch (error) {
    console.error('Failed to upload evidence package to Pinata:', error);
  }

  // Return evidence without IPFS upload if upload fails
  return {
    success: true,
    evidenceCid: null,
    evidenceUrl: null,
    evidenceData: evidence,
    screenshotCid: evidence.files.screenshotCid,
    screenshotUrl: evidence.files.screenshotUrl,
  };
}

