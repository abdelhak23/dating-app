import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, Heart, Users, MessageCircle, Video, ArrowRight } from 'lucide-react';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, API_URL } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      login(data.token, data.user);
      navigate('/discover');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      window.location.href = `${API_URL}/api/auth/google`;
    } catch (err) {
      setError('Google Sign In failed: ' + err.message);
    }
  };

  return (
    <div className="login-page">
      <video
        className="bg-video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/background-video.mp4" type="video/mp4" />
      </video>
      <div className="video-overlay" />

      {/* Features Section */}
      <div className="features-section">
        <div className="features-container">
          <div className="features-header">
            <Camera size={56} className="features-logo" />
            <h1 className="features-title">MeetLive</h1>
            <p className="features-subtitle">Discover Your Perfect Match</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Heart size={28} />
              </div>
              <h3>Discover</h3>
              <p>Swipe to meet new people</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Users size={28} />
              </div>
              <h3>Match</h3>
              <p>Connect when you both like</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <MessageCircle size={28} />
              </div>
              <h3>Chat</h3>
              <p>Message your matches</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Video size={28} />
              </div>
              <h3>Video</h3>
              <p>Live video dates</p>
            </div>
          </div>

          <div className="features-cta">
            <ArrowRight size={20} />
            <span>Start swiping now</span>
          </div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <Camera size={48} className="login-logo" />
          <h1>MeetLive</h1>
          <p>Sign in to connect</p>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn-primary">Sign In</button>
        </form>
        <div className="auth-divider">or</div>
        <button onClick={handleGoogleLogin} className="btn-google-login">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.01 24.01 0 000 21.56z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
