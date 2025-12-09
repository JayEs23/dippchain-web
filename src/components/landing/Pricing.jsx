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
    <section id="pricing" style={{ padding: '80px 0', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Pricing
          </h2>
          <p style={{ color: '#737373' }}>Start free and scale as you grow.</p>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{ 
                borderRadius: '8px', 
                padding: '24px',
                backgroundColor: plan.featured ? '#0a0a0a' : 'white',
                border: plan.featured ? 'none' : '1px solid #e5e5e5',
                color: plan.featured ? 'white' : '#0a0a0a'
              }}
            >
              {plan.featured && (
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#a3a3a3', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Popular
                </div>
              )}
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{plan.name}</h3>
              <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '32px', fontWeight: '600' }}>{plan.price === 0 ? 'Free' : `${plan.price} IP`}</span>
                {plan.price > 0 && <span style={{ fontSize: '14px', color: plan.featured ? '#a3a3a3' : '#737373' }}>/{plan.period}</span>}
              </div>
              <p style={{ fontSize: '14px', color: plan.featured ? '#a3a3a3' : '#737373', marginBottom: '20px' }}>
                {plan.desc}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '24px' }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '8px' }}>
                    <Check style={{ width: '14px', height: '14px', color: plan.featured ? '#a3a3a3' : '#0a0a0a', flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                style={{ 
                  display: 'block', 
                  padding: '10px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  textAlign: 'center', 
                  borderRadius: '6px',
                  textDecoration: 'none',
                  backgroundColor: plan.featured ? 'white' : '#0a0a0a',
                  color: plan.featured ? '#0a0a0a' : 'white'
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
