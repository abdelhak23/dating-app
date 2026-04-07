import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { token, API_URL, logout, user } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({ minAge: 18, maxAge: 60, gender: 'any' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.preferences) setPreferences(data.preferences);
      });
  }, [token, API_URL]);

  const savePreferences = async () => {
    const res = await fetch(`${API_URL}/api/profile/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ preferences }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="settings-container">
      <h1 style={{ marginBottom: 20 }}>Settings</h1>

      {saved && <div className="success-msg" style={{ marginBottom: 16 }}>Preferences saved!</div>}

      <div className="settings-section">
        <h2>Discovery Preferences</h2>
        <div className="setting-row">
          <span>Minimum Age</span>
          <input
            type="number"
            value={preferences.minAge}
            onChange={e => setPreferences({ ...preferences, minAge: parseInt(e.target.value) || 18 })}
            style={{ width: 80, textAlign: 'center' }}
          />
        </div>
        <div className="setting-row">
          <span>Maximum Age</span>
          <input
            type="number"
            value={preferences.maxAge}
            onChange={e => setPreferences({ ...preferences, maxAge: parseInt(e.target.value) || 60 })}
            style={{ width: 80, textAlign: 'center' }}
          />
        </div>
        <div className="setting-row">
          <span>Show Me</span>
          <select
            value={preferences.gender}
            onChange={e => setPreferences({ ...preferences, gender: e.target.value })}
            style={{ width: 140 }}
          >
            <option value="any">Everyone</option>
            <option value="male">Men</option>
            <option value="female">Women</option>
          </select>
        </div>
        <button className="btn-primary" onClick={savePreferences} style={{ marginTop: 16 }}>Save Preferences</button>
      </div>

      <div className="settings-section">
        <h2>Account</h2>
        <div className="setting-row">
          <span>Username</span>
          <span style={{ color: 'var(--text-muted)' }}>{user?.username}</span>
        </div>
        <div className="setting-row">
          <span>Log Out</span>
          <button className="btn-secondary" onClick={handleLogout} style={{ padding: '8px 16px', fontSize: 13 }}>Logout</button>
        </div>
      </div>

      <div className="settings-section">
        <h2>About</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          MeetLive v1.0.0 — Azar-style random video dating
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
          Connect with new people through live video chat. Tap "Skip" to find someone new.
        </p>
      </div>
    </div>
  );
}
