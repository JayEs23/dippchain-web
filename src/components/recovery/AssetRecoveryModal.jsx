// Asset Recovery Modal - Shows diagnosis and recovery options
import { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, RefreshCw, Upload, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssetRecoveryModal({ asset, onClose, onRecoveryComplete }) {
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const diagnoseAsset = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/assets/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: asset.id }),
      });

      const data = await response.json();
      if (data.success) {
        setDiagnosis(data.diagnosis);
      } else {
        toast.error('Failed to diagnose asset');
      }
    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error('Failed to diagnose asset');
    } finally {
      setLoading(false);
    }
  };

  // Load diagnosis on mount
  useEffect(() => {
    if (asset) {
      diagnoseAsset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  const handleRecovery = async () => {
    if (!diagnosis || !diagnosis.canRecover) return;

    setRecovering(true);
    const toastId = toast.loading('Processing recovery...');

    try {
      let response;
      
      switch (diagnosis.recoveryAction) {
        case 'RE_UPLOAD':
          toast.error('This asset needs to be re-uploaded', { id: toastId });
          onClose();
          return;

        case 'VERIFY_ONCHAIN':
          // Check blockchain and sync data to database
          response = await fetch('/api/assets/verify-onchain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assetId: asset.id,
              contentHash: diagnosis.recoveryData?.contentHash,
              watermarkId: diagnosis.recoveryData?.watermarkId,
            }),
          });
          
          const verifyData = await response.json();
          
          if (verifyData.success && verifyData.onChainStatus === 'REGISTERED') {
            toast.success(`Found on blockchain! Token ID: ${verifyData.tokenId}`, { id: toastId });
          } else if (verifyData.onChainStatus === 'NOT_REGISTERED') {
            toast.error('Asset not found on blockchain. You may need to register it.', { id: toastId });
          }
          break;

        case 'REGISTER_ONCHAIN':
          // User needs to sign transaction - show instructions
          toast('Please complete on-chain registration manually', { 
            id: toastId,
            icon: 'ℹ️',
          });
          // Could navigate to upload page with asset data
          window.location.href = `/dashboard/upload?recover=${asset.id}`;
          return;

        case 'REGISTER_STORY_PROTOCOL':
          response = await fetch('/api/assets/register-ip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assetId: asset.id,
              tokenId: diagnosis.recoveryData.tokenId,
              ipMetadataURI: diagnosis.recoveryData.ipMetadataURI,
              ipMetadataHash: '0x' + diagnosis.recoveryData.ipMetadataHash,
              nftMetadataURI: diagnosis.recoveryData.ipMetadataURI,
              nftMetadataHash: '0x' + diagnosis.recoveryData.ipMetadataHash,
              licenseType: 'COMMERCIAL_USE',
            }),
          });
          break;

        case 'UPDATE_STATUS':
          response = await fetch(`/api/assets/${asset.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'REGISTERED' }),
          });
          break;

        default:
          toast.error('Unknown recovery action', { id: toastId });
          return;
      }

      if (response && response.ok) {
        toast.success('Recovery completed successfully!', { id: toastId });
        if (onRecoveryComplete) onRecoveryComplete();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Recovery failed', { id: toastId });
      }
    } catch (error) {
      console.error('Recovery error:', error);
      toast.error('Recovery failed: ' + error.message, { id: toastId });
    } finally {
      setRecovering(false);
    }
  };

  if (!asset) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e5e5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a' }}>
            Asset Recovery Diagnostic
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Asset Info */}
          <div style={{
            padding: '16px',
            backgroundColor: '#fafafa',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              {asset.title}
            </p>
            <p style={{ fontSize: '12px', color: '#737373' }}>
              Status: <span style={{ fontWeight: '500' }}>{asset.status}</span>
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p>Analyzing asset...</p>
            </div>
          ) : diagnosis ? (
            <>
              {/* Completed Steps */}
              {diagnosis.completedSteps.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
                    ✅ Completed Steps
                  </h3>
                  {diagnosis.completedSteps.map((step) => (
                    <div
                      key={step.step}
                      style={{
                        padding: '12px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={16} color="#16a34a" />
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#16a34a' }}>
                          Step {step.step}: {step.name}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#525252', marginTop: '4px', marginLeft: '24px' }}>
                        {Object.entries(step.data).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {typeof value === 'string' && value.length > 40 
                              ? value.slice(0, 40) + '...' 
                              : String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Failed Step */}
              {diagnosis.failedStep && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
                    ⚠️ Failed Step
                  </h3>
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <AlertTriangle size={16} color="#dc2626" />
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#dc2626' }}>
                        Step {diagnosis.failedStep.step}: {diagnosis.failedStep.name}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#525252', marginLeft: '24px' }}>
                      {diagnosis.failedStep.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Recovery Action */}
              <div style={{
                padding: '16px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                marginBottom: '20px',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
                  📋 Recovery Plan
                </h3>
                <p style={{ fontSize: '13px', color: '#525252', marginBottom: '12px' }}>
                  {diagnosis.reason}
                </p>
                
                {!diagnosis.canRecover && (
                  <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>
                    ⚠️ Automatic recovery not possible. Manual re-upload required.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#0a0a0a',
                    backgroundColor: 'white',
                    border: '1px solid #d4d4d4',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                
                {diagnosis.canRecover && (
                  <button
                    onClick={handleRecovery}
                    disabled={recovering}
                    style={{
                      flex: 1,
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'white',
                      backgroundColor: recovering ? '#a3a3a3' : '#2563eb',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: recovering ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {recovering ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Recovering...
                      </>
                    ) : (
                      <>
                        {diagnosis.recoveryAction === 'VERIFY_ONCHAIN' && '🔍 Verify Blockchain'}
                        {diagnosis.recoveryAction === 'REGISTER_ONCHAIN' && <><Link2 size={16} /> Register On-Chain</>}
                        {diagnosis.recoveryAction === 'REGISTER_STORY_PROTOCOL' && <><Link2 size={16} /> Register on Story</>}
                        {diagnosis.recoveryAction === 'UPDATE_STATUS' && <><Check size={16} /> Fix Status</>}
                        {diagnosis.recoveryAction === 'RE_UPLOAD' && <><Upload size={16} /> Go to Upload</>}
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>
              <p>Failed to load diagnosis</p>
              <button
                onClick={diagnoseAsset}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  color: '#2563eb',
                  backgroundColor: 'transparent',
                  border: '1px solid #2563eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

