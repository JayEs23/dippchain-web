// Deployed contract addresses on Story Aeneid Testnet (Chain ID: 1315)
// Update these addresses after deploying contracts

export const CONTRACTS = {
  // Main asset registry (ERC721) - From deployment
  DippChainRegistry: '0xebf5E21e5C1024373bD9dEe2311d49fd97086A63',
  
  // Sentinel detection evidence anchoring
  DippChainDetector: '0xEe3d2d460c68B82C13ca960Bb25f1F0fB81c8B57',
  
  // Fractionalization manager (DEPRECATED - use Story Protocol's native Royalty Tokens instead)
  FractionalizationManager: '0x8D6bA8296f70baFE11f75a8d7C210969094429C9',
  
  // DAO Governance (deploy separately)
  DippChainGovernor: '', // TODO: Deploy and add address
  
  // Royalty vault (deployed per asset)
  RoyaltyVault: '', // Template - deployed per fractionalized asset
  
  // Story Protocol Core Contracts (Native on Story Aeneid)
  StoryProtocol: {
    // IP Asset Registry - manages IP registrations
    IPAssetRegistry: '0x24E9a27d92e294F327ad93E884dE0fD6Bd856902',
    
    // Licensing Module - manages PIL licensing
    LicensingModule: '0x5a7D9Fa17DE09350F481A53B470D798c1c1b0acb',
    
    // Royalty Module - distributes revenue to IP Royalty Vaults
    RoyaltyModule: '0xEa6eD700b11DfF703665CCAF55887ca56134Ae3B',
    
    // Royalty Policy LAP - Linear Ascending Policy for royalty distribution
    RoyaltyPolicyLAP: '0x793c2a8B6D2466f99B181c2A4a73A4e18fDB1819',
    
    // PIL License Templates
    PILicenseTemplate: '0x58E2c909D557Cd23EF90D14f8fd21667A5Ae7a93',
  },
};

// Story Aeneid Testnet configuration
export const CHAIN_CONFIG = {
  chainId: 1315,
  chainName: 'Story Aeneid Testnet',
  rpcUrl: 'https://aeneid.storyrpc.io',
  blockExplorer: 'https://aeneid.storyscan.io',
  // Story Protocol native currency
  nativeCurrency: {
    name: 'IP',
    symbol: 'IP',
    decimals: 18,
  },
};

export default CONTRACTS;

