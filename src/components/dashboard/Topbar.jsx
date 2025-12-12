'use client';

import { useMemo, useState } from 'react';
import { Bell, Plus, Menu } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import { clearEmailSession, getEmailSession } from '@/lib/authSession';

export default function Topbar({ title = 'Dashboard', onMobileMenuToggle = () => {} }) {
  const { address, isConnected } = useAccount();
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: address,
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });
  
  const [emailSession, setEmailSession] = useState(() =>
    typeof window !== 'undefined' ? getEmailSession() : null
  );

  const identityLabel = useMemo(() => {
    if (isConnected && address) return `${address.slice(0, 6)}...${address.slice(-4)}`;
    if (emailSession) return emailSession;
    return 'Not connected';
  }, [isConnected, address, emailSession]);

  const formattedBalance = useMemo(() => {
    if (!balance || balanceLoading) return '...';
    const value = parseFloat(formatEther(balance.value));
    if (value < 0.0001) return '< 0.0001';
    return value.toFixed(4);
  }, [balance, balanceLoading]);

  const handleLogout = () => {
    clearEmailSession();
    setEmailSession(null);
    toast.success('Session cleared');
  };

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e5e5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            border: '1px solid #e5e5e5',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          className="mobile-menu-btn"
        >
          <Menu style={{ width: '20px', height: '20px' }} />
        </button>

        <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <Link
          href="/dashboard/upload"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '600',
            color: 'white',
            backgroundColor: '#0a0a0a',
            borderRadius: '8px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease'
          }}
          className="upload-btn"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus style={{ width: '14px', height: '14px' }} />
          <span className="upload-text">Upload Asset</span>
        </Link>

        {/* Identity pill with balance */}
        {isConnected && address && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            border: '1px solid #e5e5e5',
            borderRadius: '999px',
            backgroundColor: '#f9fafb',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
                {formattedBalance} {balance?.symbol || 'IP'}
              </span>
              <span style={{ fontSize: '12px', color: '#111827', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {identityLabel}
              </span>
            </div>
          </div>
        )}
        
        {!isConnected && emailSession && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            border: '1px solid #e5e5e5',
            borderRadius: '999px',
            backgroundColor: '#f9fafb',
            maxWidth: '220px',
            overflow: 'hidden'
          }}>
            <span style={{ fontSize: '12px', color: '#111827', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {identityLabel}
            </span>
            <button
              onClick={handleLogout}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#6b7280',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '2px 6px'
              }}
            >
              Clear
            </button>
          </div>
        )}

        <button style={{
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          border: '1px solid #e5e5e5',
          backgroundColor: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Bell style={{ width: '16px', height: '16px', color: '#525252' }} />
        </button>

        {/* Only show appkit-button if wallet is not connected (fallback) */}
        {!isConnected && !emailSession && (
          <appkit-button size="sm" />
        )}
      </div>

      <style jsx>{`
        .mobile-menu-btn {
          display: none !important;
        }

        @media (max-width: 767px) {
          .mobile-menu-btn {
            display: flex !important;
          }

          header {
            padding: 0 16px !important;
          }

          h1 {
            font-size: 16px !important;
          }
        }

        @media (max-width: 640px) {
          .upload-text {
            display: none;
          }

          .upload-btn {
            width: 36px !important;
            height: 36px !important;
            padding: 8px !important;
            justify-content: center;
          }
        }
      `}</style>
    </header>
  );
}
