// Create Proposal Page
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateProposalPage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    votingStart: '',
    votingEnd: '',
    quorumRequired: '50',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.votingStart || !formData.votingEnd) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.votingEnd) <= new Date(formData.votingStart)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/governance/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: address,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Create proposal failed:', data);
        // Handle error object structure: { error: { message, code, details } }
        const errorMessage = data.error?.message || data.error?.details || data.error || 'Failed to create proposal';
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      toast.success('Proposal created successfully!');
      router.push('/dashboard/governance');
    } catch (error) {
      console.error('Create proposal error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Default dates
  const today = new Date();
  const defaultStart = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const defaultEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <DashboardLayout title="Create Proposal">
      <Link href="/dashboard/governance">
        <button style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          color: '#525252',
          backgroundColor: 'transparent',
          border: '1px solid #e5e5e5',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '24px',
        }}>
          <ArrowLeft size={16} /> Back to Governance
        </button>
      </Link>

      <div style={{
        maxWidth: '100%',
        width: '100%',
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '32px 24px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
          Create Governance Proposal
        </h2>
        <p style={{ fontSize: '14px', color: '#737373', marginBottom: '24px' }}>
          Submit a proposal for the DippChain community to vote on
        </p>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter proposal title"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your proposal in detail..."
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Voting Period */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Voting Start *
              </label>
              <input
                type="datetime-local"
                name="votingStart"
                value={formData.votingStart}
                onChange={handleInputChange}
                min={new Date().toISOString().slice(0, 16)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Voting End *
              </label>
              <input
                type="datetime-local"
                name="votingEnd"
                value={formData.votingEnd}
                onChange={handleInputChange}
                min={formData.votingStart || new Date().toISOString().slice(0, 16)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                }}
              />
            </div>
          </div>

          {/* Quorum */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
              Quorum Required (%)
            </label>
            <input
              type="number"
              name="quorumRequired"
              value={formData.quorumRequired}
              onChange={handleInputChange}
              min="1"
              max="100"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#737373', marginTop: '6px' }}>
              Minimum participation required for the vote to be valid
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !isConnected}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: (loading || !isConnected) ? '#a3a3a3' : '#0a0a0a',
              border: 'none',
              borderRadius: '8px',
              cursor: (loading || !isConnected) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Proposal'
            )}
          </button>

          {!isConnected && (
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#dc2626', marginTop: '12px' }}>
              Please connect your wallet to create a proposal
            </p>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}

