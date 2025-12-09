// API Route: Upload Metadata JSON to Pinata
import { uploadJsonToPinata } from '@/lib/pinata';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { metadata, name } = req.body;

    if (!metadata) {
      return res.status(400).json({ error: 'Metadata is required' });
    }

    const result = await uploadJsonToPinata(metadata, name || 'metadata.json');

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      cid: result.cid,
      url: result.url,
    });
  } catch (error) {
    console.error('Metadata upload error:', error);
    return res.status(500).json({ 
      error: 'Metadata upload failed', 
      details: error.message 
    });
  }
}

