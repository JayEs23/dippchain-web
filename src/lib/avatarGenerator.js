// Avatar Generator - Creates deterministic avatars from wallet addresses or names
// Uses a simple hash-based approach to generate consistent colors and patterns

/**
 * Generate a deterministic avatar URL from a wallet address or name
 * Uses DiceBear API for consistent, colorful avatars
 * @param {string} seed - Wallet address or name to use as seed
 * @param {string} style - Avatar style (default: 'identicon')
 * @returns {string} Avatar URL
 */
export function generateAvatarUrl(seed, style = 'identicon') {
  if (!seed) return null;
  
  // Normalize seed (remove 0x prefix, lowercase)
  const normalizedSeed = seed.replace(/^0x/, '').toLowerCase();
  
  // Use DiceBear API for consistent avatars
  // Options: identicon, avataaars, bottts, shapes, initials
  const baseUrl = 'https://api.dicebear.com/7.x';
  
  switch (style) {
    case 'initials':
      // Extract initials from seed (first 2 characters)
      const initials = normalizedSeed.slice(0, 2).toUpperCase();
      return `${baseUrl}/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0a0a0a&textColor=ffffff&fontSize=40`;
    
    case 'shapes':
      return `${baseUrl}/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0a0a0a`;
    
    case 'bottts':
      return `${baseUrl}/bottts/svg?seed=${encodeURIComponent(seed)}`;
    
    case 'avataaars':
      return `${baseUrl}/avataaars/svg?seed=${encodeURIComponent(seed)}`;
    
    case 'identicon':
    default:
      // Identicon style - geometric patterns based on seed
      return `${baseUrl}/identicon/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0a0a0a`;
  }
}

/**
 * Generate avatar URL from wallet address (default style)
 * @param {string} walletAddress - Wallet address
 * @returns {string} Avatar URL
 */
export function generateAvatarFromWallet(walletAddress) {
  if (!walletAddress) return null;
  return generateAvatarUrl(walletAddress, 'identicon');
}

/**
 * Generate avatar URL from display name (uses initials style)
 * @param {string} displayName - User's display name
 * @returns {string} Avatar URL
 */
export function generateAvatarFromName(displayName) {
  if (!displayName) return null;
  return generateAvatarUrl(displayName, 'initials');
}

/**
 * Generate initials from a name
 * @param {string} name - Full name or display name
 * @returns {string} Initials (max 2 characters)
 */
export function getInitials(name) {
  if (!name) return 'U';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

