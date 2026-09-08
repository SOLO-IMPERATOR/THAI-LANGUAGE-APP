import Dexie from 'dexie';
import { getCanonicalPhrases, loadCanonicalPhrases } from './phrasesData.js';

export const db = new Dexie('ThaiSpokenPwaDB');

// Schema definition
db.version(1).stores({
  phrases: '++id, thai_hidden, transcription_ru, translation_ru, category, stage_srs, next_review, is_deconstructed',
  dictionary_words: '++id, thai_hidden, transcription_ru, translation_ru, source_phrase_id',
  settings: 'key'
});

db.version(2).stores({
  phrases: '++id, thai_hidden, transcription_ru, translation_ru, category, *tags, stage_srs, review_count, next_review, is_deconstructed',
  dictionary_words: '++id, thai_hidden, transcription_ru, translation_ru, source_phrase_id',
  settings: 'key',
  users: '++id, email, authProvider'
});

db.version(3).stores({
  phrases: '++id, thai_hidden, transcription_ru, translation_ru, category, *tags, stage_srs, review_count, next_review, is_deconstructed',
  dictionary_words: '++id, thai_hidden, transcription_ru, translation_ru, source_phrase_id',
  settings: 'key',
  users: '++id, email, authProvider, isPrivate, weeklyScore',
  friend_requests: '++id, fromUserId, toUserId, status, createdAt',
  direct_messages: '++id, senderId, receiverId, timestamp',
  rooms: '++id, creatorId, isPublic, requireApproval, createdAt',
  room_messages: '++id, roomId, senderId, timestamp'
});

/** Canonical phrases from API (filled during initDatabase). */
export let INITIAL_PHRASES = [];

/** Bump when phrase content / words_breakdown must refresh in IndexedDB. */
const PHRASES_CONTENT_REV = 5;

function hasPoorWordsBreakdown(phrases, sampleSize = 80) {
  if (!phrases?.length) return true;
  const sample = phrases.slice(0, sampleSize);
  const poor = sample.filter((p) => {
    const wb = p.words_breakdown || p.words || [];
    return !Array.isArray(wb) || wb.length <= 1;
  }).length;
  return poor >= Math.max(3, Math.floor(sample.length * 0.25));
}

export async function initDatabase() {
  try {
    INITIAL_PHRASES = await loadCanonicalPhrases();
  } catch (loadErr) {
    console.warn('Failed to load phrases from SQLite API:', loadErr);
    INITIAL_PHRASES = getCanonicalPhrases();
  }

  try {
    if (!db.isOpen()) {
      await db.open();
    }
  } catch (openErr) {
    console.warn('Dexie open initial attempt failed, trying reset/reopen:', openErr);
    try {
      await db.delete();
      await db.open();
    } catch (recreateErr) {
      console.error('Dexie database could not be opened or recreated:', recreateErr);
      return;
    }
  }

  try {
    if (!INITIAL_PHRASES.length) {
      console.warn('No canonical phrases available for Dexie sync');
      return;
    }

    const count = await db.phrases.count();
    const existingPhrases = count > 0 ? await db.phrases.toArray() : [];
    const revRow = await db.settings.get('phrasesContentRev');
    const storedRev = revRow?.value;

    // Re-sync when count/shape/content revision changes, or local breakdown is stale
    const needsResync =
      count !== INITIAL_PHRASES.length ||
      storedRev !== PHRASES_CONTENT_REV ||
      hasPoorWordsBreakdown(existingPhrases) ||
      existingPhrases.some(
        (p) => !p.female || !p.male || (p.russian && p.russian.includes('Полезная разговорная фраза'))
      );

    if (count === 0 || needsResync) {
      // Map existing learning progress by Russian key to preserve SRS stats
      const progressMap = new Map();
      existingPhrases.forEach((p) => {
        const key = (p.russian || p.translation_ru || '').trim().toLowerCase();
        if (key) {
          progressMap.set(key, {
            stage_srs: p.stage_srs || 0,
            review_count: p.review_count || 0,
            next_review: p.next_review || 0,
            is_deconstructed: p.is_deconstructed || 0,
            tags: p.tags
          });
        }
      });

      const canonical900 = INITIAL_PHRASES.map((p, idx) => {
        const key = (p.russian || p.translation_ru || '').trim().toLowerCase();
        const saved = progressMap.get(key);
        return {
          ...p,
          id: idx + 1,
          stage_srs: saved ? saved.stage_srs : (p.stage_srs || 0),
          review_count: saved ? saved.review_count : (p.review_count || 0),
          next_review: saved ? saved.next_review : (p.next_review || 0),
          is_deconstructed: saved ? saved.is_deconstructed : (p.is_deconstructed || 0),
          tags: (saved && saved.tags && saved.tags.length > 0) ? saved.tags : (p.tags || ['разговорный', 'базовое'])
        };
      });

      await db.phrases.clear();
      await db.phrases.bulkAdd(canonical900);
      await db.settings.put({ key: 'phrasesContentRev', value: PHRASES_CONTENT_REV });
      console.log(`Synchronized database with ${canonical900.length} canonical phrases (rev ${PHRASES_CONTENT_REV}).`);
    }


    // Ensure default settings exist
    const defaultSettings = [
      { key: 'dailyGoal', value: 10 },
      { key: 'trainingMode', value: 'mix' }, // 'new' | 'review' | 'mix'
      { key: 'reminderHour', value: 10 },
      { key: 'reminderMinute', value: 0 },
      { key: 'notificationsEnabled', value: false },
      { key: 'playbackRate', value: 0.7 }
    ];

    for (const s of defaultSettings) {
      const existing = await db.settings.get(s.key);
      if (!existing) {
        await db.settings.put(s);
      }
    }
  } catch (dbOpErr) {
    console.warn('Error during database seeding/migration:', dbOpErr);
  }
}
