import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const username = searchParams.get('username');

    if (!token) {
      setError('No token received. Please try signing in again.');
      return;
    }

    try {
      login(token, { username });
      navigate('/discover', { replace: true });
    } catch {
      setError('Failed to complete sign in. Please try again.');
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          {error ? (
            <>
              <h1>Sign in failed</h1>
              <div className="error-msg">{error}</div>
              <p className="auth-footer">
                <a href="/login">Back to login</a>
              </p>
            </>
          ) : (
            <>
              <div className="spinner" />
              <h1>Signing you in...</h1>
              <p>Please wait</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
