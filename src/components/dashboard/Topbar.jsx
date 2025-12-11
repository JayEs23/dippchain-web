'use client';

import { useMemo, useState } from 'react';
import { Bell, Plus, Menu } from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { clearEmailSession, getEmailSession } from '@/lib/authSession';

export default function Topbar({ title = 'Dashboard', onMobileMenuToggle = () => {} }) {
  const { address, isConnected } = useAccount();
  const [emailSession, setEmailSession] = useState(() =>
    typeof window !== 'undefined' ? getEmailSession() : null
  );

  const identityLabel = useMemo(() => {
    if (isConnected && address) return `${address.slice(0, 6)}...${address.slice(-4)}`;
    if (emailSession) return emailSession;
    return 'Not connected';
  }, [isConnected, address, emailSession]);

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
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: '500',
            color: 'white',
            backgroundColor: '#0a0a0a',
            borderRadius: '6px',
            textDecoration: 'none',
            whiteSpace: 'nowrap'
          }}
          className="upload-btn"
        >
          <Plus style={{ width: '14px', height: '14px' }} />
          <span className="upload-text">Upload Asset</span>
        </Link>

        {/* Identity pill */}
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
          {(emailSession && !isConnected) && (
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
          )}
        </div>

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

        <appkit-button size="sm" />
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
