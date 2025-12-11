// User Helper Functions - Handle user creation and lookups
import prisma from '@/lib/prisma';

/**
 * Find or create a user by wallet address
 * Handles race conditions when multiple requests try to create the same user
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object>} User object
 */
export async function findOrCreateUser(walletAddress) {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  const normalized = walletAddress.toLowerCase();
  
  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { walletAddress: normalized },
  });
  
  if (user) {
    return user;
  }

  // User doesn't exist, create new one
  try {
    user = await prisma.user.create({
      data: {
        email: `${normalized}@wallet.local`,
        walletAddress: normalized,
        displayName: `User ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      },
    });
    
    console.log('Created new user:', user.id, normalized);
    return user;
  } catch (error) {
    // Handle race condition - another request created the user
    if (error.code === 'P2002') {
      console.log('Race condition detected, retrying user lookup...');
      user = await prisma.user.findUnique({
        where: { walletAddress: normalized },
      });
      
      if (user) {
        return user;
      }
      
      // Still not found? Something is wrong
      throw new Error('Failed to create or find user after race condition');
    }
    
    // Other error, rethrow
    throw error;
  }
}

/**
 * Get user by wallet address
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserByWallet(walletAddress) {
  if (!walletAddress) {
    return null;
  }

  const normalized = walletAddress.toLowerCase();
  
  return await prisma.user.findUnique({
    where: { walletAddress: normalized },
  });
}

/**
 * Get user by ID
 * @param {string} userId - User's ID
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserById(userId) {
  if (!userId) {
    return null;
  }

  return await prisma.user.findUnique({
    where: { id: userId },
  });
}

/**
 * Update user profile
 * @param {string} userId - User's ID
 * @param {Object} data - Update data (displayName, avatar, bio)
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUserProfile(userId, data) {
  const allowedFields = ['displayName', 'avatar', 'bio'];
  const updateData = {};
  
  // Filter to only allowed fields
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }
  
  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
}

/**
 * Check if a wallet address is registered
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<boolean>} True if registered, false otherwise
 */
export async function isWalletRegistered(walletAddress) {
  if (!walletAddress) {
    return false;
  }

  const normalized = walletAddress.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { walletAddress: normalized },
    select: { id: true },
  });
  
  return !!user;
}

export default {
  findOrCreateUser,
  getUserByWallet,
  getUserById,
  updateUserProfile,
  isWalletRegistered,
};

