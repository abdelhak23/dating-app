# MeetLive - Dating App Frontend

React frontend for the MeetLive dating app with swipe-based discovery, matching, chat, and video chat features.

## 🚀 Quick Start (Local Development)

```bash
cd frontend
npm install
npm start
```

App runs at: http://localhost:3000

## 📦 Build for Production

```bash
npm run build
```

Output goes to the `build/` folder.

## 🌐 Deploy to Netlify

### Option 1: Drag & Drop
1. Run `npm run build`
2. Go to https://app.netlify.com/drop
3. Drag the `build` folder onto the drop zone
4. Done! (But you'll need to set environment variables)

### Option 2: Connect GitHub (Recommended)
1. Push this code to a GitHub repository
2. Sign up at https://netlify.com
3. Click "New site from Git"
4. Connect your repository
5. Netlify auto-detects React and builds with:
   - Build command: `npm run build`
   - Publish directory: `build`
6. Add environment variable:
   - Key: `REACT_APP_API_URL`
   - Value: `https://your-backend-url.com` (your deployed backend)
7. Deploy!

### Option 3: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
# Follow prompts, then:
netlify deploy --prod
```

## ⚙️ Environment Variables

Before production deployment, set:

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_API_URL` | Your backend API URL (e.g., https://api.yourapp.com) | Yes |

**For local development** (optional):
Create `.env` file:
```
REACT_APP_API_URL=http://localhost:3001
```

## 🔧 Backend Required

This frontend requires a running backend server. See the backend README for deployment options.

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── context/        # Auth context & API config
├── pages/          # Page components (Discover, Chat, etc.)
├── styles/         # Global CSS styles
└── App.js          # Main app with routing
```

## 🎨 Tech Stack

- React 18
- React Router v6
- lucide-react icons
- CSS with glassmorphism styling

## 🤝 Contributing

1. Fork it
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
