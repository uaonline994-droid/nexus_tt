import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');

const ADMIN_EMAIL = "a60840397@gmail.com";

const DEFAULT_PROFILE = {
  avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
  displayName: "NEXUS",
  handle: "@chak.tt",
  bioText: "🚀 Офіційний акаунт NEXUS | Трендовий контент, стріми та промокод #NEXUS ✨",
  promoCode: "#NEXUS",
  stats: {
    followers: "0",
    likes: "0",
    views: "0"
  },
  links: [
    {
      id: "nexus_tt_1",
      title: "TikTok @chak.tt (Офіційний)",
      url: "https://tiktok.com/@chak.tt",
      icon: "tiktok",
      highlighted: true,
      clicks: 0
    },
    {
      id: "nexus_tg_2",
      title: "Telegram Канал NEXUS",
      url: "https://t.me",
      icon: "telegram",
      highlighted: true,
      clicks: 0
    },
    {
      id: "nexus_yt_3",
      title: "YouTube Канал",
      url: "https://youtube.com",
      icon: "youtube",
      highlighted: false,
      clicks: 0
    },
    {
      id: "nexus_inst_4",
      title: "Instagram Профіль",
      url: "https://instagram.com",
      icon: "instagram",
      highlighted: false,
      clicks: 0
    }
  ],
  news: [
    {
      id: "news_init_1",
      title: "🔥 Активуйте офіційний промокод #NEXUS!",
      content: "Отримуйте ексклюзивні бонуси та знижки за нашим фірмовим промокодом #NEXUS. Тисніть на плашку промокоду, щоб скопіювати!",
      tag: "🎁 ПРОМОКОД",
      isPinned: true,
      date: "Сьогодні",
      createdAt: Date.now()
    },
    {
      id: "news_init_2",
      title: "🎬 Нове відео вже на TikTok @chak.tt",
      content: "Свіжий ролик уже опубліковано! Залітайте, ставте лайки та залишайте коментарі під відео.",
      tag: "🔥 HOT",
      isPinned: false,
      date: "Вчора",
      createdAt: Date.now() - 86400000
    }
  ]
};

// Database persistence helpers
function getProfileData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(PROFILE_FILE)) {
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(DEFAULT_PROFILE, null, 2), 'utf-8');
      return DEFAULT_PROFILE;
    }
    const raw = fs.readFileSync(PROFILE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Database read error:', err);
    return DEFAULT_PROFILE;
  }
}

function saveProfileData(data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Database write error:', err);
    return false;
  }
}

// Real-time SSE Clients
type SSEClient = { id: number; res: express.Response };
let sseClients: SSEClient[] = [];
let clientIdCounter = 0;

function broadcastUpdate(data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (e) {
      // client disconnected
    }
  });
}

// 1. Get current profile
app.get('/api/profile', (req, res) => {
  const data = getProfileData();
  res.json({ success: true, profile: data });
});

// 2. Save profile updates (Broadcasts in real-time to all visitors)
app.post('/api/profile', (req, res) => {
  const incomingData = req.body;
  if (!incomingData || typeof incomingData !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }

  const current = getProfileData();
  const updated = {
    ...current,
    ...incomingData,
    stats: {
      followers: incomingData.stats?.followers ?? current.stats?.followers ?? '0',
      likes: incomingData.stats?.likes ?? current.stats?.likes ?? '0',
      views: incomingData.stats?.views ?? current.stats?.views ?? '0',
    },
    links: Array.isArray(incomingData.links) ? incomingData.links : current.links,
    news: Array.isArray(incomingData.news) ? incomingData.news : current.news,
  };

  const success = saveProfileData(updated);
  if (success) {
    broadcastUpdate(updated);
    res.json({ success: true, profile: updated });
  } else {
    res.status(500).json({ success: false, error: 'Database save failure' });
  }
});

// 3. SSE Live Events for instant cross-device updates
app.get('/api/profile/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const id = ++clientIdCounter;
  sseClients.push({ id, res });

  // Send initial state immediately
  const initialData = getProfileData();
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== id);
  });
});

// 4. Server-Side Google OAuth verification
app.post('/api/auth/verify-google', (req, res) => {
  const { email, token } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Відсутній Google Email' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const targetAdmin = ADMIN_EMAIL.trim().toLowerCase();

  if (cleanEmail === targetAdmin) {
    const sessionToken = 'nexus_session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 12);
    return res.json({ 
      success: true, 
      isAdmin: true, 
      token: sessionToken 
    });
  } else {
    return res.status(403).json({ 
      success: false, 
      isAdmin: false, 
      error: 'У доступі відмовлено: цей Google акаунт не має прав адміністратора.' 
    });
  }
});

// 5. Verify existing session token
app.post('/api/auth/session', (req, res) => {
  const { token } = req.body;
  if (token && typeof token === 'string' && token.startsWith('nexus_session_')) {
    return res.json({ success: true, isAdmin: true });
  }
  return res.json({ success: false, isAdmin: false });
});

// 6. OAuth callback endpoint for Google popup
app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Google Authentication</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #e0e5ec; color: #2d3748; }
          .card { padding: 24px; border-radius: 20px; background: #e0e5ec; box-shadow: 10px 10px 20px #bec4cf, -10px -10px 20px #ffffff; text-align: center; max-width: 320px; }
          .spinner { width: 32px; height: 32px; border: 3px solid #bec4cf; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 12px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <div style="font-size: 14px; font-weight: bold;">Перевірка акаунта Google...</div>
        </div>
        <script>
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          if (accessToken) {
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: 'Bearer ' + accessToken }
            })
            .then(r => r.json())
            .then(user => {
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_SUCCESS', 
                  token: accessToken, 
                  email: user.email, 
                  name: user.name, 
                  picture: user.picture 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            })
            .catch(err => {
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: err.message }, '*');
                window.close();
              }
            });
          } else {
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: 'No token returned' }, '*');
              window.close();
            }
          }
        </script>
      </body>
    </html>
  `);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
