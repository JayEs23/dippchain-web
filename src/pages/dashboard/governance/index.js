// Governance Page
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Vote, Plus, Clock, CheckCircle, XCircle, 
  ThumbsUp, ThumbsDown, Minus
} from 'lucide-react';
import { formatDate, formatRelativeTime, formatNumber } from '@/lib/utils';

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: { bg: '#f5f5f5', color: '#737373', icon: Clock },
    ACTIVE: { bg: '#dbeafe', color: '#2563eb', icon: Vote },
    PASSED: { bg: '#dcfce7', color: '#16a34a', icon: CheckCircle },
    REJECTED: { bg: '#fee2e2', color: '#dc2626', icon: XCircle },
    EXECUTED: { bg: '#e9d5ff', color: '#9333ea', icon: CheckCircle },
    CANCELLED: { bg: '#f5f5f5', color: '#737373', icon: XCircle },
  };
  
  const style = styles[status] || styles.PENDING;
  const Icon = style.icon;
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontWeight: '500',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      <Icon size={12} />
      {status}
    </span>
  );
};

export default function GovernancePage() {
  const { address, isConnected } = useAppKitAccount();
  
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    fetchProposals();
  }, [activeTab]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab === 'active') params.append('status', 'ACTIVE');
      else if (activeTab === 'passed') params.append('status', 'PASSED');
      else if (activeTab === 'rejected') params.append('status', 'REJECTED');
      
      const response = await fetch(`/api/governance/proposals?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setProposals(data.proposals);
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateVotePercentage = (proposal) => {
    const total = parseFloat(proposal.votesFor) + parseFloat(proposal.votesAgainst) + parseFloat(proposal.votesAbstain);
    if (total === 0) return { for: 0, against: 0, abstain: 0 };
    return {
      for: (parseFloat(proposal.votesFor) / total) * 100,
      against: (parseFloat(proposal.votesAgainst) / total) * 100,
      abstain: (parseFloat(proposal.votesAbstain) / total) * 100,
    };
  };

  return (
    <DashboardLayout title="Governance">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f5f5f5', padding: '4px', borderRadius: '8px' }}>
          {['active', 'passed', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === tab ? '#0a0a0a' : '#737373',
                backgroundColor: activeTab === tab ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <Link href="/dashboard/governance/create">
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '500',
            color: 'white',
            backgroundColor: '#0a0a0a',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}>
            <Plus size={18} />
            Create Proposal
          </button>
        </Link>
      </div>

      {/* Proposals List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#737373' }}>
          Loading proposals...
        </div>
      ) : proposals.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Vote size={28} color="#737373" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
            No proposals found
          </h3>
          <p style={{ fontSize: '14px', color: '#737373', marginBottom: '20px' }}>
            Be the first to create a governance proposal
          </p>
          <Link href="/dashboard/governance/create">
            <button style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: '#0a0a0a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}>
              <Plus size={18} />
              Create Proposal
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {proposals.map((proposal) => {
            const votes = calculateVotePercentage(proposal);
            
            return (
              <div
                key={proposal.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a' }}>
                        {proposal.title}
                      </h3>
                      <StatusBadge status={proposal.status} />
                    </div>
                    <p style={{ fontSize: '14px', color: '#737373', lineHeight: 1.5 }}>
                      {proposal.description.slice(0, 200)}
                      {proposal.description.length > 200 && '...'}
                    </p>
                  </div>
                </div>

                {/* Voting Progress */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                    <div style={{ width: `${votes.for}%`, backgroundColor: '#16a34a' }} />
                    <div style={{ width: `${votes.against}%`, backgroundColor: '#dc2626' }} />
                    <div style={{ width: `${votes.abstain}%`, backgroundColor: '#a3a3a3' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <ThumbsUp size={14} color="#16a34a" />
                      <span style={{ color: '#16a34a' }}>{votes.for.toFixed(1)}% For</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <ThumbsDown size={14} color="#dc2626" />
                      <span style={{ color: '#dc2626' }}>{votes.against.toFixed(1)}% Against</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <Minus size={14} color="#737373" />
                      <span style={{ color: '#737373' }}>{votes.abstain.toFixed(1)}% Abstain</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: '1px solid #f5f5f5',
                }}>
                  <div style={{ fontSize: '13px', color: '#737373' }}>
                    By {proposal.creator?.displayName || 'Unknown'} · {formatRelativeTime(proposal.createdAt)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#737373' }}>
                      {proposal._count?.votes || 0} votes
                    </span>
                    {proposal.status === 'ACTIVE' && (
                      <button style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: '#0a0a0a',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}>
                        Vote Now
                      </button>
                    )}
                    <Link href={`/dashboard/governance/${proposal.id}`}>
                      <button style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#0a0a0a',
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}>
                        View Details
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

