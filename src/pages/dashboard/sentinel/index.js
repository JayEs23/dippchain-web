// Sentinel Detection Page
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Shield, AlertTriangle, ExternalLink, Eye, Search,
  CheckCircle, Clock, XCircle, Play
} from 'lucide-react';
import { formatRelativeTime, formatPercentage } from '@/lib/utils';

const SeverityBadge = ({ severity }) => {
  const styles = {
    LOW: { bg: '#f5f5f5', color: '#737373' },
    MEDIUM: { bg: '#fef3c7', color: '#d97706' },
    HIGH: { bg: '#fee2e2', color: '#dc2626' },
    CRITICAL: { bg: '#7f1d1d', color: 'white' },
  };
  
  const style = styles[severity] || styles.MEDIUM;
  
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: '600',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {severity}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    NEW: { bg: '#dbeafe', color: '#2563eb' },
    REVIEWING: { bg: '#fef3c7', color: '#d97706' },
    CONFIRMED: { bg: '#fee2e2', color: '#dc2626' },
    FALSE_POSITIVE: { bg: '#f5f5f5', color: '#737373' },
    TAKEDOWN_SENT: { bg: '#e9d5ff', color: '#9333ea' },
    RESOLVED: { bg: '#dcfce7', color: '#16a34a' },
  };
  
  const style = styles[status] || styles.NEW;
  
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: '500',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function SentinelPage() {
  const { address, isConnected } = useAppKitAccount();
  
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  useEffect(() => {
    if (isConnected && address) {
      fetchAlerts();
    }
  }, [isConnected, address, filterStatus, filterSeverity]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ userId: address });
      if (filterStatus) params.append('status', filterStatus);
      if (filterSeverity) params.append('severity', filterSeverity);
      
      const response = await fetch(`/api/sentinel/alerts?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const stats = {
    total: alerts.length,
    new: alerts.filter(a => a.status === 'NEW').length,
    confirmed: alerts.filter(a => a.status === 'CONFIRMED').length,
    resolved: alerts.filter(a => a.status === 'RESOLVED').length,
  };

  return (
    <DashboardLayout title="Sentinel Detection">
      {/* Stats Row */}
      <div className="sentinel-stats" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '13px', color: '#737373', marginBottom: '8px' }}>Total Alerts</div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#0a0a0a' }}>{stats.total}</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '13px', color: '#737373', marginBottom: '8px' }}>New Alerts</div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#2563eb' }}>{stats.new}</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '13px', color: '#737373', marginBottom: '8px' }}>Confirmed</div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#dc2626' }}>{stats.confirmed}</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '13px', color: '#737373', marginBottom: '8px' }}>Resolved</div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#16a34a' }}>{stats.resolved}</div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="sentinel-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div className="sentinel-filters" style={{ display: 'flex', gap: '12px' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              backgroundColor: 'white',
            }}
          >
            <option value="">All Status</option>
            <option value="NEW">New</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              backgroundColor: 'white',
            }}
          >
            <option value="">All Severity</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

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
          <Play size={16} />
          Run New Scan
        </button>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#737373' }}>
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
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
            backgroundColor: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={28} color="#16a34a" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
            All Clear!
          </h3>
          <p style={{ fontSize: '14px', color: '#737373' }}>
            No potential infringements detected. Your assets are protected.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table className="sentinel-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Asset
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Platform
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Match
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Severity
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Detected
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  
                </th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={16} color={alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? '#dc2626' : '#d97706'} />
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>
                        {alert.asset?.title || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#525252' }}>
                    {alert.platform}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '60px',
                        height: '6px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${alert.similarityScore}%`,
                          height: '100%',
                          backgroundColor: alert.similarityScore >= 90 ? '#dc2626' : alert.similarityScore >= 70 ? '#d97706' : '#16a34a',
                        }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a' }}>
                        {alert.similarityScore}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <SeverityBadge severity={alert.severity} />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={alert.status} />
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#737373' }}>
                    {formatRelativeTime(alert.detectedAt)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <a
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px',
                          color: '#737373',
                          border: '1px solid #e5e5e5',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        color: '#525252',
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}>
                        Review
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="sentinel-cards">
            {alerts.map((alert) => (
              <div key={alert.id} style={{
                padding: '16px',
                borderBottom: '1px solid #f5f5f5',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <AlertTriangle size={20} color={alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? '#dc2626' : '#d97706'} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '4px' }}>
                      {alert.asset?.title || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#737373', marginBottom: '8px' }}>
                      {alert.platform} · {formatRelativeTime(alert.detectedAt)}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <SeverityBadge severity={alert.severity} />
                      <StatusBadge status={alert.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        flex: 1,
                        height: '6px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${alert.similarityScore}%`,
                          height: '100%',
                          backgroundColor: alert.similarityScore >= 90 ? '#dc2626' : alert.similarityScore >= 70 ? '#d97706' : '#16a34a',
                        }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0a' }}>
                        {alert.similarityScore}%
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f5f5f5' }}>
                  <a
                    href={alert.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      textAlign: 'center',
                      color: '#525252',
                      backgroundColor: 'white',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <ExternalLink size={14} /> View Source
                  </a>
                  <button style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#0a0a0a',
                    backgroundColor: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}>
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .sentinel-cards {
          display: none;
        }

        @media (max-width: 1024px) {
          .sentinel-stats {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 768px) {
          .sentinel-table {
            display: none;
          }

          .sentinel-cards {
            display: block;
          }

          .sentinel-header {
            flex-direction: column;
            align-items: stretch !important;
          }

          .sentinel-filters {
            flex-direction: column !important;
          }

          .sentinel-filters select {
            width: 100%;
          }

          .sentinel-header button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .sentinel-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

