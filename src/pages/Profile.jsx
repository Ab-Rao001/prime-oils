import React, { useState, useEffect } from 'react';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import PageLoader from '../components/PageLoader';
import { userApi } from '../api/userApi';
import toast from 'react-hot-toast';

export default function Profile({ user }) {
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    avatarUrl: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        role: user.role || '',
        avatarUrl: user.avatarUrl || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller');
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await userApi.uploadProfileAvatar(file);
      if (res.success && res.data) {
        setProfile(prev => ({ ...prev, avatarUrl: res.data.avatarUrl }));
        
        // Update local storage so the UI updates globally
        const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...savedUser, avatarUrl: res.data.avatarUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        toast.success('Profile picture updated!');
        setTimeout(() => window.location.reload(), 1000); // refresh to sync sidebar
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await userApi.updateProfile({
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
      });
      toast.success('Profile updated successfully');
      
      // Update local storage so the UI updates
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...savedUser, name: profile.name, phone: profile.phone, address: profile.address };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      // In a real app we'd dispatch context update here, but a reload ensures the easiest sync
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 800, margin: '0 auto' }}>
      <SectionHeader title="My Profile" />

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '30px', marginTop: 20 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ position: 'relative' }}>
            <label 
              htmlFor="avatar-upload"
              style={{
                display: 'block',
                width: 80, height: 80, borderRadius: '50%', background: C.goldBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 700, color: C.gold, border: `2px solid ${C.goldBorder}`,
                cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                overflow: 'hidden', position: 'relative'
              }}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
              {uploadingAvatar && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 24, height: 24, border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </label>
            <input 
              id="avatar-upload"
              type="file" 
              accept="image/jpeg,image/png" 
              onChange={handleAvatarChange} 
              disabled={uploadingAvatar}
              style={{ display: 'none' }} 
            />
            <div style={{ position: 'absolute', bottom: -4, right: -4, background: C.card, borderRadius: '50%', padding: 4 }}>
              <div style={{ width: 24, height: 24, background: C.gold, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', pointerEvents: 'none' }}>
                <span style={{ fontSize: 12 }}>✏️</span>
              </div>
            </div>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, color: C.text, marginBottom: 4 }}>{profile.name}</h2>
            <div style={{ fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              {profile.role}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.success }}></span>
              <span style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>Active Online</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
              Full Name
            </label>
            <input
              name="name"
              value={profile.name}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
              Email Address (Cannot change)
            </label>
            <input
              value={profile.email}
              readOnly
              style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.bg, color: C.muted, fontSize: 14, outline: 'none', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
              Phone Number
            </label>
            <input
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              placeholder="+92 300 1234567"
              style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
              Address (or Maps Coordinates)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <input
                name="address"
                value={profile.address}
                onChange={handleChange}
                placeholder="123 Main St, City or Google Maps Link"
                style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', marginBottom: '4px' }}
              />
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(pos => {
                      setProfile({ ...profile, address: `${pos.coords.latitude},${pos.coords.longitude}` });
                    }, () => alert('Unable to retrieve your location'));
                  }
                }}
                style={{ fontSize: 11, color: C.gold, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: 600, padding: '2px 0' }}
              >
                📍 Use My Current Location
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: C.gold,
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Saving...' : 'Save Profile Details'}
          </button>
        </div>

      </div>
    </div>
  );
}
