import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section style={{ paddingTop: '140px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        {/* Badge */}
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '6px', 
          padding: '6px 12px', 
          marginBottom: '24px',
          fontSize: '13px', 
          color: '#525252', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          border: '1px solid #e5e5e5'
        }}>
          Built on Story Protocol
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: '48px', fontWeight: '600', color: '#0a0a0a', lineHeight: '1.1', marginBottom: '20px', letterSpacing: '-0.02em' }}>
          Protect & Monetize<br />Your Creative Work
        </h1>

        {/* Description */}
        <p style={{ fontSize: '17px', color: '#525252', marginBottom: '32px', lineHeight: '1.6' }}>
          Register IP assets on Story Protocol, embed invisible watermarks, and detect unauthorized use with AI. Earn IP token royalties automatically.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '64px' }}>
          <Link 
            href="/dashboard"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '12px 20px', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: 'white', 
              backgroundColor: '#0a0a0a', 
              borderRadius: '6px',
              textDecoration: 'none'
            }}
          >
            Start Protecting Free
            <ArrowRight style={{ width: '14px', height: '14px' }} />
          </Link>
          <button style={{ 
            padding: '12px 20px', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#0a0a0a', 
            backgroundColor: 'white', 
            border: '1px solid #d4d4d4', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            Watch Demo
          </button>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '32px', 
          paddingTop: '32px', 
          borderTop: '1px solid #e5e5e5' 
        }}>
          {[
            { value: '10K+', label: 'IP Assets Registered' },
            { value: '50K+', label: 'Infringement Detections' },
            { value: '2M IP', label: 'Royalties Distributed' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#0a0a0a' }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: '#737373', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
