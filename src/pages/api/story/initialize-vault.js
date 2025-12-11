// API Route: Initialize Royalty Vault for IP Asset
// Attaches license terms to an IP Asset, which automatically creates the royalty vault
import { createStoryClientServer, PIL_LICENSE_TERMS } from '@/lib/storyProtocolClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ipId, licenseTermsId } = req.body;

    if (!ipId) {
      return res.status(400).json({
        success: false,
        error: 'IP ID is required',
      });
    }

    const client = await createStoryClientServer();
    
    console.log('Initializing royalty vault for IP:', ipId);
    console.log('License terms ID:', licenseTermsId || PIL_LICENSE_TERMS.COMMERCIAL_USE);
    console.log('Account address:', client.config?.account?.address || client.wallet?.account?.address);

    // Attach license terms (this creates the vault automatically)
    // The SDK uses the account from the config automatically
    const response = await client.license.attachLicenseTerms({
      ipId: ipId,
      licenseTermsId: licenseTermsId || PIL_LICENSE_TERMS.COMMERCIAL_USE,
      txOptions: { waitForTransaction: true },
    });

    // Log full response to debug
    console.log('Full attachLicenseTerms response:', JSON.stringify(response, null, 2));
    
    // SDK might return txHash, hash, or transactionHash
    const txHash = response.txHash || response.hash || response.transactionHash;
    
    if (!txHash) {
      console.error('No transaction hash in response:', response);
      return res.status(500).json({
        success: false,
        error: 'Transaction completed but no hash returned',
        details: 'License terms may have been attached, but transaction hash is missing',
        response: response,
      });
    }

    console.log('License terms attached successfully');
    console.log('Transaction hash:', txHash);

    // Verify vault was actually created (wait a moment for blockchain to update)
    console.log('Verifying vault creation...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    let vaultAddress;
    try {
      vaultAddress = await client.royalty.getRoyaltyVaultAddress(ipId);
      console.log('Vault address after attachment:', vaultAddress);
    } catch (verifyError) {
      console.warn('Could not verify vault immediately:', verifyError.message);
    }

    if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ Vault not found immediately after license attachment');
      return res.status(200).json({
        success: true,
        txHash: txHash,
        message: 'License terms attached. Vault may take a few moments to be available.',
        warning: 'Vault not immediately available - please retry vault lookup in a few seconds',
        ipId: ipId,
      });
    }

    return res.status(200).json({
      success: true,
      txHash: txHash,
      vaultAddress: vaultAddress,
      message: 'Royalty vault initialized successfully',
      ipId: ipId,
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

