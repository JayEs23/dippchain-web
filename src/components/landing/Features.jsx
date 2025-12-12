import { Shield, Eye, Coins, PieChart, Bell, FileCheck, Vote, Scale, Fingerprint } from 'lucide-react';

const features = [
  { icon: Fingerprint, title: 'Invisible Watermarking', desc: 'Embed resilient, invisible fingerprints tied to your IP metadata so derivatives and crops remain attributable.' },
  { icon: Shield, title: 'Story Protocol Registration', desc: 'One-transaction SPG flow: mint NFT, register IP, attach PIL terms, and open a royalty vault with hashes pinned to IPFS.' },
  { icon: Eye, title: 'AI Sentinel Detection', desc: 'Similarity + metadata checks across socials, marketplaces, and the open web to flag misuse—even when assets are modified.' },
  { icon: Bell, title: 'Real-Time Alerts', desc: 'Auto-generate evidence (URLs, screenshots, timestamps, hashes) and notify you the moment misuse is detected.' },
  { icon: FileCheck, title: 'Programmable Licensing', desc: 'Preset PIL terms (commercial, remix, non-commercial) with rev-share, minting fees, and attribution baked in.' },
  { icon: PieChart, title: 'Fractionalization', desc: 'Issue 100M ERC20 royalty tokens per IP so collaborators and fans can co-own and share upside.' },
  { icon: Coins, title: 'IP Token Royalties', desc: 'Route licensing fees into the IP vault and stream payouts to token holders with on-chain accounting.' },
  { icon: Vote, title: 'DAO Governance', desc: 'Token-weighted proposals for derivatives, collaborations, pricing changes, and enforcement strategy.' },
  { icon: Scale, title: 'Dispute & Evidence', desc: 'Escalate to disputes with Story Protocol modules and submit cryptographically anchored evidence packs.' },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: '100px 0', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '40px', fontWeight: '600', color: '#0a0a0a', marginBottom: '16px', letterSpacing: '-0.03em' }}>
            Everything You Need
          </h2>
          <p style={{ fontSize: '18px', color: '#737373', maxWidth: '600px', margin: '0 auto', lineHeight: '1.7' }}>
            A complete toolkit to register, protect, license, fractionalize, and monetize your IP with Story Protocol—without juggling multiple dashboards.
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {features.map((f) => (
            <div 
              key={f.title} 
              style={{ 
                backgroundColor: 'white', 
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid #e5e5e5',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0a0a0a';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <f.icon style={{ width: '24px', height: '24px', color: '#0a0a0a' }} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0a0a0a', marginBottom: '10px', letterSpacing: '-0.01em' }}>{f.title}</h3>
              <p style={{ fontSize: '15px', color: '#737373', lineHeight: '1.6' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
