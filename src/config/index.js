import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { aeneid } from "@story-protocol/core-sdk";

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

if (!projectId || projectId === 'demo') {
  console.warn("⚠️ Project ID is not defined or using demo. Get your Project ID from https://cloud.reown.com");
}

export const networks = [aeneid];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId: projectId || 'demo',
  networks,
});

export const config = wagmiAdapter.wagmiConfig;

