export default function StatCard({ title, value, change, icon: Icon }) {
  const isPositive = change && change.startsWith('+');
  
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e5e5',
      borderRadius: '8px',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: '#737373' }}>{title}</span>
        {Icon && <Icon style={{ width: '16px', height: '16px', color: '#a3a3a3' }} />}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '600', color: '#0a0a0a', marginBottom: '4px' }}>
        {value}
      </div>
      {change && (
        <span style={{ 
          fontSize: '12px', 
          color: isPositive ? '#16a34a' : '#dc2626' 
        }}>
          {change} from last month
        </span>
      )}
    </div>
  );
}

