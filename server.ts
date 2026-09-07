import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PHRASES_FILE = path.join(DATA_DIR, 'thai_phrases_database.json');
const WORDS_FILE = path.join(DATA_DIR, 'words_dictionary.json');

// Helper to ensure data files exist
function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading users:', err);
    return [];
  }
}

function saveUsers(users: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users:', err);
  }
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Phrases database endpoint
app.get('/api/phrases', (req, res) => {
  try {
    if (fs.existsSync(PHRASES_FILE)) {
      const data = fs.readFileSync(PHRASES_FILE, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      return res.send(data);
    }
    res.status(404).json({ error: 'Phrases file not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Words dictionary endpoint
app.get('/api/words', (req, res) => {
  try {
    if (fs.existsSync(WORDS_FILE)) {
      const data = fs.readFileSync(WORDS_FILE, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      return res.send(data);
    }
    res.status(404).json({ error: 'Words dictionary not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get all users (Leaderboard & Community)
app.get('/api/users', (req, res) => {
  try {
    const users = loadUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Register new user
app.post('/api/register', (req, res) => {
  try {
    const userData = req.body;
    if (!userData || (!userData.email && !userData.id)) {
      return res.status(400).json({ error: 'Email or ID required' });
    }

    const users = loadUsers();
    const existingIndex = users.findIndex(
      (u: any) =>
        (userData.id && u.id === userData.id) ||
        (userData.email && u.email?.toLowerCase() === userData.email?.toLowerCase())
    );

    const newUser = {
      id: userData.id || `user-${Date.now()}`,
      email: userData.email || '',
      username: userData.username || userData.email?.split('@')[0] || 'User',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      avatar: userData.avatar || (userData.gender === 'female' ? '👩' : '👨'),
      gender: userData.gender || 'male',
      cityInThailand: userData.cityInThailand || 'Бангкок',
      stayDuration: userData.stayDuration || 'Турист / Отпуск',
      dailyGoal: userData.dailyGoal || 10,
      xp: userData.xp || 0,
      level: userData.level || 1,
      streak: userData.streak || 1,
      registeredAt: userData.registeredAt || new Date().toISOString(),
      isPrivate: userData.isPrivate === true,
      lastActiveAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // Merge updates
      users[existingIndex] = {
        ...users[existingIndex],
        ...newUser,
        xp: Math.max(users[existingIndex].xp || 0, newUser.xp || 0),
        level: Math.max(users[existingIndex].level || 1, newUser.level || 1),
        streak: Math.max(users[existingIndex].streak || 1, newUser.streak || 1)
      };
    } else {
      users.unshift(newUser);
    }

    saveUsers(users);
    console.log(`Registered / Synced user: ${newUser.username} (${newUser.gender})`);
    res.json({ success: true, user: newUser });
  } catch (err: any) {
    console.error('Registration API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Sync user progress
app.post('/api/users/sync', (req, res) => {
  try {
    const { id, email, xp, level, streak, gender, avatar, username, cityInThailand } = req.body;
    if (!id && !email) {
      return res.status(400).json({ error: 'ID or email required' });
    }

    const users = loadUsers();
    const idx = users.findIndex(
      (u: any) => (id && u.id === id) || (email && u.email?.toLowerCase() === email?.toLowerCase())
    );

    if (idx >= 0) {
      if (xp !== undefined) users[idx].xp = xp;
      if (level !== undefined) users[idx].level = level;
      if (streak !== undefined) users[idx].streak = streak;
      if (gender !== undefined) users[idx].gender = gender;
      if (avatar !== undefined) users[idx].avatar = avatar;
      if (username !== undefined) users[idx].username = username;
      if (cityInThailand !== undefined) users[idx].cityInThailand = cityInThailand;
      users[idx].lastActiveAt = new Date().toISOString();
      saveUsers(users);
      return res.json({ success: true, user: users[idx] });
    }

    res.status(404).json({ error: 'User not found to sync' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Git & Database status info
app.get('/api/git-status', (req, res) => {
  res.json({
    database: {
      type: 'Local JSON + Dexie IndexedDB',
      phrasesCount: 1000,
      dataFile: 'data/thai_phrases_database.json',
      dictionaryFile: 'data/words_dictionary.json',
      usersFile: 'data/users.json'
    },
    features: {
      genderSeparation: 'Male (ครับ / ผม) & Female (ค่ะ/คะ / ฉัน)',
      zeroDuplicates: true,
      nativePwaPrompt: true,
      multiDeviceSync: true
    }
  });
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
