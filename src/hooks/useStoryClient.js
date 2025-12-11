import { custom } from 'viem';
import { useWalletClient } from 'wagmi';
import { StoryClient } from '@story-protocol/core-sdk';

/**
 * Hook to create Story Protocol client from connected wallet
 * 
 * @returns {Object} { setupStoryClient, wallet }
 * @example
 * const { setupStoryClient, wallet } = useStoryClient();
 * if (wallet) {
 *   const storyClient = await setupStoryClient();
 *   const result = await storyClient.ipAsset.registerIpAsset({...});
 * }
 */
export function useStoryClient() {
  const { data: wallet } = useWalletClient();

  async function setupStoryClient() {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    const config = {
      wallet: wallet,
      transport: custom(wallet.transport),
      chainId: 'aeneid',
    };

    return StoryClient.newClient(config);
  }

  return { setupStoryClient, wallet };
}

