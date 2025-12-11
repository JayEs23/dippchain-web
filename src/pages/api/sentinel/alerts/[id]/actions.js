// API Route: Sentinel Alert Actions
// Handle alert actions: takedown, escalate, mark false positive, etc.

import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Alert ID is required' });
  }

  switch (req.method) {
    case 'PATCH':
      return updateAlertStatus(req, res, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function updateAlertStatus(req, res, alertId) {
  try {
    const { action, notes } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required',
        validActions: ['REVIEWING', 'CONFIRMED', 'FALSE_POSITIVE', 'TAKEDOWN_SENT', 'RESOLVED'],
      });
    }

    const validActions = ['REVIEWING', 'CONFIRMED', 'FALSE_POSITIVE', 'TAKEDOWN_SENT', 'RESOLVED'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
      });
    }

    // Get alert
    const alert = await prisma.sentinelAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    // Update alert
    const updateData = {
      status: action,
      actionTaken: notes || action,
    };

    if (action === 'RESOLVED' || action === 'FALSE_POSITIVE') {
      updateData.resolvedAt = new Date();
    }

    const updatedAlert = await prisma.sentinelAlert.update({
      where: { id: alertId },
      data: updateData,
      include: {
        asset: {
          select: {
            id: true,
            title: true,
            assetType: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      alert: updatedAlert,
      message: `Alert ${action.toLowerCase()}`,
    });
  } catch (error) {
    console.error('Update alert error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update alert',
      details: error.message,
    });
  }
}

