// DippChain Watermark & Metadata Embedding
// Client-side watermark generation for images

import { generateWatermarkId, generateContentHash } from './utils';

/**
 * Embed invisible watermark in image using canvas
 * This embeds the watermark ID in the least significant bits of pixels
 */
export const embedImageWatermark = async (file, watermarkId) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert watermark to binary
        const watermarkBinary = stringToBinary(watermarkId);
        
        // Embed watermark in LSB of red channel
        let bitIndex = 0;
        for (let i = 0; i < data.length && bitIndex < watermarkBinary.length; i += 4) {
          // Embed in red channel
          data[i] = (data[i] & 0xFE) | parseInt(watermarkBinary[bitIndex], 10);
          bitIndex++;
        }
        
        // Put modified image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          const watermarkedFile = new File([blob], file.name, { type: file.type });
          resolve({
            file: watermarkedFile,
            watermarkId,
            dimensions: { width: img.width, height: img.height },
          });
        }, file.type, 0.95);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Add visible watermark overlay to image
 */
export const addVisibleWatermark = async (file, watermarkText, options = {}) => {
  const {
    position = 'bottom-right',
    opacity = 0.3,
    fontSize = 16,
    color = 'white',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Set watermark style
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;
        
        const textWidth = ctx.measureText(watermarkText).width;
        const padding = 20;
        
        // Position watermark
        let x, y;
        switch (position) {
          case 'top-left':
            x = padding;
            y = padding + fontSize;
            break;
          case 'top-right':
            x = canvas.width - textWidth - padding;
            y = padding + fontSize;
            break;
          case 'bottom-left':
            x = padding;
            y = canvas.height - padding;
            break;
          case 'bottom-right':
          default:
            x = canvas.width - textWidth - padding;
            y = canvas.height - padding;
        }
        
        // Add shadow for visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText(watermarkText, x, y);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: file.type }));
        }, file.type, 0.95);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Extract watermark from image
 */
export const extractWatermark = async (file, expectedLength = 28) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Extract LSB from red channel
        let binary = '';
        const bitsNeeded = expectedLength * 8;
        
        for (let i = 0; i < data.length && binary.length < bitsNeeded; i += 4) {
          binary += (data[i] & 1).toString();
        }
        
        const watermark = binaryToString(binary);
        resolve(watermark);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Generate metadata package for asset following IPA Metadata Standard
 * @see https://docs.story.foundation/concepts/ip-asset/ipa-metadata-standard
 */
export const generateMetadata = async (file, options = {}) => {
  const {
    title,
    description,
    creator,
    creatorAddress,
    tags = [],
    watermarkId,
    uploadUrl, // IPFS URL after upload
  } = options;

  const contentHash = await generateContentHash(file);
  const timestamp = new Date().toISOString();
  
  // ✅ IPA Metadata Standard structure
  const ipMetadata = {
    // Required fields
    title: title || file.name,
    description: description || '',
    
    // Media fields (required for media assets)
    image: uploadUrl || '', // Will be filled with IPFS URL after upload
    imageHash: contentHash, // SHA-256 hash (0x prefix will be added in API)
    mediaUrl: uploadUrl || '', // IPFS URL of the actual media file
    mediaHash: contentHash, // SHA-256 hash of media file
    mediaType: file.type, // e.g., "image/png", "video/mp4", "audio/mpeg"
    
    // Creators array (required)
    creators: [{
      name: creator || title || 'Unknown Creator',
      address: creatorAddress || '', // Wallet address of creator
      contributionPercent: 100, // 100% if single creator
    }],
    
    // Optional fields
    external_url: 'https://dippchain.io',
    attributes: [
      { trait_type: 'Platform', value: 'DippChain' },
      { trait_type: 'File Type', value: file.type },
      { trait_type: 'File Size', value: file.size },
      { trait_type: 'Registration Date', value: timestamp },
      { trait_type: 'Watermark ID', value: watermarkId || '' },
      ...tags.map(tag => ({ trait_type: 'Tag', value: tag })),
    ],
    
    // DippChain specific properties (kept for backward compatibility)
    properties: {
      watermarkId,
      contentHash,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      createdAt: timestamp,
      tags,
      platform: 'DippChain',
      chain: 'Story Aeneid Testnet',
      chainId: 1315,
    },
  };
  
  return ipMetadata;
};

/**
 * Create thumbnail for image/video
 */
export const createThumbnail = async (file, maxSize = 300) => {
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    return null;
  }

  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate thumbnail dimensions
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], `thumb_${file.name}`, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.8);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      // Video thumbnail - take first frame
      const video = document.createElement('video');
      video.onloadeddata = () => {
        video.currentTime = 1; // Seek to 1 second
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          resolve(new File([blob], `thumb_${file.name}.jpg`, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    }
  });
};

// Helper: Convert string to binary
const stringToBinary = (str) => {
  return str.split('').map(char => 
    char.charCodeAt(0).toString(2).padStart(8, '0')
  ).join('');
};

// Helper: Convert binary to string
const binaryToString = (binary) => {
  const chars = [];
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substr(i, 8);
    chars.push(String.fromCharCode(parseInt(byte, 2)));
  }
  return chars.join('').replace(/\0/g, '');
};

const watermarkUtils = {
  embedImageWatermark,
  addVisibleWatermark,
  extractWatermark,
  generateMetadata,
  createThumbnail,
};

export default watermarkUtils;

