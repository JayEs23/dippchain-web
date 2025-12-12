'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DemoModal from './DemoModal';

export default function Hero() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  
  // Configure your demo video here
  // Option 1: YouTube URL
  const demoVideoUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  // Option 2: Direct video URL (mp4, webm, etc.)
  // const demoVideoUrl = 'https://example.com/demo-video.mp4';
  
  const demoVideoType = process.env.NEXT_PUBLIC_DEMO_VIDEO_TYPE || 'youtube'; // 'youtube', 'vimeo', or 'direct'

  return (
    <section style={{ paddingTop: '140px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          marginBottom: '28px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#525252',
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          border: '1px solid #e5e5e5'
        }}>
          Built on Story Protocol
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: '56px', fontWeight: '700', color: '#0a0a0a', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-0.03em' }}>
          Protect, License, and Monetize Every Creative Asset
        </h1>

        {/* Description */}
        <p style={{ fontSize: '19px', color: '#525252', marginBottom: '40px', lineHeight: '1.7', maxWidth: '720px', margin: '0 auto 40px' }}>
          DippChain is your end-to-end command center for IP: watermark uploads, one-click Story Protocol registration, programmable licensing, royalty tokens, marketplace listings, and AI-powered infringement detection—all in one flow.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '60px', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex', 
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              fontSize: '15px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: '#0a0a0a',
              borderRadius: '10px',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Start Protecting Free
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </Link>
          <button 
            onClick={() => setDemoModalOpen(true)}
            style={{
              padding: '14px 24px',
              fontSize: '15px',
              fontWeight: '500',
              color: '#0a0a0a',
              backgroundColor: 'white',
              border: '1px solid #d4d4d4',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0a0a0a';
              e.currentTarget.style.backgroundColor = '#fafafa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d4d4d4';
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            Watch Demo
          </button>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '40px',
          paddingTop: '40px', 
          borderTop: '1px solid #e5e5e5' 
        }}>
          {[
            { value: '10K+', label: 'IP assets minted & registered on-chain with Story Protocol' },
            { value: '50K+', label: 'Detections auto-logged with evidence packages' },
            { value: '2M+', label: 'IP tokens & royalty payouts streamed to creators' },
            { value: '99.9%', label: 'Uptime across registry, licensing, and marketplace' },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#0a0a0a', marginBottom: '8px', letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div style={{ fontSize: '14px', color: '#737373', lineHeight: '1.6' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Modal */}
      <DemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        videoUrl={demoVideoUrl}
        videoType={demoVideoType}
      />
    </section>
  );
}
