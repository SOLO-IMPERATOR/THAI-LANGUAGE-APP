import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  bulkUpsertUserPhraseProgress,
  getAllPhrases,
  getAllUsers,
  getAllWords,
  getDb,
  getDbPath,
  getPhrasesCount,
  getSrsStats,
  getUserPhraseProgress,
  getUserReviewHistory,
  getWordsCount,
  replacePhrases,
  replaceWords,
  syncUserProgress,
  upsertUser,
  upsertUserPhraseProgress,
  type UserRecord,
} from './src/serverDb';
import { synthesizeThaiMp3 } from './src/serverTts';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

function ensureSqliteSeeded() {
  getDb();
  if (getPhrasesCount() > 0 && getWordsCount() > 0) {
    return;
  }

  const phrasesFile = path.resolve(process.cwd(), 'data/thai_phrases_database.json');
  const wordsFile = path.resolve(process.cwd(), 'data/words_dictionary.json');

  if (getPhrasesCount() === 0 && fs.existsSync(phrasesFile)) {
    const phrases = JSON.parse(fs.readFileSync(phrasesFile, 'utf-8'));
    replacePhrases(phrases);
    console.log(`Auto-seeded phrases into SQLite: ${phrases.length}`);
  }

  if (getWordsCount() === 0 && fs.existsSync(wordsFile)) {
    const words = JSON.parse(fs.readFileSync(wordsFile, 'utf-8'));
    replaceWords(words);
    console.log(`Auto-seeded words into SQLite: ${words.length}`);
  }
}

ensureSqliteSeeded();

// TTS: neural Thai voice (same in all browsers)
app.post('/api/tts', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    const gender = req.body?.gender === 'male' ? 'male' : 'female';

    if (!text) {
      return res.status(400).json({ error: 'text required' });
    }

    // Always natural-speed cache; client applies playbackRate (0.5/0.7/1.0/1.2)
    const result = await synthesizeThaiMp3(text, { gender });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-TTS-Provider', result.provider);
    res.setHeader('X-TTS-Cache', result.cacheHit ? 'hit' : 'miss');
    return res.sendFile(result.filePath);
  } catch (err: any) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message || 'TTS failed' });
  }
});

app.get('/api/tts', async (req, res) => {
  try {
    const text = String(req.query.text || '').trim();
    const gender = req.query.gender === 'male' ? 'male' : 'female';

    if (!text) {
      return res.status(400).json({ error: 'text required' });
    }

    const result = await synthesizeThaiMp3(text, { gender });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-TTS-Provider', result.provider);
    res.setHeader('X-TTS-Cache', result.cacheHit ? 'hit' : 'miss');
    return res.sendFile(result.filePath);
  } catch (err: any) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message || 'TTS failed' });
  }
});

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Phrases database endpoint
app.get('/api/phrases', (req, res) => {
  try {
    res.json(getAllPhrases());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Words dictionary endpoint
app.get('/api/words', (req, res) => {
  try {
    res.json(getAllWords());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get all users (Leaderboard & Community)
app.get('/api/users', (req, res) => {
  try {
    res.json(getAllUsers());
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

    const now = new Date().toISOString();
    const newUser: UserRecord = {
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
      registeredAt: userData.registeredAt || now,
      isPrivate: userData.isPrivate === true,
      lastActiveAt: now,
    };

    const saved = upsertUser(newUser);
    console.log(`Registered / Synced user: ${saved.username} (${saved.gender})`);
    res.json({ success: true, user: saved });
  } catch (err: any) {
    console.error('Registration API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Sync user profile progress (xp/level/streak)
app.post('/api/users/sync', (req, res) => {
  try {
    const { id, email, xp, level, streak, gender, avatar, username, cityInThailand } = req.body;
    if (!id && !email) {
      return res.status(400).json({ error: 'ID or email required' });
    }

    const updated = syncUserProgress({
      id,
      email,
      xp,
      level,
      streak,
      gender,
      avatar,
      username,
      cityInThailand,
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found to sync' });
    }

    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get user SRS progress + recent history
app.get('/api/users/:userId/srs', (req, res) => {
  try {
    const { userId } = req.params;
    const historyLimit = Number(req.query.historyLimit) || 100;
    res.json({
      progress: getUserPhraseProgress(userId),
      history: getUserReviewHistory(userId, historyLimit),
      stats: getSrsStats(userId),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get user review history only
app.get('/api/users/:userId/srs/history', (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Number(req.query.limit) || 200;
    res.json(getUserReviewHistory(userId, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Upsert one phrase SRS update (+ optional history event)
app.post('/api/users/:userId/srs', (req, res) => {
  try {
    const { userId } = req.params;
    const {
      phraseId,
      stage_srs,
      review_count,
      next_review,
      is_deconstructed,
      tags,
      event,
    } = req.body || {};

    if (!phraseId) {
      return res.status(400).json({ error: 'phraseId required' });
    }

    const saved = upsertUserPhraseProgress(
      userId,
      {
        phraseId: Number(phraseId),
        stage_srs,
        review_count,
        next_review,
        is_deconstructed,
        tags,
      },
      event
    );

    res.json({ success: true, progress: saved });
  } catch (err: any) {
    console.error('SRS upsert error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. Bulk upsert SRS progress (local -> server migrate)
app.post('/api/users/:userId/srs/bulk', (req, res) => {
  try {
    const { userId } = req.params;
    const items = Array.isArray(req.body?.progress) ? req.body.progress : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'progress array required' });
    }

    const count = bulkUpsertUserPhraseProgress(userId, items);
    res.json({
      success: true,
      upserted: count,
      progress: getUserPhraseProgress(userId),
    });
  } catch (err: any) {
    console.error('SRS bulk upsert error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 11. Git & Database status info
app.get('/api/git-status', (req, res) => {
  const srs = getSrsStats();
  res.json({
    database: {
      type: 'SQLite + Dexie IndexedDB',
      phrasesCount: getPhrasesCount(),
      wordsCount: getWordsCount(),
      srsProgressCount: srs.progressCount,
      srsHistoryCount: srs.historyCount,
      dataFile: path.relative(process.cwd(), getDbPath()),
    },
    features: {
      genderSeparation: 'Male (ครับ / ผม) & Female (ค่ะ/คะ / ฉัน)',
      zeroDuplicates: true,
      nativePwaPrompt: true,
      multiDeviceSync: true,
      userSrsInSqlite: true,
    },
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
    console.log(`SQLite: ${getDbPath()} (${getPhrasesCount()} phrases, ${getWordsCount()} words)`);
  });
}

startServer();
