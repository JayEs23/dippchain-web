// Story Protocol Response Logger
// Saves all Story Protocol SDK responses to JSON files for debugging
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const DEBUG_DIR = join(process.cwd(), '.story-protocol-debug');

/**
 * Save Story Protocol response to a unique JSON file
 * @param {string} operation - Operation name (e.g., 'register-ip', 'mint-license', 'get-vault')
 * @param {Object} response - Story Protocol SDK response
 * @param {Object} metadata - Additional metadata (ipId, assetId, txHash, etc.)
 * @returns {Promise<string>} Path to saved file
 */
export async function saveStoryResponse(operation, response, metadata = {}) {
  try {
    // Ensure debug directory exists
    await mkdir(DEBUG_DIR, { recursive: true });

    // Create unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ipIdShort = metadata.ipId ? metadata.ipId.slice(2, 10) : 'unknown';
    const filename = `${operation}-${ipIdShort}-${timestamp}.json`;
    const filepath = join(DEBUG_DIR, filename);

    // Prepare data to save
    const data = {
      operation,
      timestamp: new Date().toISOString(),
      metadata,
      response: serializeBigInt(response),
    };

    // Write to file
    await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`💾 Saved Story Protocol response: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('Failed to save Story Protocol response:', error);
    return null;
  }
}

/**
 * Serialize BigInt values in objects for JSON
 */
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }

  return obj;
}

