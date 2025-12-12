// Assets List Page
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AssetRecoveryModal from '@/components/recovery/AssetRecoveryModal';
import toast from 'react-hot-toast';
import { 
  Plus, Search, Filter, Image as ImageIcon, Video, Music, FileText, File,
  MoreVertical, Eye, Edit, Trash2, Shield, Share2, ExternalLink,
  CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { formatDate, formatFileSize, truncateText } from '@/lib/utils';

const FileTypeIcon = ({ type, size = 20 }) => {
  const props = { size, strokeWidth: 1.5, color: '#737373' };
  switch (type) {
    case 'IMAGE': return <ImageIcon {...props} />;
    case 'VIDEO': return <Video {...props} />;
    case 'AUDIO': return <Music {...props} />;
    case 'TEXT':
    case 'DOCUMENT': return <FileText {...props} />;
    default: return <File {...props} />;
  }
};

const StatusBadge = ({ status }) => {
  const styles = {
    DRAFT: { bg: '#f5f5f5', color: '#737373' },
    PROCESSING: { bg: '#fef3c7', color: '#d97706' },
    REGISTERED: { bg: '#dcfce7', color: '#16a34a' },
    ACTIVE: { bg: '#dbeafe', color: '#2563eb' },
    ARCHIVED: { bg: '#fee2e2', color: '#dc2626' },
  };
  
  const style = styles[status] || styles.DRAFT;
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontWeight: '500',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {status === 'REGISTERED' && <CheckCircle size={12} />}
      {status === 'PROCESSING' && <Clock size={12} />}
      {status}
    </span>
  );
};

export default function AssetsPage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [recoveryAsset, setRecoveryAsset] = useState(null);

  const fetchAssets = useCallback(async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({ userId: address });
      if (filterType) params.append('assetType', filterType);
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await fetch(`/api/assets?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAssets(data.assets || []);
      } else {
        console.error('Failed to fetch assets:', data);
        toast.error('Failed to load assets');
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error('Failed to load assets. Please try again.');
      }
      setAssets([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [address, filterType, filterStatus]);

  useEffect(() => {
    if (isConnected && address) {
      fetchAssets();
    }
  }, [isConnected, address, fetchAssets]);

  const handleCleanupDrafts = async () => {
    const draftCount = assets.filter(a => a.status === 'DRAFT').length;
    
    if (draftCount === 0) {
      toast.error('No draft assets to clean up');
      return;
    }

    if (!confirm(`Are you sure you want to delete all ${draftCount} draft assets? This cannot be undone.`)) {
      return;
    }

    setCleaningUp(true);
    const toastId = toast.loading('Cleaning up draft assets...');

    try {
      const response = await fetch('/api/assets/cleanup-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: address,
          confirm: 'DELETE_ALL_DRAFTS',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.error?.details || errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        toast.success(`Deleted ${data.deleted} draft assets`, { id: toastId });
        // Refresh assets list
        fetchAssets();
      } else {
        // Handle error object structure: { error: { message, code, details } }
        const errorMessage = data.error?.message || data.error?.details || data.error || 'Cleanup failed';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Network error. Please check your connection.', { id: toastId });
      } else {
        toast.error(error.message || 'Failed to clean up drafts', { id: toastId });
      }
    } finally {
      setCleaningUp(false);
    }
  };

  const handleDelete = async (assetId) => {
    if (!confirm('Are you sure you want to archive this asset? This cannot be undone.')) return;
    
    const toastId = toast.loading('Deleting asset...');
    
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.error?.details || errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.success !== false) {
        setAssets(prev => prev.filter(a => a.id !== assetId));
        toast.success('Asset deleted successfully', { id: toastId });
      } else {
        const errorMessage = data.error?.message || data.error?.details || data.error || 'Failed to delete asset';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Network error. Please check your connection.', { id: toastId });
      } else {
        toast.error(error.message || 'Failed to delete asset', { id: toastId });
      }
    } finally {
      setActiveMenu(null);
    }
  };

  const handleRetryRegistration = (asset) => {
    // Open recovery modal to diagnose and fix the asset
    setRecoveryAsset(asset);
    setActiveMenu(null);
  };

  const filteredAssets = assets.filter(asset =>
    asset.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="My Assets">
      {/* Header Actions */}
      <div className="assets-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div className="assets-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
          {/* Search */}
          <div style={{
            position: 'relative',
            flex: 1,
            maxWidth: '360px',
          }}>
            <Search size={18} color="#737373" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
            <input
              type="text"
              placeholder="Search assets by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                fontSize: '14px',
                border: '1px solid #e5e5e5',
                borderRadius: '10px',
                outline: 'none',
                transition: 'all 0.2s ease',
                backgroundColor: 'white',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0a0a0a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 10, 10, 0.05)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '12px 14px',
              fontSize: '14px',
              border: '1px solid #e5e5e5',
              borderRadius: '10px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#0a0a0a';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e5e5';
            }}
          >
            <option value="">All Types</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Videos</option>
            <option value="AUDIO">Audio</option>
            <option value="DOCUMENT">Documents</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '12px 14px',
              fontSize: '14px',
              border: '1px solid #e5e5e5',
              borderRadius: '10px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#0a0a0a';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e5e5';
            }}
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="REGISTERED">Registered</option>
            <option value="ACTIVE">Active</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {assets.filter(a => a.status === 'DRAFT').length > 0 && (
            <button
              onClick={handleCleanupDrafts}
              disabled={cleaningUp}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#dc2626',
                backgroundColor: 'white',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                cursor: cleaningUp ? 'not-allowed' : 'pointer',
                opacity: cleaningUp ? 0.6 : 1,
              }}
            >
              <Trash2 size={18} />
              Clean Up Drafts ({assets.filter(a => a.status === 'DRAFT').length})
            </button>
          )}
          
          <Link href="/dashboard/upload">
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: '#0a0a0a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}>
              <Plus size={18} />
              Upload Asset
            </button>
          </Link>
        </div>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#737373' }}>
          Loading assets...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ImageIcon size={28} color="#737373" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
            No assets yet
          </h3>
          <p style={{ fontSize: '14px', color: '#737373', marginBottom: '20px' }}>
            Upload your first creative asset to get started
          </p>
          <Link href="/dashboard/upload">
            <button style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: '#0a0a0a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}>
              <Plus size={18} />
              Upload Asset
            </button>
          </Link>
        </div>
      ) : (
        <div className="assets-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#d4d4d4';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Thumbnail */}
              <div style={{
                height: '160px',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                {asset.thumbnailUrl ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <Image
                      src={asset.thumbnailUrl}
                      alt={asset.title || 'Asset thumbnail'}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <FileTypeIcon type={asset.assetType} size={48} />
                )}
                
                {/* Status Badge Overlay */}
                <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                  <StatusBadge status={asset.status} />
                </div>
                
                {/* Menu Button */}
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === asset.id ? null : asset.id);
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <MoreVertical size={16} color="#737373" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {activeMenu === asset.id && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        minWidth: '160px',
                        zIndex: 100,
                      }}>
                      <Link href={`/dashboard/assets/${asset.id}`}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '13px',
                            color: '#0a0a0a',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <Eye size={14} /> View Details
                        </button>
                      </Link>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(null);
                          // TODO: Implement Sentinel scan
                          toast.info('Sentinel scan feature coming soon');
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '13px',
                          color: '#0a0a0a',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <Shield size={14} /> Scan with Sentinel
                      </button>
                      {/* Show Retry Registration for DRAFT assets */}
                      {asset.status === 'DRAFT' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetryRegistration(asset);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '13px',
                            color: '#2563eb',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <ExternalLink size={14} /> Complete Registration
                        </button>
                      )}
                      
                      {/* Only show Create License for registered assets */}
                      {asset.status === 'REGISTERED' && (
                        <Link href={`/dashboard/licenses/create?assetId=${asset.id}`}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenu(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '13px',
                              color: '#0a0a0a',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <Share2 size={14} /> Create License
                          </button>
                        </Link>
                      )}
                      
                      <div style={{ height: '1px', backgroundColor: '#e5e5e5', margin: '4px 0' }} />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(asset.id);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '13px',
                          color: '#dc2626',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <Trash2 size={14} /> Archive
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px' }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#0a0a0a',
                  marginBottom: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.4',
                }}>
                  {asset.title}
                </h3>
                
                <p style={{
                  fontSize: '12px',
                  color: '#737373',
                  marginBottom: '16px',
                  lineHeight: '1.5',
                }}>
                  {asset.assetType} · {formatFileSize(asset.fileSize)} · {formatDate(asset.createdAt)}
                </p>

                {/* Quick Stats */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f5f5f5',
                }}>
                  <div style={{ fontSize: '12px', color: '#525252' }}>
                    <span style={{ fontWeight: '600' }}>{asset.licenses?.length || 0}</span> licenses
                  </div>
                  <div style={{ fontSize: '12px', color: '#525252' }}>
                    <span style={{ fontWeight: '600' }}>{asset._count?.sentinelAlerts || 0}</span> alerts
                  </div>
                  {asset.fractionalization && (
                    <div style={{ fontSize: '12px', color: '#2563eb' }}>
                      ${asset.fractionalization.tokenSymbol}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close menu */}
      {activeMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setActiveMenu(null)}
        />
      )}

      {/* Recovery Modal */}
      {recoveryAsset && (
        <AssetRecoveryModal
          asset={recoveryAsset}
          onClose={() => setRecoveryAsset(null)}
          onRecoveryComplete={() => {
            setRecoveryAsset(null);
            fetchAssets(); // Refresh assets list
          }}
        />
      )}

      <style jsx>{`
        @media (max-width: 640px) {
          :global(.assets-header) {
            flex-direction: column;
            align-items: stretch !important;
          }
          
          :global(.assets-filters) {
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          :global(.assets-filters) select {
            width: 100%;
          }
          
          :global(.assets-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

