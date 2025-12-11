// Blockchain Transaction Helper Functions

/**
 * Wait for transaction with timeout and progress updates
 * @param {Object} tx - Transaction object
 * @param {number} timeoutMs - Timeout in milliseconds (default: 2 minutes)
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<Object>} Transaction receipt
 */
export async function waitForTransactionWithTimeout(tx, timeoutMs = 120000, onProgress = null) {
  const startTime = Date.now();
  
  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TRANSACTION_TIMEOUT'));
    }, timeoutMs);
    
    // Clear timeout if transaction completes
    tx.wait().then(() => clearTimeout(timer));
  });
  
  // Create polling promise with progress updates
  const pollPromise = (async () => {
    let lastUpdate = Date.now();
    const updateInterval = 5000; // Update every 5 seconds
    
    while (true) {
      try {
        // Check if transaction is confirmed
        const receipt = await Promise.race([
          tx.wait(1), // Wait for 1 confirmation
          new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);
        
        if (receipt) {
          return receipt;
        }
        
        // Send progress update if callback provided
        const now = Date.now();
        if (onProgress && now - lastUpdate > updateInterval) {
          const elapsed = Math.floor((now - startTime) / 1000);
          onProgress({
            status: 'pending',
            elapsed,
            message: `Still waiting... (${elapsed}s elapsed)`,
          });
          lastUpdate = now;
        }
        
        // Small delay before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        // If error is "transaction not found", keep waiting
        if (error.code === 'TRANSACTION_REPLACEABLE') {
          continue;
        }
        throw error;
      }
    }
  })();
  
  try {
    // Race between timeout and polling
    const receipt = await Promise.race([pollPromise, timeoutPromise]);
    
    if (onProgress) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      onProgress({
        status: 'confirmed',
        elapsed,
        message: `Transaction confirmed in ${elapsed}s`,
      });
    }
    
    return receipt;
  } catch (error) {
    if (error.message === 'TRANSACTION_TIMEOUT') {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      if (onProgress) {
        onProgress({
          status: 'timeout',
          elapsed,
          message: `Transaction is taking longer than expected (${elapsed}s). It may still complete.`,
          txHash: tx.hash,
        });
      }
      
      // Continue waiting but return special timeout object
      const receipt = await tx.wait();
      return receipt;
    }
    
    throw error;
  }
}

/**
 * Parse common blockchain errors into user-friendly messages
 * @param {Error} error - Blockchain error
 * @returns {Object} Parsed error { code, message, details }
 */
export function parseBlockchainError(error) {
  // User rejected transaction
  if (error.code === 'ACTION_REJECTED' || error.message?.includes('rejected')) {
    return {
      code: 'USER_REJECTED',
      message: 'Transaction was rejected by user',
      userFriendly: true,
    };
  }
  
  // Insufficient funds
  if (error.message?.includes('insufficient funds')) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient funds for transaction and gas fees',
      userFriendly: true,
    };
  }
  
  // Gas estimation failed
  if (error.message?.includes('gas') || error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return {
      code: 'GAS_ESTIMATION_FAILED',
      message: 'Transaction would fail. Please check your inputs.',
      details: error.shortMessage || error.message,
      userFriendly: true,
    };
  }
  
  // Contract execution reverted
  if (error.message?.includes('execution reverted')) {
    return {
      code: 'CONTRACT_REVERT',
      message: 'Transaction would fail on-chain',
      details: error.shortMessage || error.reason || 'Contract execution reverted',
      userFriendly: true,
    };
  }
  
  // Network error
  if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed. Please check your internet connection.',
      userFriendly: true,
    };
  }
  
  // Nonce too low (transaction already processed)
  if (error.message?.includes('nonce too low')) {
    return {
      code: 'NONCE_TOO_LOW',
      message: 'This transaction may have already been processed',
      userFriendly: true,
    };
  }
  
  // Replacement transaction underpriced
  if (error.code === 'REPLACEMENT_UNDERPRICED') {
    return {
      code: 'REPLACEMENT_UNDERPRICED',
      message: 'Gas price too low to replace pending transaction',
      userFriendly: true,
    };
  }
  
  // Generic error
  return {
    code: 'UNKNOWN_ERROR',
    message: 'Transaction failed',
    details: error.shortMessage || error.message || 'Unknown error',
    userFriendly: false,
  };
}

/**
 * Retry a transaction with exponential backoff
 * @param {Function} txFunction - Function that returns a transaction promise
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise<Object>} Transaction receipt
 */
export async function retryTransaction(txFunction, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const tx = await txFunction();
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      lastError = error;
      
      // Don't retry user rejections or certain errors
      const parsed = parseBlockchainError(error);
      if (parsed.code === 'USER_REJECTED' || parsed.code === 'INSUFFICIENT_FUNDS') {
        throw error;
      }
      
      // Last attempt, throw error
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Transaction attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export default {
  waitForTransactionWithTimeout,
  parseBlockchainError,
  retryTransaction,
};

