import { PinataSDK } from 'pinata';

let pinata = null;

export const getPinata = () => {
  if (!pinata) {
    pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT,
      pinataGateway: process.env.PINATA_GATEWAY,
    });
  }
  return pinata;
};

// Upload file to Pinata
export const uploadFileToPinata = async (file, metadata = {}) => {
  const pinata = getPinata();
  
  try {
    const result = await pinata.upload.file(file).addMetadata({
      name: metadata.name || file.name,
      keyValues: metadata.keyValues || {},
    });
    
    return {
      success: true,
      cid: result.IpfsHash,
      url: `https://${process.env.PINATA_GATEWAY}/ipfs/${result.IpfsHash}`,
    };
  } catch (error) {
    console.error('Pinata upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Upload JSON to Pinata
export const uploadJsonToPinata = async (json, name = 'metadata.json') => {
  const pinata = getPinata();
  
  try {
    const result = await pinata.upload.json(json).addMetadata({
      name,
    });
    
    return {
      success: true,
      cid: result.IpfsHash,
      url: `https://${process.env.PINATA_GATEWAY}/ipfs/${result.IpfsHash}`,
    };
  } catch (error) {
    console.error('Pinata JSON upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get file from Pinata gateway
export const getFileFromPinata = async (cid) => {
  try {
    const url = `https://${process.env.PINATA_GATEWAY}/ipfs/${cid}`;
    return {
      success: true,
      url,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export default getPinata;

