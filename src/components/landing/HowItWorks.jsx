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
    <section id="how-it-works" style={{ padding: '80px 0' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            How It Works
          </h2>
          <p style={{ color: '#737373' }}>Five simple steps. No blockchain experience required—everything is automated and guided.</p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          {steps.map((step, i) => (
            <div key={step.title} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                border: '1px solid #e5e5e5',
                backgroundColor: 'white',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 12px',
                position: 'relative'
              }}>
                <step.icon style={{ width: '20px', height: '20px', color: '#0a0a0a' }} />
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#0a0a0a',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>{i + 1}</span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0a0a0a', marginBottom: '6px' }}>{step.title}</h3>
              <p style={{ fontSize: '14px', color: '#737373', lineHeight: '1.5' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
