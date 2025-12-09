// Asset Upload Page
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider, Contract, getAddress } from 'ethers';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FileDropzone from '@/components/upload/FileDropzone';
import { Upload, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { generateWatermarkId, generateContentHash, formatFileSize } from '@/lib/utils';
import { embedImageWatermark, generateMetadata, createThumbnail } from '@/lib/watermark';
import { CONTRACTS } from '@/contracts/addresses';
import DippChainRegistryABI from '@/contracts/abis/DippChainRegistry.json';

const STEPS = [
  { id: 'select', label: 'Select File' },
  { id: 'details', label: 'Add Details' },
  { id: 'process', label: 'Process & Upload' },
  { id: 'register', label: 'Register On-Chain' },
];

export default function UploadPage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState(null);
  const [assetType, setAssetType] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    visibility: 'PRIVATE',
    enableWatermark: true,
    registerOnChain: true,
    registerStoryProtocol: true, // Register on Story Protocol
  });
  
  // Upload results
  const [uploadResult, setUploadResult] = useState(null);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [storyProtocolResult, setStoryProtocolResult] = useState(null);

  const handleFileSelect = useCallback((selectedFile, type) => {
    setFile(selectedFile);
    setAssetType(type);
    setFormData(prev => ({
      ...prev,
      title: selectedFile.name.replace(/\.[^/.]+$/, ''),
    }));
    setCurrentStep(1);
  }, []);

  const handleClearFile = useCallback(() => {
    setFile(null);
    setAssetType(null);
    setCurrentStep(0);
    setUploadResult(null);
    setRegistrationResult(null);
    setStoryProtocolResult(null);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const processAndUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }
    
    if (!isConnected) {
      toast.error('Please connect your wallet to continue');
      return;
    }

    setProcessing(true);
    setCurrentStep(2);
    const toastId = toast.loading('Processing your asset...');

    // Step 1: Generate watermark ID and content hash
    let watermarkId, contentHash;
    try {
      watermarkId = generateWatermarkId();
      contentHash = await generateContentHash(file);
    } catch (err) {
      console.error('Hash generation error:', err);
      toast.error('Failed to process file. Please try again.', { id: toastId });
      setCurrentStep(1);
      setProcessing(false);
      return;
    }
    
    // Step 2: Apply watermark (for images)
    let processedFile = file;
    if (formData.enableWatermark && assetType === 'IMAGE') {
      try {
        toast.loading('Embedding watermark...', { id: toastId });
        const watermarkResult = await embedImageWatermark(file, watermarkId);
        processedFile = watermarkResult.file;
      } catch (err) {
        console.error('Watermark error:', err);
        // Continue without watermark - non-critical error
        toast.loading('Watermark skipped, continuing upload...', { id: toastId });
      }
    }

    // Step 3: Create thumbnail
    let thumbnail = null;
    try {
      toast.loading('Creating thumbnail...', { id: toastId });
      thumbnail = await createThumbnail(processedFile);
    } catch (err) {
      console.error('Thumbnail error:', err);
      // Continue without thumbnail - non-critical error
    }

    // Step 4: Upload to Pinata
    let uploadData;
    try {
      toast.loading('Uploading to IPFS...', { id: toastId });
      
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

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResponse.ok || !uploadResult.success) {
        toast.error(uploadResult.details || uploadResult.error || 'IPFS upload failed. Check your Pinata credentials.', { id: toastId });
        setCurrentStep(1);
        setProcessing(false);
        return;
      }

      uploadData = uploadResult;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload to IPFS. Please check your connection and try again.', { id: toastId });
      setCurrentStep(1);
      setProcessing(false);
      return;
    }

    // Step 5: Upload thumbnail (non-critical)
    let thumbnailData = null;
    if (thumbnail) {
      try {
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
        console.error('Thumbnail upload error:', err);
        // Continue without thumbnail
      }
    }

    // Step 6: Generate and upload metadata
    let metadataData = null;
    try {
      toast.loading('Uploading metadata...', { id: toastId });
      const metadata = await generateMetadata(processedFile, {
        title: formData.title,
        description: formData.description,
        creator: formData.title,
        creatorAddress: address,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        watermarkId,
      });
      metadata.image = uploadData.url;
      if (metadata.ipMetadata) {
        metadata.ipMetadata.ipMetadataURI = uploadData.url;
        metadata.ipMetadata.nftMetadataURI = uploadData.url;
      }

      const metadataResponse = await fetch('/api/assets/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata, name: `${formData.title}_metadata.json` }),
      });

      if (metadataResponse.ok) {
        metadataData = await metadataResponse.json();
      }
    } catch (err) {
      console.error('Metadata upload error:', err);
      // Continue without metadata - non-critical
    }

    // Step 7: Create asset in database
    let asset;
    try {
      toast.loading('Saving asset...', { id: toastId });
      const createResponse = await fetch('/api/assets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: address,
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
        toast.error(createResult.error || 'Failed to save asset to database', { id: toastId });
        setCurrentStep(1);
        setProcessing(false);
        return;
      }

      asset = createResult.asset;
    } catch (err) {
      console.error('Database save error:', err);
      toast.error('Failed to save asset. Please try again.', { id: toastId });
      setCurrentStep(1);
      setProcessing(false);
      return;
    }

    // Success!
    setUploadResult({
      asset,
      uploadData,
      thumbnailData,
      metadataData,
      watermarkId,
      contentHash,
    });

    toast.success('Asset uploaded successfully!', { id: toastId });
    setProcessing(false);

    // Move to registration step if enabled
    if (formData.registerOnChain) {
      setCurrentStep(3);
    }
  };

  const registerOnChain = async () => {
    if (!uploadResult) {
      toast.error('Please complete the upload step first');
      return;
    }
    
    if (!walletProvider) {
      toast.error('Please connect your wallet to register on-chain');
      return;
    }

    setProcessing(true);
    const toastId = toast.loading('Registering on blockchain...');

    // Step 1: Initialize provider and signer
    let provider, signer;
    try {
      provider = new BrowserProvider(walletProvider);
      signer = await provider.getSigner();
    } catch (err) {
      console.error('Wallet connection error:', err);
      toast.error('Failed to connect to wallet. Please try reconnecting.', { id: toastId });
      setProcessing(false);
      return;
    }
    
    // Step 2: Initialize contract (checksum address for ethers v6)
    let registry;
    try {
      // Convert to lowercase first then checksum to handle any format
      const registryAddress = getAddress(CONTRACTS.DippChainRegistry.toLowerCase());
      registry = new Contract(
        registryAddress,
        DippChainRegistryABI,
        signer
      );
    } catch (err) {
      console.error('Contract initialization error:', err);
      toast.error('Failed to initialize contract. Please refresh and try again.', { id: toastId });
      setProcessing(false);
      return;
    }

    // Step 3: Prepare and send transaction
    let receipt, tokenId;
    try {
      // Contract expects: registerAsset(contentHash, metadataUri, watermarkId)
      const contentHash = uploadResult.contentHash; // string, NOT bytes
      const metadataUri = uploadResult.metadataData?.url || uploadResult.uploadData.url;
      const watermarkId = uploadResult.watermarkId;
      
      console.log('Calling registerAsset with:', { contentHash, metadataUri, watermarkId });

      toast.loading('Please confirm the transaction in your wallet...', { id: toastId });
      
      const tx = await registry.registerAsset(
        contentHash,    // 1st param: contentHash (string)
        metadataUri,    // 2nd param: metadataUri (string)  
        watermarkId     // 3rd param: watermarkId (string)
      );

      toast.loading('Transaction submitted! Waiting for confirmation...', { id: toastId });
      receipt = await tx.wait();
      
      // Debug: Log all receipt data
      console.log('=== TRANSACTION RECEIPT ===');
      console.log('Transaction hash:', receipt.hash);
      console.log('Block number:', receipt.blockNumber);
      console.log('Number of logs:', receipt.logs?.length);
      
      // Debug: Log all logs
      receipt.logs?.forEach((log, i) => {
        console.log(`Log ${i}:`, {
          address: log.address,
          topics: log.topics,
          data: log.data?.slice(0, 100) + '...',
        });
      });

      // Get token ID from event (try multiple methods)
      try {
        // Method 1: Parse logs for AssetRegistered event (tokenId is topics[1])
        console.log('Trying Method 1: Parse AssetRegistered event...');
        for (const log of receipt.logs) {
          try {
            const parsed = registry.interface.parseLog({
              topics: log.topics,
              data: log.data,
            });
            console.log('Parsed event:', parsed?.name, parsed?.args);
            if (parsed && parsed.name === 'AssetRegistered') {
              tokenId = Number(parsed.args.tokenId);
              console.log('✅ Found tokenId from AssetRegistered:', tokenId);
              break;
            }
          } catch (parseErr) {
            // Not a matching event, continue
          }
        }
        
        // Method 2: Look for Transfer event (tokenId is topics[3] for ERC721)
        if (!tokenId) {
          console.log('Trying Method 2: Parse Transfer event...');
          const transferEventSig = registry.interface.getEvent('Transfer').topicHash;
          console.log('Transfer event signature:', transferEventSig);
          
          const transferEvent = receipt.logs.find(
            log => log.topics && log.topics[0] === transferEventSig
          );
          
          if (transferEvent) {
            console.log('Found Transfer event:', transferEvent.topics);
            if (transferEvent.topics[3]) {
              tokenId = parseInt(transferEvent.topics[3], 16);
              console.log('✅ Found tokenId from Transfer:', tokenId);
            }
          } else {
            console.log('No Transfer event found');
          }
        }
        
        // Method 3: Read totalAssets from contract (current tokenId = totalAssets)
        if (!tokenId) {
          console.log('Trying Method 3: Read totalAssets...');
          try {
            const total = await registry.totalAssets();
            tokenId = Number(total);
            console.log('✅ Found tokenId from totalAssets:', tokenId);
          } catch (totalErr) {
            console.log('totalAssets failed:', totalErr.message);
          }
        }
        
        console.log('=== FINAL TOKEN ID:', tokenId, '===');
      } catch (err) {
        console.error('Event parsing error:', err);
        // Continue without token ID
      }
    } catch (err) {
      console.error('Transaction error:', err);
      
      // Parse common error messages
      let errorMessage = 'Transaction failed';
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection';
      } else if (err.shortMessage) {
        errorMessage = err.shortMessage;
      }
      
      toast.error(errorMessage, { id: toastId });
      setProcessing(false);
      return;
    }

    // Step 4: Update database (non-critical)
    try {
      await fetch('/api/assets/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: uploadResult.asset.id,
          txHash: receipt.hash,
          tokenId,
        }),
      });
    } catch (err) {
      console.error('Database update error:', err);
      // Continue - transaction was successful
    }

    setRegistrationResult({
      txHash: receipt.hash,
      tokenId,
      blockNumber: receipt.blockNumber,
    });

    toast.success('Asset registered on-chain!', { id: toastId });

    // Step 5: Register on Story Protocol if enabled
    if (formData.registerStoryProtocol && tokenId) {
      await registerOnStoryProtocol(tokenId);
    }
    
    setProcessing(false);
  };

  const registerOnStoryProtocol = async (tokenId) => {
    // Guard against null/undefined tokenId
    if (!tokenId) {
      toast.error('Token ID not available. Please register on DippChain first.');
      return;
    }

    const toastId = toast.loading('Registering on Story Protocol...');

    try {
      const response = await fetch('/api/assets/register-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: uploadResult.asset.id,
          tokenId: String(tokenId),
          ipMetadataURI: uploadResult.metadataData?.url || uploadResult.uploadData.url,
          ipMetadataHash: '0x' + uploadResult.contentHash,
          nftMetadataURI: uploadResult.metadataData?.url || uploadResult.uploadData.url,
          nftMetadataHash: '0x' + uploadResult.contentHash,
          licenseType: 'COMMERCIAL_USE',
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('Response parse error:', parseErr);
        toast.error('Story Protocol registration failed. Please try again later.', { id: toastId });
        return;
      }

      if (!response.ok) {
        const errorMessage = data.error || data.details || 'Story Protocol registration failed';
        toast.error(errorMessage, { id: toastId });
        return;
      }

      setStoryProtocolResult({
        ipId: data.ipId,
        txHash: data.txHash,
        licenseAttached: data.licenseAttached,
        explorerUrl: data.explorerUrl,
      });

      toast.success('Registered on Story Protocol!', { id: toastId });
    } catch (error) {
      console.error('Story Protocol error:', error);
      
      // User-friendly error messages
      let errorMessage = 'Story Protocol registration failed';
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      toast.error(errorMessage, { id: toastId });
    }
  };

  return (
    <DashboardLayout title="Upload Asset">
      {/* Progress Steps */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '32px',
        padding: '0 20px',
      }}>
        {STEPS.map((step, index) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: index <= currentStep ? '#0a0a0a' : '#f5f5f5',
              color: index <= currentStep ? 'white' : '#737373',
              fontSize: '13px',
              fontWeight: '500',
            }}>
              {index < currentStep ? (
                <Check size={14} />
              ) : (
                <span>{index + 1}</span>
              )}
              <span>{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div style={{
                width: '24px',
                height: '2px',
                backgroundColor: index < currentStep ? '#0a0a0a' : '#e5e5e5',
                margin: '0 4px',
              }} />
            )}
          </div>
        ))}
      </div>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '32px',
      }}>
        {/* Step 1: File Selection */}
        {currentStep <= 1 && (
          <>
            <FileDropzone
              onFileSelect={handleFileSelect}
              selectedFile={file}
              onClear={handleClearFile}
              disabled={processing}
            />

            {currentStep === 1 && (
              <>
                {/* Asset Details Form */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#0a0a0a', marginBottom: '6px' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter asset title"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '14px',
                      border: '1px solid #d4d4d4',
                      borderRadius: '8px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#0a0a0a', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your asset"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '14px',
                      border: '1px solid #d4d4d4',
                      borderRadius: '8px',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#0a0a0a', marginBottom: '6px' }}>
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="art, digital, photography"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '14px',
                      border: '1px solid #d4d4d4',
                      borderRadius: '8px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#0a0a0a', marginBottom: '6px' }}>
                    Visibility
                  </label>
                  <select
                    name="visibility"
                    value={formData.visibility}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '14px',
                      border: '1px solid #d4d4d4',
                      borderRadius: '8px',
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="PRIVATE">Private</option>
                    <option value="PUBLIC">Public</option>
                    <option value="LICENSED">Licensed Only</option>
                  </select>
                </div>

                {/* Options */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '8px',
                  marginBottom: '24px',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '12px' }}>
                    <input
                      type="checkbox"
                      name="enableWatermark"
                      checked={formData.enableWatermark}
                      onChange={handleInputChange}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#0a0a0a' }}>
                      Embed invisible watermark
                    </span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="registerOnChain"
                      checked={formData.registerOnChain}
                      onChange={handleInputChange}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#0a0a0a' }}>
                      Register on DippChain Registry (on-chain)
                    </span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="registerStoryProtocol"
                      checked={formData.registerStoryProtocol}
                      onChange={handleInputChange}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#0a0a0a' }}>
                      Register as IP Asset on Story Protocol
                    </span>
                  </label>
                </div>

                <button
                  onClick={processAndUpload}
                  disabled={!formData.title || processing || !isConnected}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: (!formData.title || processing || !isConnected) ? '#a3a3a3' : '#0a0a0a',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (!formData.title || processing || !isConnected) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {processing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Upload & Process
                    </>
                  )}
                </button>

                {!isConnected && (
                  <p style={{ textAlign: 'center', fontSize: '13px', color: '#dc2626', marginTop: '12px' }}>
                    Please connect your wallet to upload
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* Step 3: Registration */}
        {currentStep >= 2 && uploadResult && (
          <div>
            {/* Upload Success Summary */}
            <div style={{
              padding: '20px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#16a34a" />
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#16a34a' }}>
                  Upload Complete!
                </span>
              </div>
              
              <div style={{ fontSize: '13px', color: '#525252' }}>
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>IPFS CID:</strong> {uploadResult.uploadData.cid}</p>
                <p><strong>Watermark ID:</strong> {uploadResult.watermarkId}</p>
              </div>
              
              <a
                href={uploadResult.uploadData.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '12px',
                  fontSize: '13px',
                  color: '#0a0a0a',
                  textDecoration: 'underline',
                }}
              >
                View on IPFS <ExternalLink size={14} />
              </a>
            </div>

            {/* On-chain Registration */}
            {formData.registerOnChain && !registrationResult && (
              <div style={{
                padding: '20px',
                backgroundColor: '#fafafa',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
                  Register on DippChain
                </h3>
                <p style={{ fontSize: '13px', color: '#737373', marginBottom: '16px' }}>
                  Registering your asset on-chain creates an immutable record of ownership and enables licensing, fractionalization, and protection features.
                </p>
                
                <button
                  onClick={registerOnChain}
                  disabled={processing}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: processing ? '#a3a3a3' : '#0a0a0a',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {processing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register On-Chain'
                  )}
                </button>
              </div>
            )}

            {/* Registration Success */}
            {registrationResult && (
              <div style={{
                padding: '20px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Check size={20} color="#16a34a" />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#16a34a' }}>
                    Registered On-Chain!
                  </span>
                </div>
                
                <div style={{ fontSize: '13px', color: '#525252' }}>
                  <p><strong>Token ID:</strong> {registrationResult.tokenId ? `#${registrationResult.tokenId}` : 'Pending...'}</p>
                  <p><strong>Block:</strong> {registrationResult.blockNumber}</p>
                  <p><strong>Content Hash:</strong> {uploadResult.contentHash?.slice(0, 16)}...</p>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                  <a
                    href={`https://aeneid.storyscan.io/tx/${registrationResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      color: '#0a0a0a',
                      textDecoration: 'underline',
                    }}
                  >
                    View Transaction <ExternalLink size={14} />
                  </a>
                  <a
                    href={`https://aeneid.storyscan.io/token/${CONTRACTS.DippChainRegistry}?a=${registrationResult.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      color: '#0a0a0a',
                      textDecoration: 'underline',
                    }}
                  >
                    View NFT <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}

            {/* Story Protocol IP Registration Success */}
            {storyProtocolResult && (
              <div style={{
                padding: '20px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Check size={20} color="#2563eb" />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#2563eb' }}>
                    Registered on Story Protocol!
                  </span>
                </div>
                
                <div style={{ fontSize: '13px', color: '#525252' }}>
                  <p><strong>IP Asset ID:</strong> {storyProtocolResult.ipId?.slice(0, 10)}...{storyProtocolResult.ipId?.slice(-8)}</p>
                  <p><strong>License Attached:</strong> {storyProtocolResult.licenseAttached ? 'Yes (Commercial Use)' : 'No'}</p>
                </div>
                
                <a
                  href={storyProtocolResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '12px',
                    fontSize: '13px',
                    color: '#2563eb',
                    textDecoration: 'underline',
                  }}
                >
                  View IP Asset on Story <ExternalLink size={14} />
                </a>
              </div>
            )}

            {/* Story Protocol Registration Pending (if DippChain registered but Story not yet) */}
            {registrationResult && formData.registerStoryProtocol && !storyProtocolResult && !processing && (
              <div style={{
                padding: '20px',
                backgroundColor: '#fafafa',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
                  Register on Story Protocol
                </h3>
                <p style={{ fontSize: '13px', color: '#737373', marginBottom: '16px' }}>
                  Register your asset as an IP Asset on Story Protocol to enable programmable licensing and royalties.
                </p>
                
                <button
                  onClick={() => registerOnStoryProtocol(registrationResult?.tokenId)}
                  disabled={processing || !registrationResult?.tokenId}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: registrationResult?.tokenId ? '#2563eb' : '#9ca3af',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: registrationResult?.tokenId ? 'pointer' : 'not-allowed',
                  }}
                >
                  {registrationResult?.tokenId 
                    ? 'Register as IP Asset' 
                    : 'Token ID not available'}
                </button>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleClearFile}
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
                Upload Another
              </button>
              <button
                onClick={() => router.push('/dashboard/assets')}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#0a0a0a',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                View My Assets
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

