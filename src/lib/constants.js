// DippChain Constants

// Asset Types
export const ASSET_TYPES = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  TEXT: 'TEXT',
  DOCUMENT: 'DOCUMENT',
};

// Asset Status
export const ASSET_STATUS = {
  DRAFT: 'DRAFT',
  PROCESSING: 'PROCESSING',
  REGISTERED: 'REGISTERED',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
};

// License Types
export const LICENSE_TYPES = {
  PERSONAL: 'PERSONAL',
  COMMERCIAL: 'COMMERCIAL',
  EXCLUSIVE: 'EXCLUSIVE',
  NON_EXCLUSIVE: 'NON_EXCLUSIVE',
  ROYALTY_FREE: 'ROYALTY_FREE',
  RIGHTS_MANAGED: 'RIGHTS_MANAGED',
};

// Alert Severity
export const ALERT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// Supported File Types
export const SUPPORTED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  TEXT: ['text/plain', 'text/markdown'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Max File Sizes (in bytes)
export const MAX_FILE_SIZES = {
  IMAGE: 50 * 1024 * 1024,      // 50MB
  VIDEO: 500 * 1024 * 1024,     // 500MB
  AUDIO: 100 * 1024 * 1024,     // 100MB
  TEXT: 10 * 1024 * 1024,       // 10MB
  DOCUMENT: 50 * 1024 * 1024,   // 50MB
};

// Chain Configuration - Story Aeneid Testnet
export const CHAIN_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1315'),
  chainName: 'Story Aeneid Testnet',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://aeneid.storyrpc.io',
  blockExplorer: 'https://aeneid.storyscan.io',
  nativeCurrency: {
    name: 'IP',
    symbol: 'IP',
    decimals: 18,
  },
};

// Default currency for transactions on Story Protocol
export const DEFAULT_CURRENCY = 'IP';

// Contract Addresses
export const CONTRACTS = {
  DIPPCHAIN_REGISTRY: process.env.NEXT_PUBLIC_DIPPCHAIN_REGISTRY_ADDRESS || '',
  ROYALTY_TOKEN: process.env.NEXT_PUBLIC_ROYALTY_TOKEN_ADDRESS || '',
  FRACTIONALIZATION_MANAGER: process.env.NEXT_PUBLIC_FRACTIONALIZATION_MANAGER_ADDRESS || '',
  ROYALTY_VAULT: process.env.NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS || '',
  DIPPCHAIN_GOVERNOR: process.env.NEXT_PUBLIC_DIPPCHAIN_GOVERNOR_ADDRESS || '',
  DIPPCHAIN_DETECTOR: process.env.NEXT_PUBLIC_DIPPCHAIN_DETECTOR_ADDRESS || '',
};

// Navigation Links
export const NAV_LINKS = [
  { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { name: 'My Assets', href: '/assets', icon: 'FolderOpen' },
  { name: 'Licenses', href: '/licenses', icon: 'FileCheck' },
  { name: 'Fractions', href: '/fractions', icon: 'PieChart' },
  { name: 'Marketplace', href: '/marketplace', icon: 'Store' },
  { name: 'Governance', href: '/governance', icon: 'Vote' },
  { name: 'Sentinel', href: '/sentinel', icon: 'Shield' },
  { name: 'Revenue', href: '/revenue', icon: 'Wallet' },
];

// Pricing Plans (in IP tokens)
export const PRICING_PLANS = [
  {
    name: 'Creator',
    price: 0,
    currency: 'IP',
    period: 'forever',
    description: 'Perfect for individual creators getting started',
    features: [
      'Up to 10 IP asset registrations',
      'Basic watermarking',
      'Community support',
      'Standard Sentinel scans (weekly)',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 50,
    currency: 'IP',
    period: 'month',
    description: 'For serious creators building their brand',
    features: [
      'Unlimited IP registrations',
      'Advanced watermarking & metadata',
      'Priority support',
      'Daily Sentinel scans',
      'PIL licensing engine',
      'Royalty analytics',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 200,
    currency: 'IP',
    period: 'month',
    description: 'For teams and agencies at scale',
    features: [
      'Everything in Professional',
      'Real-time Sentinel monitoring',
      'Story Protocol API access',
      'Custom integrations',
      'Dedicated account manager',
      'Legal support & takedowns',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

