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

// 4. Server-Side Admin Authentication (No client SDK leakage)
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (email && email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
    // Generate secure session identifier
    const sessionToken = 'nexus_session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    res.json({ 
      success: true, 
      isAdmin: true, 
      email: ADMIN_EMAIL,
      token: sessionToken
    });
  } else {
    res.status(403).json({ 
      success: false, 
      isAdmin: false, 
      error: `Доступ дозволено лише для ${ADMIN_EMAIL}` 
    });
  }
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
