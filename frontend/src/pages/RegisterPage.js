import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', name: '', age: '', gender: 'male', bio: '' });
  const [error, setError] = useState('');
  const { login, API_URL } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      login(data.token, data.user);
      navigate('/discover');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Camera size={48} className="auth-logo" />
          <h1>Join MeetLive</h1>
          <p>Create your account</p>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input name="username" value={form.username} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Display Name</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input name="age" type="number" value={form.age} onChange={handleChange} placeholder="Age" />
            </div>
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Tell people about yourself..." rows={3} />
          </div>
          <button type="submit" className="btn-primary">Create Account</button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
