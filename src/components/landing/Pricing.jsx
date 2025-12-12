import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Creator',
    price: 0,
    currency: 'IP',
    period: 'forever',
    desc: 'For individual creators',
    features: ['10 IP asset registrations', 'Basic watermarking', 'Weekly Sentinel scans', 'Community support'],
    cta: 'Get Started',
    featured: false,
  },
  {
    name: 'Professional',
    price: 50,
    currency: 'IP',
    period: 'month',
    desc: 'For serious creators',
    features: ['Unlimited IP registrations', 'Advanced watermarking', 'Daily scans', 'Priority support', 'PIL licensing', 'Royalty analytics'],
    cta: 'Start Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 200,
    currency: 'IP',
    period: 'month',
    desc: 'For teams at scale',
    features: ['Everything in Pro', 'Real-time monitoring', 'Story Protocol API', 'Dedicated manager', 'Legal support'],
    cta: 'Contact Sales',
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" style={{ padding: '100px 0', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '40px', fontWeight: '600', color: '#0a0a0a', marginBottom: '16px', letterSpacing: '-0.03em' }}>
            Pricing
          </h2>
          <p style={{ fontSize: '18px', color: '#737373', maxWidth: '600px', margin: '0 auto', lineHeight: '1.7' }}>
            Start free and scale as you grow.
          </p>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{ 
                borderRadius: '16px', 
                padding: '32px',
                backgroundColor: plan.featured ? '#0a0a0a' : 'white',
                border: plan.featured ? 'none' : '1px solid #e5e5e5',
                color: plan.featured ? 'white' : '#0a0a0a',
                transition: 'all 0.2s ease',
                position: 'relative',
                transform: plan.featured ? 'scale(1.05)' : 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (!plan.featured) {
                  e.currentTarget.style.borderColor = '#0a0a0a';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!plan.featured) {
                  e.currentTarget.style.borderColor = '#e5e5e5';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {plan.featured && (
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  color: '#0a0a0a', 
                  backgroundColor: 'white',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  marginBottom: '16px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  display: 'inline-block'
                }}>
                  Popular
                </div>
              )}
              <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px', letterSpacing: '-0.01em' }}>{plan.name}</h3>
              <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '40px', fontWeight: '700', letterSpacing: '-0.02em' }}>{plan.price === 0 ? 'Free' : `${plan.price} IP`}</span>
                {plan.price > 0 && <span style={{ fontSize: '16px', color: plan.featured ? '#a3a3a3' : '#737373', marginLeft: '4px' }}>/{plan.period}</span>}
              </div>
              <p style={{ fontSize: '15px', color: plan.featured ? '#a3a3a3' : '#737373', marginBottom: '28px', lineHeight: '1.6' }}>
                {plan.desc}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '32px' }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '15px', marginBottom: '12px', lineHeight: '1.5' }}>
                    <Check style={{ width: '18px', height: '18px', color: plan.featured ? '#a3a3a3' : '#0a0a0a', flexShrink: 0, marginTop: '2px' }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                style={{ 
                  display: 'block', 
                  padding: '14px', 
                  fontSize: '15px', 
                  fontWeight: '600', 
                  textAlign: 'center', 
                  borderRadius: '10px',
                  textDecoration: 'none',
                  backgroundColor: plan.featured ? 'white' : '#0a0a0a',
                  color: plan.featured ? '#0a0a0a' : 'white',
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
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
