import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  FolderOpen,
  Upload,
  FileCheck, 
  PieChart, 
  Store, 
  Vote, 
  Shield, 
  Wallet,
  Settings,
  X
} from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Assets', href: '/dashboard/assets', icon: FolderOpen },
  { name: 'Upload', href: '/dashboard/upload', icon: Upload },
  { name: 'Licenses', href: '/dashboard/licenses', icon: FileCheck },
  { name: 'Fractions', href: '/dashboard/fractions', icon: PieChart },
  { name: 'Marketplace', href: '/dashboard/marketplace', icon: Store },
  { name: 'Governance', href: '/dashboard/governance', icon: Vote },
  { name: 'Sentinel', href: '/dashboard/sentinel', icon: Shield },
  { name: 'Revenue', href: '/dashboard/revenue', icon: Wallet },
];

export default function Sidebar({ mobileMenuOpen = false, onCloseMobile = () => {} }) {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 30,
            display: 'none'
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside 
        style={{
          width: '240px',
          height: '100vh',
          backgroundColor: '#fafafa',
          borderRight: '1px solid #e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 40
        }}
        className={mobileMenuOpen ? 'mobile-open' : ''}
      >
        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e5e5e5',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
          className="mobile-close"
        >
          <X style={{ width: '18px', height: '18px' }} />
        </button>

        {/* Logo */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e5e5' }}>
          <Link href="/" style={{ display: 'block', textDecoration: 'none' }}>
            <Image 
              src="/DippChainLogoText.png" 
              alt="DippChain" 
              width={130} 
              height={32} 
              style={{ objectFit: 'contain' }}
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  marginBottom: '4px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? '500' : '400',
                  color: isActive ? '#0a0a0a' : '#525252',
                  backgroundColor: isActive ? '#e5e5e5' : 'transparent'
                }}
              >
                <item.icon style={{ width: '18px', height: '18px' }} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid #e5e5e5' }}>
          <Link
            href="/dashboard/settings"
            onClick={onCloseMobile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              color: '#525252'
            }}
          >
            <Settings style={{ width: '18px', height: '18px' }} />
            Settings
          </Link>
        </div>
      </aside>

      <style jsx>{`
        /* Desktop - sidebar always visible */
        aside {
          transform: translateX(0);
          transition: transform 0.3s ease;
        }

        .mobile-close {
          display: none !important;
        }

        .mobile-overlay {
          display: none !important;
        }

        /* Mobile - sidebar slides in */
        @media (max-width: 767px) {
          aside {
            transform: translateX(-100%);
          }

          aside.mobile-open {
            transform: translateX(0);
          }

          .mobile-close {
            display: flex !important;
          }

          .mobile-overlay {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
