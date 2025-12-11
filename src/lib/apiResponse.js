// Standardized API Response Handlers
// Ensures consistent response format across all API endpoints

/**
 * Send a successful API response
 * @param {Object} res - Next.js response object
 * @param {Object} data - Data to send
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function sendSuccess(res, data = null, message = null, statusCode = 200) {
  const response = {
    success: true,
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send an error API response
 * @param {Object} res - Next.js response object
 * @param {string} message - User-friendly error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} options - Additional error details
 * @param {string} options.code - Error code for client-side handling
 * @param {string} options.details - Technical details for debugging
 * @param {string} options.field - Field name for validation errors
 * @param {Array} options.required - Required fields for validation errors
 */
export function sendError(res, message, statusCode = 500, options = {}) {
  const response = {
    success: false,
    error: {
      message,
    },
  };

  if (options.code) {
    response.error.code = options.code;
  }

  if (options.details) {
    response.error.details = options.details;
  }

  if (options.field) {
    response.error.field = options.field;
  }

  if (options.required) {
    response.error.required = options.required;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a validation error response
 * @param {Object} res - Next.js response object
 * @param {string} message - Validation error message
 * @param {Array} requiredFields - List of required fields
 * @param {string} field - Specific field that failed validation
 */
export function sendValidationError(res, message = 'Validation failed', requiredFields = null, field = null) {
  return sendError(res, message, 400, {
    code: 'VALIDATION_ERROR',
    required: requiredFields,
    field,
  });
}

/**
 * Send a not found error response
 * @param {Object} res - Next.js response object
 * @param {string} resource - Resource type that was not found
 */
export function sendNotFound(res, resource = 'Resource') {
  return sendError(res, `${resource} not found`, 404, {
    code: 'NOT_FOUND',
  });
}

/**
 * Send an unauthorized error response
 * @param {Object} res - Next.js response object
 * @param {string} message - Authorization error message
 */
export function sendUnauthorized(res, message = 'Unauthorized') {
  return sendError(res, message, 401, {
    code: 'UNAUTHORIZED',
  });
}

/**
 * Send a forbidden error response
 * @param {Object} res - Next.js response object
 * @param {string} message - Permission error message
 */
export function sendForbidden(res, message = 'Forbidden') {
  return sendError(res, message, 403, {
    code: 'FORBIDDEN',
  });
}

/**
 * Send a conflict error response (duplicate resource)
 * @param {Object} res - Next.js response object
 * @param {string} message - Conflict error message
 * @param {Object} existingResource - Existing resource details
 */
export function sendConflict(res, message = 'Resource already exists', existingResource = null) {
  return sendError(res, message, 409, {
    code: 'CONFLICT',
    details: existingResource ? `Existing resource: ${JSON.stringify(existingResource)}` : undefined,
  });
}

/**
 * Handle Prisma errors and send appropriate response
 * @param {Object} res - Next.js response object
 * @param {Error} error - Prisma error object
 * @param {string} context - Context of where error occurred
 */
export function handlePrismaError(res, error, context = 'Database operation') {
  console.error(`${context} error:`, error);

  // Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return sendConflict(res, `A record with this ${field} already exists`, { field });
  }

  // Foreign key constraint violation
  if (error.code === 'P2003') {
    return sendError(res, 'Referenced record does not exist', 400, {
      code: 'INVALID_REFERENCE',
      details: error.message,
    });
  }

  // Record not found
  if (error.code === 'P2025') {
    return sendNotFound(res, 'Record');
  }

  // Generic database error
  return sendError(res, `${context} failed`, 500, {
    code: 'DATABASE_ERROR',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
  });
}

/**
 * Handle blockchain errors and send appropriate response
 * @param {Object} res - Next.js response object
 * @param {Error} error - Blockchain error object
 * @param {string} context - Context of where error occurred
 */
export function handleBlockchainError(res, error, context = 'Blockchain operation') {
  console.error(`${context} error:`, error);

  // User rejected transaction
  if (error.code === 'ACTION_REJECTED' || error.message?.includes('rejected')) {
    return sendError(res, 'Transaction was rejected by user', 400, {
      code: 'TX_REJECTED',
    });
  }

  // Insufficient funds
  if (error.message?.includes('insufficient funds')) {
    return sendError(res, 'Insufficient funds for transaction', 400, {
      code: 'INSUFFICIENT_FUNDS',
    });
  }

  // Contract execution error
  if (error.message?.includes('execution reverted')) {
    return sendError(res, 'Contract execution failed', 400, {
      code: 'CONTRACT_ERROR',
      details: error.shortMessage || error.message,
    });
  }

  // Network error
  if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
    return sendError(res, 'Network connection failed', 503, {
      code: 'NETWORK_ERROR',
      details: 'Unable to connect to blockchain network',
    });
  }

  // Generic blockchain error
  return sendError(res, `${context} failed`, 500, {
    code: 'BLOCKCHAIN_ERROR',
    details: error.shortMessage || error.message,
  });
}

/**
 * Handle Story Protocol errors and send appropriate response
 * @param {Object} res - Next.js response object
 * @param {Error} error - Story Protocol error object
 * @param {string} context - Context of where error occurred
 */
export function handleStoryProtocolError(res, error, context = 'Story Protocol operation') {
  console.error(`${context} error:`, error);

  // Already registered
  if (error.message?.includes('0x7e273289') || 
      error.message?.includes('AlreadyInitialized') ||
      error.message?.includes('already registered')) {
    return sendConflict(res, 'IP Asset is already registered on Story Protocol');
  }

  // Invalid license terms
  if (error.message?.includes('license') || error.message?.includes('PIL')) {
    return sendError(res, 'Invalid license terms', 400, {
      code: 'INVALID_LICENSE',
      details: error.message,
    });
  }

  // Generic Story Protocol error
  return sendError(res, `${context} failed`, 500, {
    code: 'STORY_PROTOCOL_ERROR',
    details: error.message,
  });
}

/**
 * Handle IPFS/Pinata errors and send appropriate response
 * @param {Object} res - Next.js response object
 * @param {Error} error - IPFS error object
 * @param {string} context - Context of where error occurred
 */
export function handleIPFSError(res, error, context = 'IPFS operation') {
  console.error(`${context} error:`, error);

  // Authentication error
  if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
    return sendError(res, 'IPFS authentication failed', 401, {
      code: 'IPFS_AUTH_ERROR',
      details: 'Invalid or missing Pinata API credentials',
    });
  }

  // File too large
  if (error.message?.includes('size') || error.message?.includes('limit')) {
    return sendError(res, 'File is too large', 400, {
      code: 'FILE_TOO_LARGE',
      details: 'Maximum file size is 500MB',
    });
  }

  // Network error
  if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
    return sendError(res, 'IPFS connection failed', 503, {
      code: 'IPFS_NETWORK_ERROR',
      details: 'Unable to connect to IPFS service',
    });
  }

  // Generic IPFS error
  return sendError(res, `${context} failed`, 500, {
    code: 'IPFS_ERROR',
    details: error.message,
  });
}

export default {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  handlePrismaError,
  handleBlockchainError,
  handleStoryProtocolError,
  handleIPFSError,
};

