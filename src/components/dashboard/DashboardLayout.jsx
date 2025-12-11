import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ children, title }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#fafafa' }}>
        <Sidebar mobileMenuOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
        <div style={{ flex: 1, marginLeft: '240px' }}>
          <Topbar title={title} onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
          <main style={{ padding: '24px 16px', maxWidth: '100%' }}>
            {children}
          </main>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 767px) {
          div {
            margin-left: 0 !important;
          }
          main {
            padding: 16px 12px !important;
          }
        }
        
        @media (min-width: 1200px) {
          main {
            padding: 32px 24px !important;
          }
        }
        
        @media (min-width: 1600px) {
          main {
            padding: 40px 32px !important;
          }
        }
      `}</style>
    </>
  );
}
