// Deployed contract addresses on Story Aeneid Testnet (Chain ID: 1315)
// Update these addresses after deploying contracts

export const CONTRACTS = {
  // Main asset registry (ERC721) - From deployment
  DippChainRegistry: '0xebf5E21e5C1024373bD9dEe2311d49fd97086A63',
  
  // Sentinel detection evidence anchoring
  DippChainDetector: '0xEe3d2d460c68B82C13ca960Bb25f1F0fB81c8B57',
  
  // Fractionalization manager
  FractionalizationManager: '0xD702244D0ceAA39A8567a41B361a160C67d46F5e',
  
  // DAO Governance (deploy separately)
  DippChainGovernor: '', // TODO: Deploy and add address
  
  // Royalty vault (deployed per asset)
  RoyaltyVault: '', // Template - deployed per fractionalized asset
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

