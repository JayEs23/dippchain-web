// Fractionalization Page
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Plus, PieChart, TrendingUp, Users, ExternalLink,
  Image, Video, Music, FileText, CheckCircle, Clock
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

const AssetIcon = ({ type, size = 16 }) => {
  const props = { size, color: '#737373' };
  switch (type) {
    case 'IMAGE': return <Image {...props} />;
    case 'VIDEO': return <Video {...props} />;
    case 'AUDIO': return <Music {...props} />;
    default: return <FileText {...props} />;
  }
};

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: { bg: '#fef3c7', color: '#d97706' },
    DEPLOYED: { bg: '#dbeafe', color: '#2563eb' },
    TRADING: { bg: '#dcfce7', color: '#16a34a' },
    PAUSED: { bg: '#fee2e2', color: '#dc2626' },
    CLOSED: { bg: '#f5f5f5', color: '#737373' },
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

export default function FractionsPage() {
  const { address, isConnected } = useAppKitAccount();
  
  const [fractions, setFractions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      fetchFractions();
    }
  }, [isConnected, address]);

  const fetchFractions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fractions?userId=${address}`);
      const data = await response.json();
      
      if (data.success) {
        setFractions(data.fractionalizations);
      }
    } catch (error) {
      console.error('Failed to fetch fractions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate user's holdings for each fraction
  const getUserHolding = (fraction) => {
    const holding = fraction.holders?.find(h => h.userId === address);
    return holding ? holding.percentageOwned : 0;
  };

  return (
    <DashboardLayout title="Fractionalization">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <p style={{ fontSize: '14px', color: '#737373' }}>
          Turn your assets into tradeable fractional tokens
        </p>

        <Link href="/dashboard/fractions/create">
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
            Fractionalize Asset
          </button>
        </Link>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
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
            <PieChart size={18} color="#737373" />
            <span style={{ fontSize: '13px', color: '#737373' }}>Total Fractionalized</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>
            {fractions.length}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <TrendingUp size={18} color="#737373" />
            <span style={{ fontSize: '13px', color: '#737373' }}>Active Trading</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>
            {fractions.filter(f => f.status === 'TRADING').length}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Users size={18} color="#737373" />
            <span style={{ fontSize: '13px', color: '#737373' }}>Holdings</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>
            {fractions.filter(f => getUserHolding(f) > 0).length}
          </div>
        </div>
      </div>

      {/* Fractions Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#737373' }}>
          Loading fractionalizations...
        </div>
      ) : fractions.length === 0 ? (
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
            <PieChart size={28} color="#737373" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
            No fractionalized assets
          </h3>
          <p style={{ fontSize: '14px', color: '#737373', marginBottom: '20px' }}>
            Turn your registered assets into tradeable fractional tokens
          </p>
          <Link href="/dashboard/fractions/create">
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
              Fractionalize Asset
            </button>
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {fractions.map((fraction) => {
            const userHolding = getUserHolding(fraction);
            
            return (
              <div
                key={fraction.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                {/* Header with Asset */}
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid #f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {fraction.asset?.thumbnailUrl ? (
                      <img 
                        src={fraction.asset.thumbnailUrl} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <AssetIcon type={fraction.asset?.assetType} size={24} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a' }}>
                        ${fraction.tokenSymbol}
                      </span>
                      <StatusBadge status={fraction.status} />
                    </div>
                    <div style={{ fontSize: '13px', color: '#737373' }}>
                      {fraction.asset?.title}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>Total Supply</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                        {formatNumber(fraction.totalSupply)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>Price/Token</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                        {formatCurrency(fraction.pricePerToken, fraction.currency)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>Available</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                        {formatNumber(fraction.availableSupply)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>Royalty</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                        {fraction.royaltyPercentage}%
                      </div>
                    </div>
                  </div>

                  {/* Your Holding */}
                  {userHolding > 0 && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '8px',
                      marginBottom: '16px',
                    }}>
                      <div style={{ fontSize: '12px', color: '#16a34a', marginBottom: '4px' }}>Your Holding</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#16a34a' }}>
                        {userHolding.toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/dashboard/fractions/${fraction.id}`} style={{ flex: 1 }}>
                      <button style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#0a0a0a',
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}>
                        View Details
                      </button>
                    </Link>
                    {fraction.status === 'TRADING' && (
                      <Link href={`/dashboard/marketplace?fraction=${fraction.id}`} style={{ flex: 1 }}>
                        <button style={{
                          width: '100%',
                          padding: '10px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: 'white',
                          backgroundColor: '#0a0a0a',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}>
                          Trade
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

