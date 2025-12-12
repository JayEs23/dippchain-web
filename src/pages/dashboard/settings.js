'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Save, User, Mail, FileText, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useUserSync } from '@/hooks/useUserSync';

export default function SettingsPage() {
  const router = useRouter();
  const { user, walletAddress, isConnected, syncUser } = useUserSync();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    bio: '',
    avatar: '',
  });

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/profile?walletAddress=${walletAddress}`);
      const data = await response.json();
      if (data.success && data.user) {
        setFormData({
          displayName: data.user.displayName || '',
          email: data.user.email || '',
          bio: data.user.bio || '',
          avatar: data.user.avatar || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, [walletAddress]);

  // Load user data
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
    } else if (isConnected && walletAddress) {
      // Try to fetch user profile
      fetchUserProfile();
    }
  }, [user, isConnected, walletAddress, fetchUserProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/users/profile?walletAddress=${walletAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully!');
      
      // Refresh user data
      if (syncUser) {
        await syncUser(walletAddress);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#737373' }}>
            Please connect your wallet to access settings
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#0a0a0a', marginBottom: '8px' }}>
            Profile Settings
          </h1>
          <p style={{ fontSize: '16px', color: '#737373' }}>
            Manage your profile information and preferences
          </p>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e5e5', padding: '32px' }}>
          {/* Avatar Section */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
              <ImageIcon size={18} />
              Profile Avatar
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {formData.avatar && (
                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #e5e5e5' }}>
                  <Image
                    src={formData.avatar}
                    alt="Profile"
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input
                  type="url"
                  value={formData.avatar}
                  onChange={(e) => handleChange('avatar', e.target.value)}
                  placeholder="Enter avatar URL (or leave empty to auto-generate)"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e5e5',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0a0a0a';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 10, 10, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e5e5';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <p style={{ fontSize: '12px', color: '#737373', marginTop: '6px' }}>
                  Leave empty to auto-generate avatar from your wallet address
                </p>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
              <User size={18} />
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="Enter your display name"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e5e5',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0a0a0a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 10, 10, 0.05)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
              <Mail size={18} />
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter your email address"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e5e5',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0a0a0a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 10, 10, 0.05)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Bio */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '12px' }}>
              <FileText size={18} />
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e5e5',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0a0a0a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 10, 10, 0.05)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Wallet Address (Read-only) */}
          <div style={{ marginBottom: '32px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0a0a0a', marginBottom: '8px' }}>
              Wallet Address
            </label>
            <p style={{ fontSize: '14px', color: '#737373', fontFamily: 'monospace' }}>
              {walletAddress}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: loading ? '#737373' : '#0a0a0a',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}

