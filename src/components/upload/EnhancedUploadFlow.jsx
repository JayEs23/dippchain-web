// Enhanced Upload Flow Component with Progress Reporting
// Modern Story Protocol integration with smooth animations

import { useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle2, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import ProgressIndicator from '@/components/ui/ProgressIndicator';
import toast from 'react-hot-toast';

// Upload steps configuration
const UPLOAD_STEPS = [
  { 
    id: 1, 
    label: 'Generate Identifiers', 
    description: 'Creating unique watermark and content hash' 
  },
  { 
    id: 2, 
    label: 'Apply Watermark', 
    description: 'Embedding invisible watermark (images only)' 
  },
  { 
    id: 3, 
    label: 'Upload to IPFS', 
    description: 'Storing file on decentralized network' 
  },
  { 
    id: 4, 
    label: 'Create Thumbnail', 
    description: 'Generating preview image' 
  },
  { 
    id: 5, 
    label: 'Upload Metadata', 
    description: 'Storing asset information' 
  },
  { 
    id: 6, 
    label: 'Save to Database', 
    description: 'Creating asset record' 
  },
  { 
    id: 7, 
    label: 'Register IP Asset', 
    description: 'One-transaction registration with Story Protocol' 
  },
];

export default function EnhancedUploadFlow({
  file,
  formData,
  assetType,
  onComplete,
  onError,
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState('Initializing...');

  const updateProgress = (step, message) => {
    setCurrentStep(step);
    setDetails(message);
  };

  const handleUpload = async () => {
    try {
      setError(null);

      // Step 1: Generate Identifiers
      updateProgress(1, 'Generating unique identifiers...');
      const { generateWatermarkId, generateContentHash } = await import('@/lib/utils');
      const watermarkId = generateWatermarkId();
      const contentHash = await generateContentHash(file);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX

      // Step 2: Apply Watermark (if image)
      let processedFile = file;
      if (formData.enableWatermark && assetType === 'IMAGE') {
        updateProgress(2, 'Embedding invisible watermark...');
        try {
          const { embedImageWatermark } = await import('@/lib/watermark');
          const watermarkResult = await embedImageWatermark(file, watermarkId);
          processedFile = watermarkResult.file;
        } catch (err) {
          console.warn('Watermark skipped:', err.message);
        }
      } else {
        setCurrentStep(2);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Step 3: Upload to IPFS
      updateProgress(3, 'Uploading to IPFS...');
      const uploadFormData = new FormData();
      uploadFormData.append('file', processedFile);
      uploadFormData.append('metadata', JSON.stringify({
        name: formData.title,
        watermarkId,
        assetType,
        contentHash,
      }));

      const uploadResponse = await fetch('/api/assets/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.details || error.error || 'IPFS upload failed');
      }

      const uploadData = await uploadResponse.json();

      // Step 4: Create Thumbnail
      let thumbnailData = null;
      if (assetType === 'IMAGE') {
        updateProgress(4, 'Creating thumbnail...');
        try {
          const { createThumbnail } = await import('@/lib/watermark');
          const thumbnail = await createThumbnail(processedFile);
          
          const thumbFormData = new FormData();
          thumbFormData.append('file', thumbnail);
          thumbFormData.append('metadata', JSON.stringify({ name: `thumb_${formData.title}` }));
          
          const thumbResponse = await fetch('/api/assets/upload', {
            method: 'POST',
            body: thumbFormData,
          });
          
          if (thumbResponse.ok) {
            thumbnailData = await thumbResponse.json();
          }
        } catch (err) {
          console.warn('Thumbnail skipped:', err.message);
        }
      } else {
        setCurrentStep(4);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Step 5: Upload Metadata
      updateProgress(5, 'Uploading metadata...');
      const { generateMetadata } = await import('@/lib/watermark');
      const metadata = await generateMetadata(processedFile, {
        title: formData.title,
        description: formData.description,
        creator: formData.title,
        tags: formData.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
        watermarkId,
      });
      metadata.image = uploadData.url;

      const metadataResponse = await fetch('/api/assets/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          metadata, 
          name: `${formData.title}_metadata.json` 
        }),
      });

      const metadataData = metadataResponse.ok ? await metadataResponse.json() : null;

      // Step 6: Save to Database
      updateProgress(6, 'Saving asset record...');
      const createResponse = await fetch('/api/assets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formData.userId,
          title: formData.title,
          description: formData.description,
          assetType,
          originalFileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          pinataCid: uploadData.cid,
          pinataUrl: uploadData.url,
          thumbnailCid: thumbnailData?.cid,
          thumbnailUrl: thumbnailData?.url,
          watermarkId,
          metadataHash: metadataData?.cid,
          contentHash,
          visibility: formData.visibility,
        }),
      });

      const createResult = await createResponse.json();
      
      if (!createResponse.ok || !createResult.success) {
        throw new Error(createResult.error?.message || 'Failed to save asset');
      }

      const asset = createResult.data.asset;
      setUploadResult({
        asset,
        uploadData,
        thumbnailData,
        metadataData,
        watermarkId,
        contentHash,
      });

      // Step 7: Register IP Asset (if enabled)
      if (formData.registerStoryProtocol) {
        updateProgress(7, 'Registering on Story Protocol (one transaction)...');
        
        const registerResponse = await fetch('/api/assets/register-ip-modern', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetId: asset.id,
            licenseType: formData.licenseType || 'COMMERCIAL_USE',
            commercialRevShare: formData.commercialRevShare || 5,
            defaultMintingFee: formData.mintingFee || '10000000000000000000',
          }),
        });

        const registerResult = await registerResponse.json();
        
        if (!registerResponse.ok || !registerResult.success) {
          console.error('Registration failed:', registerResult);
          // Don't throw - asset is uploaded, just registration failed
          setError('Asset uploaded but Story Protocol registration failed. You can retry later.');
        } else {
          setRegistrationResult({
            ipId: registerResult.data.ipId,
            tokenId: registerResult.data.tokenId,
            txHash: registerResult.data.txHash,
            licenseTermsId: registerResult.data.licenseTermsId,
            explorerUrl: registerResult.data.explorerUrl,
          });
        }
      }

      // Success!
      setCurrentStep(UPLOAD_STEPS.length);
      setDetails('Upload complete!');
      
      if (onComplete) {
        onComplete({
          uploadResult: {
            ...uploadResult,
            asset,
          },
          registrationResult,
        });
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      
      if (onError) {
        onError(err);
      }
    }
  };

  // Auto-start upload on mount
  useState(() => {
    handleUpload();
  }, []);

  const isComplete = currentStep === UPLOAD_STEPS.length && !error;
  const hasFailed = !!error;

  return (
    <div>
      {/* Progress Indicator */}
      {!isComplete && !hasFailed && (
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={UPLOAD_STEPS.length}
          steps={UPLOAD_STEPS}
          message={currentStep === 0 ? 'Starting upload...' : UPLOAD_STEPS[currentStep - 1]?.label}
          details={details}
          error={error}
        />
      )}

      {/* Success State */}
      {isComplete && (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          {/* Success Animation */}
          <div style={{
            display: 'inline-flex',
            padding: '24px',
            backgroundColor: '#f0fdf4',
            borderRadius: '50%',
            marginBottom: '24px',
            animation: 'scaleIn 0.5s ease-out',
          }}>
            <CheckCircle2 size={64} color="#16a34a" />
          </div>

          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#0a0a0a',
            marginBottom: '12px',
          }}>
            Asset Registered Successfully!
          </h2>

          <p style={{
            fontSize: '16px',
            color: '#737373',
            marginBottom: '32px',
          }}>
            Your asset is now protected and ready for fractionalization
          </p>

          {/* Registration Details */}
          {registrationResult && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'left',
              marginBottom: '24px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}>
                <Sparkles size={20} color="#8b5cf6" />
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#0a0a0a',
                }}>
                  Story Protocol Details
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gap: '12px',
                fontSize: '14px',
              }}>
                <div>
                  <span style={{ color: '#737373' }}>IP Asset ID:</span>
                  <br />
                  <code style={{
                    fontSize: '12px',
                    backgroundColor: '#f5f5f5',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    wordBreak: 'break-all',
                  }}>
                    {registrationResult.ipId}
                  </code>
                </div>

                <div>
                  <span style={{ color: '#737373' }}>Token ID:</span>
                  <strong style={{ marginLeft: '8px' }}>#{registrationResult.tokenId}</strong>
                </div>

                <div>
                  <span style={{ color: '#737373' }}>License Terms:</span>
                  <strong style={{ marginLeft: '8px', color: '#16a34a' }}>
                    ✓ Attached (Royalty Vault Created)
                  </strong>
                </div>
              </div>

              <a
                href={registrationResult.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '16px',
                  fontSize: '14px',
                  color: '#8b5cf6',
                  textDecoration: 'underline',
                }}
              >
                View on Story Explorer <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
            <button
              onClick={() => router.push('/dashboard/fractions/create')}
              style={{
                padding: '14px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: '#8b5cf6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Fractionalize Now
            </button>
            <button
              onClick={() => router.push('/dashboard/assets')}
              style={{
                padding: '14px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#0a0a0a',
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              View My Assets
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasFailed && (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '24px',
            backgroundColor: '#fef2f2',
            borderRadius: '50%',
            marginBottom: '24px',
          }}>
            <AlertCircle size={64} color="#dc2626" />
          </div>

          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#0a0a0a',
            marginBottom: '12px',
          }}>
            Upload Failed
          </h2>

          <p style={{
            fontSize: '16px',
            color: '#737373',
            marginBottom: '32px',
          }}>
            {error}
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '14px 24px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: '#0a0a0a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

