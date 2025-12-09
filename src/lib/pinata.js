// Pinata IPFS Upload Library
// Uses REST API for reliable server-side uploads

const PINATA_API_URL = 'https://api.pinata.cloud';

// Upload JSON to Pinata using REST API
export const uploadJsonToPinata = async (json, name = 'metadata.json') => {
  try {
    const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: json,
        pinataMetadata: {
          name: name,
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata JSON upload failed: ${errorText}`);
    }

    const result = await response.json();
    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

    return {
      success: true,
      cid: result.IpfsHash,
      url: `https://${gateway}/ipfs/${result.IpfsHash}`,
    };
  } catch (error) {
    console.error('Pinata JSON upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get file URL from Pinata gateway
export const getFileFromPinata = (cid) => {
  const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
  return {
    success: true,
    url: `https://${gateway}/ipfs/${cid}`,
  };
};

// Legacy export for compatibility
export const getPinata = () => {
  console.warn('getPinata() is deprecated. Use REST API functions directly.');
  return null;
};

const pinataUtils = { uploadJsonToPinata, getFileFromPinata };
export default pinataUtils;

