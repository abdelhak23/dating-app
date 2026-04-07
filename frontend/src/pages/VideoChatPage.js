import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { MicOff, Mic, VideoOff, Video as VideoIcon, PhoneOff, SkipForward, Send } from 'lucide-react';

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function VideoChatPage() {
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState('idle'); // idle, searching, connected, ended
  const [partner, setPartner] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [chats, setChats] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [searchTime, setSearchTime] = useState(0);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomIdRef = useRef(null);

  // Connect socket
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const socket = io(`${API_URL}`, { auth: { token } });
    socketRef.current = socket;

    socket.on('match_found', ({ roomId, partner: p }) => {
      roomIdRef.current = roomId;
      setPartner(p);
      setState('connected');
      setSearchTime(0);
    });

    socket.on('search_cancelled', () => {
      if (state === 'searching') setState('idle');
      setSearchTime(0);
    });

    socket.on('searching_for_partner', () => {
      setSearchTime(0);
    });

    socket.on('call_ended', () => {
      setState('ended');
    });

    socket.on('partner_skipped', () => {
      setState('searching');
      setSearchTime(0);
      // Clean up peer connection
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
    });

    socket.on('partner_disconnected', () => {
      setState('ended');
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
    });

    socket.on('webrtc_offer', async ({ offer }) => {
      const pc = peerRef.current;
      if (!pc) return;
      if (pc.signalingState !== 'stable') return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { roomId: roomIdRef.current, answer });
    });

    socket.on('webrtc_answer', async ({ answer }) => {
      const pc = peerRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      const pc = peerRef.current;
      if (!pc) return;
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    return () => socket.close();
  }, [token, API_URL]);

  // Camera/mic
  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: cameraOn, audio: micOn });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('Media error:', err);
      return null;
    }
  };

  const startSearch = async () => {
    const stream = await startMedia();
    if (!stream) return;
    // Set up peer connection
    const pc = new RTCPeerConnection(RTC_CONFIG);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    peerRef.current = pc;
    socketRef.current.emit('webrtc_offer', { roomId: '', offer }); // will be set when room is found

    setState('searching');
    setSearchTime(0);
    setChats([]);
    socketRef.current.emit('find_match', {});
  };

  // Search timer
  useEffect(() => {
    if (state !== 'searching') return;
    const timer = setInterval(() => setSearchTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  const cancelSearch = () => {
    socketRef.current?.emit('cancel_search');
    stopMedia();
    setState('idle');
    setSearchTime(0);
  };

  const skipPartner = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    socketRef.current?.emit('next', { roomId: roomIdRef.current });
    localStreamRef.current?.getTracks().forEach(track => track.stop());
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    stopMedia();
    setState('idle');
    setPartner(null);
    roomIdRef.current = null;
  };

  const stopMedia = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
  };

  const toggleMic = () => {
    setMicOn(prev => {
      const newVal = !prev;
      localStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = newVal));
      return newVal;
    });
  };

  const toggleCamera = () => {
    setCameraOn(prev => {
      const newVal = !prev;
      localStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = newVal));
      return newVal;
    });
  };

  const sendChat = () => {
    if (!chatInput.trim() || !socketRef.current || !roomIdRef.current) return;
    // In production, you'd use a separate room-based message channel
    // For now, emit via socket
    setChats(prev => [...prev, { text: chatInput.trim(), sent: true }]);
    setChatInput('');
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-chat-container">
      <div className="video-area">
        <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline muted={false} />

        {/* Partner info bar */}
        {partner && state === 'connected' && (
          <div className="partner-info-bar">
            <div className="partner-avatar">{partner.username?.charAt(0).toUpperCase() || '?'}</div>
            <span className="partner-name">{partner.username}</span>
          </div>
        )}

        {/* Local video (PIP) */}
        <div className="local-video">
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>

        {/* Searching overlay */}
        {state === 'searching' && (
          <div className="video-text">
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <h2>Finding someone...</h2>
            <p>Searching for {searchTime}s — don't close this tab</p>
          </div>
        )}

        {/* Idle overlay */}
        {state === 'idle' && (
          <div className="video-text">
            <h2>Tap to Start</h2>
            <p>Find a random person for video chat</p>
          </div>
        )}

        {/* Chat overlay during connected */}
        {state === 'connected' && (
          <div className="chat-overlay">
            <div style={{ marginBottom: 8, maxHeight: 100, overflowY: 'auto' }}>
              {chats.map((c, i) => (
                <div key={i} className={`message ${c.sent ? 'sent' : 'received'}`} style={{ marginBottom: 4, maxWidth: 200, fontSize: 13, padding: '6px 12px' }}>
                  {c.text}
                </div>
              ))}
            </div>
            <div className="chat-overlay-input">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Say something..."
              />
              <button onClick={sendChat}><Send size={16} /></button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="video-controls">
          {state === 'idle' && (
            <button className="video-btn primary" onClick={startSearch} style={{ width: 64, height: 64 }}>
              <VideoIcon size={28} />
            </button>
          )}
          {state === 'searching' && (
            <button className="video-btn danger" onClick={cancelSearch}>
              <PhoneOff size={24} />
            </button>
          )}
          {(state === 'connected' || state === 'ended') && (
            <>
              <button className={`video-btn ${micOn ? '' : 'danger'}`} onClick={toggleMic}>
                {micOn ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              <button className={`video-btn ${cameraOn ? '' : 'danger'}`} onClick={toggleCamera}>
                {cameraOn ? <VideoIcon size={22} /> : <VideoOff size={22} />}
              </button>
              <button
                className="video-btn primary"
                onClick={state === 'connected' ? skipPartner : startSearch}
                style={{ width: 60, height: 60 }}
              >
                {state === 'connected' ? <SkipForward size={24} /> : <VideoIcon size={24} />}
              </button>
              <button className="video-btn danger" onClick={state === 'connected' ? endCall : exit}>
                <PhoneOff size={22} />
              </button>
            </>
          )}
        </div>

        {/* Timer */}
        {state === 'connected' && (
          <div style={{ position: 'absolute', top: 60, right: 20, background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 12, fontSize: 13, zIndex: 4 }}>
            {formatTime(searchTime)}
          </div>
        )}
      </div>
    </div>
  );

  function exit() {
    endCall();
    navigate('/discover');
  }
}
