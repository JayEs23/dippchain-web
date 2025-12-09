// Revenue Page
import { useState, useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Wallet, TrendingUp, Clock, CheckCircle, 
  ArrowDownRight, ArrowUpRight, Download
} from 'lucide-react';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

const SourceBadge = ({ source }) => {
  const styles = {
    LICENSE_SALE: { bg: '#dbeafe', color: '#2563eb' },
    FRACTION_SALE: { bg: '#e9d5ff', color: '#9333ea' },
    ROYALTY: { bg: '#dcfce7', color: '#16a34a' },
    SECONDARY_SALE: { bg: '#fef3c7', color: '#d97706' },
  };
  
  const style = styles[source] || styles.ROYALTY;
  
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: '500',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {source.replace('_', ' ')}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: { bg: '#f5f5f5', color: '#737373' },
    CLAIMABLE: { bg: '#dcfce7', color: '#16a34a' },
    CLAIMED: { bg: '#dbeafe', color: '#2563eb' },
    FAILED: { bg: '#fee2e2', color: '#dc2626' },
  };
  
  const style = styles[status] || styles.PENDING;
  
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: '500',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {status}
    </span>
  );
};

export default function RevenuePage() {
  const { address, isConnected } = useAppKitAccount();
  
  const [revenues, setRevenues] = useState([]);
  const [stats, setStats] = useState({ totalEarned: 0, claimable: 0, claimed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState('');

  useEffect(() => {
    if (isConnected && address) {
      fetchRevenue();
    }
  }, [isConnected, address, filterSource]);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ userId: address });
      if (filterSource) params.append('source', filterSource);
      
      const response = await fetch(`/api/revenue?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setRevenues(data.revenues);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (revenueId) => {
    // TODO: Implement claim functionality with wallet
    alert('Claim functionality coming soon!');
  };

  return (
    <DashboardLayout title="Revenue">
      {/* Stats Row */}
      <div style={{
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <TrendingUp size={18} color="#737373" />
            <span style={{ fontSize: '13px', color: '#737373' }}>Total Earned</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>
            {formatCurrency(stats.totalEarned)}
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Wallet size={18} color="#16a34a" />
            <span style={{ fontSize: '13px', color: '#16a34a' }}>Claimable</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#16a34a' }}>
            {formatCurrency(stats.claimable)}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <CheckCircle size={18} color="#737373" />
            <span style={{ fontSize: '13px', color: '#737373' }}>Claimed</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>
            {formatCurrency(stats.claimed)}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Clock size={18} color="#737373" />
            <span style={{ fontSize: '13px', color: '#737373' }}>Pending</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>
            {formatCurrency(stats.pending)}
          </div>
        </div>
      </div>

      {/* Claim Button */}
      {stats.claimable > 0 && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '4px' }}>
              You have claimable revenue!
            </h3>
            <p style={{ fontSize: '14px', color: '#737373' }}>
              Claim your {formatCurrency(stats.claimable)} to your wallet
            </p>
          </div>
          <button
            onClick={() => handleClaim('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: '#16a34a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <Download size={18} />
            Claim All
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '24px' }}>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          style={{
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            backgroundColor: 'white',
          }}
        >
          <option value="">All Sources</option>
          <option value="LICENSE_SALE">License Sales</option>
          <option value="FRACTION_SALE">Fraction Sales</option>
          <option value="ROYALTY">Royalties</option>
          <option value="SECONDARY_SALE">Secondary Sales</option>
        </select>
      </div>

      {/* Revenue List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#737373' }}>
          Loading revenue...
        </div>
      ) : revenues.length === 0 ? (
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
            <Wallet size={28} color="#737373" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
            No revenue yet
          </h3>
          <p style={{ fontSize: '14px', color: '#737373' }}>
            Start earning by licensing or fractionalizing your assets
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Source
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Asset/Token
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Amount
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#525252' }}>
                  
                </th>
              </tr>
            </thead>
            <tbody>
              {revenues.map((revenue) => (
                <tr key={revenue.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <SourceBadge source={revenue.source} />
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#0a0a0a' }}>
                    {revenue.asset?.title || revenue.fractionalization?.tokenSymbol || '-'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ArrowUpRight size={14} color="#16a34a" />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
                        {formatCurrency(revenue.amount, revenue.currency)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={revenue.status} />
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#737373' }}>
                    {formatRelativeTime(revenue.createdAt)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {revenue.status === 'CLAIMABLE' && (
                      <button
                        onClick={() => handleClaim(revenue.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: 'white',
                          backgroundColor: '#16a34a',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Claim
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}

