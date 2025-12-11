// Create Fractionalization Page - Using Story Protocol Native Royalty Tokens
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, Loader2, Info, CheckCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  STORY_ROYALTY_TOKEN_TOTAL_TOKENS,
  tokensToWei,
  weiToTokens,
} from '@/lib/storyRoyaltyTokens';

export default function CreateFractionPage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();

  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [royaltyTokenInfo, setRoyaltyTokenInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    tokensForSale: '',
    pricePerToken: '',
    retainPercentage: 20,
  });

  const [result, setResult] = useState(null);
  const [initializingVault, setInitializingVault] = useState(false);

  // Fetch user's assets that are registered on Story Protocol
  useEffect(() => {
    if (isConnected && address) {
      fetchAssets();
    }
  }, [isConnected, address]);

  const fetchAssets = async () => {
    try {
      const response = await fetch(`/api/assets?userId=${address}`);
      const data = await response.json();
      
      if (data.success) {
        // Filter assets that:
        // 1. Are registered on Story Protocol
        // 2. Are NOT already fractionalized
        const eligibleAssets = data.assets.filter(
          asset => asset.storyProtocolId && !asset.fractionalization
        );
        setAssets(eligibleAssets);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast.error('Failed to load assets');
    }
  };

  const handleInitializeVault = async (asset) => {
    setInitializingVault(true);
    const toastId = toast.loading('Initializing Royalty Vault...');
    
    try {
      const response = await fetch('/api/story/initialize-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipId: asset.storyProtocolId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Vault initialization failed:', data);
        const errorMsg = data.error?.message || data.details || data.error || 'Failed to initialize vault';
        toast.error(errorMsg, { id: toastId });
        setInitializingVault(false);
        return;
      }

      // Check if vault was immediately available
      if (data.vaultAddress) {
        toast.success('Vault initialized successfully!', { id: toastId });
        // Immediately proceed to step 2
        setTimeout(() => {
          handleAssetSelect(asset);
        }, 1000);
      } else if (data.warning) {
        toast.success('License terms attached. Checking vault...', { id: toastId });
        // Wait a bit longer and retry
        setTimeout(() => {
          handleAssetSelect(asset);
        }, 5000);
      } else {
        toast.success('Vault initialized! Checking...', { id: toastId });
        // Default wait and retry
        setTimeout(() => {
          handleAssetSelect(asset);
        }, 3000);
      }
    } catch (error) {
      console.error('Initialize vault error:', error);
      toast.error(error.message || 'Failed to initialize vault', { id: toastId });
      setInitializingVault(false);
    }
  };

  const handleAssetSelect = async (asset) => {
    setSelectedAsset(asset);
    setLoading(true);
    
    try {
      // Use the API endpoint that uses Story Protocol SDK (server-side)
      const response = await fetch(`/api/fractions/vault?assetId=${asset.id}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.warn('Royalty vault not found for IP:', asset.storyProtocolId);
        
        // Show option to initialize vault or retry
        toast(
          (t) => (
            <div style={{ maxWidth: '400px' }}>
              <strong>⚠️ Royalty Vault Not Found</strong>
              <p style={{ fontSize: '13px', marginTop: '8px', marginBottom: '12px' }}>
                {data.details || 'The vault may take a few moments to deploy after attaching license terms, or it might need to be initialized.'}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                <button
                  onClick={async () => {
                    toast.dismiss(t.id);
                    toast.loading('Retrying vault lookup...', { duration: 3000 });
                    setTimeout(() => {
                      handleAssetSelect(asset);
                    }, 2000);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: '#6366f1',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  🔄 Retry
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    handleInitializeVault(asset);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: '#8b5cf6',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Initialize Vault
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#525252',
                    backgroundColor: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ),
          { duration: 20000 }
        );
        
        setLoading(false);
        setSelectedAsset(null);
        return;
      }
      
      // API returns all token details we need
      setRoyaltyTokenInfo({
        address: data.vaultAddress,
        name: data.token.name,
        symbol: data.token.symbol,
        decimals: data.token.decimals,
        totalSupply: data.token.totalSupply,
        ipAccountBalance: data.token.ipAccountBalance,
        ipId: asset.storyProtocolId,
      });
      
      setStep(2);
    } catch (error) {
      console.error('Failed to fetch royalty token info:', error);
      toast.error(error.message || 'Failed to get Royalty Token details');
      setSelectedAsset(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRetainPercentageChange = (e) => {
    const retainPercentage = parseInt(e.target.value) || 0;
    const tokensForSale = STORY_ROYALTY_TOKEN_TOTAL_TOKENS * (1 - retainPercentage / 100);
    
    setFormData(prev => ({
      ...prev,
      retainPercentage,
      tokensForSale: tokensForSale.toString(),
    }));
  };

  const handleCreate = async () => {
    if (!selectedAsset || !royaltyTokenInfo || !formData.tokensForSale || !formData.pricePerToken) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating fractionalization...');

    try {
      // Create fractionalization record in database
      const response = await fetch('/api/story-fractions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          royaltyTokenAddress: royaltyTokenInfo.address,
          tokensForSale: parseFloat(formData.tokensForSale),
          pricePerToken: parseFloat(formData.pricePerToken),
          currency: 'IP',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Create fractionalization failed:', data);
        const errorMsg = data.error?.message || data.error || 'Failed to create fractionalization';
        toast.error(errorMsg, { id: toastId });
        setLoading(false);
        return;
      }

      toast.success('Fractionalization created!', { id: toastId });
      
      setResult({
        fractionalization: data.fractionalization,
        royaltyTokenAddress: royaltyTokenInfo.address,
        tokensForSale: formData.tokensForSale,
        tokensRetained: STORY_ROYALTY_TOKEN_TOTAL_TOKENS - parseFloat(formData.tokensForSale),
        pricePerToken: formData.pricePerToken,
      });
      
      setStep(3);
    } catch (error) {
      console.error('Create fractionalization error:', error);
      toast.error('An unexpected error occurred. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Create Fractionalization">
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

      {/* Progress Steps */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '32px',
      }}>
        {['Select Asset', 'Set Terms', 'Complete'].map((label, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: step > index ? '#0a0a0a' : step === index + 1 ? '#0a0a0a' : '#f5f5f5',
            color: step >= index + 1 ? 'white' : '#737373',
            fontSize: '13px',
            fontWeight: '500',
          }}>
            {step > index + 1 ? <CheckCircle size={14} /> : <span>{index + 1}</span>}
            {label}
          </div>
        ))}
      </div>

      <div style={{
        maxWidth: '100%',
        width: '100%',
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '32px 24px',
      }}>
        {/* Step 1: Select Asset */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              Select Asset to Fractionalize
            </h2>
            <p style={{ fontSize: '14px', color: '#737373', marginBottom: '24px' }}>
              Choose an asset that is registered on Story Protocol to fractionalize using Story's native Royalty Tokens.
            </p>

            {/* Info Box */}
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <Info size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
                <strong>Using Story Protocol Royalty Tokens</strong>
                <br />
                Each IP Asset on Story Protocol has 100M native ERC-20 Royalty Tokens (6 decimals). These tokens represent fractional ownership and automatically receive proportional revenue from derivatives and licensing.
                <br /><br />
                <strong>Note:</strong> The Royalty Vault is created when you mint the first license token or register a derivative. If your asset doesn't have a vault yet, you'll need to attach license terms first.
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Loader2 size={32} className="animate-spin" color="#737373" />
                <p style={{ fontSize: '14px', color: '#737373', marginTop: '12px' }}>
                  Loading eligible assets...
                </p>
              </div>
            ) : assets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>
                <p>No eligible assets found.</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>
                  Assets must be registered on Story Protocol to be fractionalized.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                  <button
                    onClick={fetchAssets}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      color: '#0a0a0a',
                      backgroundColor: 'white',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Refresh
                  </button>
                  <Link href="/dashboard/upload">
                    <button style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      color: 'white',
                      backgroundColor: '#0a0a0a',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}>
                      Upload New Asset
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => handleAssetSelect(asset)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0a0a0a';
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e5e5';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    {asset.thumbnailUrl && (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.title}
                        style={{
                          width: '60px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '500', color: '#0a0a0a', marginBottom: '4px' }}>
                        {asset.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#737373' }}>
                        Type: {asset.assetType} • Registered on Story Protocol
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 2: Set Terms */}
        {step === 2 && selectedAsset && royaltyTokenInfo && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              Set Fractionalization Terms
            </h2>
            <p style={{ fontSize: '14px', color: '#737373', marginBottom: '24px' }}>
              Define how many tokens to sell and at what price.
            </p>

            {/* Royalty Token Info */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
                Story Protocol Royalty Token
              </h3>
              <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#737373' }}>Token Address:</span>
                  <a
                    href={`https://aeneid.storyscan.io/address/${royaltyTokenInfo.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#2563eb',
                      textDecoration: 'underline',
                    }}
                  >
                    {royaltyTokenInfo.address.slice(0, 10)}...{royaltyTokenInfo.address.slice(-8)}
                    <ExternalLink size={12} />
                  </a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#737373' }}>Total Supply:</span>
                  <span style={{ color: '#0a0a0a', fontWeight: '500' }}>
                    {STORY_ROYALTY_TOKEN_TOTAL_TOKENS.toLocaleString()} tokens
                  </span>
                </div>
              </div>
            </div>

            {/* Retain Percentage Slider */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0a0a0a',
                marginBottom: '12px',
              }}>
                How much ownership do you want to retain?
              </label>
              <input
                type="range"
                name="retainPercentage"
                min="0"
                max="100"
                step="5"
                value={formData.retainPercentage}
                onChange={handleRetainPercentageChange}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  marginBottom: '12px',
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                color: '#737373',
              }}>
                <span>Sell All (0%)</span>
                <span style={{ fontWeight: '600', color: '#0a0a0a', fontSize: '16px' }}>
                  {formData.retainPercentage}% Retained
                </span>
                <span>Keep All (100%)</span>
              </div>
            </div>

            {/* Token Distribution Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <div style={{
                padding: '16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
              }}>
                <p style={{ fontSize: '12px', color: '#15803d', marginBottom: '4px' }}>You Keep</p>
                <p style={{ fontSize: '20px', fontWeight: '600', color: '#15803d' }}>
                  {(STORY_ROYALTY_TOKEN_TOTAL_TOKENS * formData.retainPercentage / 100).toLocaleString()}
                </p>
                <p style={{ fontSize: '11px', color: '#15803d' }}>{formData.retainPercentage}% ownership</p>
              </div>
              <div style={{
                padding: '16px',
                backgroundColor: '#eff6ff',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
              }}>
                <p style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px' }}>For Sale</p>
                <p style={{ fontSize: '20px', fontWeight: '600', color: '#1e40af' }}>
                  {(STORY_ROYALTY_TOKEN_TOTAL_TOKENS * (100 - formData.retainPercentage) / 100).toLocaleString()}
                </p>
                <p style={{ fontSize: '11px', color: '#1e40af' }}>{100 - formData.retainPercentage}% ownership</p>
              </div>
            </div>

            {/* Price Per Token */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0a0a0a',
                marginBottom: '8px',
              }}>
                Price Per Token (IP)
              </label>
              <input
                type="number"
                name="pricePerToken"
                value={formData.pricePerToken}
                onChange={handleInputChange}
                placeholder="0.00001"
                step="0.00001"
                min="0"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                }}
              />
              {formData.pricePerToken && formData.tokensForSale && (
                <p style={{ fontSize: '13px', color: '#737373', marginTop: '8px' }}>
                  Total revenue if all tokens sell: <strong>{(parseFloat(formData.pricePerToken) * parseFloat(formData.tokensForSale)).toFixed(4)} IP</strong>
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#525252',
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.pricePerToken}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: (loading || !formData.pricePerToken) ? '#a3a3a3' : '#0a0a0a',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (loading || !formData.pricePerToken) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Create Fractionalization
              </button>
            </div>
          </>
        )}

        {/* Step 3: Complete */}
        {step === 3 && result && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '50%',
                marginBottom: '16px',
              }}>
                <CheckCircle size={48} color="#15803d" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
                Fractionalization Created!
              </h2>
              <p style={{ fontSize: '14px', color: '#737373' }}>
                Your asset is now fractionalized using Story Protocol's Royalty Tokens.
              </p>
            </div>

            {/* Summary */}
            <div style={{
              padding: '20px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '16px' }}>
                Summary
              </h3>
              <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#737373' }}>Tokens for Sale:</span>
                  <span style={{ color: '#0a0a0a', fontWeight: '500' }}>
                    {parseFloat(result.tokensForSale).toLocaleString()} tokens
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#737373' }}>Tokens You Keep:</span>
                  <span style={{ color: '#0a0a0a', fontWeight: '500' }}>
                    {result.tokensRetained.toLocaleString()} tokens
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#737373' }}>Price Per Token:</span>
                  <span style={{ color: '#0a0a0a', fontWeight: '500' }}>
                    {result.pricePerToken} IP
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#737373' }}>Royalty Token:</span>
                  <a
                    href={`https://aeneid.storyscan.io/address/${result.royaltyTokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#2563eb',
                      textDecoration: 'underline',
                      fontSize: '13px',
                    }}
                  >
                    View Token <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div style={{
              padding: '16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                Next Steps
              </h3>
              <ul style={{ fontSize: '13px', color: '#1e40af', lineHeight: 1.8, paddingLeft: '20px' }}>
                <li>Your tokens are now listed on the marketplace</li>
                <li>Buyers will purchase tokens, and you'll receive IP tokens</li>
                <li>Revenue from derivatives/licensing will flow to all token holders</li>
                <li>Token holders can trade on secondary markets</li>
              </ul>
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Link href="/dashboard/marketplace">
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
                  View in Marketplace
                </button>
              </Link>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedAsset(null);
                  setRoyaltyTokenInfo(null);
                  setFormData({
                    tokensForSale: '',
                    pricePerToken: '',
                    retainPercentage: 20,
                  });
                  setResult(null);
                  fetchAssets();
                }}
                style={{
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#525252',
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Fractionalize Another
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
