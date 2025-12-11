import { useState, useEffect, useCallback } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import { FolderOpen, FileCheck, Shield, Wallet, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { address, isConnected } = useAppKitAccount();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeLicenses: 0,
    sentinelAlerts: 0,
    totalRevenue: '0',
    revenueChange: '0',
  });
  const [recentAssets, setRecentAssets] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/stats?userId=${address}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setRecentAssets(data.recentAssets);
        setRecentAlerts(data.recentAlerts);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchDashboardData();
    }
  }, [isConnected, address, fetchDashboardData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const statsCards = [
    { 
      title: 'Total Assets', 
      value: loading ? '...' : stats.totalAssets.toString(), 
      change: null, 
      icon: FolderOpen 
    },
    { 
      title: 'Active Licenses', 
      value: loading ? '...' : stats.activeLicenses.toString(), 
      change: null, 
      icon: FileCheck 
    },
    { 
      title: 'Sentinel Alerts', 
      value: loading ? '...' : stats.sentinelAlerts.toString(), 
      change: null, 
      icon: Shield 
    },
    { 
      title: 'Revenue (IP)', 
      value: loading ? '...' : stats.totalRevenue, 
      change: stats.revenueChange !== '0' ? `${stats.revenueChange}%` : null, 
      icon: Wallet 
    },
  ];

  return (
    <DashboardLayout title="Overview">
      {/* Stats Grid */}
      <div className="stats-grid">
        {statsCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-content">
        {/* Recent Assets */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Assets</h2>
            <Link href="/dashboard/assets" className="view-all-link">View all →</Link>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="empty-state">Loading...</div>
            ) : recentAssets.length === 0 ? (
              <div className="empty-state">
                <p>No assets yet</p>
                <Link href="/dashboard/upload" className="text-link">Upload your first asset →</Link>
              </div>
            ) : (
              recentAssets.map((asset, i) => (
                <div 
                  key={asset.id} 
                  className="list-item"
                  style={{ 
                    borderBottom: i < recentAssets.length - 1 ? '1px solid #f5f5f5' : 'none' 
                  }}
                >
                  <div>
                    <div className="item-title">{asset.title}</div>
                    <div className="item-subtitle">
                      {asset.assetType} · {formatDate(asset.createdAt)}
                    </div>
                  </div>
                  <span className={`status-badge status-${asset.status.toLowerCase()}`}>
                    {asset.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="card">
          <div className="card-header">
            <h2>Sentinel Alerts</h2>
            <Link href="/dashboard/sentinel" className="view-all-link">View all →</Link>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="empty-state">Loading...</div>
            ) : recentAlerts.length === 0 ? (
              <div className="empty-state">
                <p>No alerts detected</p>
                <span className="text-muted">Your content is being monitored</span>
              </div>
            ) : (
              recentAlerts.map((alert, i) => (
                <div 
                  key={alert.id} 
                  className="list-item"
                  style={{ 
                    borderBottom: i < recentAlerts.length - 1 ? '1px solid #f5f5f5' : 'none' 
                  }}
                >
                  <div className="alert-content">
                    <AlertTriangle 
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        color: alert.severity === 'HIGH' ? '#dc2626' : '#d97706',
                        flexShrink: 0
                      }} 
                    />
                    <div>
                      <div className="item-title">{alert.asset?.title || 'Unknown Asset'}</div>
                      <div className="item-subtitle">
                        {alert.platform} · {alert.similarityScore}% match
                      </div>
                    </div>
                  </div>
                  <span className={`severity-badge severity-${alert.severity.toLowerCase()}`}>
                    {alert.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .dashboard-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 768px) {
          .dashboard-content {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .card {
          background-color: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          overflow: hidden;
        }

        .card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .card-header h2 {
          font-size: 14px;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0;
        }

        .view-all-link {
          font-size: 13px;
          color: #525252;
          text-decoration: none;
        }

        .view-all-link:hover {
          color: #0a0a0a;
        }

        .card-body {
          min-height: 100px;
        }

        .list-item {
          padding: 14px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .item-title {
          font-size: 14px;
          font-weight: 500;
          color: #0a0a0a;
          word-break: break-word;
        }

        .item-subtitle {
          font-size: 12px;
          color: #737373;
          margin-top: 2px;
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status-registered {
          background-color: #dcfce7;
          color: #16a34a;
        }

        .status-processing {
          background-color: #fef3c7;
          color: #d97706;
        }

        .status-pending {
          background-color: #e0e7ff;
          color: #4f46e5;
        }

        .severity-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .severity-high {
          background-color: #fef2f2;
          color: #dc2626;
        }

        .severity-medium {
          background-color: #fef3c7;
          color: #d97706;
        }

        .severity-low {
          background-color: #f0fdf4;
          color: #16a34a;
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #737373;
        }

        .empty-state p {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 500;
          color: #0a0a0a;
        }

        .text-link {
          font-size: 13px;
          color: #0a0a0a;
          text-decoration: none;
          font-weight: 500;
        }

        .text-link:hover {
          text-decoration: underline;
        }

        .text-muted {
          font-size: 12px;
          color: #a3a3a3;
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .card-header {
            padding: 12px 16px;
          }

          .list-item {
            padding: 12px 16px;
            flex-direction: column;
            align-items: flex-start;
          }

          .alert-content {
            width: 100%;
          }

          .status-badge,
          .severity-badge {
            align-self: flex-start;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
