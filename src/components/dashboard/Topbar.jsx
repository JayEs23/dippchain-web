import { Bell, Plus } from 'lucide-react';
import Link from 'next/link';

export default function Topbar({ title = 'Dashboard' }) {
  return (
    <header style={{
      height: '64px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e5e5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px'
    }}>
      <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a' }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link
          href="/dashboard/assets/upload"
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
            textDecoration: 'none'
          }}
        >
          <Plus style={{ width: '14px', height: '14px' }} />
          Upload Asset
        </Link>

        <button style={{
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          border: '1px solid #e5e5e5',
          backgroundColor: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Bell style={{ width: '16px', height: '16px', color: '#525252' }} />
        </button>

        <appkit-button size="sm" />
      </div>
    </header>
  );
}

