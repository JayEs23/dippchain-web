// Sentinel Alerts Dashboard
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { AlertTriangle, CheckCircle, XCircle, Eye, ExternalLink, Shield } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getEmailSession } from '@/lib/authSession';

export default function SentinelPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'ALL', severity: 'ALL' });
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    high: 0,
    critical: 0,
  });

  useEffect(() => {
    if (isConnected || getEmailSession()) {
      fetchAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, filter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (isConnected && address) {
        params.append('walletAddress', address);
      } else {
        const email = getEmailSession();
        if (email) {
          params.append('email', email);
        } else {
          setLoading(false);
          return;
        }
      }

      if (filter.status !== 'ALL') params.append('status', filter.status);
      if (filter.severity !== 'ALL') params.append('severity', filter.severity);

      const response = await fetch(`/api/sentinel/alerts?${params}`);
      const data = await response.json();

      if (data.success) {
        setAlerts(data.alerts || []);
        calculateStats(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (alertsList) => {
    setStats({
      total: alertsList.length,
      new: alertsList.filter((a) => a.status === 'NEW').length,
      high: alertsList.filter((a) => a.severity === 'HIGH' || a.severity === 'CRITICAL').length,
      critical: alertsList.filter((a) => a.severity === 'CRITICAL').length,
    });
  };

  const handleAlertAction = async (alertId, action) => {
    try {
      const response = await fetch(`/api/sentinel/alerts/${alertId}/actions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Alert marked as ${action.toLowerCase()}`);
        fetchAlerts();
      } else {
        toast.error(data.error || 'Failed to update alert');
      }
    } catch (error) {
      console.error('Alert action error:', error);
      toast.error('Failed to update alert');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#ea580c';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW': return '#3b82f6';
      case 'CONFIRMED': return '#ea580c';
      case 'FALSE_POSITIVE': return '#10b981';
      case 'RESOLVED': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <DashboardLayout title="Sentinel Alerts">
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#737373', marginBottom: '8px' }}>Total Alerts</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>{stats.total}</div>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#737373', marginBottom: '8px' }}>New</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#3b82f6' }}>{stats.new}</div>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#737373', marginBottom: '8px' }}>High Priority</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#ea580c' }}>{stats.high}</div>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#737373', marginBottom: '8px' }}>Critical</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626' }}>{stats.critical}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        >
          <option value="ALL">All Status</option>
          <option value="NEW">New</option>
          <option value="REVIEWING">Reviewing</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="FALSE_POSITIVE">False Positive</option>
          <option value="TAKEDOWN_SENT">Takedown Sent</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <select
          value={filter.severity}
          onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        >
          <option value="ALL">All Severity</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Shield size={48} color="#9ca3af" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#737373' }}>No alerts found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '20px',
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: getSeverityColor(alert.severity) + '20',
                        color: getSeverityColor(alert.severity),
                      }}
                    >
                      {alert.severity}
                    </span>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: getStatusColor(alert.status) + '20',
                        color: getStatusColor(alert.status),
                      }}
                    >
                      {alert.status}
                    </span>
                    <span style={{ fontSize: '13px', color: '#737373' }}>{alert.platform}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '4px' }}>
                    {alert.asset?.title || 'Unknown Asset'}
                  </h3>
                  <a
                    href={alert.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '13px',
                      color: '#6366f1',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {alert.sourceUrl}
                    <ExternalLink size={12} />
                  </a>
                </div>
                {alert.screenshotUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={alert.screenshotUrl}
                    alt="Screenshot"
                    style={{
                      width: '120px',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid #e5e5e5',
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#737373' }}>Similarity:</span>
                  <span style={{ fontWeight: '500', marginLeft: '8px' }}>{parseFloat(alert.similarityScore).toFixed(1)}%</span>
                </div>
                <div>
                  <span style={{ color: '#737373' }}>Watermark:</span>
                  <span style={{ fontWeight: '500', marginLeft: '8px' }}>
                    {alert.watermarkFound ? '✓ Found' : '✗ Not Found'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#737373' }}>Detected:</span>
                  <span style={{ fontWeight: '500', marginLeft: '8px' }}>
                    {new Date(alert.detectedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {alert.status === 'NEW' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleAlertAction(alert.id, 'CONFIRMED')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'white',
                      backgroundColor: '#ea580c',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm Infringement
                  </button>
                  <button
                    onClick={() => handleAlertAction(alert.id, 'FALSE_POSITIVE')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#0a0a0a',
                      backgroundColor: 'white',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Mark False Positive
                  </button>
                  <button
                    onClick={() => handleAlertAction(alert.id, 'TAKEDOWN_SENT')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'white',
                      backgroundColor: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Send Takedown
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
