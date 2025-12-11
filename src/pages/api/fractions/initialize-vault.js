// API Route: Initialize royalty vault by minting one license token (triggers vault deployment)
import { createStoryClientServer, getStoryRpcUrls } from '@/lib/storyProtocolClient';
import { ethers } from 'ethers';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { ipId, licenseTermsId, receiver } = req.body || {};
    if (!ipId) {
      return res.status(400).json({ success: false, error: 'ipId is required' });
    }
    const ltId = licenseTermsId || '1'; // default to license terms ID 1 (zero/low fee)

    const rpcUrls = getStoryRpcUrls();
    let vaultAddress = null;
    let txHash = null;
    let lastErr = null;

    for (let i = 0; i < rpcUrls.length; i += 1) {
      const rpc = rpcUrls[i];
      try {
        const spClient = await createStoryClientServer(rpc);
        const acct = spClient.config?.account?.address;
        const nativeProvider = new ethers.JsonRpcProvider(rpc);
        const nativeBal = await nativeProvider.getBalance(acct);
        console.log('Using RPC:', rpc, 'Account:', acct, 'Native balance:', ethers.formatEther(nativeBal));
        const mintResult = await spClient.license.mintLicenseTokens({
          licensorIpId: ipId,
          licenseTermsId: ltId,
          amount: 1,
          receiver: receiver || spClient.config?.account?.address,
          txOptions: { waitForTransaction: true },
        });
        txHash = mintResult?.txHash || mintResult?.hash || null;
        vaultAddress = await spClient.royalty.getRoyaltyVaultAddress(ipId);
        if (vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000') {
          break;
        }
      } catch (e) {
        lastErr = e;
        // try next RPC
      }
    }

    if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
      return res.status(500).json({
        success: false,
        error: 'Vault still not found after mint attempt',
        details: lastErr?.message,
        ipId,
      });
    }

    return res.status(200).json({
      success: true,
      vaultAddress,
      txHash,
    });
  } catch (error) {
    console.error('Initialize vault error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize vault',
      details: error.message,
    });
  }
}


