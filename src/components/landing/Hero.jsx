'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { setEmailSession } from '@/lib/authSession';

export default function Hero() {
  const router = useRouter();
  const [emailInput, setEmailInput] = useState('');

  const handleEmailLogin = () => {
    const email = emailInput.trim();
    if (!email) {
      toast.error('Please enter an email to continue.');
      return;
    }
    setEmailSession(email);
    toast.success('Email session saved. You can access the dashboard now.');
    router.push('/dashboard');
  };

  return (
    <section style={{ paddingTop: '140px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
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
        <h1 style={{ fontSize: '52px', fontWeight: '700', color: '#0a0a0a', lineHeight: '1.08', marginBottom: '20px', letterSpacing: '-0.02em' }}>
          Protect, License, and Monetize Every Creative Asset
        </h1>

        {/* Description */}
        <p style={{ fontSize: '18px', color: '#4b5563', marginBottom: '36px', lineHeight: '1.7' }}>
          DippChain is your end-to-end command center for IP: watermark uploads, one-click Story Protocol registration, programmable licensing, royalty tokens, marketplace listings, and AI-powered infringement detection—all in one flow.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Link 
            href="/dashboard"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '12px 20px', 
              fontSize: '15px', 
              fontWeight: '600', 
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
          <button
            onClick={handleEmailLogin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#0a0a0a',
              backgroundColor: '#f5f5f5',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Mail size={16} />
            Continue with Email
          </button>
        </div>

        {/* Email quick login */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '52px'
        }}>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Enter email to continue"
            style={{
              minWidth: '260px',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #e5e5e5',
              fontSize: '14px'
            }}
          />
          <button
            onClick={handleEmailLogin}
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: '#0a0a0a',
              border: '1px solid #0a0a0a',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Save & Continue
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
            { value: '10K+', label: 'IP assets minted & registered on-chain with Story Protocol' },
            { value: '50K+', label: 'Detections auto-logged with evidence packages' },
            { value: '2M+', label: 'IP tokens & royalty payouts streamed to creators' },
            { value: '99.9%', label: 'Uptime across registry, licensing, and marketplace' },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: '26px', fontWeight: '700', color: '#0a0a0a' }}>{stat.value}</div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', lineHeight: '1.5' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
