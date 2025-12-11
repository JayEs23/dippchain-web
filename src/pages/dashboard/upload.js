// Asset Upload Page
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FileDropzone from '@/components/upload/FileDropzone';
import { Upload, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { generateWatermarkId, generateContentHash, formatFileSize } from '@/lib/utils';
import { embedImageWatermark, generateMetadata, createThumbnail } from '@/lib/watermark';

const STEPS = [
  { id: 'select', label: 'Select File' },
  { id: 'details', label: 'Add Details' },
  { id: 'process', label: 'Process & Upload' },
  { id: 'register', label: 'Register On-Chain' },
];

export default function UploadPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  
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
    registerStoryProtocol: true, // Register on Story Protocol (SPG handles NFT minting)
  });
  
  // Upload results
  const [uploadResult, setUploadResult] = useState(null);
  const [storyProtocolResult, setStoryProtocolResult] = useState(null);
  
  // Progress tracking
  const [progressSteps, setProgressSteps] = useState([
    { id: 'watermark', label: 'Generating watermark', status: 'pending' },
    { id: 'ipfs', label: 'Uploading to IPFS', status: 'pending' },
    { id: 'thumbnail', label: 'Creating thumbnail', status: 'pending' },
    { id: 'metadata', label: 'Uploading metadata', status: 'pending' },
    { id: 'database', label: 'Saving to database', status: 'pending' },
    { id: 'story', label: 'Registering on Story Protocol (SPG)', status: 'pending' },
  ]);

  const updateProgressStep = (stepId, status, message = null) => {
    setProgressSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message }
        : step
    ));
  };

  // 🎉 Confetti celebration function
  const triggerConfetti = () => {
    const duration = 3000; // 3 seconds
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Launch confetti from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

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
    setStoryProtocolResult(null);
    // Reset progress steps
    setProgressSteps([
      { id: 'watermark', label: 'Generating watermark', status: 'pending' },
      { id: 'ipfs', label: 'Uploading to IPFS', status: 'pending' },
      { id: 'thumbnail', label: 'Creating thumbnail', status: 'pending' },
      { id: 'metadata', label: 'Uploading metadata', status: 'pending' },
      { id: 'database', label: 'Saving Asset Records Off-Chain', status: 'pending' },
      { id: 'story', label: 'Registering on Story Protocol (SPG)', status: 'pending' },
    ]);
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

    // Step 1: Generate watermark ID and content hash
    let watermarkId, contentHash;
    try {
      updateProgressStep('watermark', 'processing');
      watermarkId = generateWatermarkId();
      contentHash = await generateContentHash(file);
      updateProgressStep('watermark', 'completed', 'Watermark ID generated');
    } catch (err) {
      console.error('Hash generation error:', err);
      updateProgressStep('watermark', 'error', 'Failed to generate watermark');
      toast.error('Failed to process file. Please try again.');
      setCurrentStep(1);
      setProcessing(false);
      return;
    }
    
    // Step 2: Apply watermark (for images)
    let processedFile = file;
    if (formData.enableWatermark && assetType === 'IMAGE') {
      try {
        const watermarkResult = await embedImageWatermark(file, watermarkId);
        processedFile = watermarkResult.file;
      } catch (err) {
        console.error('Watermark error:', err);
        // Continue without watermark - non-critical error
      }
    }

    // Step 3: Create thumbnail
    let thumbnail = null;
    try {
      updateProgressStep('thumbnail', 'processing');
      thumbnail = await createThumbnail(processedFile);
      updateProgressStep('thumbnail', 'completed', 'Thumbnail created');
    } catch (err) {
      console.error('Thumbnail error:', err);
      updateProgressStep('thumbnail', 'completed', 'Thumbnail skipped');
      // Continue without thumbnail - non-critical error
    }

    // Step 4: Upload to Pinata
    let uploadData;
    try {
      updateProgressStep('ipfs', 'processing');
      
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
        const errorMsg = uploadResult.error?.message || uploadResult.details || uploadResult.error || 'IPFS upload failed. Check your Pinata credentials.';
        updateProgressStep('ipfs', 'error', errorMsg);
        toast.error(errorMsg);
        setCurrentStep(1);
        setProcessing(false);
        return;
      }

      uploadData = uploadResult;
      updateProgressStep('ipfs', 'completed', `Uploaded to IPFS (${uploadData.cid.slice(0, 8)}...)`);
    } catch (err) {
      console.error('Upload error:', err);
      updateProgressStep('ipfs', 'error', 'Network error');
      toast.error('Failed to upload to IPFS. Please check your connection and try again.');
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

      // Step 6: Generate and upload metadata (IPA Metadata Standard)
      let metadataData = null;
      try {
        updateProgressStep('metadata', 'processing');
        // ✅ Generate metadata following IPA Metadata Standard
        const metadata = await generateMetadata(processedFile, {
          title: formData.title,
          description: formData.description,
          creator: formData.title,
          creatorAddress: address,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          watermarkId,
          uploadUrl: uploadData.url, // Pass IPFS URL for image/mediaUrl fields
        });
        
        // Ensure image and mediaUrl are set (should already be set by generateMetadata)
        if (!metadata.image) metadata.image = uploadData.url;
        if (!metadata.mediaUrl) metadata.mediaUrl = uploadData.url;

      const metadataResponse = await fetch('/api/assets/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata, name: `${formData.title}_metadata.json` }),
      });

      if (metadataResponse.ok) {
        metadataData = await metadataResponse.json();
        updateProgressStep('metadata', 'completed', 'Metadata uploaded');
      } else {
        updateProgressStep('metadata', 'completed', 'Metadata skipped');
      }
    } catch (err) {
      console.error('Metadata upload error:', err);
      updateProgressStep('metadata', 'completed', 'Metadata skipped');
      // Continue without metadata - non-critical
    }

    // Step 7: Create asset in database
    let asset;
    try {
      updateProgressStep('database', 'processing');
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
      
      console.log('📥 Database creation response:', {
        ok: createResponse.ok,
        success: createResult.success,
        hasData: !!createResult.data,
        hasAsset: !!createResult.data?.asset,
        assetId: createResult.data?.asset?.id,
      });
      
      if (!createResponse.ok || !createResult.success) {
        const errorMsg = createResult.error?.message || createResult.error || 'Failed to save asset to database';
        updateProgressStep('database', 'error', errorMsg);
        toast.error(errorMsg);
        setCurrentStep(1);
        setProcessing(false);
        return;
      }

      // ✅ FIX: Access asset from createResult.data.asset (not createResult.asset)
      asset = createResult.data?.asset;
      
      if (!asset) {
        console.error('❌ Asset not found in response:', createResult);
        updateProgressStep('database', 'error', 'Asset data missing from response');
        toast.error('Failed to retrieve asset data');
        setCurrentStep(1);
        setProcessing(false);
        return;
      }
      
      console.log('💾 Asset received from database:', {
        id: asset.id,
        title: asset.title,
        hasWatermarkId: !!asset.watermarkId,
        hasContentHash: !!asset.contentHash,
      });
      
      updateProgressStep('database', 'completed', 'Asset saved successfully');
    } catch (err) {
      console.error('Database save error:', err);
      updateProgressStep('database', 'error', 'Database error');
      toast.error('Failed to save asset. Please try again.');
      setCurrentStep(1);
      setProcessing(false);
      return;
    }

    // ✅ CRITICAL: Validate asset object before proceeding
    if (!asset || !asset.id) {
      console.error('❌ CRITICAL: Asset object is invalid!', { asset });
      updateProgressStep('database', 'error', 'Asset ID missing');
      toast.error('Failed to create asset: ID not generated');
      setProcessing(false);
      return;
    }

    console.log('✅ Asset created successfully with ID:', asset.id);

    // Success! Store asset data in state AND localStorage for resilience
    setUploadResult({
      asset,
      uploadData,
      thumbnailData,
      metadataData,
      watermarkId,
      contentHash,
    });

    // ✅ CRITICAL: Store asset ID in localStorage as backup
    // This prevents ID loss on page refresh or state issues
    try {
      localStorage.setItem('dippchain_current_asset', JSON.stringify({
        id: asset.id,
        watermarkId: watermarkId, // Use the local variable, not asset.watermarkId
        contentHash: contentHash, // Use the local variable, not asset.contentHash
        timestamp: Date.now(),
      }));
      console.log('💾 Asset ID backed up to localStorage:', asset.id);
    } catch (storageErr) {
      console.warn('⚠️ Failed to save to localStorage:', storageErr);
      // Don't fail the whole process if localStorage fails
    }

    toast.success('Asset uploaded successfully!');

    // ✅ BUILDATHON SIMPLIFIED FLOW: Skip DippChain Registry, use SPG only
    // Go directly to Story Protocol registration
    if (formData.registerStoryProtocol && isConnected) {
      console.log('🌐 Auto-starting Story Protocol SPG registration...');
      // Move to registration step
      setCurrentStep(3);
      // Keep processing state active for registration
      // Small delay to ensure state and UI are updated
      setTimeout(() => {
        // Skip DippChain Registry, go straight to Story Protocol SPG
        // SPG will mint NFT + register IP + attach license in ONE transaction
        registerOnStoryProtocolSPG(asset.id);
      }, 500);
    } else {
      // Only stop processing if we're not auto-registering
      setProcessing(false);
      // Move to registration step if enabled (but not auto-starting)
      if (formData.registerStoryProtocol) {
        setCurrentStep(3);
      }
    }
  };

  /**
   * ❌ DEPRECATED: DippChain Registry registration
   * SPG handles NFT minting internally - this function is no longer needed
   * Kept for reference only - will be removed in future cleanup
   */
  const registerOnChain_DEPRECATED = async (assetId) => {
    // ✅ CRITICAL: Validate and recover asset ID
    if (!assetId) {
      // Try to recover from uploadResult
      assetId = uploadResult?.asset?.id;
    }
    
    if (!assetId) {
      // Try to recover from localStorage
      const storedAsset = localStorage.getItem('dippchain_current_asset');
      if (storedAsset) {
        try {
          const parsed = JSON.parse(storedAsset);
          assetId = parsed.id;
          console.log('📦 Recovered asset ID from localStorage:', assetId);
        } catch (e) {
          console.error('Failed to parse stored asset:', e);
        }
      }
    }

    if (!assetId) {
      toast.error('Asset ID not available. Please complete upload first.');
      return;
    }

    console.log('🔗 Starting on-chain registration for asset:', assetId);
    
    if (!uploadResult) {
      toast.error('Please complete the upload step first');
      return;
    }
    
    if (!walletProvider) {
      toast.error('Please connect your wallet to register on-chain');
      return;
    }

    setProcessing(true);
    updateProgressStep('onchain', 'processing');

    // Step 1: Initialize provider and signer
    let provider, signer;
    try {
      provider = new BrowserProvider(walletProvider);
      signer = await provider.getSigner();
    } catch (err) {
      console.error('Wallet connection error:', err);
      updateProgressStep('onchain', 'error', 'Wallet connection failed');
      toast.error('Failed to connect to wallet. Please try reconnecting.');
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
      updateProgressStep('onchain', 'error', 'Contract initialization failed');
      toast.error('Failed to initialize contract. Please refresh and try again.');
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

      updateProgressStep('onchain', 'processing', 'Please confirm transaction in wallet...');
      
      const tx = await registry.registerAsset(
        contentHash,    // 1st param: contentHash (string)
        metadataUri,    // 2nd param: metadataUri (string)  
        watermarkId     // 3rd param: watermarkId (string)
      );

      updateProgressStep('onchain', 'processing', 'Waiting for confirmation...');
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
      
      updateProgressStep('onchain', 'error', errorMessage);
      toast.error(errorMessage);
      setProcessing(false);
      return;
    }

    setRegistrationResult({
      txHash: receipt.hash,
      tokenId,
      blockNumber: receipt.blockNumber,
    });
    
    updateProgressStep('onchain', 'completed', `Token ID: #${tokenId}`);
    toast.success('Asset registered on-chain!');

    // Step 4: Update database with token ID and transaction hash
    // CRITICAL: Must complete BEFORE Story Protocol registration
    // Uses retry logic to ensure data is saved even if first attempt fails
    let databaseUpdateSuccess = false;
    const maxRetries = 3;
    
    // ✅ USE THE ASSET ID THAT WAS PASSED IN (no more searching!)
    console.log('💾 Updating database for asset:', assetId, 'with tokenId:', tokenId);
    
    if (assetId) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📝 Database update attempt ${attempt}/${maxRetries} for asset ${assetId}...`);
          
          const updateResponse = await fetch('/api/assets/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assetId: assetId, // ✅ Use the passed assetId
              txHash: receipt.hash,
              tokenId,
            }),
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`Database update attempt ${attempt} failed:`, errorText);
            
            if (attempt === maxRetries) {
              toast.error(`Failed to save token ID to database after ${maxRetries} attempts`);
            }
          } else {
            const updateData = await updateResponse.json();
            console.log('✅ Database updated successfully on attempt', attempt, ':', updateData);
            databaseUpdateSuccess = true;
            
            // Update local uploadResult with the new data
            setUploadResult(prev => ({
              ...prev,
              asset: {
                ...prev.asset,
                id: assetId, // ✅ Use the passed assetId
                dippchainTokenId: tokenId?.toString(),
                dippchainTxHash: receipt.hash,
                registeredOnChain: true,
                status: 'REGISTERED',
              },
            }));
            
            // Success! Break out of retry loop
            break;
          }
        } catch (err) {
          console.error(`Database update attempt ${attempt} error:`, err);
          
          if (attempt === maxRetries) {
            toast.error('Database update failed: ' + err.message);
          } else {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      }
    } else {
      console.error('❌ CRITICAL: Asset ID is missing - cannot update database!');
      toast.error('Cannot update database: asset ID missing', {
        duration: 8000,
      });
    }

    // Step 5: Register on Story Protocol if enabled (SPG method)
    // Only proceed if database was updated successfully (so Story Protocol API can find the asset)
    if (formData.registerStoryProtocol && assetId) {
      if (!databaseUpdateSuccess) {
        console.warn('Skipping Story Protocol registration: database update failed');
        toast.error('Cannot register on Story Protocol: database not updated');
      } else {
        // ✅ SPG handles NFT minting - no tokenId needed
        await registerOnStoryProtocol(assetId);
      }
    }
    
    // Only stop processing after ALL steps complete
    setProcessing(false);
  };

  /**
   * Register asset on Story Protocol as an IP Asset
   * @param {string} assetId - The database asset ID (required)
   * @param {number|string} tokenId - The DippChain token ID (required)
   */
  const registerOnStoryProtocol = async (assetId) => {
    // ✅ Validate asset ID (SPG handles NFT minting, no tokenId needed)
    if (!assetId) {
      toast.error('Asset ID not available. Cannot register on Story Protocol.');
      updateProgressStep('story', 'error', 'Asset ID missing');
      return;
    }

    console.log('🌐 Starting Story Protocol registration (SPG method):', { assetId });
    updateProgressStep('story', 'processing', 'Registering IP asset with SPG...');

    try {
      // ✅ Use modern SPG API endpoint (handles minting + registration + license in one transaction)
      const payload = {
        assetId: assetId,
        licenseType: 'COMMERCIAL_USE', // Can be COMMERCIAL_USE, COMMERCIAL_REMIX, or NON_COMMERCIAL
        commercialRevShare: 5, // 5% revenue share
        defaultMintingFee: '10', // 10 WIP (will be converted to wei)
      };

      console.log('📤 Sending Story Protocol registration request (SPG):', {
        assetId: payload.assetId,
        licenseType: payload.licenseType,
      });

      const response = await fetch('/api/assets/register-ip-modern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('Response parse error:', parseErr);
        updateProgressStep('story', 'error', 'Failed to parse response');
        toast.error('Story Protocol registration failed. Please try again later.');
        return;
      }

      if (!response.ok) {
        // Handle error object structure: { error: { message, code, details } }
        const errorMessage = data.error?.message || data.error?.details || data.error || data.details || 'Story Protocol registration failed';
        updateProgressStep('story', 'error', errorMessage);
        toast.error(errorMessage);
        return;
      }

      // ✅ Handle response from register-ip-modern API
      setStoryProtocolResult({
        ipId: data.data?.ipId || data.ipId,
        txHash: data.data?.txHash || data.txHash,
        tokenId: data.data?.tokenId || data.tokenId,
        nftContract: data.data?.nftContract || data.nftContract,
        licenseTermsId: data.data?.licenseTermsId || data.licenseTermsId,
        licenseAttached: true, // SPG always attaches license
        explorerUrl: data.data?.explorerUrl || data.explorerUrl,
      });

      const ipId = data.data?.ipId || data.ipId;
      updateProgressStep('story', 'completed', `IP ID: ${ipId?.slice(0, 8)}...`);
      toast.success('✅ Asset fully registered! Ready for fractionalization.');
      
      // 🎉 Celebrate with confetti!
      triggerConfetti();
      
      // ✅ Clean up localStorage - registration complete
      localStorage.removeItem('dippchain_current_asset');
      console.log('🎉 Full registration complete! Asset ready for fractionalization.');
    } catch (error) {
      console.error('Story Protocol error:', error);
      
      // User-friendly error messages
      let errorMessage = 'Story Protocol registration failed';
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      updateProgressStep('story', 'error', errorMessage);
      toast.error(errorMessage);
    }
  };

  /**
   * Register asset on Story Protocol using SPG (SIMPLIFIED - Buildathon Version)
   * SPG mints NFT + registers IP + attaches license in ONE transaction
   * No need for DippChain Registry token ID!
   * 
   * @param {string} assetId - The database asset ID (required)
   */
  const registerOnStoryProtocolSPG = async (assetId) => {
    try {
      // ✅ Validate asset ID
      if (!assetId) {
        toast.error('Asset ID not available. Cannot register on Story Protocol.');
        updateProgressStep('story', 'error', 'Asset ID missing');
        setProcessing(false);
        return;
      }

      console.log('🌐 Starting Story Protocol SPG registration for asset:', assetId);
      updateProgressStep('story', 'processing', 'Registering IP asset with SPG...');

      // ✅ Call backend API - SPG handles everything
      // Backend will fetch all metadata from the database asset
      const payload = {
        assetId: assetId,
        licenseType: 'COMMERCIAL_USE',
        // No need to pass metadata - backend fetches from database
      };

      console.log('📤 Sending SPG registration request for asset:', assetId);

      const response = await fetch('/api/assets/register-ip-modern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('Response parse error:', parseErr);
        updateProgressStep('story', 'error', 'Failed to parse response');
        toast.error('Story Protocol registration failed. Please try again later.');
        setProcessing(false);
        return;
      }

      if (!response.ok) {
        // Handle error object structure: { error: { message, code, details } }
        const errorMessage = data.error?.message || data.error?.details || data.error || data.details || 'Story Protocol registration failed';
        updateProgressStep('story', 'error', errorMessage);
        toast.error(errorMessage);
        setProcessing(false);
        return;
      }

      // ✅ Success! Handle response from register-ip-modern API
      const responseData = data.data || data;
      setStoryProtocolResult({
        ipId: responseData.ipId,
        txHash: responseData.txHash,
        tokenId: responseData.tokenId,
        nftContract: responseData.nftContract,
        licenseTermsId: responseData.licenseTermsId,
        licenseAttached: true, // SPG always attaches license
        explorerUrl: responseData.explorerUrl,
      });

      const ipId = responseData.ipId;
      updateProgressStep('story', 'completed', `IP ID: ${ipId?.slice(0, 8)}...`);
      toast.success('✅ Asset registered on Story Protocol! Ready for fractionalization.');
      
      // 🎉 Celebrate with confetti!
      triggerConfetti();
      
      // ✅ Clean up localStorage - registration complete
      localStorage.removeItem('dippchain_current_asset');
      console.log('🎉 Full SPG registration complete!');
      console.log('IP ID:', responseData.ipId);
      console.log('Token ID:', responseData.tokenId);
      console.log('License Terms ID:', responseData.licenseTermsId);

      setProcessing(false);

    } catch (error) {
      console.error('Story Protocol SPG error:', error);
      
      // User-friendly error messages
      let errorMessage = 'Story Protocol registration failed';
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      updateProgressStep('story', 'error', errorMessage);
      toast.error(errorMessage);
      setProcessing(false);
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
        maxWidth: '100%',
        width: '100%',
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '32px 24px',
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
                  
                  {/* ✅ BUILDATHON: Hidden DippChain Registry option - using SPG only */}
                  {/* <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
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
                  </label> */}
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="registerStoryProtocol"
                      checked={formData.registerStoryProtocol}
                      onChange={handleInputChange}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#0a0a0a' }}>
                      Register as IP Asset on Story Protocol (SPG)
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

        {/* Step 2.5: Processing Progress Display */}
        {currentStep === 2 && processing && (
          <div style={{
            padding: '32px',
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#0a0a0a', 
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              Processing Your Asset
            </h3>

            {/* Progress Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {progressSteps.map((step) => {
                if (step.status === 'pending') return null;
                
                return (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e5e5e5',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: 
                        step.status === 'completed' ? '#dcfce7' : 
                        step.status === 'processing' ? '#dbeafe' :
                        step.status === 'error' ? '#fee2e2' : '#f5f5f5',
                    }}>
                      {step.status === 'completed' && (
                        <Check size={18} color="#16a34a" />
                      )}
                      {step.status === 'processing' && (
                        <Loader2 size={18} color="#2563eb" className="animate-spin" />
                      )}
                      {step.status === 'error' && (
                        <AlertCircle size={18} color="#dc2626" />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#0a0a0a',
                        marginBottom: '2px',
                      }}>
                        {step.label}
                      </div>
                      {step.message && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: step.status === 'error' ? '#dc2626' : '#737373',
                        }}>
                          {step.message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: On-chain Registration Progress */}
        {currentStep === 3 && processing && (
          <div style={{
            padding: '32px',
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#0a0a0a', 
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              Registering On-Chain
            </h3>

            {/* Progress Steps - Show only on-chain and story steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {progressSteps.filter(s => s.id === 'onchain' || s.id === 'story').map((step) => {
                // Show all steps during registration (even pending ones for visibility)
                
                return (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e5e5e5',
                      opacity: step.status === 'pending' ? 0.6 : 1,
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: 
                        step.status === 'completed' ? '#dcfce7' : 
                        step.status === 'processing' ? '#dbeafe' :
                        step.status === 'error' ? '#fee2e2' : '#f5f5f5',
                      border: step.status === 'pending' ? '2px dashed #d4d4d4' : 'none',
                    }}>
                      {step.status === 'completed' && (
                        <Check size={18} color="#16a34a" />
                      )}
                      {step.status === 'processing' && (
                        <Loader2 size={18} color="#2563eb" className="animate-spin" />
                      )}
                      {step.status === 'error' && (
                        <AlertCircle size={18} color="#dc2626" />
                      )}
                      {step.status === 'pending' && (
                        <span style={{ fontSize: '14px', color: '#a3a3a3', fontWeight: '600' }}>⋯</span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: step.status === 'pending' ? '#a3a3a3' : '#0a0a0a',
                        marginBottom: '2px',
                      }}>
                        {step.label}
                      </div>
                      {step.message && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: step.status === 'error' ? '#dc2626' : '#737373',
                        }}>
                          {step.message}
                        </div>
                      )}
                      {step.status === 'pending' && (
                        <div style={{ fontSize: '12px', color: '#a3a3a3' }}>
                          Waiting...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Registration Results */}
        {currentStep >= 2 && uploadResult && !processing && (
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

            {/* ✅ SPG handles NFT minting - no separate DippChain Registry step needed */}

            {/* ✅ SPG handles NFT minting - no separate DippChain Registry registration needed */}

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
                  {storyProtocolResult.tokenId && (
                    <p><strong>SPG Token ID:</strong> #{storyProtocolResult.tokenId}</p>
                  )}
                  {storyProtocolResult.licenseTermsId && (
                    <p><strong>License Terms ID:</strong> {storyProtocolResult.licenseTermsId}</p>
                  )}
                  <p><strong>License Attached:</strong> {storyProtocolResult.licenseAttached ? 'Yes (Commercial Use)' : 'No'}</p>
                  <p><strong>Royalty Vault:</strong> Created ✅</p>
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

            {/* Story Protocol Registration Pending */}
            {uploadResult?.asset && formData.registerStoryProtocol && !storyProtocolResult && !processing && (
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
                  onClick={() => registerOnStoryProtocol(uploadResult?.asset?.id)}
                  disabled={processing || !uploadResult?.asset?.id}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: uploadResult?.asset?.id ? '#2563eb' : '#9ca3af',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: uploadResult?.asset?.id ? 'pointer' : 'not-allowed',
                  }}
                >
                  Register as IP Asset on Story Protocol
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

