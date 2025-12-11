// Create License Page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAppKitAccount } from '@reown/appkit/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, Check, ChevronDown, Image, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateLicensePage() {
  const router = useRouter();
  const { assetId: queryAssetId } = router.query;
  const { address, isConnected } = useAppKitAccount();
  
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    assetId: queryAssetId || '',
    licenseType: 'COMMERCIAL',
    templateId: '',
    price: '',
    currency: 'IP',
    isExclusive: false,
    startDate: '',
    endDate: '',
    customTerms: {
      commercial: true,
      derivatives: false,
      attribution: true,
      transferable: false,
    },
  });

  useEffect(() => {
    if (isConnected && address) {
      fetchAssets();
      fetchTemplates();
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (queryAssetId) {
      setFormData(prev => ({ ...prev, assetId: queryAssetId }));
    }
  }, [queryAssetId]);

  const fetchAssets = async () => {
    try {
      const response = await fetch(`/api/assets?userId=${address}&status=REGISTERED`);
      const data = await response.json();
      if (data.success) {
        setAssets(data.assets);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setAssetsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/licenses/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('terms.')) {
      const termName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        customTerms: { ...prev.customTerms, [termName]: checked },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleTemplateSelect = (template) => {
    setFormData(prev => ({
      ...prev,
      // Only use templateId if it's a database template (not a default one)
      templateId: template.isDefault ? '' : template.id,
      customTerms: template.terms,
      isExclusive: template.terms.exclusivity || false,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.assetId) {
      toast.error('Please select an asset');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/licenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: formData.assetId,
          creatorId: address,
          licenseType: formData.licenseType,
          templateId: formData.templateId || null,
          terms: formData.customTerms,
          price: formData.price || null,
          currency: formData.currency,
          isExclusive: formData.isExclusive,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Create license failed:', data);
        // Handle error object structure: { error: { message, code, details } }
        const errorMessage = data.error?.message || data.error?.details || data.error || 'Failed to create license';
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      toast.success('License created successfully!');
      router.push('/dashboard/licenses');
    } catch (error) {
      console.error('Create license error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedAsset = assets.find(a => a.id === formData.assetId);

  return (
    <DashboardLayout title="Create License">
      <Link href="/dashboard/licenses">
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
          <ArrowLeft size={16} /> Back to Licenses
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
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', marginBottom: '24px' }}>
          Create New License
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Asset Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
              Select Asset *
            </label>
            {assetsLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#737373' }}>Loading assets...</div>
            ) : assets.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
                border: '1px dashed #e5e5e5',
              }}>
                <p style={{ fontSize: '14px', color: '#737373', marginBottom: '12px' }}>
                  No registered assets found
                </p>
                <Link href="/dashboard/upload">
                  <button type="button" style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: 'white',
                    backgroundColor: '#0a0a0a',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}>
                    Upload Asset
                  </button>
                </Link>
              </div>
            ) : (
              <select
                name="assetId"
                value={formData.assetId}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Choose an asset...</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title} ({asset.assetType})
                  </option>
                ))}
              </select>
            )}
            
            {selectedAsset && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '6px',
                  backgroundColor: '#e5e5e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {selectedAsset.thumbnailUrl ? (
                    <img src={selectedAsset.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Image size={20} color="#737373" />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>{selectedAsset.title}</div>
                  <div style={{ fontSize: '12px', color: '#737373' }}>{selectedAsset.assetType}</div>
                </div>
              </div>
            )}
          </div>

          {/* License Template */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
              License Template
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {templates.slice(0, 4).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  style={{
                    padding: '14px',
                    textAlign: 'left',
                    border: formData.templateId === template.id ? '2px solid #0a0a0a' : '1px solid #e5e5e5',
                    borderRadius: '8px',
                    backgroundColor: formData.templateId === template.id ? '#fafafa' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>
                      {template.name}
                    </div>
                    {formData.templateId === template.id && (
                      <Check size={16} color="#0a0a0a" />
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* License Type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
              License Type
            </label>
            <select
              name="licenseType"
              value={formData.licenseType}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                backgroundColor: 'white',
              }}
            >
              <option value="PERSONAL">Personal Use</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="EXCLUSIVE">Exclusive</option>
              <option value="NON_EXCLUSIVE">Non-Exclusive</option>
              <option value="ROYALTY_FREE">Royalty Free</option>
            </select>
          </div>

          {/* Pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
                Price
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.001"
                min="0"
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
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                }}
              >
                <option value="IP">IP (Story)</option>
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
          </div>

          {/* Terms */}
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#fafafa',
            borderRadius: '8px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '16px' }}>
              License Terms
            </h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="terms.commercial"
                  checked={formData.customTerms.commercial}
                  onChange={handleInputChange}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', color: '#0a0a0a' }}>Allow commercial use</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="terms.derivatives"
                  checked={formData.customTerms.derivatives}
                  onChange={handleInputChange}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', color: '#0a0a0a' }}>Allow derivative works</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="terms.attribution"
                  checked={formData.customTerms.attribution}
                  onChange={handleInputChange}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', color: '#0a0a0a' }}>Require attribution</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="terms.transferable"
                  checked={formData.customTerms.transferable}
                  onChange={handleInputChange}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', color: '#0a0a0a' }}>License is transferable</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="isExclusive"
                  checked={formData.isExclusive}
                  onChange={handleInputChange}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', color: '#0a0a0a' }}>Exclusive license</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !formData.assetId}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: (loading || !formData.assetId) ? '#a3a3a3' : '#0a0a0a',
              border: 'none',
              borderRadius: '8px',
              cursor: (loading || !formData.assetId) ? 'not-allowed' : 'pointer',
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
              'Create License'
            )}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}

