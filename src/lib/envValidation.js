// Environment Variable Validation
// Run at startup to catch configuration issues early

/**
 * Validate required environment variables
 * @param {Array<string>} requiredVars - Array of required variable names
 * @throws {Error} If any required variables are missing
 */
export function validateRequiredEnvVars(requiredVars) {
  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  - ${missing.join('\n  - ')}\n\n` +
      `Please check your .env file and ensure all required variables are set.`
    );
  }
}

/**
 * Validate Pinata credentials
 * @returns {Object} Validation result { valid, error }
 */
export function validatePinataConfig() {
  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.PINATA_GATEWAY;
  
  if (!jwt) {
    return {
      valid: false,
      error: 'PINATA_JWT is not set',
      message: 'Pinata JWT token is required for IPFS uploads',
    };
  }
  
  if (!jwt.startsWith('eyJ')) {
    return {
      valid: false,
      error: 'Invalid PINATA_JWT format',
      message: 'Pinata JWT should start with "eyJ"',
    };
  }
  
  if (!gateway) {
    return {
      valid: false,
      error: 'PINATA_GATEWAY is not set',
      message: 'Pinata gateway URL is required',
    };
  }
  
  return { valid: true };
}

/**
 * Validate wallet private key
 * @returns {Object} Validation result { valid, error }
 */
export function validateWalletConfig() {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  
  if (!privateKey) {
    return {
      valid: false,
      error: 'WALLET_PRIVATE_KEY is not set',
      message: 'Server wallet private key is required for Story Protocol operations',
    };
  }
  
  // Clean up key
  const cleaned = privateKey.trim().replace(/['"]/g, '').replace(/\s/g, '');
  
  // Check length (with or without 0x prefix)
  const expectedLength = cleaned.startsWith('0x') ? 66 : 64;
  if (cleaned.length !== expectedLength) {
    return {
      valid: false,
      error: 'Invalid WALLET_PRIVATE_KEY length',
      message: `Private key should be ${expectedLength} characters (${cleaned.length} found)`,
    };
  }
  
  // Check hex format
  const hexPart = cleaned.startsWith('0x') ? cleaned.slice(2) : cleaned;
  if (!/^[0-9a-fA-F]{64}$/.test(hexPart)) {
    return {
      valid: false,
      error: 'Invalid WALLET_PRIVATE_KEY format',
      message: 'Private key must be 64 hexadecimal characters',
    };
  }
  
  return { valid: true };
}

/**
 * Validate database URL
 * @returns {Object} Validation result { valid, error }
 */
export function validateDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    return {
      valid: false,
      error: 'DATABASE_URL is not set',
      message: 'Database connection URL is required',
    };
  }
  
  // Check for PostgreSQL
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    return {
      valid: false,
      error: 'Invalid DATABASE_URL format',
      message: 'DATABASE_URL should start with "postgresql://" or "postgres://"',
    };
  }
  
  return { valid: true };
}

/**
 * Validate all critical environment variables
 * @param {boolean} throwOnError - Whether to throw error or return results
 * @returns {Object} Validation results
 */
export function validateAllEnvVars(throwOnError = false) {
  const results = {
    database: validateDatabaseConfig(),
    pinata: validatePinataConfig(),
    wallet: validateWalletConfig(),
  };
  
  const allValid = Object.values(results).every(r => r.valid);
  
  if (!allValid && throwOnError) {
    const errors = Object.entries(results)
      .filter(([_, result]) => !result.valid)
      .map(([name, result]) => `  [${name.toUpperCase()}] ${result.error}: ${result.message}`)
      .join('\n');
    
    throw new Error(
      `Environment validation failed:\n\n${errors}\n\n` +
      `Please check your .env file and fix the issues above.`
    );
  }
  
  return {
    valid: allValid,
    results,
  };
}

/**
 * Test Pinata connection
 * @returns {Promise<Object>} Test result { success, error }
 */
export async function testPinataConnection() {
  try {
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      message: data.message || 'Authentication successful',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  validateRequiredEnvVars,
  validatePinataConfig,
  validateWalletConfig,
  validateDatabaseConfig,
  validateAllEnvVars,
  testPinataConnection,
};

