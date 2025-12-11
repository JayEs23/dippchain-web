// API Route: Initialize Royalty Vault for IP Asset
// Attaches license terms to an IP Asset, which automatically creates the royalty vault
import { createStoryClientServer, PIL_LICENSE_TERMS, getStoryRpcUrls, STORY_CONTRACTS } from '@/lib/storyProtocolClient';
import { saveStoryResponse } from '@/lib/storyProtocolLogger';
import { ethers } from 'ethers';

// Royalty Module ABI for direct contract queries
const ROYALTY_MODULE_ABI = [
  'function ipRoyaltyVaults(address ipId) view returns (address)',
];

// License Module event signatures
const LICENSE_TOKEN_MINTED_EVENT = '0x0d96f072d487d7f8b4891a4e4cf14e8cdad444a34248230085c20808d57caa1a';

/**
 * Extract vault address from mint transaction receipt logs
 * The vault address is emitted in the LicenseTokenMinted event data
 * Event signature: LicenseTokenMinted(address,address,address,uint256)
 * Data contains: [vaultAddress, licenseTermsId, receiver, tokenId]
 */
function extractVaultFromMintLogs(receipt) {
  if (!receipt?.logs || !Array.isArray(receipt.logs)) {
    return null;
  }

  // Find the LicenseTokenMinted event (from License Module)
  const licenseModuleAddress = STORY_CONTRACTS.LICENSING_MODULE?.toLowerCase();
  const mintLog = receipt.logs.find((log) => {
    const isLicenseModule = log.address?.toLowerCase() === licenseModuleAddress;
    const isMintEvent = log.topics?.[0]?.toLowerCase() === LICENSE_TOKEN_MINTED_EVENT.toLowerCase();
    return isLicenseModule && isMintEvent;
  });

  if (!mintLog?.data) {
    return null;
  }

  try {
    // Decode ABI-encoded data: the first parameter is the vault address (32 bytes, padded)
    const dataHex = mintLog.data;
    if (dataHex.length < 66) {
      // Need at least 0x + 64 chars for one 32-byte value
      return null;
    }
    
    // The first 32 bytes (64 hex chars) contain the vault address (left-padded)
    // Format: 0x + 12 zeros + 20-byte address = 66 chars total
    const firstParam = dataHex.slice(2, 66); // Skip 0x, take first 64 chars
    // Extract the address (last 40 hex chars = 20 bytes)
    const vaultAddressHex = `0x${firstParam.slice(24)}`; // Skip padding, take last 40 chars
    
    // Validate it's a valid address (42 chars including 0x)
    if (vaultAddressHex.length === 42 && /^0x[a-fA-F0-9]{40}$/.test(vaultAddressHex)) {
      // Convert to checksum address for consistency
      return ethers.getAddress(vaultAddressHex);
    }
  } catch (e) {
    console.warn('Failed to extract vault from logs:', e);
  }

  return null;
}

/**
 * Query vault address directly from Royalty Module contract
 */
async function getVaultAddressDirect(rpcUrl, ipId) {
  try {
    // Note: We need the Royalty Module address - using SDK's internal or deployed contracts
    // For now, we'll try to get it from the SDK client, but if that fails,
    // we can query the known deployed address
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Try to get from SDK's deployed contracts (if available)
    // Otherwise, we'd need to query the registry or use a known address
    // For now, return null and let SDK handle it
    return null;
  } catch (e) {
    console.warn('Direct vault query failed:', e);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ipId, licenseTermsId, receiver } = req.body;
    console.log('initialize-vault req.body:', req.body);
    console.log('initialize-vault ipId:', ipId);
    console.log('initialize-vault licenseTermsId:', licenseTermsId);
    console.log('initialize-vault receiver:', receiver);
    if (!ipId) {
      return res.status(400).json({
        success: false,
        error: 'IP ID is required',
      });
    }

    const rpcUrls = getStoryRpcUrls();
    const ltId = licenseTermsId || '1'; // default to license terms ID 1 (zero/low fee)

    console.log('Initializing royalty vault for IP (via mintLicenseTokens):', ipId);
    console.log('License terms ID:', ltId);

    let txHash = null;
    let vaultAddress = null;
    let lastErr = null;
    let licenseTokenIds = null;
    let rpcUsed = null;

    for (let i = 0; i < rpcUrls.length; i += 1) {
      const rpc = rpcUrls[i];
      try {
        const client = await createStoryClientServer(rpc);
        const acct = client.config?.account?.address;
        const nativeProvider = new ethers.JsonRpcProvider(rpc);
        const nativeBal = await nativeProvider.getBalance(acct);
        console.log('Using RPC:', rpc, 'Account:', acct, 'Native balance:', ethers.formatEther(nativeBal));

        // Ensure license terms are attached (idempotent; ignore if already attached)
        try {
          await client.license.attachLicenseTerms({
            ipId,
            licenseTermsId: ltId,
            txOptions: { waitForTransaction: true },
          });
        } catch (attachErr) {
          console.warn('attachLicenseTerms skipped/failed (may already be attached):', attachErr?.message || attachErr);
        }

        // Mint 1 license token to trigger vault deployment
        const mintRes = await client.license.mintLicenseTokens({
          licensorIpId: ipId,
          licenseTermsId: ltId,
          amount: 1,
          receiver: receiver || client.config?.account?.address,
          txOptions: { waitForTransaction: true },
        });

        console.log('mintLicenseTokens response:', mintRes);

        txHash = mintRes?.txHash || mintRes?.hash || mintRes?.transactionHash || null;
        licenseTokenIds = mintRes?.licenseTokenIds || null;
        rpcUsed = rpc;

        // Save mint response for debugging
        await saveStoryResponse('mint-license-token', mintRes, {
          ipId,
          licenseTermsId: ltId,
          receiver: receiver || client.config?.account?.address,
          txHash,
          licenseTokenIds: licenseTokenIds?.map((id) => id.toString?.() || id.toString()),
        });

        // Strategy 1: Extract vault address directly from mint transaction logs
        const receipt = mintRes?.receipt || mintRes?.transactionReceipt || null;
        if (receipt) {
          const extractedVault = extractVaultFromMintLogs(receipt);
          if (extractedVault && extractedVault !== '0x0000000000000000000000000000000000000000') {
            console.log('✅ Vault address extracted from mint logs:', extractedVault);
            vaultAddress = extractedVault;
          }
        }

        // Strategy 2: Poll vault via SDK (with longer delays for RPC indexing)
        if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
          console.log('Polling for vault address via SDK (with 5-10s delays)...');
          const pollDelays = [5000, 7000, 10000, 10000, 10000]; // Progressive delays: 5s, 7s, 10s, 10s, 10s
          for (let attempt = 0; attempt < pollDelays.length; attempt += 1) {
            if (attempt > 0) {
              console.log(`Waiting ${pollDelays[attempt]}ms before attempt ${attempt + 1}...`);
              await new Promise((resolve) => setTimeout(resolve, pollDelays[attempt]));
            }
            try {
              vaultAddress = await client.royalty.getRoyaltyVaultAddress(ipId);
              if (vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000') {
                console.log(`✅ Vault found on attempt ${attempt + 1}:`, vaultAddress);
                break;
              }
            } catch (pollErr) {
              console.warn(`Vault poll attempt ${attempt + 1} failed:`, pollErr?.message || pollErr);
            }
          }
        }

        // Strategy 3: Direct contract query fallback (if SDK polling fails)
        if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
          console.log('Attempting direct contract query as fallback...');
          const directVault = await getVaultAddressDirect(rpc, ipId);
          if (directVault && directVault !== '0x0000000000000000000000000000000000000000') {
            console.log('✅ Vault found via direct contract query:', directVault);
            vaultAddress = directVault;
          }
        }

        // Save vault lookup response
        await saveStoryResponse('get-vault-address', { vaultAddress, extractedFromLogs: !!receipt }, {
          ipId,
          txHash,
          attempts: 5,
        });

        if (vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000') {
          break;
        }
      } catch (e) {
        lastErr = e;
        console.error('Error initializing vault: before return', e);
        console.warn('Vault init attempt failed on RPC', rpc, e?.message || e);
        // Save error response
        await saveStoryResponse('initialize-vault-error', e, {
          ipId,
          licenseTermsId: ltId,
          rpc,
          error: e?.message || String(e),
        });
      }
    }

    if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
      return res.status(200).json({
        success: true,
        warning: 'Vault not observed yet after mint; retry vault lookup in a few seconds.',
        txHash,
        ipId,
        rpcUsed,
        lastError: lastErr?.message,
      });
    }

    return res.status(200).json({
      success: true,
      txHash,
      vaultAddress,
      licenseTokenIds: licenseTokenIds?.map((id) => id.toString?.() || id.toString()),
      message: 'Royalty vault initialized by minting one license token',
      ipId,
      rpcUsed,
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

