import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      zIndex: 50, 
      backgroundColor: 'rgba(255,255,255,0.95)', 
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #e5e5e5' 
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#0a0a0a' }}>DippChain</span>
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <a href="#features" style={{ fontSize: '14px', color: '#525252', textDecoration: 'none' }}>Features</a>
            <a href="#how-it-works" style={{ fontSize: '14px', color: '#525252', textDecoration: 'none' }}>How it Works</a>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <appkit-button size="sm" />
            <Link 
              href="/dashboard"
              style={{ 
                padding: '8px 16px', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'white', 
                backgroundColor: '#0a0a0a', 
                borderRadius: '6px',
                textDecoration: 'none'
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
