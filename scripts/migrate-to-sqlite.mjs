import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const dbPath = path.join(dataDir, 'app.db');
const phrasesPath = path.join(dataDir, 'thai_phrases_database.json');
const wordsPath = path.join(dataDir, 'words_dictionary.json');

function ensureDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS phrases (
      id INTEGER PRIMARY KEY,
      category TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      russian TEXT NOT NULL,
      is_question INTEGER NOT NULL DEFAULT 0,
      male_thai TEXT NOT NULL DEFAULT '',
      male_transcription_ru TEXT NOT NULL DEFAULT '',
      male_particle TEXT NOT NULL DEFAULT '',
      female_thai TEXT NOT NULL DEFAULT '',
      female_transcription_ru TEXT NOT NULL DEFAULT '',
      female_particle TEXT NOT NULL DEFAULT '',
      thai_hidden TEXT NOT NULL DEFAULT '',
      transcription_ru TEXT NOT NULL DEFAULT '',
      translation_ru TEXT NOT NULL DEFAULT '',
      stage_srs INTEGER NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      next_review INTEGER NOT NULL DEFAULT 0,
      is_deconstructed INTEGER NOT NULL DEFAULT 0,
      words_breakdown TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thai TEXT NOT NULL,
      transcription_ru TEXT NOT NULL DEFAULT '',
      translation_ru TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      username TEXT NOT NULL DEFAULT 'User',
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '👨',
      gender TEXT NOT NULL DEFAULT 'male',
      city_in_thailand TEXT NOT NULL DEFAULT 'Бангкок',
      stay_duration TEXT NOT NULL DEFAULT 'Турист / Отпуск',
      daily_goal INTEGER NOT NULL DEFAULT 10,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streak INTEGER NOT NULL DEFAULT 1,
      registered_at TEXT NOT NULL,
      is_private INTEGER NOT NULL DEFAULT 0,
      last_active_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_phrase_progress (
      user_id TEXT NOT NULL,
      phrase_id INTEGER NOT NULL,
      stage_srs INTEGER NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      next_review INTEGER NOT NULL DEFAULT 0,
      is_deconstructed INTEGER NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, phrase_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (phrase_id) REFERENCES phrases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_review_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      phrase_id INTEGER NOT NULL,
      result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
      stage_before INTEGER NOT NULL DEFAULT 0,
      stage_after INTEGER NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (phrase_id) REFERENCES phrases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_phrases_category ON phrases(category);
    CREATE INDEX IF NOT EXISTS idx_words_thai ON words(thai);
    CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_phrase_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_history_user ON user_review_history(user_id, created_at DESC);
  `);
}

function migrate() {
  ensureDir();

  if (!fs.existsSync(phrasesPath)) {
    throw new Error(`Missing phrases file: ${phrasesPath}`);
  }
  if (!fs.existsSync(wordsPath)) {
    throw new Error(`Missing words file: ${wordsPath}`);
  }

  const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf-8'));
  const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

  if (!Array.isArray(phrases) || phrases.length === 0) {
    throw new Error('Phrases JSON is empty or invalid');
  }
  if (!Array.isArray(words) || words.length === 0) {
    throw new Error('Words JSON is empty or invalid');
  }

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  for (const suffix of ['-wal', '-shm']) {
    const side = `${dbPath}${suffix}`;
    if (fs.existsSync(side)) fs.unlinkSync(side);
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);

  const insertPhrase = db.prepare(`
    INSERT INTO phrases (
      id, category, tags, russian, is_question,
      male_thai, male_transcription_ru, male_particle,
      female_thai, female_transcription_ru, female_particle,
      thai_hidden, transcription_ru, translation_ru,
      stage_srs, review_count, next_review, is_deconstructed, words_breakdown
    ) VALUES (
      @id, @category, @tags, @russian, @is_question,
      @male_thai, @male_transcription_ru, @male_particle,
      @female_thai, @female_transcription_ru, @female_particle,
      @thai_hidden, @transcription_ru, @translation_ru,
      @stage_srs, @review_count, @next_review, @is_deconstructed, @words_breakdown
    )
  `);

  const insertWord = db.prepare(`
    INSERT INTO words (thai, transcription_ru, translation_ru)
    VALUES (@thai, @transcription_ru, @translation_ru)
  `);

  const importAll = db.transaction(() => {
    for (const phrase of phrases) {
      insertPhrase.run({
        id: phrase.id,
        category: phrase.category || '',
        tags: JSON.stringify(phrase.tags || []),
        russian: phrase.russian || phrase.translation_ru || '',
        is_question: phrase.isQuestion ? 1 : 0,
        male_thai: phrase.male?.thai || '',
        male_transcription_ru: phrase.male?.transcription_ru || '',
        male_particle: phrase.male?.particle || phrase.male?.polite_particle || '',
        female_thai: phrase.female?.thai || '',
        female_transcription_ru: phrase.female?.transcription_ru || '',
        female_particle: phrase.female?.particle || phrase.female?.polite_particle || '',
        thai_hidden: phrase.thai_hidden || phrase.male?.thai || '',
        transcription_ru: phrase.transcription_ru || phrase.male?.transcription_ru || '',
        translation_ru: phrase.translation_ru || phrase.russian || '',
        stage_srs: phrase.stage_srs || 0,
        review_count: phrase.review_count || 0,
        next_review: phrase.next_review || 0,
        is_deconstructed: phrase.is_deconstructed || 0,
        words_breakdown: JSON.stringify(phrase.words_breakdown || phrase.words || []),
      });
    }

    for (const word of words) {
      insertWord.run({
        thai: word.thai || '',
        transcription_ru: word.transcription_ru || '',
        translation_ru: word.translation_ru || '',
      });
    }
  });

  importAll();

  const phrasesCount = db.prepare('SELECT COUNT(*) AS c FROM phrases').get().c;
  const wordsCount = db.prepare('SELECT COUNT(*) AS c FROM words').get().c;
  const usersCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;

  db.close();

  console.log(`SQLite DB created: ${dbPath}`);
  console.log(`Phrases migrated: ${phrasesCount}`);
  console.log(`Words migrated: ${wordsCount}`);
  console.log(`Users table ready (empty): ${usersCount}`);
}

migrate();
