// Marketplace Page - Primary + Secondary Trading with Story Protocol Royalty Tokens
import { useState, useEffect } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ShoppingCart, TrendingUp, Users, Filter, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  transferRoyaltyTokensFromIPAccount, 
  transferRoyaltyTokens, 
  getRoyaltyTokenBalance,
  tokensToWei,
  weiToTokens,
} from '@/lib/storyRoyaltyTokens';

export default function MarketplacePage() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'primary', 'secondary'
  const [purchasing, setPurchasing] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState({});

  useEffect(() => {
    fetchListings();
  }, [filter]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketplace/listings?type=${filter}`);
      const data = await response.json();

      if (data.success) {
        setListings(data.listings);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      toast.error('Failed to load marketplace listings');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (listingId, value) => {
    setPurchaseAmount(prev => ({
      ...prev,
      [listingId]: value,
    }));
  };

  const handleBuyPrimary = async (listing) => {
    if (!isConnected || !address || !walletProvider) {
      toast.error('Please connect your wallet');
      return;
    }

    const amount = parseFloat(purchaseAmount[listing.id] || 0);
    if (amount <= 0 || amount > listing.amount) {
      toast.error('Invalid amount');
      return;
    }

    setPurchasing(listing.id);
    const toastId = toast.loading('Processing primary market purchase...');

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();

      // Step 1: Calculate payment
      const totalCost = amount * listing.pricePerToken;
      const totalCostWei = parseEther(totalCost.toString());

      // Step 2: Buyer sends payment to seller (escrow would be better, but this works for MVP)
      toast.loading('Processing payment...', { id: toastId });
      
      const tx = await signer.sendTransaction({
        to: listing.seller.walletAddress,
        value: totalCostWei,
      });
      
      toast.loading('Waiting for payment confirmation...', { id: toastId });
      const receipt = await tx.wait();

      // Step 3: Create purchase intent in database
      // This notifies the seller to transfer tokens
      toast.loading('Creating purchase record...', { id: toastId });
      
      const response = await fetch('/api/marketplace/buy-primary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fractionalizationId: listing.fractionalizationId,
          buyerAddress: address,
          amount,
          txHash: receipt.hash,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Record purchase failed:', data);
        const errorMsg = data.error?.message || data.error || 'Payment sent but failed to record purchase. Contact support with transaction: ' + receipt.hash;
        toast.error(errorMsg, { 
          id: toastId,
          duration: 10000,
        });
        setPurchasing(null);
        return;
      }

      toast.success(
        'Payment sent! The seller will transfer your tokens shortly. You will receive a notification when tokens are transferred.',
        { id: toastId, duration: 8000 }
      );
      
      // Refresh listings
      fetchListings();
      setPurchaseAmount(prev => ({ ...prev, [listing.id]: '' }));
      
      // Show info modal about next steps
      toast((t) => (
        <div style={{ maxWidth: '400px' }}>
          <strong>🎉 Purchase Initiated!</strong>
          <p style={{ fontSize: '13px', marginTop: '8px', marginBottom: '12px' }}>
            Your payment of <strong>{totalCost} IP</strong> has been sent to the seller.
            <br /><br />
            <strong>Next Steps:</strong>
            <br />• Seller will transfer {amount.toLocaleString()} tokens to your wallet
            <br />• This usually happens within a few minutes
            <br />• Check your "Revenue" page for token balance updates
            <br />• If tokens don't arrive within 24 hours, contact support
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <a
              href={`https://aeneid.storyscan.io/tx/${receipt.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#2563eb',
                backgroundColor: 'white',
                border: '1px solid #2563eb',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              View Transaction
            </a>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: '500',
                color: 'white',
                backgroundColor: '#0a0a0a',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      ), { duration: 20000 });
    } catch (error) {
      console.error('Primary market purchase error:', error);
      
      let errorMessage = 'Purchase failed';
      if (error.code === 'ACTION_REJECTED' || error.message?.includes('rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient IP tokens in wallet';
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { id: toastId });
    } finally {
      setPurchasing(null);
    }
  };

  const handleBuySecondary = async (listing) => {
    if (!isConnected || !address || !walletProvider) {
      toast.error('Please connect your wallet');
      return;
    }

    const amount = parseFloat(purchaseAmount[listing.id] || 0);
    if (amount <= 0 || amount > listing.amount) {
      toast.error('Invalid amount');
      return;
    }

    setPurchasing(listing.id);
    const toastId = toast.loading('Processing secondary market purchase...');

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();

      // Step 1: Calculate payment
      const totalCost = amount * listing.pricePerToken;
      const totalCostWei = parseEther(totalCost.toString());

      // Step 2: Buyer sends payment to contract/escrow (simplified: direct to seller)
      toast.loading('Processing payment...', { id: toastId });
      
      const paymentTx = await signer.sendTransaction({
        to: listing.seller.walletAddress,
        value: totalCostWei,
      });
      await paymentTx.wait();

      // Step 3: Seller transfers tokens to buyer
      // NOTE: In production, this should be atomic (escrow or contract-based)
      // For now, we assume seller has approved or will transfer
      toast.loading('Waiting for token transfer...', { id: toastId });

      // Check if buyer already has some tokens
      const currentBalance = await getRoyaltyTokenBalance(
        provider,
        listing.tokenAddress,
        address
      );

      // Step 4: Update database
      toast.loading('Updating records...', { id: toastId });
      
      const response = await fetch('/api/marketplace/buy-secondary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          buyerAddress: address,
          amount,
          txHash: paymentTx.hash,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Record purchase failed:', data);
        const errorMsg = data.error?.message || data.error || 'Failed to record purchase';
        toast.error(errorMsg, { id: toastId });
        setPurchasing(null);
        return;
      }

      toast.success('Purchase completed! Tokens will be transferred by the seller.', { id: toastId });
      
      // Refresh listings
      fetchListings();
      setPurchaseAmount(prev => ({ ...prev, [listing.id]: '' }));
    } catch (error) {
      console.error('Secondary market purchase error:', error);
      
      let errorMessage = 'Purchase failed';
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient IP tokens';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { id: toastId });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <DashboardLayout title="Marketplace">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a', marginBottom: '4px' }}>
            Royalty Token Marketplace
          </h1>
          <p style={{ fontSize: '14px', color: '#737373' }}>
            Buy fractional ownership of IP assets using Story Protocol's native tokens
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid #e5e5e5',
      }}>
        {[
          { value: 'all', label: 'All Markets', icon: ShoppingCart },
          { value: 'primary', label: 'Primary Market', icon: TrendingUp },
          { value: 'secondary', label: 'Secondary Market', icon: Users },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: filter === tab.value ? '#0a0a0a' : '#737373',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: filter === tab.value ? '2px solid #0a0a0a' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '80px',
        }}>
          <Loader2 size={32} className="animate-spin" color="#737373" />
        </div>
      ) : listings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px',
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
        }}>
          <ShoppingCart size={48} color="#d4d4d4" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
            No listings available
          </h3>
          <p style={{ fontSize: '14px', color: '#737373' }}>
            Check back later for new fractional ownership opportunities
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
        }}>
          {listings.map((listing) => {
            const amount = parseFloat(purchaseAmount[listing.id] || 0);
            const totalCost = amount * listing.pricePerToken;
            const isPrimary = listing.type === 'PRIMARY';

            return (
              <div
                key={listing.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0a0a0a';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e5e5';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Asset Image */}
                <div style={{
                  height: '180px',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {listing.asset.thumbnailUrl ? (
                    <img
                      src={listing.asset.thumbnailUrl}
                      alt={listing.asset.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <ShoppingCart size={48} color="#d4d4d4" />
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                  {/* Market Type Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    backgroundColor: isPrimary ? '#eff6ff' : '#fefce8',
                    color: isPrimary ? '#1e40af' : '#854d0e',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {isPrimary ? <TrendingUp size={12} /> : <Users size={12} />}
                    {isPrimary ? 'Primary Market' : 'Secondary Market'}
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#0a0a0a',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {listing.asset.title}
                  </h3>

                  {/* Seller */}
                  <p style={{ fontSize: '13px', color: '#737373', marginBottom: '16px' }}>
                    by <strong>{listing.seller.displayName || 'Creator'}</strong>
                  </p>

                  {/* Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#737373', marginBottom: '2px' }}>Available</p>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a' }}>
                        {listing.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#737373', marginBottom: '2px' }}>Price/Token</p>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a' }}>
                        {listing.pricePerToken} {listing.currency}
                      </p>
                    </div>
                  </div>

                  {/* Purchase Input */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#737373',
                      marginBottom: '6px',
                    }}>
                      Amount to buy
                    </label>
                    <input
                      type="number"
                      value={purchaseAmount[listing.id] || ''}
                      onChange={(e) => handleAmountChange(listing.id, e.target.value)}
                      placeholder="0"
                      min="1"
                      max={listing.amount}
                      step="1"
                      disabled={purchasing === listing.id}
                      style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: '14px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                      }}
                    />
                    {amount > 0 && (
                      <p style={{ fontSize: '12px', color: '#737373', marginTop: '6px' }}>
                        Total: <strong>{totalCost.toFixed(6)} {listing.currency}</strong>
                      </p>
                    )}
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => isPrimary ? handleBuyPrimary(listing) : handleBuySecondary(listing)}
                    disabled={purchasing === listing.id || !amount || amount > listing.amount}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'white',
                      backgroundColor: (purchasing === listing.id || !amount || amount > listing.amount) ? '#a3a3a3' : '#0a0a0a',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (purchasing === listing.id || !amount || amount > listing.amount) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {purchasing === listing.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        Buy Tokens
                      </>
                    )}
                  </button>

                  {/* Token Link */}
                  <a
                    href={`https://aeneid.storyscan.io/address/${listing.tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      marginTop: '12px',
                      fontSize: '12px',
                      color: '#2563eb',
                      textDecoration: 'underline',
                    }}
                  >
                    View Royalty Token <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
