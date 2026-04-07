import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { token, API_URL } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setForm(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, API_URL]);

  const save = async () => {
    const res = await fetch(`${API_URL}/api/profile/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setEditing(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${API_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Update profile and form
        setProfile(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
        setForm(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to upload avatar');
      }
    } catch (err) {
      alert('Error uploading avatar');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-avatar-large" style={{ position: 'relative' }}>
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} />
          ) : (
            profile?.name?.charAt(0).toUpperCase() || '?'
          )}
          {!editing && (
            <div className="avatar-upload-overlay" onClick={() => document.getElementById('avatar-input').click()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLineCap="round"/>
                <path d="M8 12h4" stroke="currentColor" strokeWidth="2" strokeLineCap="round"/>
              </svg>
              <span>Change Photo</span>
            </div>
          )}
          <input
            type="file"
            id="avatar-input"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />
          {uploading && (
            <div className="avatar-upload-progress" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              Uploading...
            </div>
          )}
        </div>

        {editing ? (
          <div style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Age</label>
                <input type="number" value={form.age || ''} onChange={e => setForm({ ...form, age: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender || 'other'} onChange={e => setForm({ ...form, gender: e.target.value })}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea value={form.bio || ''} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={save}>Save Changes</button>
              <button className="btn-secondary" onClick={() => setEditing(false)} style={{ width: '100%' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h1>{profile?.name || profile?.username}</h1>
            <p className="username">@{profile?.username}</p>
            <p className="bio-text">{profile?.bio || 'No bio yet'}</p>
            {profile?.age && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>Age: {profile.age}</p>}
            {profile?.gender && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Gender: {profile.gender}</p>}
            <div className="profile-stats">
              <div className="stat">
                <div className="stat-value">{profile?.matches?.length || 0}</div>
                <div className="stat-label">Matches</div>
              </div>
            </div>
            <button className="btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
          </>
        )}
      </div>
    </div>
  );
}
