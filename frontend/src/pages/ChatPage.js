import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { Video } from 'lucide-react';

export default function ChatPage() {
  const { token, API_URL, user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEnd = useRef(null);

  useEffect(() => {
    const newSocket = io(`${API_URL}`, {
      auth: { token },
    });
    newSocket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, { ...msg, sent: false }]);
    });
    setSocket(newSocket);
    return () => newSocket.close();
  }, [token, API_URL]);

  useEffect(() => {
    fetch(`${API_URL}/api/matches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setMatches)
      .catch(err => console.error(err));
  }, [token, API_URL]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !selected || !socket) return;
    socket.emit('send_message', { toUserId: selected.id, text: input.trim() });
    setMessages(prev => [...prev, { fromUserId: user.id, text: input.trim(), timestamp: new Date().toISOString(), sent: true }]);
    setInput('');
  };

  const selectMatch = (match) => {
    setSelected(match);
  };

  return (
    <div className="chat-container">
      <div className="matches-sidebar">
        <h2>Matches</h2>
        {matches.length === 0 && <p style={{ padding: '16px', color: 'var(--text-muted)' }}>No matches yet. Discover someone!</p>}
        {matches.map(m => (
          <div key={m.id} className={`match-item ${selected?.id === m.id ? 'active' : ''}`} onClick={() => selectMatch(m)}>
            <div className="match-avatar">
              {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} /> : m.name.charAt(0).toUpperCase()}
            </div>
            <div className="match-info">
              <h4>{m.name}</h4>
              <span>{m.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-main">
        {selected ? (
          <>
            <div className="chat-header">
              <div className="match-avatar" style={{ width: 36, height: 36, borderRadius: '50%' }}>
                {selected.avatarUrl ? <img src={selected.avatarUrl} alt={selected.name} /> : selected.name.charAt(0).toUpperCase()}
              </div>
              <h2>{selected.name}</h2>
              <button className="video-chat-btn" title="Video Call">
                <Video size={20} />
              </button>
            </div>
            <div className="chat-messages">
              {messages.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
                  Say hello to {selected.name}!
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.sent ? 'sent' : 'received'}`}>
                  {msg.text}
                  <div className="time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
              <div ref={messagesEnd} />
            </div>
            <div className="chat-input-bar">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={`Message ${selected.name}...`}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <h2>Select a Match</h2>
            <p>Choose someone from your matches to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
