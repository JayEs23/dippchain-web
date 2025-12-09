// API Route: License Templates
import prisma from '@/lib/prisma';

// Default license templates
const DEFAULT_TEMPLATES = [
  {
    id: 'personal-use',
    name: 'Personal Use',
    description: 'For personal, non-commercial use only',
    terms: {
      commercial: false,
      derivatives: false,
      attribution: true,
      transferable: false,
      duration: 'perpetual',
      territory: 'worldwide',
      exclusivity: false,
    },
    isDefault: true,
  },
  {
    id: 'commercial-basic',
    name: 'Commercial Basic',
    description: 'Basic commercial license with attribution',
    terms: {
      commercial: true,
      derivatives: false,
      attribution: true,
      transferable: false,
      duration: '1 year',
      territory: 'worldwide',
      exclusivity: false,
      revShare: 5,
    },
    isDefault: true,
  },
  {
    id: 'commercial-extended',
    name: 'Commercial Extended',
    description: 'Extended commercial license with derivatives allowed',
    terms: {
      commercial: true,
      derivatives: true,
      attribution: true,
      transferable: true,
      duration: 'perpetual',
      territory: 'worldwide',
      exclusivity: false,
      revShare: 10,
    },
    isDefault: true,
  },
  {
    id: 'exclusive',
    name: 'Exclusive License',
    description: 'Exclusive rights to use the asset',
    terms: {
      commercial: true,
      derivatives: true,
      attribution: false,
      transferable: true,
      duration: 'perpetual',
      territory: 'worldwide',
      exclusivity: true,
      revShare: 20,
    },
    isDefault: true,
  },
];

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return getTemplates(req, res);
    case 'POST':
      return createTemplate(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getTemplates(req, res) {
  try {
    // Get custom templates from database
    const customTemplates = await prisma.licenseTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Combine with default templates
    const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates.map(t => ({
      ...t,
      terms: typeof t.terms === 'string' ? JSON.parse(t.terms) : t.terms,
    }))];

    return res.status(200).json({
      success: true,
      templates: allTemplates,
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
  }
}

async function createTemplate(req, res) {
  try {
    const { name, description, terms } = req.body;

    if (!name || !terms) {
      return res.status(400).json({ error: 'Name and terms are required' });
    }

    const template = await prisma.licenseTemplate.create({
      data: {
        name,
        description,
        terms,
        isDefault: false,
      },
    });

    return res.status(201).json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Create template error:', error);
    return res.status(500).json({ error: 'Failed to create template', details: error.message });
  }
}

