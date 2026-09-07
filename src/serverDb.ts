import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

export type PhraseRecord = {
  id: number;
  category: string;
  tags: string[];
  russian: string;
  isQuestion: boolean;
  male: {
    thai: string;
    transcription_ru: string;
    particle: string;
  };
  female: {
    thai: string;
    transcription_ru: string;
    particle: string;
  };
  thai_hidden: string;
  transcription_ru: string;
  translation_ru: string;
  stage_srs: number;
  review_count: number;
  next_review: number;
  is_deconstructed: number;
  words_breakdown: Array<{
    thai_hidden?: string;
    thai?: string;
    transcription_ru?: string;
    translation_ru?: string;
  }>;
};

export type WordRecord = {
  thai: string;
  transcription_ru: string;
  translation_ru: string;
};

export type UserPhraseProgress = {
  userId: string;
  phraseId: number;
  stage_srs: number;
  review_count: number;
  next_review: number;
  is_deconstructed: number;
  tags: string[];
  updatedAt: string;
};

export type UserReviewHistoryItem = {
  id: number;
  userId: string;
  phraseId: number;
  result: 'success' | 'failure';
  stageBefore: number;
  stageAfter: number;
  reviewCount: number;
  createdAt: string;
};

export type UserRecord = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  gender: string;
  cityInThailand: string;
  stayDuration: string;
  dailyGoal: number;
  xp: number;
  level: number;
  streak: number;
  registeredAt: string;
  isPrivate: boolean;
  lastActiveAt: string;
};

let db: Database.Database | null = null;

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getDbPath() {
  return DB_PATH;
}

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

export function initSchema(database: Database.Database = getDb()) {
  database.exec(`
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

function mapPhraseRow(row: any): PhraseRecord {
  return {
    id: row.id,
    category: row.category,
    tags: parseJson(row.tags, []),
    russian: row.russian,
    isQuestion: !!row.is_question,
    male: {
      thai: row.male_thai,
      transcription_ru: row.male_transcription_ru,
      particle: row.male_particle,
    },
    female: {
      thai: row.female_thai,
      transcription_ru: row.female_transcription_ru,
      particle: row.female_particle,
    },
    thai_hidden: row.thai_hidden,
    transcription_ru: row.transcription_ru,
    translation_ru: row.translation_ru,
    stage_srs: row.stage_srs || 0,
    review_count: row.review_count || 0,
    next_review: row.next_review || 0,
    is_deconstructed: row.is_deconstructed || 0,
    words_breakdown: parseJson(row.words_breakdown, []),
  };
}

function mapUserRow(row: any): UserRecord {
  return {
    id: row.id,
    email: row.email || '',
    username: row.username || 'User',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    avatar: row.avatar || '👨',
    gender: row.gender || 'male',
    cityInThailand: row.city_in_thailand || 'Бангкок',
    stayDuration: row.stay_duration || 'Турист / Отпуск',
    dailyGoal: row.daily_goal ?? 10,
    xp: row.xp || 0,
    level: row.level || 1,
    streak: row.streak || 1,
    registeredAt: row.registered_at,
    isPrivate: !!row.is_private,
    lastActiveAt: row.last_active_at,
  };
}

export function getAllPhrases(): PhraseRecord[] {
  const rows = getDb().prepare('SELECT * FROM phrases ORDER BY id ASC').all();
  return rows.map(mapPhraseRow);
}

export function getPhrasesCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS count FROM phrases').get() as { count: number };
  return row.count;
}

export function getAllWords(): WordRecord[] {
  const rows = getDb()
    .prepare('SELECT thai, transcription_ru, translation_ru FROM words ORDER BY id ASC')
    .all() as WordRecord[];
  return rows;
}

export function getWordsCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS count FROM words').get() as { count: number };
  return row.count;
}

export function getAllUsers(): UserRecord[] {
  const rows = getDb().prepare('SELECT * FROM users ORDER BY xp DESC, registered_at ASC').all();
  return rows.map(mapUserRow);
}

export function findUserByIdOrEmail(id?: string, email?: string): UserRecord | null {
  if (id) {
    const byId = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (byId) return mapUserRow(byId);
  }
  if (email) {
    const byEmail = getDb()
      .prepare('SELECT * FROM users WHERE lower(email) = lower(?)')
      .get(email);
    if (byEmail) return mapUserRow(byEmail);
  }
  return null;
}

export function upsertUser(user: UserRecord): UserRecord {
  const existing = findUserByIdOrEmail(user.id, user.email);
  const database = getDb();

  if (existing) {
    const merged: UserRecord = {
      ...existing,
      ...user,
      xp: Math.max(existing.xp || 0, user.xp || 0),
      level: Math.max(existing.level || 1, user.level || 1),
      streak: Math.max(existing.streak || 1, user.streak || 1),
      lastActiveAt: user.lastActiveAt || new Date().toISOString(),
    };

    database
      .prepare(
        `UPDATE users SET
          email = @email,
          username = @username,
          first_name = @firstName,
          last_name = @lastName,
          avatar = @avatar,
          gender = @gender,
          city_in_thailand = @cityInThailand,
          stay_duration = @stayDuration,
          daily_goal = @dailyGoal,
          xp = @xp,
          level = @level,
          streak = @streak,
          registered_at = @registeredAt,
          is_private = @isPrivate,
          last_active_at = @lastActiveAt
        WHERE id = @id`
      )
      .run({
        ...merged,
        isPrivate: merged.isPrivate ? 1 : 0,
      });

    return merged;
  }

  database
    .prepare(
      `INSERT INTO users (
        id, email, username, first_name, last_name, avatar, gender,
        city_in_thailand, stay_duration, daily_goal, xp, level, streak,
        registered_at, is_private, last_active_at
      ) VALUES (
        @id, @email, @username, @firstName, @lastName, @avatar, @gender,
        @cityInThailand, @stayDuration, @dailyGoal, @xp, @level, @streak,
        @registeredAt, @isPrivate, @lastActiveAt
      )`
    )
    .run({
      ...user,
      isPrivate: user.isPrivate ? 1 : 0,
    });

  return user;
}

export function syncUserProgress(patch: {
  id?: string;
  email?: string;
  xp?: number;
  level?: number;
  streak?: number;
  gender?: string;
  avatar?: string;
  username?: string;
  cityInThailand?: string;
}): UserRecord | null {
  const existing = findUserByIdOrEmail(patch.id, patch.email);
  if (!existing) return null;

  const updated: UserRecord = {
    ...existing,
    xp: patch.xp !== undefined ? patch.xp : existing.xp,
    level: patch.level !== undefined ? patch.level : existing.level,
    streak: patch.streak !== undefined ? patch.streak : existing.streak,
    gender: patch.gender !== undefined ? patch.gender : existing.gender,
    avatar: patch.avatar !== undefined ? patch.avatar : existing.avatar,
    username: patch.username !== undefined ? patch.username : existing.username,
    cityInThailand:
      patch.cityInThailand !== undefined ? patch.cityInThailand : existing.cityInThailand,
    lastActiveAt: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `UPDATE users SET
        xp = @xp,
        level = @level,
        streak = @streak,
        gender = @gender,
        avatar = @avatar,
        username = @username,
        city_in_thailand = @cityInThailand,
        last_active_at = @lastActiveAt
      WHERE id = @id`
    )
    .run(updated);

  return updated;
}

export function replacePhrases(phrases: any[]) {
  const database = getDb();
  const insert = database.prepare(`
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

  const tx = database.transaction((items: any[]) => {
    database.exec('DELETE FROM phrases');
    for (const phrase of items) {
      insert.run({
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
  });

  tx(phrases);
}

export function replaceWords(words: any[]) {
  const database = getDb();
  const insert = database.prepare(`
    INSERT INTO words (thai, transcription_ru, translation_ru)
    VALUES (@thai, @transcription_ru, @translation_ru)
  `);

  const tx = database.transaction((items: any[]) => {
    database.exec('DELETE FROM words');
    for (const word of items) {
      insert.run({
        thai: word.thai || '',
        transcription_ru: word.transcription_ru || '',
        translation_ru: word.translation_ru || '',
      });
    }
  });

  tx(words);
}

function mapProgressRow(row: any): UserPhraseProgress {
  return {
    userId: row.user_id,
    phraseId: row.phrase_id,
    stage_srs: row.stage_srs || 0,
    review_count: row.review_count || 0,
    next_review: row.next_review || 0,
    is_deconstructed: row.is_deconstructed || 0,
    tags: parseJson(row.tags, []),
    updatedAt: row.updated_at,
  };
}

function mapHistoryRow(row: any): UserReviewHistoryItem {
  return {
    id: row.id,
    userId: row.user_id,
    phraseId: row.phrase_id,
    result: row.result,
    stageBefore: row.stage_before || 0,
    stageAfter: row.stage_after || 0,
    reviewCount: row.review_count || 0,
    createdAt: row.created_at,
  };
}

export function getUserPhraseProgress(userId: string): UserPhraseProgress[] {
  const rows = getDb()
    .prepare('SELECT * FROM user_phrase_progress WHERE user_id = ? ORDER BY phrase_id ASC')
    .all(userId);
  return rows.map(mapProgressRow);
}

export function getUserReviewHistory(userId: string, limit = 200): UserReviewHistoryItem[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM user_review_history
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
    )
    .all(userId, Math.max(1, Math.min(limit, 1000)));
  return rows.map(mapHistoryRow);
}

export function upsertUserPhraseProgress(
  userId: string,
  progress: {
    phraseId: number;
    stage_srs?: number;
    review_count?: number;
    next_review?: number;
    is_deconstructed?: number;
    tags?: string[];
  },
  event?: {
    result: 'success' | 'failure';
    stageBefore?: number;
    stageAfter?: number;
    reviewCount?: number;
    createdAt?: string;
  }
): UserPhraseProgress {
  const database = getDb();
  const now = new Date().toISOString();
  const existing = database
    .prepare('SELECT * FROM user_phrase_progress WHERE user_id = ? AND phrase_id = ?')
    .get(userId, progress.phraseId) as any;

  const merged = {
    user_id: userId,
    phrase_id: progress.phraseId,
    stage_srs: progress.stage_srs ?? existing?.stage_srs ?? 0,
    review_count: progress.review_count ?? existing?.review_count ?? 0,
    next_review: progress.next_review ?? existing?.next_review ?? 0,
    is_deconstructed: progress.is_deconstructed ?? existing?.is_deconstructed ?? 0,
    tags: JSON.stringify(
      progress.tags !== undefined ? progress.tags : parseJson(existing?.tags, [])
    ),
    updated_at: now,
  };

  database
    .prepare(
      `INSERT INTO user_phrase_progress (
        user_id, phrase_id, stage_srs, review_count, next_review, is_deconstructed, tags, updated_at
      ) VALUES (
        @user_id, @phrase_id, @stage_srs, @review_count, @next_review, @is_deconstructed, @tags, @updated_at
      )
      ON CONFLICT(user_id, phrase_id) DO UPDATE SET
        stage_srs = excluded.stage_srs,
        review_count = excluded.review_count,
        next_review = excluded.next_review,
        is_deconstructed = excluded.is_deconstructed,
        tags = excluded.tags,
        updated_at = excluded.updated_at`
    )
    .run(merged);

  if (event?.result) {
    database
      .prepare(
        `INSERT INTO user_review_history (
          user_id, phrase_id, result, stage_before, stage_after, review_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        progress.phraseId,
        event.result,
        event.stageBefore ?? existing?.stage_srs ?? 0,
        event.stageAfter ?? merged.stage_srs,
        event.reviewCount ?? merged.review_count,
        event.createdAt || now
      );
  }

  database
    .prepare('UPDATE users SET last_active_at = ? WHERE id = ?')
    .run(now, userId);

  return mapProgressRow(merged);
}

export function bulkUpsertUserPhraseProgress(
  userId: string,
  items: Array<{
    phraseId: number;
    stage_srs?: number;
    review_count?: number;
    next_review?: number;
    is_deconstructed?: number;
    tags?: string[];
  }>
): number {
  const upsert = getDb().transaction((rows: typeof items) => {
    let count = 0;
    for (const item of rows) {
      if (!item?.phraseId) continue;
      upsertUserPhraseProgress(userId, item);
      count += 1;
    }
    return count;
  });
  return upsert(items);
}

export function getSrsStats(userId?: string) {
  const database = getDb();
  if (userId) {
    const progress = database
      .prepare('SELECT COUNT(*) AS c FROM user_phrase_progress WHERE user_id = ?')
      .get(userId) as { c: number };
    const history = database
      .prepare('SELECT COUNT(*) AS c FROM user_review_history WHERE user_id = ?')
      .get(userId) as { c: number };
    return { progressCount: progress.c, historyCount: history.c };
  }
  const progress = database
    .prepare('SELECT COUNT(*) AS c FROM user_phrase_progress')
    .get() as { c: number };
  const history = database
    .prepare('SELECT COUNT(*) AS c FROM user_review_history')
    .get() as { c: number };
  return { progressCount: progress.c, historyCount: history.c };
}
