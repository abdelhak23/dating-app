import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Video, MessageCircle, Heart, X, ChevronRight, Star } from 'lucide-react';
import './DiscoverPage.css';

function ProfileModal({ user, onClose }) {
  if (!user) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} />
          ) : (
            <div className="avatar-placeholder">{user.name?.charAt(0).toUpperCase() || '?'}</div>
          )}
        </div>
        <h2>{user.name || user.username}{user.age ? `, ${user.age}` : ''}</h2>
        <p className="modal-meta">{user.gender}</p>
        <p className="modal-bio">{user.bio || 'No bio yet.'}</p>
        <div className="modal-actions">
          <div className="modal-btn like-btn" onClick={async () => {
            await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/match`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify({ userId: user.id }),
            });
            onClose();
          }}>
            <Heart size={18} /> Match
          </div>
          <Link to={{ pathname: '/chat' }} state={{ targetId: user.id, targetName: user.name }} className="modal-btn chat-btn">
            <MessageCircle size={18} /> Chat
          </Link>
        </div>
        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('any');
  const [loading, setLoading] = useState(true);
  const [viewingProfile, setViewingProfile] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch users:', res.status);
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleLike = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setUsers(prev => {
          const currentUsers = Array.isArray(prev) ? prev : [];
          return currentUsers.filter(u => u.id !== userId);
        });
      }
    } catch { /* ignore */ }
  };

  const handleDislike = (userId) => {
    setUsers(prev => {
      const currentUsers = Array.isArray(prev) ? prev : [];
      return currentUsers.filter(u => u.id !== userId);
    });
  };

  const usersArray = Array.isArray(users) ? users : [];
  const filtered = filter === 'any' ? usersArray : usersArray.filter(u => u.gender === filter);
  const online = filtered.filter(u => u.online);
  const display = online.length > 0 ? online : filtered;

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="discover-page">
      <div className="discover-header">
        <h1>Discover People</h1>
        <p>Swipe right to match, left to pass</p>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${filter === 'any' ? 'active' : ''}`} onClick={() => setFilter('any')}>Everyone</button>
        <button className={`filter-btn ${filter === 'female' ? 'active' : ''}`} onClick={() => setFilter('female')}>Women</button>
        <button className={`filter-btn ${filter === 'male' ? 'active' : ''}`} onClick={() => setFilter('male')}>Men</button>
        <Link to="/video" className="filter-btn video-filter">
          <Video size={14} /> Video Chat
        </Link>
      </div>

      {display.length === 0 ? (
        <div className="empty-state">
          <p>No one nearby. Check back later!</p>
        </div>
      ) : (
        <div className="user-cards">
          {display.map((user, idx) => {
            const sharedInterests = Math.random() > 0.5 ? 3 : 0;
            return (
              <SwipeCard key={user.id} user={user} onLike={handleLike} onDislike={handleDislike} sharedInterests={sharedInterests} onViewProfile={setViewingProfile} />
            );
          })}
        </div>
      )}

      <ProfileModal user={viewingProfile} onClose={() => setViewingProfile(null)} />
    </div>
  );
}

function SwipeCard({ user, onLike, onDislike, sharedInterests, onViewProfile }) {
  const [dragState, setDragState] = useState('idle');
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  const startDrag = (x) => {
    setDragState('dragging');
    setDragStartX(x);
    setDragOffset(0);
  };
  const onMove = (x) => {
    if (dragState !== 'dragging') return;
    setDragOffset(x - dragStartX);
  };
  const onRelease = () => {
    if (Math.abs(dragOffset) > 80) {
      if (dragOffset > 0) onLike(user.id);
      else onDislike(user.id);
    }
    setDragState('idle');
    setDragOffset(0);
  };

  const rotation = dragOffset * 0.1;
  const isDragging = dragState === 'dragging';

  return (
    <div
      className="swipe-card"
      style={{
        transform: `translateX(${dragOffset}px) rotate(${rotation}deg)`,
        transition: !isDragging ? 'transform 0.3s ease' : 'none',
      }}
      onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onRelease}
      onMouseDown={(e) => startDrag(e.clientX)}
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={onRelease}
      onMouseLeave={() => dragState === 'idle' || onRelease()}
    >
      <div className="swipe-avatar">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} />
        ) : (
          <div className="avatar-placeholder">{user.name?.charAt(0).toUpperCase() || '?'}</div>
        )}
        {user.online && <span className="online-dot" />}
        {sharedInterests > 0 && <span className="match-badge"><Star size={12} /> Match!</span>}
      </div>
      <div className="swipe-info">
        <h3 className="swipe-name">
          {user.name || user.username}
          {user.age ? `, ${user.age}` : ''}
        </h3>
        <p className="swipe-meta">{user.gender}{user.online ? '  Online' : ''}</p>
        <p className="swipe-bio">{user.bio || 'No bio yet.'}</p>
        <button className="view-profile-btn" onClick={() => onViewProfile(user)}>
          View Profile <ChevronRight size={16} />
        </button>
      </div>
      <div className="swipe-actions" onClick={e => e.stopPropagation()}>
        <button className="action-btn dislike" onClick={() => onDislike(user.id)}>
          <X size={24} />
        </button>
        <button className="action-btn like" onClick={() => onLike(user.id)}>
          <Heart size={24} />
        </button>
      </div>
    </div>
  );
}
