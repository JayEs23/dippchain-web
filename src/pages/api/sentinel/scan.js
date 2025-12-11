// API Route: Sentinel Scan
// Initiates a scan for an asset across platforms

import prisma from '@/lib/prisma';
import { scanPlatform, captureScreenshot, getScanPlatforms } from '@/lib/sentinel/scanner';
import { calculateImageHash, extractWatermark, calculateSimilarity, verifyMetadataMatch, determineSeverity } from '@/lib/sentinel/detection';
import { createEvidencePackage } from '@/lib/sentinel/evidence';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assetId, platforms, searchQuery } = req.body;

    if (!assetId) {
      return res.status(400).json({
        success: false,
        error: 'assetId is required',
      });
    }

    // Get asset with user
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
        error: 'Asset must be registered on Story Protocol before scanning',
      });
    }

    // Determine platforms to scan
    const platformsToScan = platforms || getScanPlatforms().slice(0, 3); // Limit to 3 for prototype

    // Create scan record
    const scan = await prisma.sentinelScan.create({
      data: {
        assetId,
        platform: platformsToScan.join(','),
        searchQuery: searchQuery || asset.title,
        status: 'RUNNING',
      },
    });

    // Process scan asynchronously (don't wait for completion)
    processScanAsync(scan, asset, platformsToScan, searchQuery).catch((error) => {
      console.error('Scan processing error:', error);
    });

    return res.status(202).json({
      success: true,
      scan: {
        id: scan.id,
        status: scan.status,
        startedAt: scan.startedAt,
      },
      message: 'Scan initiated. Results will be available shortly.',
    });
  } catch (error) {
    console.error('Scan initiation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate scan',
      details: error.message,
    });
  }
}

/**
 * Process scan asynchronously
 */
async function processScanAsync(scan, asset, platforms, searchQuery) {
  try {
    let totalMatches = 0;
    const alerts = [];

    // Scan each platform
    for (const platform of platforms) {
      try {
        // Perform scan
        const scanResults = await scanPlatform(platform, asset, searchQuery);

        // Process each match
        for (const match of scanResults.matches) {
          totalMatches++;

          // Capture screenshot
          const screenshotBuffer = await captureScreenshot(match.url);

          // Calculate similarity (prototype: use mock score)
          // In production, download image and calculate actual similarity
          const originalHash = asset.contentHash || 'mock-hash';
          const detectedHash = `mock-detected-${match.url}`;
          const similarityScore = await calculateSimilarity(originalHash, detectedHash) || Math.random() * 30 + 70; // Mock: 70-100%

          // Extract watermark
          const watermarkFound = screenshotBuffer
            ? await extractWatermark(screenshotBuffer)
            : false;
          const watermarkMatch = watermarkFound === asset.watermarkId;

          // Verify metadata
          const metadataMatch = verifyMetadataMatch(
            { title: asset.title, contentHash: asset.contentHash },
            { title: match.title }
          );

          // Determine severity
          const severity = determineSeverity(similarityScore, watermarkMatch, metadataMatch);

          // Create evidence package
          const evidence = await createEvidencePackage({
            asset,
            platform,
            sourceUrl: match.url,
            screenshotBuffer,
            screenshotUrl: match.thumbnailUrl,
            similarityScore,
            watermarkFound: watermarkMatch,
            metadataMatch,
            detectedAt: match.detectedAt,
          });

          // Create alert
          const alert = await prisma.sentinelAlert.create({
            data: {
              assetId: asset.id,
              userId: asset.userId,
              scanId: scan.id,
              platform,
              sourceUrl: match.url,
              screenshotCid: evidence.screenshotCid,
              screenshotUrl: evidence.screenshotUrl,
              similarityScore,
              watermarkFound: watermarkMatch,
              metadataMatch,
              severity,
              status: 'NEW',
              evidenceCid: evidence.evidenceCid,
              evidenceUrl: evidence.evidenceUrl,
              evidenceData: evidence.evidenceData,
            },
          });

          alerts.push(alert);
        }
      } catch (platformError) {
        console.error(`Error scanning platform ${platform}:`, platformError);
        // Continue with other platforms
      }
    }

    // Update scan record
    await prisma.sentinelScan.update({
      where: { id: scan.id },
      data: {
        matchesFound: totalMatches,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    console.log(`✅ Scan completed: ${totalMatches} matches found, ${alerts.length} alerts created`);
  } catch (error) {
    console.error('Scan processing error:', error);
    
    // Update scan as failed
    await prisma.sentinelScan.update({
      where: { id: scan.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });
  }
}

