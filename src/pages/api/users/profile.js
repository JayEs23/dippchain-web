// API Route: Get and Update User Profile
import prisma from '@/lib/prisma';
import { generateAvatarFromWallet, generateAvatarFromName } from '@/lib/avatarGenerator';
import { sendSuccess, sendError, sendValidationError } from '@/lib/apiResponse';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get user profile
    try {
      const { userId, walletAddress } = req.query;

      if (!userId && !walletAddress) {
        return sendValidationError(res, 'userId or walletAddress is required', ['userId', 'walletAddress']);
      }

      const where = userId 
        ? { id: userId }
        : { walletAddress: walletAddress?.toLowerCase() };

      const user = await prisma.user.findUnique({
        where,
        select: {
          id: true,
          email: true,
          walletAddress: true,
          displayName: true,
          avatar: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return sendError(res, 'User not found', 404, { code: 'USER_NOT_FOUND' });
      }

      return sendSuccess(res, { user }, 'User profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      return sendError(res, 'Failed to get user profile', 500, {
        code: 'PROFILE_FETCH_ERROR',
        details: error.message,
      });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    // Update user profile
    try {
      const { userId, walletAddress } = req.query;
      const { displayName, bio, avatar, email } = req.body;

      if (!userId && !walletAddress) {
        return sendValidationError(res, 'userId or walletAddress is required', ['userId', 'walletAddress']);
      }

      const where = userId 
        ? { id: userId }
        : { walletAddress: walletAddress?.toLowerCase() };

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where });
      if (!existingUser) {
        return sendError(res, 'User not found', 404, { code: 'USER_NOT_FOUND' });
      }

      // Build update data
      const updateData = {};
      
      if (displayName !== undefined) {
        updateData.displayName = displayName.trim() || null;
      }
      
      if (bio !== undefined) {
        updateData.bio = bio?.trim() || null;
      }
      
      if (avatar !== undefined) {
        // If avatar is provided, use it; otherwise generate from wallet or name
        if (avatar === null || avatar === '') {
          // Generate new avatar based on wallet or display name
          const seed = existingUser.walletAddress || displayName || existingUser.displayName;
          updateData.avatar = seed 
            ? (existingUser.walletAddress ? generateAvatarFromWallet(seed) : generateAvatarFromName(seed))
            : null;
        } else {
          updateData.avatar = avatar.trim() || null;
        }
      }
      
      if (email !== undefined && email !== existingUser.email) {
        // Email update requires validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return sendValidationError(res, 'Invalid email format', ['email']);
        }
        updateData.email = email.trim().toLowerCase();
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where,
        data: updateData,
        select: {
          id: true,
          email: true,
          walletAddress: true,
          displayName: true,
          avatar: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      console.log('✅ User profile updated:', {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        hasAvatar: !!updatedUser.avatar,
        hasBio: !!updatedUser.bio,
      });

      return sendSuccess(res, { user: updatedUser }, 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);

      // Handle unique constraint violation (email already exists)
      if (error.code === 'P2002') {
        return sendError(res, 'Email already in use', 409, {
          code: 'EMAIL_EXISTS',
          field: 'email',
        });
      }

      return sendError(res, 'Failed to update profile', 500, {
        code: 'PROFILE_UPDATE_ERROR',
        details: error.message,
      });
    }
  }

  return sendError(res, 'Method not allowed', 405, { code: 'METHOD_NOT_ALLOWED' });
}

