const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const { jwtDecode } = require('jwt-decode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Configure CORS based on environment
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [FRONTEND_URL];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    if (corsOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session middleware for passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'dating-app-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });
}

const storage = multer.diskStorage({
  destination: path.join(uploadsDir, 'avatars'),
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// In-memory stores (use Redis/DB in production)
const users = new Map();
const onlineUsers = new Map();
const rooms = new Map();
const waitingUsers = new Set();
const loginSessions = [];

const SECRET_KEY = process.env.JWT_SECRET || 'ab709b33-c3b3-4ca8-9fdb-e2e70154963a';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || FRONTEND_URL.replace('3000', '3001') || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '200409858873-i1aqtfr4hnkr2pbfopnlbcn24iat0gdp.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || `${API_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists by email
    let user = [...users.values()].find(u => u.email === profile.emails[0].value);

    if (!user) {
      // Create new user from Google profile
      user = {
        id: uuidv4(),
        username: profile.emails[0].value.split('@')[0], // Use email prefix as username
        email: profile.emails[0].value,
        googleId: profile.id,
        password: '', // No password for OAuth users
        name: profile.displayName || profile.emails[0].value.split('@')[0],
        age: null,
        gender: 'other', // Default, can be updated later
        bio: '',
        avatarUrl: profile.photos[0].value, // Use Google profile picture
        preferences: { minAge: 18, maxAge: 60, gender: 'any' },
        matches: [],
        reports: 0,
        createdAt: new Date().toISOString(),
      };
      users.set(user.username, user);
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });

    // Return user data and token
    done(null, { ...user, token, password: undefined });
  } catch (error) {
    done(error, null);
  }
}));

function recordLogin(user) {
  loginSessions.push({
    googleId: user.googleId || null,
    email: user.email,
    username: user.username,
    loginAt: new Date().toISOString(),
  });
}

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// --- Auth Routes ---
app.post('/api/register', (req, res) => {
  const { username, email, password, name, age, gender, bio } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password required' });
  }
  if (users.has(username)) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  const user = {
    id: uuidv4(),
    username,
    email,
    password, // Hash in production using bcrypt
    name: name || username,
    age: age || null,
    gender: gender || 'other',
    bio: bio || '',
    avatarUrl: '',
    preferences: { minAge: 18, maxAge: 60, gender: 'any' },
    matches: [],
    reports: 0,
    createdAt: new Date().toISOString(),
  };
  users.set(username, user);
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
  res.status(201).json({ token, user: { ...user, password: undefined } });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
  res.json({ token, user: { ...user, password: undefined } });
});

// Google OAuth Routes
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('req.user:', JSON.stringify(req.user, null, 2));
    if (!req.user || !req.user.username) {
      console.error('Google OAuth: req.user is missing username');
      return res.redirect('/login?error=auth_failed');
    }
    const { token, username } = req.user;
    if (!token) {
      console.error('Google OAuth: token missing from req.user');
      return res.redirect('/login?error=auth_failed');
    }
    res.redirect(`${FRONTEND_URL}/auth/google/callback?token=${token}&username=${encodeURIComponent(username)}`);
  }
);

// Handle the callback from frontend to complete Google auth
app.post('/api/auth/google/complete', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const decoded = jwtDecode(token);
    const user = [...users.values()].find(u => u.id === decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ token, user: { ...user, password: undefined } });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// --- Profile Routes ---
app.get('/api/profile/me', authenticateToken, (req, res) => {
  const user = [...users.values()].find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, password: undefined });
});

app.put('/api/profile/me', authenticateToken, (req, res) => {
  const user = [...users.values()].find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  Object.assign(user, req.body);
  res.json({ ...user, password: undefined });
});

app.post('/api/profile/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  const user = [...users.values()].find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (req.file) {
    // Build avatar URL using API_URL environment variable or request origin
    const baseUrl = req.get('origin') || API_URL;
    user.avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
  }
  res.json({ avatarUrl: user.avatarUrl });
});

// --- Discovery / Browse ---
app.get('/api/users', authenticateToken, (req, res) => {
  const me = [...users.values()].find(u => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: 'User not found' });
  let userList = [...users.values()].filter(u => u.id !== me.id);
  // Apply basic filters
  if (me.preferences.gender !== 'any') {
    userList = userList.filter(u => u.gender === me.preferences.gender);
  }
  if (me.preferences.minAge) {
    userList = userList.filter(u => u.age && u.age >= me.preferences.minAge);
  }
  if (me.preferences.maxAge) {
    userList = userList.filter(u => u.age && u.age <= me.preferences.maxAge);
  }
  res.json(userList.map(u => ({
    id: u.id, username: u.username, name: u.name, age: u.age,
    gender: u.gender, bio: u.bio, avatarUrl: u.avatarUrl,
    online: onlineUsers.has(u.id),
  })));
});

// --- Match Routes ---
app.post('/api/match', authenticateToken, (req, res) => {
  const me = [...users.values()].find(u => u.id === req.user.id);
  const them = [...users.values()].find(u => u.id === req.body.userId);
  if (!me || !them) return res.status(404).json({ error: 'User not found' });
  if (!me.matches.includes(them.id)) {
    me.matches.push(them.id);
  }
  // Auto-match for simplicity (in production: double opt-in)
  if (!them.matches.includes(me.id)) {
    them.matches.push(me.id);
  }
  res.json({ matched: true, user: { id: them.id, name: them.name, avatarUrl: them.avatarUrl } });
});

app.get('/api/matches', authenticateToken, (req, res) => {
  const me = [...users.values()].find(u => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: 'User not found' });
  const matchList = me.matches.map(matchId => {
    const m = [...users.values()].find(u => u.id === matchId);
    return m ? { id: m.id, name: m.name, avatarUrl: m.avatarUrl, online: onlineUsers.has(m.id) } : null;
  }).filter(Boolean);
  res.json(matchList);
});

// --- Report ---
app.post('/api/report', authenticateToken, (req, res) => {
  const reported = [...users.values()].find(u => u.id === req.body.userId);
  if (reported) {
    reported.reports = (reported.reports || 0) + 1;
  }
  res.json({ success: true });
});

// --- Socket.IO for Video Chat & Messaging ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  const username = socket.user.username;
  onlineUsers.set(userId, socket.id);

  socket.emit('connected', { userId, username });

  // === Messaging ===
  socket.on('send_message', ({ toUserId, text }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive_message', {
        fromUserId: userId,
        text,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // === Video Chat Matching (Azar-style random video) ===
  socket.on('find_match', () => {
    socket.join('searching');
    waitingUsers.add(socket.id);

    // Find a compatible waiting user
    const waitingArray = [...waitingUsers];
    for (const wId of waitingArray) {
      if (wId === socket.id) continue;
      const wSocket = io.sockets.sockets.get(wId);
      if (!wSocket) { waitingUsers.delete(wId); continue; }
      // Could add filtering by gender/age here
      // Create a room
      const roomId = uuidv4();
      const roomInfo = {
        id: roomId,
        user1: { socketId: socket.id, userId, username },
        user2: { socketId: wSocket.id, userId: wSocket.user.id, username: wSocket.user.username },
        startTime: new Date().toISOString(),
      };
      rooms.set(roomId, roomInfo);
      socket.join(roomId);
      wSocket.join(roomId);
      waitingUsers.delete(socket.id);
      waitingUsers.delete(wId);
      io.to(socket.id).emit('match_found', { roomId, partner: roomInfo.user2 });
      io.to(wSocket.id).emit('match_found', { roomId, partner: roomInfo.user1 });
      // Leave searching room
      io.to(socket.id).socketsJoin([roomId]);
      return;
    }
  });

  socket.on('cancel_search', () => {
    waitingUsers.delete(socket.id);
    socket.leave('searching');
    socket.emit('search_cancelled');
  });

  // WebRTC signaling through the room
  socket.on('webrtc_offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('webrtc_offer', { offer, from: userId });
  });
  socket.on('webrtc_answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('webrtc_answer', { answer, from: userId });
  });
  socket.on('webrtc_ice_candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('webrtc_ice_candidate', { candidate, from: userId });
  });

  socket.on('end_call', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const partnerSocketId = room.user1.socketId === socket.id
        ? room.user2.socketId : room.user1.socketId;
      io.to(partnerSocketId).emit('call_ended');
      rooms.delete(roomId);
    }
    waitingUsers.delete(socket.id);
  });

  socket.on('next', ({ roomId }) => {
    // End current call and find new match
    const room = rooms.get(roomId);
    if (room) {
      const partnerSocketId = room.user1.socketId === socket.id
        ? room.user2.socketId : room.user1.socketId;
      io.to(partnerSocketId).emit('partner_skipped');
      rooms.delete(roomId);
      socket.leave(roomId);
    }

    // Immediately find next
    socket.join('searching');
    waitingUsers.add(socket.id);
    const waitingArray = [...waitingUsers];
    for (const wId of waitingArray) {
      if (wId === socket.id) continue;
      const wSocket = io.sockets.sockets.get(wId);
      if (!wSocket) { waitingUsers.delete(wId); continue; }
      const newRoomId = uuidv4();
      const newRoom = {
        id: newRoomId,
        user1: { socketId: socket.id, userId, username },
        user2: { socketId: wSocket.id, userId: wSocket.user.id, username: wSocket.user.username },
        startTime: new Date().toISOString(),
      };
      rooms.set(newRoomId, newRoom);
      socket.join(newRoomId);
      wSocket.join(newRoomId);
      waitingUsers.delete(socket.id);
      waitingUsers.delete(wId);
      io.to(socket.id).emit('match_found', { roomId: newRoomId, partner: newRoom.user2 });
      io.to(wSocket.id).emit('match_found', { roomId: newRoomId, partner: newRoom.user1 });
      return;
    }
    socket.emit('searching_for_partner');
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    waitingUsers.delete(socket.id);
    // Clean up rooms
    for (const [roomId, room] of rooms) {
      if (room.user1.socketId === socket.id || room.user2.socketId === socket.id) {
        const otherSocketId = room.user1.socketId === socket.id ? room.user2.socketId : room.user1.socketId;
        const otherSocket = io.sockets.sockets.get(otherSocketId);
        if (otherSocket) io.to(otherSocketId).emit('partner_disconnected');
        rooms.delete(roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

function seedUsers() {
  if (users.size > 0) return;
  const sampleUsers = [
    { username: 'alice', email: 'alice@example.com', password: '1234', name: 'Alice', age: 26, gender: 'female', bio: 'Love hiking and coffee 🌄', avatarUrl: '' },
    { username: 'bob', email: 'bob@example.com', password: '1234', name: 'Bob', age: 29, gender: 'male', bio: 'Guitar player, movie buff 🎸', avatarUrl: '' },
    { username: 'diana', email: 'diana@example.com', password: '1234', name: 'Diana', age: 24, gender: 'female', bio: 'Travel addict and foodie ✈️', avatarUrl: '' },
    { username: 'charlie', email: 'charlie@example.com', password: '1234', name: 'Charlie', age: 27, gender: 'male', bio: 'Tech geek who loves yoga 💻', avatarUrl: '' },
    { username: 'emma', email: 'emma@example.com', password: '1234', name: 'Emma', age: 25, gender: 'female', bio: 'Photographer and cat lover 📸', avatarUrl: '' },
    { username: 'david', email: 'david@example.com', password: '1234', name: 'David', age: 30, gender: 'male', bio: 'Chef looking for a taste of love 👨‍🍳', avatarUrl: '' },
  ];
  for (const u of sampleUsers) {
    const user = {
      ...u,
      id: uuidv4(),
      preferences: { minAge: 18, maxAge: 60, gender: 'any' },
      matches: [],
      reports: 0,
      createdAt: new Date().toISOString(),
    };
    users.set(user.username, user);
  }
  console.log(`Seeded ${sampleUsers.length} demo users`);
}

server.listen(PORT, () => {
  seedUsers();
  console.log(`Server running on port ${PORT}`);
});
