export default function StatCard({ title, value, change, icon: Icon }) {
  const isPositive = change && change.startsWith('+');
  
  return (
    <>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '24px',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#d4d4d4';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e5e5';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#737373', fontWeight: '500', letterSpacing: '0.01em' }}>{title}</span>
          {Icon && (
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon style={{ width: '18px', height: '18px', color: '#525252' }} />
            </div>
          )}
        </div>
        <div style={{ fontSize: '32px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
          {value}
        </div>
        {change && (
          <span style={{ 
            fontSize: '12px', 
            color: isPositive ? '#16a34a' : '#dc2626',
            fontWeight: '500'
          }}>
            {change} from last month
          </span>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          div {
            padding: 20px !important;
          }
          div > div:nth-child(2) {
            font-size: 26px !important;
          }
        }
      `}</style>
    </>
  );
}
