'use client';

import { Upload, Fingerprint, Globe, Shield, Coins } from 'lucide-react';

const steps = [
  { icon: Upload, title: 'Upload', desc: 'Drag-and-drop any format. We hash, watermark, and pin to IPFS automatically.' },
  { icon: Fingerprint, title: 'Register', desc: 'Mint + register on Story Protocol in one SPG call, attach PIL terms, and open a royalty vault.' },
  { icon: Globe, title: 'Monitor', desc: 'Sentinel scans socials, marketplaces, and the open web for lookalikes and metadata matches.' },
  { icon: Shield, title: 'Detect', desc: 'Receive instant alerts with URLs, screenshots, hashes, and similarity scores you can trust.' },
  { icon: Coins, title: 'Earn', desc: 'License, fractionalize, sell, and stream royalties to token holders in a single dashboard.' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: '100px 0' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '40px', fontWeight: '600', color: '#0a0a0a', marginBottom: '16px', letterSpacing: '-0.03em' }}>
            How It Works
          </h2>
          <p style={{ fontSize: '18px', color: '#737373', maxWidth: '600px', margin: '0 auto', lineHeight: '1.7' }}>
            Five simple steps. No blockchain experience required—everything is automated and guided.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
          {steps.map((step, i) => (
            <div key={step.title} style={{ flex: '1 1 180px', textAlign: 'center', minWidth: '160px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '16px', 
                border: '1px solid #e5e5e5',
                backgroundColor: 'white',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 20px',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0a0a0a';
                e.currentTarget.style.backgroundColor = '#fafafa';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              >
                <step.icon style={{ width: '28px', height: '28px', color: '#0a0a0a' }} />
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#0a0a0a',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '700',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white'
                }}>{i + 1}</span>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0a0a0a', marginBottom: '10px', letterSpacing: '-0.01em' }}>{step.title}</h3>
              <p style={{ fontSize: '15px', color: '#737373', lineHeight: '1.6' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
