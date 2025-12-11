// Licenses Page
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Plus, FileCheck, Clock, CheckCircle, XCircle, 
  ExternalLink, Image, Video, Music, FileText
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: { bg: '#fef3c7', color: '#d97706', icon: Clock },
    ACTIVE: { bg: '#dcfce7', color: '#16a34a', icon: CheckCircle },
    EXPIRED: { bg: '#fee2e2', color: '#dc2626', icon: XCircle },
    REVOKED: { bg: '#f5f5f5', color: '#737373', icon: XCircle },
  };
  
  const style = styles[status] || styles.PENDING;
  const Icon = style.icon;
  
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
      <Icon size={12} />
      {status}
    </span>
  );
};

const AssetIcon = ({ type, size = 16 }) => {
  const props = { size, color: '#737373' };
  switch (type) {
    case 'IMAGE': return <Image {...props} />;
    case 'VIDEO': return <Video {...props} />;
    case 'AUDIO': return <Music {...props} />;
    default: return <FileText {...props} />;
  }
};

export default function LicensesPage() {
  const { address, isConnected } = useAppKitAccount();
  
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('created'); // 'created' or 'received'

  useEffect(() => {
    if (isConnected && address) {
      fetchLicenses();
    }
  }, [isConnected, address, activeTab]);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const role = activeTab === 'created' ? 'creator' : 'licensee';
      const response = await fetch(`/api/licenses?userId=${address}&role=${role}`);
      const data = await response.json();
      
      if (data.success) {
        setLicenses(data.licenses);
      }
    } catch (error) {
      console.error('Failed to fetch licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Licenses">
      {/* Tabs & Actions */}
      <div className="licenses-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f5f5f5', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('created')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'created' ? '#0a0a0a' : '#737373',
              backgroundColor: activeTab === 'created' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'created' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            Created by Me
          </button>
          <button
            onClick={() => setActiveTab('received')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'received' ? '#0a0a0a' : '#737373',
              backgroundColor: activeTab === 'received' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'received' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            Received
          </button>
        </div>

        <Link href="/dashboard/licenses/create">
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
            Create License
          </button>
        </Link>
      </div>

      {/* Licenses Table */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#737373' }}>
            Loading licenses...
          </div>
        ) : licenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
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
              <FileCheck size={28} color="#737373" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              No licenses yet
            </h3>
            <p style={{ fontSize: '14px', color: '#737373', marginBottom: '20px' }}>
              {activeTab === 'created' 
                ? 'Create your first license for your assets'
                : 'You haven\'t received any licenses yet'}
            </p>
            {activeTab === 'created' && (
              <Link href="/dashboard/licenses/create">
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
                  Create License
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div>
            <table className="licenses-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                    Asset
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                    Type
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                    Price
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                    Created
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                    
                  </th>
                </tr>
              </thead>
              <tbody>
              {licenses.map((license) => (
                <tr key={license.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {license.asset?.thumbnailUrl ? (
                          <img 
                            src={license.asset.thumbnailUrl} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <AssetIcon type={license.asset?.assetType} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>
                          {license.asset?.title || 'Unknown Asset'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#737373' }}>
                          {license.template?.name || license.licenseType}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      backgroundColor: license.isExclusive ? '#fef3c7' : '#f5f5f5',
                      color: license.isExclusive ? '#d97706' : '#525252',
                      borderRadius: '4px',
                    }}>
                      {license.isExclusive ? 'Exclusive' : license.licenseType}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#0a0a0a' }}>
                    {license.price ? formatCurrency(license.price, license.currency) : 'Free'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={license.status} />
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#737373' }}>
                    {formatDate(license.createdAt)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link href={`/dashboard/licenses/${license.id}`}>
                      <button style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        color: '#525252',
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}>
                        View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="licenses-cards">
              {licenses.map((license) => (
                <div key={license.id} style={{
                  padding: '16px',
                  borderBottom: '1px solid #f5f5f5',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {license.asset?.thumbnailUrl ? (
                        <img 
                          src={license.asset.thumbnailUrl} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <AssetIcon type={license.asset?.assetType} size={20} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '4px' }}>
                        {license.asset?.title || 'Unknown Asset'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#737373', marginBottom: '8px' }}>
                        {license.template?.name || license.licenseType}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <StatusBadge status={license.status} />
                        <span style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          backgroundColor: license.isExclusive ? '#fef3c7' : '#f5f5f5',
                          color: license.isExclusive ? '#d97706' : '#525252',
                          borderRadius: '4px',
                        }}>
                          {license.isExclusive ? 'Exclusive' : license.licenseType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f5f5f5' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a' }}>
                        {license.price ? formatCurrency(license.price, license.currency) : 'Free'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#737373' }}>
                        {formatDate(license.createdAt)}
                      </div>
                    </div>
                    <Link href={`/dashboard/licenses/${license.id}`}>
                      <button style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#0a0a0a',
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}>
                        View
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .licenses-cards {
          display: none;
        }

        @media (max-width: 768px) {
          .licenses-table {
            display: none;
          }

          .licenses-cards {
            display: block;
          }

          :global(.licenses-header) {
            flex-direction: column;
            align-items: stretch !important;
            gap: 12px;
          }

          :global(.licenses-header) > div:first-child {
            width: 100%;
            justify-content: center;
          }

          :global(.licenses-header) button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

