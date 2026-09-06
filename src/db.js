import Dexie from 'dexie';
import { PHRASES_1000 } from './phrasesData.js';

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

export const INITIAL_PHRASES = PHRASES_1000;

export async function initDatabase() {
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
    const count = await db.phrases.count();
    if (count === 0) {
      await db.phrases.bulkAdd(INITIAL_PHRASES);
    } else if (count < 500) {
      // Import the full 1000 phrases without duplicates
      const existing = await db.phrases.toArray();
      const existingThaiSet = new Set(existing.map((p) => p.thai_hidden));

      const newPhrasesToAdd = INITIAL_PHRASES.filter((p) => !existingThaiSet.has(p.thai_hidden)).map((p) => ({
        ...p,
        stage_srs: 0,
        review_count: 0,
        next_review: 0,
        is_deconstructed: 0
      }));

      if (newPhrasesToAdd.length > 0) {
        await db.phrases.bulkAdd(newPhrasesToAdd);
      }
    } else {
      // Migration: ensure all existing phrases have tags & review_count
      const existingPhrases = await db.phrases.toArray();
      for (const p of existingPhrases) {
        let needsUpdate = false;
        const patch = {};

        if (!p.tags || !Array.isArray(p.tags) || p.tags.length === 0) {
          const seedMatch = INITIAL_PHRASES.find((s) => s.thai_hidden === p.thai_hidden);
          patch.tags = seedMatch?.tags || ['разговорный', 'базовое'];
          needsUpdate = true;
        }

        if (p.review_count === undefined) {
          patch.review_count = Number(p.stage_srs) || 0;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await db.phrases.update(p.id, patch);
        }
      }
    }

    // Ensure default settings exist
    const defaultSettings = [
      { key: 'dailyGoal', value: 10 },
      { key: 'trainingMode', value: 'mix' }, // 'new' | 'review' | 'mix'
      { key: 'reminderHour', value: 10 },
      { key: 'reminderMinute', value: 0 },
      { key: 'notificationsEnabled', value: false }
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
