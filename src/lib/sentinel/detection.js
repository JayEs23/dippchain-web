// Sentinel Detection Engine
// Handles similarity detection, watermark extraction, and metadata verification

import { createHash } from 'crypto';

/**
 * Calculate perceptual hash for image similarity detection
 * Uses average hash (aHash) algorithm
 */
export async function calculateImageHash(imageBuffer) {
  // For prototype: use SHA-256 of image buffer
  // In production, use proper perceptual hashing (pHash, dHash, etc.)
  const hash = createHash('sha256').update(imageBuffer).digest('hex');
  return hash;
}

/**
 * Extract watermark from image buffer
 * Returns watermark ID if found, null otherwise
 */
export async function extractWatermark(imageBuffer) {
  // For prototype: simplified watermark extraction
  // In production, use proper LSB steganography extraction
  try {
    // This is a placeholder - real implementation would:
    // 1. Decode image
    // 2. Extract LSB from pixels
    // 3. Reconstruct watermark ID
    // For now, return null (watermark not found in prototype)
    return null;
  } catch (error) {
    console.warn('Watermark extraction error:', error);
    return null;
  }
}

/**
 * Calculate similarity score between two images
 * Returns score 0-100 (percentage)
 */
export async function calculateSimilarity(originalHash, detectedHash) {
  if (!originalHash || !detectedHash) {
    return 0;
  }

  // Hamming distance for hash comparison
  let distance = 0;
  const minLength = Math.min(originalHash.length, detectedHash.length);
  
  for (let i = 0; i < minLength; i++) {
    if (originalHash[i] !== detectedHash[i]) {
      distance++;
    }
  }

  // Calculate similarity percentage
  const maxDistance = minLength;
  const similarity = ((maxDistance - distance) / maxDistance) * 100;
  
  return Math.max(0, Math.min(100, similarity));
}

/**
 * Verify metadata match
 * Checks if detected content matches asset metadata
 */
export function verifyMetadataMatch(assetMetadata, detectedMetadata) {
  if (!assetMetadata || !detectedMetadata) {
    return false;
  }

  // Check title similarity
  const titleMatch = assetMetadata.title?.toLowerCase().includes(
    detectedMetadata.title?.toLowerCase() || ''
  ) || detectedMetadata.title?.toLowerCase().includes(
    assetMetadata.title?.toLowerCase() || ''
  );

  // Check content hash match (if available)
  const hashMatch = assetMetadata.contentHash && detectedMetadata.contentHash
    ? assetMetadata.contentHash === detectedMetadata.contentHash
    : false;

  return titleMatch || hashMatch;
}

/**
 * Determine alert severity based on detection results
 */
export function determineSeverity(similarityScore, watermarkFound, metadataMatch) {
  if (watermarkFound && similarityScore >= 90) {
    return 'CRITICAL';
  }
  if (similarityScore >= 80 || (watermarkFound && similarityScore >= 70)) {
    return 'HIGH';
  }
  if (similarityScore >= 60 || metadataMatch) {
    return 'MEDIUM';
  }
  return 'LOW';
}

