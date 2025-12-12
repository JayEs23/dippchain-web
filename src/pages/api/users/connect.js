// API Route: Create or Get User on Wallet Connect
import prisma from '@/lib/prisma';
import { generateAvatarFromWallet, getInitials } from '@/lib/avatarGenerator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, email, displayName, bio } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Normalize wallet address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user already exists by wallet address
    let user = await prisma.user.findFirst({
      where: { walletAddress: normalizedAddress },
    });

    if (user) {
      // User exists, return existing user
      return res.status(200).json({
        success: true,
        user,
        isNew: false,
      });
    }

    // Generate display name from wallet if not provided
    const finalDisplayName = displayName || `User ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    
    // Generate avatar from wallet address (deterministic)
    const avatarUrl = generateAvatarFromWallet(walletAddress);

    // Create new user with enhanced details
    user = await prisma.user.create({
      data: {
        email: email || `${normalizedAddress}@wallet.local`,
        walletAddress: normalizedAddress,
        displayName: finalDisplayName,
        avatar: avatarUrl,
        bio: bio || null,
      },
    });

    console.log('✅ Created new user with avatar:', {
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar,
      walletAddress: normalizedAddress,
    });

    return res.status(201).json({
      success: true,
      user,
      isNew: true,
    });
  } catch (error) {
    console.error('User connect error:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      // User already exists (race condition), fetch and return
      const existingUser = await prisma.user.findFirst({
        where: { walletAddress: req.body.walletAddress?.toLowerCase() },
      });
      
      if (existingUser) {
        return res.status(200).json({
          success: true,
          user: existingUser,
          isNew: false,
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to connect user',
      details: error.message,
    });
  }
}

