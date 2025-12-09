import { Shield, Eye, Coins, PieChart, Bell, FileCheck, Vote, Scale, Fingerprint } from 'lucide-react';

const features = [
  { icon: Fingerprint, title: 'Invisible Watermarking', desc: 'Embed unique watermarks that survive modifications.' },
  { icon: Shield, title: 'IP Asset Registration', desc: 'Register on Story Protocol with immutable ownership.' },
  { icon: Eye, title: 'AI Sentinel Detection', desc: 'Scan the internet for unauthorized content use.' },
  { icon: Bell, title: 'Real-Time Alerts', desc: 'Instant notifications with evidence packages.' },
  { icon: FileCheck, title: 'PIL Licensing', desc: 'Programmable IP Licenses with custom terms.' },
  { icon: PieChart, title: 'Fractionalization', desc: 'Split IP ownership into tradeable tokens.' },
  { icon: Coins, title: 'IP Token Royalties', desc: 'Earn IP tokens from licenses and sales.' },
  { icon: Vote, title: 'DAO Governance', desc: 'Token holders vote on platform decisions.' },
  { icon: Scale, title: 'Dispute Resolution', desc: 'File disputes with on-chain evidence.' },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: '80px 0', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Everything You Need
          </h2>
          <p style={{ color: '#737373', maxWidth: '440px', margin: '0 auto' }}>
            A complete toolkit to register IP assets, protect your content, and earn royalties on Story Protocol.
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: '#e5e5e5', border: '1px solid #e5e5e5', borderRadius: '8px', overflow: 'hidden' }}>
          {features.map((f) => (
            <div key={f.title} style={{ backgroundColor: 'white', padding: '24px' }}>
              <f.icon style={{ width: '20px', height: '20px', color: '#0a0a0a', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0a0a0a', marginBottom: '6px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: '#737373', lineHeight: '1.5' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
