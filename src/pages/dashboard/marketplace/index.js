// Marketplace Page - Primary + Secondary Trading with Story Protocol Royalty Tokens
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ShoppingCart, TrendingUp, Users, Filter, Loader2, ExternalLink, Plus, Briefcase } from 'lucide-react';
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

  const fetchListings = useCallback(async () => {
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
  }, [filter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

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

    // ✅ VALIDATE BEFORE PAYMENT: Check asset is properly registered
    // Use tokenAddress from fractionalization as fallback (it's the vault address)
    const vaultAddress = listing.asset?.royaltyVaultAddress || listing.tokenAddress;
    const ipId = listing.asset?.storyProtocolId;
    
    if (!ipId) {
      toast.error('Asset is not properly registered on Story Protocol. Cannot proceed with purchase.');
      console.error('Asset validation failed - missing IP ID:', {
        assetId: listing.asset?.id,
        assetTitle: listing.asset?.title,
        storyProtocolId: ipId,
      });
      return;
    }

    if (!vaultAddress) {
      toast.error('Asset is missing royalty vault address. Cannot proceed with purchase.');
      console.error('Asset validation failed - missing vault address:', {
        assetId: listing.asset?.id,
        storyProtocolId: ipId,
        royaltyVaultAddress: listing.asset?.royaltyVaultAddress,
        tokenAddress: listing.tokenAddress,
      });
      return;
    }

    // ✅ VALIDATE BEFORE PAYMENT: Prevent asset owner from buying their own primary listing
    const normalizedBuyerAddress = address.toLowerCase();
    const assetOwnerAddress = listing.asset?.user?.walletAddress?.toLowerCase();
    
    if (assetOwnerAddress && normalizedBuyerAddress === assetOwnerAddress) {
      toast.error('You cannot purchase from your own primary market listing');
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

      // Check if tokens were automatically transferred
      if (data.transferTxHash) {
        toast.success(
          `✅ Purchase completed! ${amount.toLocaleString()} tokens have been automatically transferred to your wallet.`,
          { id: toastId, duration: 8000 }
        );
      } else if (data.success) {
        toast.success(
          '✅ Purchase completed! Tokens have been automatically transferred to your wallet.',
          { id: toastId, duration: 8000 }
        );
      }
      
      // Refresh listings
      fetchListings();
      setPurchaseAmount(prev => ({ ...prev, [listing.id]: '' }));
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

    // ✅ VALIDATE BEFORE PAYMENT: Check asset is properly registered
    // Use tokenAddress from fractionalization as fallback (it's the vault address)
    const vaultAddress = listing.asset?.royaltyVaultAddress || listing.tokenAddress;
    const ipId = listing.asset?.storyProtocolId;
    
    if (!ipId) {
      toast.error('Asset is not properly registered on Story Protocol. Cannot proceed with purchase.');
      console.error('Asset validation failed - missing IP ID:', {
        assetId: listing.asset?.id,
        assetTitle: listing.asset?.title,
        storyProtocolId: ipId,
      });
      return;
    }

    if (!vaultAddress) {
      toast.error('Asset is missing royalty vault address. Cannot proceed with purchase.');
      console.error('Asset validation failed - missing vault address:', {
        assetId: listing.asset?.id,
        storyProtocolId: ipId,
        royaltyVaultAddress: listing.asset?.royaltyVaultAddress,
        tokenAddress: listing.tokenAddress,
      });
      return;
    }

    // ✅ VALIDATE BEFORE PAYMENT: Prevent buying from yourself
    const normalizedBuyerAddress = address.toLowerCase();
    const sellerAddress = listing.seller?.walletAddress?.toLowerCase();
    
    if (sellerAddress && normalizedBuyerAddress === sellerAddress) {
      toast.error('You cannot purchase from your own listing');
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

      // Check if tokens were automatically transferred
      if (data.transferTxHash) {
        toast.success(
          `✅ Purchase completed! ${amount.toLocaleString()} tokens have been automatically transferred to your wallet.`,
          { id: toastId, duration: 8000 }
        );
      } else if (data.success) {
        toast.success(
          '✅ Purchase completed! Tokens have been automatically transferred to your wallet.',
          { id: toastId, duration: 8000 }
        );
      }
      
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
        marginBottom: '32px',
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Royalty Token Marketplace
          </h1>
          <p style={{ fontSize: '15px', color: '#737373', lineHeight: '1.5' }}>
            Buy fractional ownership of IP assets using Story Protocol&apos;s native tokens
          </p>
        </div>
        {isConnected && (
          <a href="/dashboard/portfolio">
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: '#0a0a0a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#262626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0a0a0a';
            }}
            >
              <Briefcase size={18} />
              Sell Your Tokens
            </button>
          </a>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '32px',
        borderBottom: '1px solid #e5e5e5',
        paddingBottom: '4px',
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
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              color: filter === tab.value ? '#0a0a0a' : '#737373',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: filter === tab.value ? '3px solid #0a0a0a' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (filter !== tab.value) {
                e.currentTarget.style.color = '#0a0a0a';
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== tab.value) {
                e.currentTarget.style.color = '#737373';
              }
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '28px',
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
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0a0a0a';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e5e5';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
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
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <Image
                        src={listing.asset.thumbnailUrl}
                        alt={listing.asset.title || 'Asset thumbnail'}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <ShoppingCart size={48} color="#d4d4d4" />
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                  {/* Market Type Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: isPrimary ? '#eff6ff' : '#fefce8',
                    color: isPrimary ? '#1e40af' : '#854d0e',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {isPrimary ? <TrendingUp size={12} /> : <Users size={12} />}
                    {isPrimary ? 'Primary Market' : 'Secondary Market'}
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '17px',
                    fontWeight: '600',
                    color: '#0a0a0a',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.4',
                  }}>
                    {listing.asset.title}
                  </h3>

                  {/* Seller */}
                  <p style={{ fontSize: '13px', color: '#737373', marginBottom: '20px', lineHeight: '1.5' }}>
                    by <strong style={{ color: '#0a0a0a' }}>{listing.seller.displayName || 'Creator'}</strong>
                  </p>

                  {/* Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: '#fafafa',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '1px solid #f5f5f5',
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
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#0a0a0a',
                      marginBottom: '8px',
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
                        padding: '12px 14px',
                        fontSize: '14px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '10px',
                        transition: 'all 0.2s ease',
                        backgroundColor: purchasing === listing.id ? '#f5f5f5' : 'white',
                      }}
                      onFocus={(e) => {
                        if (purchasing !== listing.id) {
                          e.currentTarget.style.borderColor = '#0a0a0a';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 10, 10, 0.05)';
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e5e5e5';
                        e.currentTarget.style.boxShadow = 'none';
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
                      padding: '14px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      backgroundColor: (purchasing === listing.id || !amount || amount > listing.amount) ? '#a3a3a3' : '#0a0a0a',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: (purchasing === listing.id || !amount || amount > listing.amount) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!(purchasing === listing.id || !amount || amount > listing.amount)) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
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
