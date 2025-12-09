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
  Settings
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

export default function Sidebar() {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <aside style={{
      width: '240px',
      height: '100vh',
      backgroundColor: '#fafafa',
      borderRight: '1px solid #e5e5e5',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0
    }}>
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
  );
}
