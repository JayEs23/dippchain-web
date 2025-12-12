'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

function Navbar() {
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
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image 
              src="/DippChainLogoText.png" 
              alt="DippChain" 
              width={140} 
              height={36} 
              style={{ objectFit: 'contain' }}
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <a 
              href="#features" 
              style={{ 
                fontSize: '14px', 
                color: '#525252', 
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#0a0a0a'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#525252'}
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              style={{ 
                fontSize: '14px', 
                color: '#525252', 
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#0a0a0a'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#525252'}
            >
              How it Works
            </a>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <appkit-button size="sm" />
            <Link 
              href="/dashboard"
              style={{ 
                padding: '10px 20px', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'white', 
                backgroundColor: '#0a0a0a', 
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Dashboard
            </Link>
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ padding: '48px 0', borderTop: '1px solid #e5e5e5', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Image 
            src="/DippChainLogoText.png" 
            alt="DippChain" 
            width={120} 
            height={32} 
            style={{ objectFit: 'contain' }}
          />
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', gap: '32px', fontSize: '14px', color: '#737373', fontWeight: '500' }}>
          <a 
            href="#features" 
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0a0a0a'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#737373'}
          >
            Features
          </a>
          <Link 
            href="/dashboard" 
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0a0a0a'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#737373'}
          >
            Dashboard
          </Link>
        </div>

        {/* Story Protocol */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#a3a3a3', fontWeight: '500' }}>Built on</span>
          <Image 
            src="/storylogo.webp" 
            alt="Story Protocol" 
            width={80} 
            height={24} 
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
    </footer>
  );
}

export default function LandingLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white' }}>
      <Navbar />
      <main>
        {children}
      </main>
      <Footer />
    </div>
  );
}

