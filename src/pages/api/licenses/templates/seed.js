// API Route: Seed Default License Templates
import prisma from '@/lib/prisma';

const DEFAULT_TEMPLATES = [
  {
    name: 'Commercial Use',
    description: 'Full commercial rights with attribution',
    terms: {
      commercial: true,
      derivatives: false,
      attribution: true,
      transferable: false,
      exclusivity: false,
    },
  },
  {
    name: 'Personal Use Only',
    description: 'Non-commercial personal use with attribution',
    terms: {
      commercial: false,
      derivatives: false,
      attribution: true,
      transferable: false,
      exclusivity: false,
    },
  },
  {
    name: 'Derivative Works',
    description: 'Create derivative works with attribution',
    terms: {
      commercial: false,
      derivatives: true,
      attribution: true,
      transferable: false,
      exclusivity: false,
    },
  },
  {
    name: 'Exclusive Rights',
    description: 'Full exclusive commercial rights',
    terms: {
      commercial: true,
      derivatives: true,
      attribution: false,
      transferable: true,
      exclusivity: true,
    },
  },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if templates already exist
    const existingCount = await prisma.licenseTemplate.count();
    
    if (existingCount > 0) {
      return res.status(200).json({
        success: true,
        message: 'Templates already exist',
        count: existingCount,
      });
    }

    // Create default templates
    const created = await prisma.licenseTemplate.createMany({
      data: DEFAULT_TEMPLATES,
      skipDuplicates: true,
    });

    console.log('Created license templates:', created.count);

    return res.status(201).json({
      success: true,
      message: 'Default license templates created',
      count: created.count,
    });
  } catch (error) {
    console.error('Seed templates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to seed templates',
      details: error.message,
    });
  }
}

