// Create Fractionalization Page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAppKitAccount } from '@reown/appkit/react';
import { useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider, Contract, parseEther, getAddress } from 'ethers';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, Image, Loader2, ExternalLink, Check, AlertTriangle } from 'lucide-react';
import { CONTRACTS } from '@/contracts/addresses';
import DippChainRegistryABI from '@/contracts/abis/DippChainRegistry.json';
import FractionalizationManagerABI from '@/contracts/abis/FractionalizationManager.json';
import toast from 'react-hot-toast';

export default function CreateFractionPage() {
  const router = useRouter();
  const { assetId: queryAssetId } = router.query;
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Configure, 2: Deploy, 3: Complete
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [deployResult, setDeployResult] = useState(null);
  
  const [formData, setFormData] = useState({
    assetId: queryAssetId || '',
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '1000000',
    pricePerToken: '0.001',
    currency: 'IP',
    creatorRetainPercentage: '20', // % of tokens creator keeps
  });

  useEffect(() => {
    if (isConnected && address) {
      fetchAssets();
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (queryAssetId) {
      setFormData(prev => ({ ...prev, assetId: queryAssetId }));
    }
  }, [queryAssetId]);

  const fetchAssets = async () => {
    try {
      const response = await fetch(`/api/assets?userId=${address}&status=REGISTERED`);
      const data = await response.json();
      if (data.success) {
        // Filter out already fractionalized assets
        const available = data.assets.filter(a => !a.fractionalization);
        setAssets(available);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-generate token symbol from name
    if (name === 'tokenName') {
      const symbol = value
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 5);
      setFormData(prev => ({ ...prev, tokenSymbol: symbol || '' }));
    }
  };

  const handleDeploy = async () => {
    if (!formData.assetId || !formData.tokenName || !formData.tokenSymbol) {
      toast.error('Please fill in all required fields');
      return;
    }

    const asset = assets.find(a => a.id === formData.assetId);
    if (!asset?.dippchainTokenId) {
      toast.error('Asset must be registered on-chain first');
      return;
    }

    if (!walletProvider) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoading(true);
    setStep(2);
    const toastId = toast.loading('Starting fractionalization...');

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      
      // First, approve FractionalizationManager to transfer the NFT
      toast.loading('Step 1/3: Approving NFT transfer...', { id: toastId });
      
      const registryAddress = getAddress(CONTRACTS.DippChainRegistry.toLowerCase());
      const managerAddress = getAddress(CONTRACTS.FractionalizationManager.toLowerCase());
      
      const registry = new Contract(registryAddress, DippChainRegistryABI, signer);
      const manager = new Contract(managerAddress, FractionalizationManagerABI, signer);

      const tokenId = parseInt(asset.dippchainTokenId);
      
      // Check if already approved
      const approved = await registry.getApproved(tokenId);
      if (approved.toLowerCase() !== managerAddress.toLowerCase()) {
        toast.loading('Approve NFT transfer in wallet...', { id: toastId });
        const approveTx = await registry.approve(managerAddress, tokenId);
        await approveTx.wait();
      }

      // Now fractionalize
      toast.loading('Step 2/3: Creating fractional tokens...', { id: toastId });
      
      const totalSupply = BigInt(formData.totalSupply);
      const pricePerToken = parseEther(formData.pricePerToken);
      const creatorRetainPercentage = parseInt(formData.creatorRetainPercentage);

      console.log('Fractionalizing:', {
        tokenId,
        tokenName: formData.tokenName,
        tokenSymbol: formData.tokenSymbol,
        totalSupply: totalSupply.toString(),
        pricePerToken: pricePerToken.toString(),
        creatorRetainPercentage,
      });

      toast.loading('Confirm fractionalization in wallet...', { id: toastId });
      const tx = await manager.fractionalizeAsset(
        tokenId,
        formData.tokenName,
        formData.tokenSymbol,
        totalSupply,
        pricePerToken,
        creatorRetainPercentage
      );

      toast.loading('Step 3/3: Waiting for confirmation...', { id: toastId });
      const receipt = await tx.wait();

      // Get token address from event
      let tokenAddress = null;
      for (const log of receipt.logs) {
        try {
          const parsed = manager.interface.parseLog({ topics: log.topics, data: log.data });
          if (parsed && parsed.name === 'AssetFractionalized') {
            tokenAddress = parsed.args.tokenAddress;
            console.log('Token deployed at:', tokenAddress);
            break;
          }
        } catch {
          // Not our event
        }
      }

      // Save to database
      toast.loading('Saving to database...', { id: toastId });
      const createResponse = await fetch('/api/fractions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: formData.assetId,
          tokenName: formData.tokenName,
          tokenSymbol: formData.tokenSymbol,
          totalSupply: formData.totalSupply,
          pricePerToken: formData.pricePerToken,
          currency: formData.currency,
          creatorRetainPercentage: formData.creatorRetainPercentage,
          tokenAddress,
          deployTxHash: receipt.hash,
          status: 'TRADING',
        }),
      });

      if (!createResponse.ok) {
        console.error('Failed to save to database');
      }

      setDeployResult({
        tokenAddress,
        txHash: receipt.hash,
        totalSupply: formData.totalSupply,
        availableForSale: Math.floor(parseInt(formData.totalSupply) * (100 - creatorRetainPercentage) / 100),
      });

      toast.success('Fractionalization complete!', { id: toastId });
      setStep(3);
    } catch (error) {
      console.error('Deploy error:', error);
      
      let errorMessage = 'Fractionalization failed';
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was rejected';
      } else if (error.message?.includes('NotAssetOwner')) {
        errorMessage = 'You are not the owner of this asset';
      } else if (error.message?.includes('AlreadyFractionalized')) {
        errorMessage = 'This asset is already fractionalized';
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage;
      }
      
      toast.error(errorMessage, { id: toastId });
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const selectedAsset = assets.find(a => a.id === formData.assetId);

  return (
    <DashboardLayout title="Fractionalize Asset">
      <Link href="/dashboard/fractions">
        <button style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          color: '#525252',
          backgroundColor: 'transparent',
          border: '1px solid #e5e5e5',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '24px',
        }}>
          <ArrowLeft size={16} /> Back to Fractions
        </button>
      </Link>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '32px',
      }}>
        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '32px',
        }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: s <= step ? '#0a0a0a' : '#f5f5f5',
                color: s <= step ? 'white' : '#737373',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: '500',
              }}>
                {s < step ? <Check size={14} /> : s}
              </div>
              {s < 3 && (
                <div style={{
                  width: '60px',
                  height: '2px',
                  backgroundColor: s < step ? '#0a0a0a' : '#e5e5e5',
                  margin: '0 8px',
                }} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              Configure Fractionalization
            </h2>
            <p style={{ fontSize: '14px', color: '#737373', marginBottom: '24px' }}>
              Set up the token parameters for your fractionalized asset
            </p>

            {/* Asset Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Select Asset *
              </label>
              {assetsLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#737373' }}>Loading...</div>
              ) : assets.length === 0 ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: '#fafafa',
                  borderRadius: '8px',
                  border: '1px dashed #e5e5e5',
                }}>
                  <p style={{ fontSize: '14px', color: '#737373', marginBottom: '12px' }}>
                    No available assets to fractionalize
                  </p>
                  <Link href="/dashboard/upload">
                    <button type="button" style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      color: 'white',
                      backgroundColor: '#0a0a0a',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}>
                      Upload Asset
                    </button>
                  </Link>
                </div>
              ) : (
                <select
                  name="assetId"
                  value={formData.assetId}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                  }}
                >
                  <option value="">Choose an asset...</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({asset.assetType})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Token Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Token Name *
              </label>
              <input
                type="text"
                name="tokenName"
                value={formData.tokenName}
                onChange={handleInputChange}
                placeholder="e.g., Summer Photo Token"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                }}
              />
            </div>

            {/* Token Symbol */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Token Symbol *
              </label>
              <input
                type="text"
                name="tokenSymbol"
                value={formData.tokenSymbol}
                onChange={handleInputChange}
                placeholder="e.g., SPT"
                maxLength={5}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  textTransform: 'uppercase',
                }}
              />
            </div>

            {/* Supply & Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                  Total Supply
                </label>
                <input
                  type="number"
                  name="totalSupply"
                  value={formData.totalSupply}
                  onChange={handleInputChange}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                  Price per Token (IP)
                </label>
                <input
                  type="number"
                  name="pricePerToken"
                  value={formData.pricePerToken}
                  onChange={handleInputChange}
                  step="0.0001"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                  }}
                />
              </div>
            </div>

            {/* Creator Retain Percentage */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Creator Retain (%)
              </label>
              <input
                type="number"
                name="creatorRetainPercentage"
                value={formData.creatorRetainPercentage}
                onChange={handleInputChange}
                min="0"
                max="100"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                }}
              />
              <p style={{ fontSize: '12px', color: '#737373', marginTop: '6px' }}>
                Percentage of tokens you keep. The rest ({100 - parseInt(formData.creatorRetainPercentage || 0)}%) will be available for sale.
              </p>
            </div>

            {/* Summary */}
            {formData.totalSupply && formData.pricePerToken && (
              <div style={{
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                marginBottom: '24px',
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
                  Summary
                </h4>
                <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#737373' }}>Total Supply</span>
                    <span style={{ color: '#0a0a0a', fontWeight: '500' }}>{parseInt(formData.totalSupply).toLocaleString()} tokens</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#737373' }}>You Keep</span>
                    <span style={{ color: '#0a0a0a', fontWeight: '500' }}>
                      {Math.floor(parseInt(formData.totalSupply) * parseInt(formData.creatorRetainPercentage) / 100).toLocaleString()} tokens ({formData.creatorRetainPercentage}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#737373' }}>For Sale</span>
                    <span style={{ color: '#0a0a0a', fontWeight: '500' }}>
                      {Math.floor(parseInt(formData.totalSupply) * (100 - parseInt(formData.creatorRetainPercentage)) / 100).toLocaleString()} tokens
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e5e5', paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#737373' }}>Potential Raise</span>
                    <span style={{ color: '#16a34a', fontWeight: '600' }}>
                      {(Math.floor(parseInt(formData.totalSupply) * (100 - parseInt(formData.creatorRetainPercentage)) / 100) * parseFloat(formData.pricePerToken)).toLocaleString()} IP
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleDeploy}
              disabled={loading || !formData.assetId || !formData.tokenName || !formData.tokenSymbol}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: (loading || !formData.assetId) ? '#a3a3a3' : '#0a0a0a',
                border: 'none',
                borderRadius: '8px',
                cursor: (loading || !formData.assetId) ? 'not-allowed' : 'pointer',
              }}
            >
              Deploy Token
            </button>
          </>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Loader2 size={48} className="animate-spin" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              Deploying Token
            </h2>
            <p style={{ fontSize: '14px', color: '#737373' }}>
              Please confirm the transaction in your wallet...
            </p>
          </div>
        )}

        {step === 3 && deployResult && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Check size={32} color="#16a34a" />
            </div>
            
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              Fractionalization Complete!
            </h2>
            <p style={{ fontSize: '14px', color: '#737373', marginBottom: '24px' }}>
              Your asset has been fractionalized into tradeable tokens
            </p>

            {deployResult.tokenAddress && (
              <div style={{
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                marginBottom: '24px',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>Token Address</div>
                <code style={{ fontSize: '13px', color: '#0a0a0a', wordBreak: 'break-all' }}>
                  {deployResult.tokenAddress}
                </code>
              </div>
            )}

            {deployResult.txHash && (
              <a
                href={`https://aeneid.storyscan.io/tx/${deployResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  color: '#0a0a0a',
                  textDecoration: 'underline',
                  marginBottom: '24px',
                }}
              >
                View Transaction <ExternalLink size={14} />
              </a>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/dashboard/fractions" style={{ flex: 1 }}>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#0a0a0a',
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}>
                  View All Fractions
                </button>
              </Link>
              <Link href="/dashboard/marketplace" style={{ flex: 1 }}>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#0a0a0a',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}>
                  Go to Marketplace
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

