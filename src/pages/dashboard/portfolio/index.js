// Portfolio Page - Shows user's purchased tokens from primary/secondary markets
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { 
  Wallet, TrendingUp, Package, DollarSign, 
  Image as ImageIcon, Video, Music, FileText,
  ArrowUpRight, Plus, ExternalLink
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

const AssetTypeIcon = ({ type, size = 20 }) => {
  const props = { size, color: '#737373' };
  switch (type) {
    case 'IMAGE': return <ImageIcon {...props} />;
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

export default function PortfolioPage() {
  const { address, isConnected } = useAppKitAccount();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [listAmount, setListAmount] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [creatingListing, setCreatingListing] = useState(false);

  const fetchHoldings = useCallback(async () => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/portfolio/holdings?walletAddress=${address}`);
      const data = await response.json();
      
      if (data.success) {
        setHoldings(data.holdings || []);
        setTotalValue(data.totalValue || 0);
      } else {
        toast.error(data.error || 'Failed to load portfolio');
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [isConnected, address]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const handleCreateListing = async () => {
    if (!selectedHolding || !listAmount || !listPrice) {
      toast.error('Please fill in all fields');
      return;
    }

    const amount = parseFloat(listAmount);
    const price = parseFloat(listPrice);

    if (amount <= 0 || amount > selectedHolding.amount) {
      toast.error('Invalid amount. Must be greater than 0 and not exceed your balance');
      return;
    }

    if (price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    setCreatingListing(true);
    const toastId = toast.loading('Creating listing...');

    try {
      const response = await fetch('/api/marketplace/create-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fractionalizationId: selectedHolding.fractionalizationId,
          sellerAddress: address,
          amount: amount,
          pricePerToken: price,
          currency: selectedHolding.fractionalization.currency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Listing created successfully!', { id: toastId });
        setShowListModal(false);
        setSelectedHolding(null);
        setListAmount('');
        setListPrice('');
        fetchHoldings(); // Refresh holdings
      } else {
        toast.error(data.error || 'Failed to create listing', { id: toastId });
      }
    } catch (error) {
      console.error('Failed to create listing:', error);
      toast.error('Failed to create listing', { id: toastId });
    } finally {
      setCreatingListing(false);
    }
  };

  const openListModal = (holding) => {
    setSelectedHolding(holding);
    setListPrice(holding.fractionalization.pricePerToken.toString()); // Default to current price
    setListAmount('');
    setShowListModal(true);
  };

  if (!isConnected || !address) {
    return (
      <DashboardLayout title="My Portfolio">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#737373' }}>
          Please connect your wallet to view your portfolio
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Portfolio">
      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            <Wallet size={18} color="#737373" />
            <span style={{ fontSize: '13px', color: '#737373' }}>Total Value</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>
            {formatCurrency(totalValue, 'IP')}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Package size={18} color="#737373" />
            <span style={{ fontSize: '13px', color: '#737373' }}>Total Holdings</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>
            {holdings.length}
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
            <span style={{ fontSize: '13px', color: '#737373' }}>Active Assets</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>
            {holdings.filter(h => h.fractionalization.status === 'TRADING').length}
          </div>
        </div>
      </div>

      {/* Holdings Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#737373' }}>
          Loading portfolio...
        </div>
      ) : holdings.length === 0 ? (
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
            No holdings yet
          </h3>
          <p style={{ fontSize: '14px', color: '#737373', marginBottom: '20px' }}>
            Purchase tokens from the marketplace to build your portfolio
          </p>
          <a href="/dashboard/marketplace">
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
              Browse Marketplace
              <ArrowUpRight size={18} />
            </button>
          </a>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {holdings.map((holding) => (
            <div
              key={holding.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0a0a0a';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Asset Header */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid #f5f5f5',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '8px',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {holding.asset.thumbnailUrl ? (
                    <Image
                      src={holding.asset.thumbnailUrl}
                      alt={holding.asset.title || 'Asset'}
                      width={56}
                      height={56}
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <AssetTypeIcon type={holding.asset.assetType} size={24} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a' }}>
                      {holding.asset.title || 'Untitled Asset'}
                    </span>
                    <StatusBadge status={holding.fractionalization.status} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#737373' }}>
                    {holding.fractionalization.tokenSymbol} • {formatNumber(holding.amount)} tokens
                  </div>
                </div>
              </div>

              {/* Holdings Info */}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#737373', marginBottom: '4px' }}>Your Balance</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                      {formatNumber(holding.amount)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#737373', marginBottom: '4px' }}>Ownership</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                      {holding.percentageOwned.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#737373', marginBottom: '4px' }}>Current Price</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                      {formatCurrency(holding.fractionalization.pricePerToken, holding.fractionalization.currency)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#737373', marginBottom: '4px' }}>Value</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                      {formatCurrency(holding.currentValue, holding.fractionalization.currency)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {holding.fractionalization.status === 'TRADING' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openListModal(holding)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: '#0a0a0a',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={14} />
                      List for Sale
                    </button>
                    <a href={`/dashboard/marketplace?fraction=${holding.fractionalizationId}`} style={{ flex: 1 }}>
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}>
                        View Market
                        <ExternalLink size={14} />
                      </button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List for Sale Modal */}
      {showListModal && selectedHolding && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowListModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', marginBottom: '20px' }}>
              List Tokens for Sale
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#737373', marginBottom: '8px' }}>Asset</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>
                {selectedHolding.asset.title || 'Untitled Asset'}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Amount to Sell
              </label>
              <input
                type="number"
                value={listAmount}
                onChange={(e) => setListAmount(e.target.value)}
                placeholder={`Max: ${formatNumber(selectedHolding.amount)}`}
                min="0"
                max={selectedHolding.amount}
                step="0.000001"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>
                Available: {formatNumber(selectedHolding.amount)} tokens
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Price Per Token ({selectedHolding.fractionalization.currency})
              </label>
              <input
                type="number"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.000001"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
              {listAmount && listPrice && (
                <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>
                  Total: {formatCurrency(parseFloat(listAmount || 0) * parseFloat(listPrice || 0), selectedHolding.fractionalization.currency)}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowListModal(false)}
                disabled={creatingListing}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#0a0a0a',
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateListing}
                disabled={creatingListing || !listAmount || !listPrice}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: creatingListing ? '#737373' : '#0a0a0a',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: creatingListing ? 'not-allowed' : 'pointer',
                }}
              >
                {creatingListing ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

