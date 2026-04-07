import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, MessageCircle, Users, User, Settings, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (location.pathname === '/login' || location.pathname === '/register') return null;
  if (location.pathname === '/video') return null; // Full screen for video chat

  const navItems = [
    { path: '/discover', icon: Users, label: 'Discover' },
    { path: '/video', icon: Camera, label: 'Video' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="navbar">
      <Link to="/discover" className="nav-logo">
        <Camera size={24} />
        <span>MeetLive</span>
      </Link>
      <div className="nav-links">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button className="nav-link logout-btn" onClick={logout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
