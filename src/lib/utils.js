import { v4 as uuidv4 } from 'uuid';
import { format, formatDistanceToNow } from 'date-fns';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZES } from './constants';

// Generate unique watermark ID
export const generateWatermarkId = () => {
  return `DIPPC-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;
};

// Generate content hash (simple hash for demo - use proper hashing in production)
export const generateContentHash = async (file) => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Format date
export const formatDate = (date) => {
  return format(new Date(date), 'MMM dd, yyyy');
};

// Format date with time
export const formatDateTime = (date) => {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

// Format relative time
export const formatRelativeTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Format currency
export const formatCurrency = (amount, currency = 'IP') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
  return `${parseFloat(amount).toFixed(4)} ${currency}`;
};

// Format large numbers
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Format percentage
export const formatPercentage = (value, decimals = 2) => {
  return `${parseFloat(value).toFixed(decimals)}%`;
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get asset type from mime type
export const getAssetTypeFromMime = (mimeType) => {
  for (const [type, mimes] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type;
    }
  }
  return null;
};

// Validate file type
export const validateFileType = (file) => {
  const assetType = getAssetTypeFromMime(file.type);
  if (!assetType) {
    return { valid: false, error: 'Unsupported file type' };
  }
  return { valid: true, assetType };
};

// Validate file size
export const validateFileSize = (file, assetType) => {
  const maxSize = MAX_FILE_SIZES[assetType];
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds maximum of ${formatFileSize(maxSize)}` 
    };
  }
  return { valid: true };
};

// Truncate address
export const truncateAddress = (address, startLength = 6, endLength = 4) => {
  if (!address) return '';
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Sleep utility
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Class name utility (simple cn alternative)
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Generate random color for avatars
export const generateAvatarColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500',
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
    'bg-teal-500', 'bg-emerald-500', 'bg-green-500', 'bg-amber-500',
  ];
  return colors[Math.abs(hash) % colors.length];
};

// Parse error message
export const parseError = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  return 'An unexpected error occurred';
};

