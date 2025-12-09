// API Route: Upload Asset to Pinata
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 500 * 1024 * 1024, // 500MB
    });

    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const metadata = fields.metadata?.[0] ? JSON.parse(fields.metadata[0]) : {};
    
    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath);
    
    // Create FormData using Node.js built-in (Node 18+)
    const formData = new FormData();
    
    // Create a Blob from the buffer
    const blob = new Blob([fileBuffer], { type: file.mimetype });
    formData.append('file', blob, file.originalFilename || 'file');

    // Add metadata
    const pinataMetadata = JSON.stringify({
      name: metadata.name || file.originalFilename,
      keyvalues: {
        watermarkId: metadata.watermarkId || '',
        assetType: metadata.assetType || '',
        contentHash: metadata.contentHash || '',
      },
    });
    formData.append('pinataMetadata', pinataMetadata);

    // Add options
    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', pinataOptions);

    // Upload to Pinata using REST API
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata upload failed: ${errorText}`);
    }

    const result = await response.json();

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    const gatewayUrl = `https://${gateway}/ipfs/${result.IpfsHash}`;

    return res.status(200).json({
      success: true,
      cid: result.IpfsHash,
      url: gatewayUrl,
      fileName: file.originalFilename,
      fileSize: file.size,
      mimeType: file.mimetype,
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Parse specific error types for user-friendly messages
    let errorMessage = 'Upload failed';
    let errorDetails = error.message;
    
    if (error.message?.includes('PINATA') || error.message?.includes('Pinata')) {
      errorMessage = 'IPFS upload failed';
      errorDetails = 'Please check your Pinata API credentials';
    } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = 'Authentication failed';
      errorDetails = 'Invalid Pinata JWT token';
    } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Network error';
      errorDetails = 'Could not connect to IPFS service';
    } else if (error.message?.includes('size') || error.message?.includes('limit')) {
      errorMessage = 'File too large';
      errorDetails = 'Maximum file size is 500MB';
    }
    
    return res.status(500).json({ 
      success: false,
      error: errorMessage, 
      details: errorDetails 
    });
  }
}

