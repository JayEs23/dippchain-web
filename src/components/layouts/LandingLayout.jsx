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
            <a href="#features" style={{ fontSize: '14px', color: '#525252', textDecoration: 'none' }}>Features</a>
            <a href="#how-it-works" style={{ fontSize: '14px', color: '#525252', textDecoration: 'none' }}>How it Works</a>
            <a href="#pricing" style={{ fontSize: '14px', color: '#525252', textDecoration: 'none' }}>Pricing</a>
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
    <footer style={{ padding: '32px 0', borderTop: '1px solid #e5e5e5' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#737373' }}>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
          <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing</a>
          <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        </div>

        {/* Story Protocol */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#a3a3a3' }}>Built on</span>
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

