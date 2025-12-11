// API Route: Scheduled Sentinel Scans
// Cron job endpoint to automatically scan all registered assets

import prisma from '@/lib/prisma';
import { getScanPlatforms } from '@/lib/sentinel/scanner';

export default async function handler(req, res) {
  // Verify cron secret (if using Vercel Cron or similar)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Starting scheduled Sentinel scan...');

    // Get all registered assets that haven't been scanned recently (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const assets = await prisma.asset.findMany({
      where: {
        storyProtocolId: { not: null },
        status: 'REGISTERED',
        // Only scan assets that haven't been scanned in the last 24 hours
        sentinelScans: {
          none: {
            completedAt: {
              gte: oneDayAgo,
            },
            status: 'COMPLETED',
          },
        },
      },
      include: {
        user: true,
        sentinelScans: {
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
      take: 10, // Limit to 10 assets per cron run to avoid timeout
    });

    console.log(`📊 Found ${assets.length} assets to scan`);

    const results = {
      scanned: 0,
      errors: 0,
      alertsCreated: 0,
    };

    // Trigger scans for each asset
    for (const asset of assets) {
      try {
        // Call scan API internally
        const scanResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sentinel/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assetId: asset.id,
            platforms: getScanPlatforms().slice(0, 2), // Limit to 2 platforms per scheduled scan
          }),
        });

        if (scanResponse.ok) {
          results.scanned++;
        } else {
          results.errors++;
          console.error(`Failed to scan asset ${asset.id}:`, await scanResponse.text());
        }
      } catch (error) {
        results.errors++;
        console.error(`Error scanning asset ${asset.id}:`, error);
      }
    }

    console.log(`✅ Scheduled scan completed: ${results.scanned} scanned, ${results.errors} errors`);

    return res.status(200).json({
      success: true,
      message: 'Scheduled scan completed',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scheduled scan error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to run scheduled scan',
      details: error.message,
    });
  }
}

