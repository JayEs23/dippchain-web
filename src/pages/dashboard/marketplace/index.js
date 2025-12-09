// Marketplace Page - Primary & Secondary Sales
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider, Contract, parseEther, formatEther, getAddress } from 'ethers';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Store, Search, Filter, TrendingUp, 
  Image, ShoppingCart, Tag, Loader2, X, ExternalLink
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { CONTRACTS } from '@/contracts/addresses';
import FractionalizationManagerABI from '@/contracts/abis/FractionalizationManager.json';
import toast from 'react-hot-toast';

export default function MarketplacePage() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  
  const [fractions, setFractions] = useState([]); // Primary sales
  const [listings, setListings] = useState([]); // Secondary sales
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('primary'); // 'primary', 'secondary'
  const [buyModal, setBuyModal] = useState(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    fetchData();
  }, [address, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'primary') {
        // Fetch fractionalized assets with available supply
        const response = await fetch('/api/fractions?status=TRADING');
        const data = await response.json();
        if (data.success) {
          setFractions(data.fractionalizations.filter(f => f.availableSupply > 0));
        }
      } else {
        // Fetch secondary market listings
        const response = await fetch('/api/marketplace/listings');
        const data = await response.json();
        if (data.success) {
          setListings(data.listings);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPrimary = async (fraction) => {
    if (!isConnected || !walletProvider) {
      toast.error('Please connect your wallet');
      return;
    }

    const amount = parseInt(buyAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > fraction.availableSupply) {
      toast.error('Amount exceeds available supply');
      return;
    }

    setBuying(true);
    const toastId = toast.loading('Processing purchase...');

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      
      const managerAddress = getAddress(CONTRACTS.FractionalizationManager.toLowerCase());
      const manager = new Contract(managerAddress, FractionalizationManagerABI, signer);

      // Get asset token ID from the fraction data
      const assetTokenId = parseInt(fraction.asset?.dippchainTokenId || 0);
      if (!assetTokenId) {
        toast.error('Asset token ID not found', { id: toastId });
        setBuying(false);
        return;
      }

      // Calculate total cost
      const pricePerToken = parseEther(fraction.pricePerToken.toString());
      const totalCost = pricePerToken * BigInt(amount);

      console.log('Purchasing:', { assetTokenId, amount, totalCost: formatEther(totalCost) });

      toast.loading('Confirm transaction in wallet...', { id: toastId });
      const tx = await manager.purchaseTokens(assetTokenId, amount, { value: totalCost });

      toast.loading('Waiting for confirmation...', { id: toastId });
      const receipt = await tx.wait();

      toast.success(`Successfully purchased ${amount} tokens!`, { id: toastId });
      setBuyModal(null);
      setBuyAmount('');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Purchase error:', error);
      
      let errorMessage = 'Purchase failed';
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was rejected';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds';
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage;
      }
      
      toast.error(errorMessage, { id: toastId });
    } finally {
      setBuying(false);
    }
  };

  const filteredFractions = fractions.filter(f =>
    f.asset?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.tokenSymbol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredListings = listings.filter(listing =>
    listing.fractionalization?.asset?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.fractionalization?.tokenSymbol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Marketplace">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} color="#737373" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                fontSize: '14px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                outline: 'none',
              }}
            />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f5f5f5', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('primary')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === 'primary' ? '#0a0a0a' : '#737373',
                backgroundColor: activeTab === 'primary' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Primary Sale
            </button>
            <button
              onClick={() => setActiveTab('secondary')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === 'secondary' ? '#0a0a0a' : '#737373',
                backgroundColor: activeTab === 'secondary' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Secondary Market
            </button>
          </div>
        </div>

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
            <Tag size={18} />
            Fractionalize Asset
          </button>
        </Link>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#737373' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading marketplace...
        </div>
      ) : activeTab === 'primary' ? (
        // Primary Sales Grid
        filteredFractions.length === 0 ? (
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
              <Store size={28} color="#737373" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              No tokens available
            </h3>
            <p style={{ fontSize: '14px', color: '#737373', marginBottom: '20px' }}>
              No fractionalized assets are currently for sale
            </p>
            <Link href="/dashboard/fractions/create">
              <button style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'white',
                backgroundColor: '#0a0a0a',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}>
                Fractionalize an Asset
              </button>
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {filteredFractions.map((fraction) => (
              <div
                key={fraction.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                {/* Thumbnail */}
                <div style={{
                  height: '160px',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {fraction.asset?.pinataUrl && fraction.asset?.assetType === 'IMAGE' ? (
                    <img
                      src={fraction.asset.pinataUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Image size={40} color="#d4d4d4" />
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#0a0a0a',
                    }}>
                      ${fraction.tokenSymbol}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      borderRadius: '4px',
                      fontWeight: '500',
                    }}>
                      PRIMARY
                    </span>
                  </div>
                  
                  <p style={{
                    fontSize: '14px',
                    color: '#525252',
                    marginBottom: '4px',
                  }}>
                    {fraction.tokenName}
                  </p>
                  
                  <p style={{
                    fontSize: '13px',
                    color: '#737373',
                    marginBottom: '16px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {fraction.asset?.title}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>Available</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#0a0a0a' }}>
                        {formatNumber(fraction.availableSupply)} / {formatNumber(fraction.totalSupply)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#737373', marginBottom: '4px' }}>Price</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#0a0a0a' }}>
                        {fraction.pricePerToken} {fraction.currency}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      height: '6px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${((fraction.totalSupply - fraction.availableSupply) / fraction.totalSupply) * 100}%`,
                        backgroundColor: '#16a34a',
                        borderRadius: '3px',
                      }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#737373', marginTop: '4px' }}>
                      {Math.round(((fraction.totalSupply - fraction.availableSupply) / fraction.totalSupply) * 100)}% sold
                    </div>
                  </div>

                  <button
                    onClick={() => setBuyModal(fraction)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'white',
                      backgroundColor: '#0a0a0a',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <ShoppingCart size={16} />
                    Buy Tokens
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Secondary Market - Coming Soon
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
            <TrendingUp size={28} color="#737373" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
            Secondary Market Coming Soon
          </h3>
          <p style={{ fontSize: '14px', color: '#737373', marginBottom: '20px' }}>
            Token holders will soon be able to list their tokens for resale
          </p>
        </div>
      )}

      {/* Buy Modal */}
      {buyModal && (
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
            maxWidth: '420px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a' }}>
                Buy ${buyModal.tokenSymbol}
              </h2>
              <button
                onClick={() => { setBuyModal(null); setBuyAmount(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#737373" />
              </button>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '4px' }}>
                {buyModal.tokenName}
              </div>
              <div style={{ fontSize: '13px', color: '#737373' }}>
                {buyModal.asset?.title}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Amount to Buy
              </label>
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={buyModal.availableSupply}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                }}
              />
              <div style={{ fontSize: '12px', color: '#737373', marginTop: '6px' }}>
                Available: {formatNumber(buyModal.availableSupply)} tokens
              </div>
            </div>

            {buyAmount && parseInt(buyAmount) > 0 && (
              <div style={{
                padding: '16px',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#737373' }}>Price per token</span>
                  <span style={{ fontSize: '13px', color: '#0a0a0a' }}>{buyModal.pricePerToken} {buyModal.currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#737373' }}>Quantity</span>
                  <span style={{ fontSize: '13px', color: '#0a0a0a' }}>{parseInt(buyAmount).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e5e5', paddingTop: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a' }}>Total Cost</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#16a34a' }}>
                    {(parseFloat(buyModal.pricePerToken) * parseInt(buyAmount)).toFixed(4)} {buyModal.currency}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setBuyModal(null); setBuyAmount(''); }}
                disabled={buying}
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
                onClick={() => handleBuyPrimary(buyModal)}
                disabled={buying || !buyAmount || parseInt(buyAmount) <= 0}
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
                  backgroundColor: buying ? '#a3a3a3' : '#0a0a0a',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: buying ? 'not-allowed' : 'pointer',
                }}
              >
                {buying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} /> Buy Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

