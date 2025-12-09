import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ padding: '32px 0', borderTop: '1px solid #e5e5e5' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a' }}>DippChain</span>
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#737373' }}>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
          <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing</a>
          <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        </div>
        <span style={{ fontSize: '13px', color: '#a3a3a3' }}>Built on Story Protocol</span>
      </div>
    </footer>
  );
}
