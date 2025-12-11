// Reusable Progress Indicator Component for Multi-Step Operations
import { Loader2, Check, AlertCircle } from 'lucide-react';

export default function ProgressIndicator({ 
  currentStep, 
  totalSteps, 
  steps = [],
  message = '',
  details = '',
  error = null,
}) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e5e5',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      {/* Title */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
          {message || 'Processing...'}
        </h3>
        {details && (
          <p style={{ fontSize: '13px', color: '#737373' }}>
            {details}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{
        position: 'relative',
        height: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        marginBottom: '24px',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${(currentStep / totalSteps) * 100}%`,
          backgroundColor: error ? '#dc2626' : '#0a0a0a',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Step Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        fontSize: '13px',
        color: '#737373',
      }}>
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
      </div>

      {/* Steps List */}
      {steps.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isPending = stepNumber > currentStep;

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: isCurrent ? '#f5f5f5' : 'transparent',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {/* Icon */}
                <div style={{
                  flexShrink: 0,
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? '#0a0a0a' : isCurrent ? '#0a0a0a' : '#e5e5e5',
                  color: isCompleted ? 'white' : isCurrent ? 'white' : '#a3a3a3',
                }}>
                  {isCompleted ? (
                    <Check size={14} />
                  ) : isCurrent ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: '600' }}>{stepNumber}</span>
                  )}
                </div>

                {/* Step Details */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: isCurrent ? '600' : '500',
                    color: isCompleted ? '#0a0a0a' : isCurrent ? '#0a0a0a' : '#737373',
                    marginBottom: '2px',
                  }}>
                    {step.label}
                  </div>
                  {step.description && (
                    <div style={{
                      fontSize: '12px',
                      color: '#737373',
                    }}>
                      {step.description}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  color: isCompleted ? '#16a34a' : isCurrent ? '#0a0a0a' : '#a3a3a3',
                }}>
                  {isCompleted ? 'Done' : isCurrent ? 'In progress...' : 'Pending'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px',
          marginTop: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
        }}>
          <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
              Error at Step {currentStep}
            </div>
            <div style={{ fontSize: '13px', color: '#991b1b' }}>
              {error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Example usage:
// <ProgressIndicator
//   currentStep={3}
//   totalSteps={7}
//   message="Uploading Your Asset"
//   details="Please wait while we process your file..."
//   steps={[
//     { label: 'Generate Watermark', description: 'Creating unique identifier' },
//     { label: 'Upload to IPFS', description: 'Storing on decentralized network' },
//     { label: 'Create Thumbnail', description: 'Generating preview' },
//     { label: 'Upload Metadata', description: 'Storing asset information' },
//     { label: 'Save to Database', description: 'Creating asset record' },
//     { label: 'Register On-Chain', description: 'Creating blockchain record' },
//     { label: 'Register on Story Protocol', description: 'Registering as IP Asset' },
//   ]}
//   error={null}
// />

