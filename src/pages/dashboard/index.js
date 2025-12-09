import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import { FolderOpen, FileCheck, Shield, Wallet, AlertTriangle, TrendingUp } from 'lucide-react';

const stats = [
  { title: 'Total Assets', value: '24', change: '+3', icon: FolderOpen },
  { title: 'Active Licenses', value: '12', change: '+2', icon: FileCheck },
  { title: 'Sentinel Alerts', value: '3', change: '-1', icon: Shield },
  { title: 'Revenue (IP)', value: '2.45', change: '+0.8', icon: Wallet },
];

const recentAssets = [
  { id: 1, name: 'Summer Photo Collection', type: 'IMAGE', status: 'REGISTERED', date: 'Dec 7, 2024' },
  { id: 2, name: 'Podcast Episode 45', type: 'AUDIO', status: 'PROCESSING', date: 'Dec 6, 2024' },
  { id: 3, name: 'Brand Logo Design', type: 'IMAGE', status: 'REGISTERED', date: 'Dec 5, 2024' },
];

const recentAlerts = [
  { id: 1, asset: 'Summer Photo Collection', platform: 'Instagram', similarity: '94%', severity: 'HIGH' },
  { id: 2, asset: 'Brand Logo Design', platform: 'Etsy', similarity: '87%', severity: 'MEDIUM' },
];

export default function Dashboard() {
  return (
    <DashboardLayout title="Overview">
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recent Assets */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: '8px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a' }}>Recent Assets</h2>
            <a href="/dashboard/assets" style={{ fontSize: '13px', color: '#525252', textDecoration: 'none' }}>View all →</a>
          </div>
          <div>
            {recentAssets.map((asset, i) => (
              <div key={asset.id} style={{ 
                padding: '14px 20px', 
                borderBottom: i < recentAssets.length - 1 ? '1px solid #f5f5f5' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>{asset.name}</div>
                  <div style={{ fontSize: '12px', color: '#737373', marginTop: '2px' }}>{asset.type} · {asset.date}</div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: asset.status === 'REGISTERED' ? '#dcfce7' : '#fef3c7',
                  color: asset.status === 'REGISTERED' ? '#16a34a' : '#d97706'
                }}>
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e5e5', borderRadius: '8px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a' }}>Sentinel Alerts</h2>
            <a href="/dashboard/sentinel" style={{ fontSize: '13px', color: '#525252', textDecoration: 'none' }}>View all →</a>
          </div>
          <div>
            {recentAlerts.map((alert, i) => (
              <div key={alert.id} style={{ 
                padding: '14px 20px', 
                borderBottom: i < recentAlerts.length - 1 ? '1px solid #f5f5f5' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle style={{ width: '16px', height: '16px', color: alert.severity === 'HIGH' ? '#dc2626' : '#d97706' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>{alert.asset}</div>
                    <div style={{ fontSize: '12px', color: '#737373', marginTop: '2px' }}>{alert.platform} · {alert.similarity} match</div>
                  </div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: alert.severity === 'HIGH' ? '#fef2f2' : '#fef3c7',
                  color: alert.severity === 'HIGH' ? '#dc2626' : '#d97706'
                }}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

