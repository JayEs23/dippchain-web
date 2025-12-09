// API Route: DAO Proposals
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return getProposals(req, res);
    case 'POST':
      return createProposal(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getProposals(req, res) {
  try {
    const {
      status,
      creatorId,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (creatorId) where.creatorId = creatorId;

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          creator: {
            select: { displayName: true, walletAddress: true },
          },
          _count: {
            select: { votes: true },
          },
        },
      }),
      prisma.proposal.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      proposals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get proposals error:', error);
    return res.status(500).json({ error: 'Failed to fetch proposals', details: error.message });
  }
}

async function createProposal(req, res) {
  try {
    const {
      creatorId,
      title,
      description,
      documentCid,
      documentUrl,
      votingStart,
      votingEnd,
      quorumRequired = 50,
    } = req.body;

    if (!creatorId || !title || !description || !votingStart || !votingEnd) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['creatorId', 'title', 'description', 'votingStart', 'votingEnd'],
      });
    }

    const proposal = await prisma.proposal.create({
      data: {
        creatorId,
        title,
        description,
        documentCid,
        documentUrl,
        votingStart: new Date(votingStart),
        votingEnd: new Date(votingEnd),
        quorumRequired: parseFloat(quorumRequired),
        status: new Date(votingStart) <= new Date() ? 'ACTIVE' : 'PENDING',
      },
      include: {
        creator: { select: { displayName: true, walletAddress: true } },
      },
    });

    return res.status(201).json({ success: true, proposal });
  } catch (error) {
    console.error('Create proposal error:', error);
    return res.status(500).json({ error: 'Failed to create proposal', details: error.message });
  }
}

