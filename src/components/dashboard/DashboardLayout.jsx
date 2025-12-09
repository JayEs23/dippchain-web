import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ children, title }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '240px' }}>
        <Topbar title={title} />
        <main style={{ padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

