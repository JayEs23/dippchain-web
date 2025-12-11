'use client';

// Asset Detail Page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  ArrowLeft, ExternalLink, Image, Video, Music, FileText, File,
  Shield, Share2, BarChart3, Edit, Trash2, Copy, Check,
  Clock, CheckCircle, AlertTriangle, Loader2, Zap
} from 'lucide-react';
import { formatDate, formatFileSize, truncateAddress } from '@/lib/utils';
import toast from 'react-hot-toast';

const LICENSE_OPTIONS = [
  { value: 'NONE', label: 'No License', description: 'Register without attaching a license' },
  { value: 'NON_COMMERCIAL_SOCIAL', label: 'Non-Commercial Social', description: 'Free to remix, must credit, no commercial use' },
  { value: 'COMMERCIAL_USE', label: 'Commercial Use', description: 'Allows commercial use with royalty payments' },
  { value: 'COMMERCIAL_REMIX', label: 'Commercial Remix', description: 'Allows remixing and commercial use' },
];

const FileTypeIcon = ({ type, size = 24 }) => {
  const props = { size, strokeWidth: 1.5, color: '#737373' };
  switch (type) {
    case 'IMAGE': return <Image {...props} />;
    case 'VIDEO': return <Video {...props} />;
    case 'AUDIO': return <Music {...props} />;
    case 'TEXT':
    case 'DOCUMENT': return <FileText {...props} />;
    default: return <File {...props} />;
  }
};

export default function AssetDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { address, isConnected } = useAppKitAccount();
  
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [registering, setRegistering] = useState(false);
  const [attachingLicense, setAttachingLicense] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState('COMMERCIAL_USE');
  const [manualTokenId, setManualTokenId] = useState('');

  useEffect(() => {
    if (id) {
      fetchAsset();
    }
  }, [id]);

  const fetchAsset = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assets/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.error?.details || errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Handle both response formats: { success: true, data: { asset } } or { success: true, asset }
      const assetData = data.data?.asset || data.asset;
      
      if (data.success && assetData) {
        setAsset(assetData);
      } else {
        toast.error('Asset not found');
        router.push('/dashboard/assets');
      }
    } catch (error) {
      console.error('Failed to fetch asset:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(error.message || 'Failed to load asset');
      }
      router.push('/dashboard/assets');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(''), 2000);
  };

  const fetchTokenIdFromContract = async () => {
    // Try to get token ID from contract using watermarkId or contentHash
    if (!asset.watermarkId && !asset.contentHash) return null;
    
    try {
      const { BrowserProvider, Contract, getAddress } = await import('ethers');
      const { CONTRACTS } = await import('@/contracts/addresses');
      const DippChainRegistryABI = (await import('@/contracts/abis/DippChainRegistry.json')).default;
      
      // Use wallet provider
      const provider = new BrowserProvider(window.ethereum);
      const registryAddress = getAddress(CONTRACTS.DippChainRegistry.toLowerCase());
      const registry = new Contract(registryAddress, DippChainRegistryABI, provider);
      
      // Try watermarkId first
      if (asset.watermarkId) {
        try {
          const tokenId = await registry.getAssetByWatermark(asset.watermarkId);
          if (tokenId && Number(tokenId) > 0) {
            console.log('Found tokenId by watermark:', Number(tokenId));
            return Number(tokenId);
          }
        } catch (wmErr) {
          console.log('Watermark lookup failed:', wmErr.message);
          // Continue to try contentHash
        }
      }
      
      // Try contentHash (with 0x prefix if needed)
      if (asset.contentHash) {
        const hashToTry = asset.contentHash.startsWith('0x') 
          ? asset.contentHash 
          : asset.contentHash;
        
        try {
          const tokenId = await registry.getAssetByContentHash(hashToTry);
          if (tokenId && Number(tokenId) > 0) {
            console.log('Found tokenId by contentHash:', Number(tokenId));
            return Number(tokenId);
          }
        } catch (chErr) {
          console.log('ContentHash lookup failed:', chErr.message);
        }
      }
      
      // Try to get totalAssets and check if this is the latest one
      try {
        const total = await registry.totalAssets();
        if (total && Number(total) > 0) {
          // Return the latest token ID as a fallback
          console.log('Using totalAssets as fallback:', Number(total));
          return Number(total);
        }
      } catch (totalErr) {
        console.log('TotalAssets lookup failed:', totalErr.message);
      }
      
      return null;
    } catch (err) {
      console.error('Failed to fetch token ID from contract:', err);
      return null;
    }
  };

  const registerOnStoryProtocol = async () => {
    if (!asset) {
      toast.error('Asset not found');
      return;
    }

    // Check if registered on DippChain
    if (!asset.dippchainTxHash && !asset.dippchainTokenId) {
      toast.error('Asset must be registered on DippChain first');
      return;
    }

    setRegistering(true);
    const toastId = toast.loading('Preparing registration...');

    try {
      // Get token ID - from manual input, database, or fetch from contract
      let tokenId = manualTokenId ? parseInt(manualTokenId) : asset.dippchainTokenId;
      
      if (!tokenId) {
        toast.loading('Fetching Token ID from blockchain...', { id: toastId });
        tokenId = await fetchTokenIdFromContract();
        
        if (!tokenId) {
          toast.error('Could not find Token ID. Please enter it manually.', { id: toastId });
          setRegistering(false);
          return;
        }
      }
      
      // Update the asset with the token ID if it was fetched or manual
      if (tokenId && tokenId !== asset.dippchainTokenId) {
        await fetch(`/api/assets/${asset.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dippchainTokenId: tokenId }),
        });
      }

      toast.loading('Registering on Story Protocol...', { id: toastId });

      const response = await fetch('/api/assets/register-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          tokenId: String(tokenId),
          ipMetadataURI: asset.pinataUrl,
          ipMetadataHash: asset.contentHash ? `0x${asset.contentHash}` : '0x',
          nftMetadataURI: asset.pinataUrl,
          nftMetadataHash: asset.contentHash ? `0x${asset.contentHash}` : '0x',
          licenseType: selectedLicense === 'NONE' ? null : selectedLicense,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error?.message || data.error || data.details || 'Registration failed';
        toast.error(errorMsg, { id: toastId });
        return;
      }

      // Update local asset state
      setAsset(prev => ({
        ...prev,
        dippchainTokenId: tokenId,
        storyProtocolId: data.ipId,
        storyProtocolTxHash: data.txHash,
      }));

      toast.success('Successfully registered on Story Protocol!', { id: toastId });
      setShowStoryModal(false);
      
      // Refresh asset data
      fetchAsset();
    } catch (error) {
      console.error('Story Protocol error:', error);
      toast.error('Failed to register on Story Protocol', { id: toastId });
    } finally {
      setRegistering(false);
    }
  };

  const handleAttachLicense = async () => {
    if (!asset || !asset.storyProtocolId) {
      toast.error('Asset must be registered on Story Protocol first');
      return;
    }

    setAttachingLicense(true);
    const toastId = toast.loading('Attaching license terms...');

    try {
      const response = await fetch('/api/assets/attach-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          ipId: asset.storyProtocolId,
          licenseType: selectedLicense,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error?.message || data.error || data.details || 'Failed to attach license terms';
        toast.error(errorMsg, { id: toastId });
        return;
      }

      toast.success('License terms attached! Royalty vault is now created.', { id: toastId });
      setShowLicenseModal(false);
      
      // Refresh asset data
      fetchAsset();
    } catch (error) {
      console.error('Attach license error:', error);
      toast.error('Failed to attach license terms', { id: toastId });
    } finally {
      setAttachingLicense(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading...">
        <div style={{ textAlign: 'center', padding: '60px', color: '#737373' }}>
          Loading asset details...
        </div>
      </DashboardLayout>
    );
  }

  if (!asset) {
    return (
      <DashboardLayout title="Not Found">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: '#737373', marginBottom: '20px' }}>Asset not found</p>
          <Link href="/dashboard/assets">
            <button style={{
              padding: '10px 20px',
              fontSize: '14px',
              color: 'white',
              backgroundColor: '#0a0a0a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}>
              Back to Assets
            </button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Check if current user is the asset owner
  const isOwner = address && asset.user?.walletAddress?.toLowerCase() === address.toLowerCase();

  return (
    <DashboardLayout title={asset.title}>
      {/* Back Button */}
      <Link href="/dashboard/assets">
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
          <ArrowLeft size={16} /> Back to Assets
        </button>
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
        {/* Main Content */}
        <div>
          {/* Preview */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '24px',
          }}>
            <div style={{
              height: '400px',
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {asset.pinataUrl && asset.assetType === 'IMAGE' ? (
                <img
                  src={asset.pinataUrl}
                  alt={asset.title}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : asset.pinataUrl && asset.assetType === 'VIDEO' ? (
                <video
                  src={asset.pinataUrl}
                  controls
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : asset.pinataUrl && asset.assetType === 'AUDIO' ? (
                <div style={{ padding: '40px' }}>
                  <FileTypeIcon type="AUDIO" size={64} />
                  <audio src={asset.pinataUrl} controls style={{ marginTop: '20px', width: '100%' }} />
                </div>
              ) : (
                <FileTypeIcon type={asset.assetType} size={80} />
              )}
            </div>
          </div>

          {/* Description */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '16px' }}>
              Description
            </h2>
            <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6 }}>
              {asset.description || 'No description provided.'}
            </p>
          </div>

          {/* Blockchain Info */}
          {asset.registeredOnChain && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '16px' }}>
                DippChain Registration
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                {asset.dippchainTokenId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#737373' }}>Token ID</span>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a' }}>
                      #{asset.dippchainTokenId}
                    </span>
                  </div>
                )}
                
                {asset.dippchainTxHash && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#737373' }}>Transaction</span>
                    <a
                      href={`https://aeneid.storyscan.io/tx/${asset.dippchainTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        color: '#0a0a0a',
                        textDecoration: 'underline',
                      }}
                    >
                      {truncateAddress(asset.dippchainTxHash, 8, 6)} <ExternalLink size={12} />
                    </a>
                  </div>
                )}
                
                {asset.contentHash && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#737373' }}>Content Hash</span>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0a0a0a' }}>
                      {truncateAddress(asset.contentHash, 10, 6)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Story Protocol Section */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Zap size={20} color="#8b5cf6" />
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                Story Protocol
              </h2>
            </div>
            
            {asset.storyProtocolId ? (
              // Already registered on Story Protocol
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}>
                  <CheckCircle size={16} color="#16a34a" />
                  <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
                    Registered as IP Asset
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#737373' }}>IP Asset ID</span>
                    <a
                      href={`https://aeneid.storyscan.io/address/${asset.storyProtocolId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        color: '#8b5cf6',
                        textDecoration: 'underline',
                      }}
                    >
                      {truncateAddress(asset.storyProtocolId)} <ExternalLink size={12} />
                    </a>
                  </div>
                  
                  {asset.storyProtocolTxHash && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#737373' }}>Transaction</span>
                      <a
                        href={`https://aeneid.storyscan.io/tx/${asset.storyProtocolTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '13px',
                          color: '#0a0a0a',
                          textDecoration: 'underline',
                        }}
                      >
                        {truncateAddress(asset.storyProtocolTxHash, 8, 6)} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Attach License Terms Button - Only for owner */}
                {isOwner ? (
                  <>
                    <button
                      onClick={() => setShowLicenseModal(true)}
                      disabled={attachingLicense}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#8b5cf6',
                        backgroundColor: 'white',
                        border: '1px solid #8b5cf6',
                        borderRadius: '8px',
                        cursor: attachingLicense ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {attachingLicense ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Attaching License...
                        </>
                      ) : (
                        <>
                          <Shield size={14} /> Attach License Terms
                        </>
                      )}
                    </button>
                    
                    <p style={{ fontSize: '11px', color: '#737373', marginTop: '8px', lineHeight: 1.4 }}>
                      Attach license terms to create the Royalty Vault and enable fractionalization
                    </p>
                  </>
                ) : (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                  }}>
                    <p style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                      Only the asset owner can attach license terms to this IP Asset.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Not yet registered on Story Protocol
              <div>
                <p style={{ fontSize: '13px', color: '#737373', marginBottom: '16px', lineHeight: 1.5 }}>
                  Register this asset as an IP Asset on Story Protocol to enable programmable licensing, 
                  royalty collection, and derivative works management.
                </p>
                
                {!asset.dippchainTokenId && !asset.dippchainTxHash ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                  }}>
                    <AlertTriangle size={16} color="#d97706" />
                    <span style={{ fontSize: '13px', color: '#d97706' }}>
                      Register on DippChain first to get a Token ID
                    </span>
                  </div>
                ) : !isOwner ? (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                  }}>
                    <p style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                      Only the asset owner can register this as an IP Asset on Story Protocol.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowStoryModal(true)}
                    disabled={registering}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'white',
                      backgroundColor: '#8b5cf6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: registering ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {registering ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Registering...
                      </>
                    ) : (
                      <>
                        <Zap size={16} /> Register as IP Asset
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Status Card */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}>
              {asset.status === 'REGISTERED' ? (
                <CheckCircle size={20} color="#16a34a" />
              ) : asset.status === 'PROCESSING' ? (
                <Clock size={20} color="#d97706" />
              ) : (
                <AlertTriangle size={20} color="#737373" />
              )}
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: asset.status === 'REGISTERED' ? '#16a34a' : '#0a0a0a',
              }}>
                {asset.status}
              </span>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#737373' }}>Type</span>
                <span style={{ fontSize: '13px', color: '#0a0a0a' }}>{asset.assetType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#737373' }}>Size</span>
                <span style={{ fontSize: '13px', color: '#0a0a0a' }}>{formatFileSize(asset.fileSize)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#737373' }}>Created</span>
                <span style={{ fontSize: '13px', color: '#0a0a0a' }}>{formatDate(asset.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#737373' }}>Visibility</span>
                <span style={{ fontSize: '13px', color: '#0a0a0a' }}>{asset.visibility}</span>
              </div>
            </div>
          </div>

          {/* Watermark & Hashes */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '14px' }}>
              Identifiers
            </h3>
            
            {asset.watermarkId && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>Watermark ID</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px',
                }}>
                  <code style={{ flex: 1, fontSize: '12px', color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {asset.watermarkId}
                  </code>
                  <button
                    onClick={() => copyToClipboard(asset.watermarkId, 'Watermark ID')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                  >
                    {copied === 'Watermark ID' ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#737373" />}
                  </button>
                </div>
              </div>
            )}

            {asset.contentHash && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>Content Hash</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px',
                }}>
                  <code style={{ flex: 1, fontSize: '11px', color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {truncateAddress(asset.contentHash, 12, 8)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(asset.contentHash, 'Content Hash')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                  >
                    {copied === 'Content Hash' ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#737373" />}
                  </button>
                </div>
              </div>
            )}

            {asset.pinataCid && (
              <div>
                <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>IPFS CID</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px',
                }}>
                  <code style={{ flex: 1, fontSize: '11px', color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {truncateAddress(asset.pinataCid, 12, 8)}
                  </code>
                  <a
                    href={asset.pinataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: '2px' }}
                  >
                    <ExternalLink size={14} color="#737373" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '14px' }}>
              Actions
            </h3>
            
            <div style={{ display: 'grid', gap: '10px' }}>
              <Link href={`/dashboard/licenses/create?assetId=${asset.id}`}>
                <button style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: isOwner ? '#0a0a0a' : '#a3a3a3',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isOwner ? 'pointer' : 'not-allowed',
                  width: '100%',
                }}>
                  <Share2 size={16} /> Create License
                </button>
              </Link>
              
              <Link href={asset.fractionalization ? `/dashboard/fractions` : `/dashboard/fractions/create`}>
                <button 
                  disabled={!isOwner || !asset.storyProtocolId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#0a0a0a',
                    backgroundColor: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    cursor: (isOwner && asset.storyProtocolId) ? 'pointer' : 'not-allowed',
                    width: '100%',
                    opacity: (isOwner && asset.storyProtocolId) ? 1 : 0.5,
                  }}>
                  <BarChart3 size={16} /> {asset.fractionalization ? 'View Fractions' : 'Fractionalize'}
                </button>
              </Link>
              
              <button 
                onClick={() => toast.info('Sentinel scanning coming soon!')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#0a0a0a',
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  width: '100%',
                }}>
                <Shield size={16} /> Scan with Sentinel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Story Protocol Registration Modal */}
      {showStoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Zap size={24} color="#8b5cf6" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a' }}>
                Register on Story Protocol
              </h2>
            </div>

            <p style={{ fontSize: '14px', color: '#525252', marginBottom: '20px', lineHeight: 1.5 }}>
              Choose a license to attach to your IP Asset. This determines how others can use your work.
            </p>

            {/* Manual Token ID Input */}
            {!asset.dippchainTokenId && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px', display: 'block' }}>
                  Token ID {manualTokenId ? '' : '(will be auto-fetched)'}
                </label>
                <input
                  type="number"
                  value={manualTokenId}
                  onChange={(e) => setManualTokenId(e.target.value)}
                  placeholder="Enter token ID manually (optional)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#737373', marginTop: '6px' }}>
                  Leave empty to auto-fetch from blockchain, or enter the token ID from your registration transaction.
                </p>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px', display: 'block' }}>
                License Type
              </label>
              <div style={{ display: 'grid', gap: '8px' }}>
                {LICENSE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedLicense === option.value ? '#8b5cf6' : '#e5e5e5'}`,
                      backgroundColor: selectedLicense === option.value ? '#faf5ff' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="license"
                      value={option.value}
                      checked={selectedLicense === option.value}
                      onChange={(e) => setSelectedLicense(e.target.value)}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>
                        {option.label}
                      </div>
                      <div style={{ fontSize: '12px', color: '#737373', marginTop: '2px' }}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowStoryModal(false)}
                disabled={registering}
                style={{
                  flex: 1,
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
                Cancel
              </button>
              <button
                onClick={registerOnStoryProtocol}
                disabled={registering}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: registering ? '#a78bfa' : '#8b5cf6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: registering ? 'not-allowed' : 'pointer',
                }}
              >
                {registering ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 
                    Registering...
                  </>
                ) : (
                  'Register IP Asset'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach License Terms Modal */}
      {showLicenseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              Attach License Terms
            </h2>
            <p style={{ fontSize: '14px', color: '#737373', marginBottom: '24px' }}>
              Attaching license terms will create the IP Royalty Vault, enabling fractionalization and revenue distribution.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '12px' }}>
                Select License Type
              </label>
              <div style={{ display: 'grid', gap: '12px' }}>
                {LICENSE_OPTIONS.filter(opt => opt.value !== 'NONE').map((option) => (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedLicense === option.value ? '#8b5cf6' : '#e5e5e5'}`,
                      backgroundColor: selectedLicense === option.value ? '#faf5ff' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="attachLicense"
                      value={option.value}
                      checked={selectedLicense === option.value}
                      onChange={(e) => setSelectedLicense(e.target.value)}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>
                        {option.label}
                      </div>
                      <div style={{ fontSize: '12px', color: '#737373', marginTop: '2px' }}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowLicenseModal(false)}
                disabled={attachingLicense}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#525252',
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  cursor: attachingLicense ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAttachLicense}
                disabled={attachingLicense}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: attachingLicense ? '#a78bfa' : '#8b5cf6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: attachingLicense ? 'not-allowed' : 'pointer',
                }}
              >
                {attachingLicense ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 
                    Attaching...
                  </>
                ) : (
                  'Attach License'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

