/**
 * Rebuild words_breakdown for all phrases: real words, no กะ/ครับ particles.
 * Usage: node scripts/rebuild-words-breakdown.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildLexicon,
  buildWordsBreakdown,
  isPoliteParticleWord,
  stripPoliteParticleThai,
  stripPoliteParticleTr,
} from './thaiWordBreakdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
const phrasesPath = path.join(dataDir, 'thai_phrases_database.json');
const wordsPath = path.join(dataDir, 'words_dictionary.json');

const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf-8'));
const existingWords = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

// Prefer short dictionary entries as lexicon seeds
// Prefer short dictionary entries as lexicon seeds, but never full phrase bases
const phraseBases = new Set(
  phrases.map((p) => stripPoliteParticleThai(p.male?.thai || p.thai_hidden || ''))
);

const shortDict = existingWords
  .map((w) => ({
    thai: stripPoliteParticleThai(w.thai),
    transcription_ru: stripPoliteParticleTr(w.transcription_ru),
    translation_ru: w.translation_ru || '',
  }))
  .filter((w) => {
    if (!w.thai || w.thai.length <= 1 || w.thai.length > 6) return false;
    if (phraseBases.has(w.thai)) return false;
    // Skip glued forms that are just smaller atoms concatenated
    // (e.g. ดีไหม → ดี + ไหม, อันนี้ → อัน + นี้)
    return true;
  });

const lexicon = buildLexicon(shortDict);

// Drop compositional lexicon rows: if A+B both exist, remove AB
{
  const keys = [...lexicon.keys()].sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key.length < 3) continue;
    let i = 0;
    const parts = [];
    while (i < key.length) {
      let hit = null;
      for (let len = Math.min(key.length - i, key.length - 1); len >= 1; len--) {
        const sub = key.slice(i, i + len);
        if (sub !== key && lexicon.has(sub)) {
          hit = sub;
          break;
        }
      }
      if (!hit) {
        parts.length = 0;
        break;
      }
      parts.push(hit);
      i += hit.length;
    }
    if (parts.length >= 2) lexicon.delete(key);
  }
}

let multi = 0;
let single = 0;
let particleLeft = 0;

for (const p of phrases) {
  const baseThai = stripPoliteParticleThai(p.male?.thai || p.thai_hidden || '');
  const baseTr = stripPoliteParticleTr(p.male?.transcription_ru || p.transcription_ru || '');
  const russian = p.russian || p.translation_ru || '';

  let breakdown = buildWordsBreakdown(baseThai, baseTr, russian, lexicon);

  // Safety: never keep particle rows
  breakdown = breakdown.filter((w) => !isPoliteParticleWord(w));

  // If still empty, fall back to whole base phrase (still no particle)
  if (breakdown.length === 0 && baseThai) {
    breakdown = [
      {
        thai_hidden: baseThai,
        transcription_ru: baseTr,
        translation_ru: russian,
      },
    ];
  }

  p.words_breakdown = breakdown;
  if (breakdown.length > 1) multi += 1;
  else single += 1;
  if (breakdown.some(isPoliteParticleWord)) particleLeft += 1;
}

// Rebuild words dictionary from breakdown tokens + gendered phrase forms without particles
const wordMap = new Map();
const addWord = (thai, transcription_ru, translation_ru) => {
  const key = stripPoliteParticleThai(thai);
  if (!key || isPoliteParticleWord({ thai_hidden: key, translation_ru })) return;
  if (!wordMap.has(key)) {
    wordMap.set(key, {
      thai: key,
      transcription_ru: stripPoliteParticleTr(transcription_ru),
      translation_ru: translation_ru || '',
    });
  }
};

for (const p of phrases) {
  for (const w of p.words_breakdown || []) {
    addWord(w.thai_hidden, w.transcription_ru, w.translation_ru);
  }
  addWord(
    stripPoliteParticleThai(p.male?.thai),
    stripPoliteParticleTr(p.male?.transcription_ru),
    p.russian
  );
  addWord(
    stripPoliteParticleThai(p.female?.thai),
    stripPoliteParticleTr(p.female?.transcription_ru),
    p.russian
  );
}

const words = [...wordMap.values()];

fs.writeFileSync(phrasesPath, JSON.stringify(phrases, null, 2), 'utf-8');
fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2), 'utf-8');

console.log(
  JSON.stringify(
    {
      phrases: phrases.length,
      words: words.length,
      multiWordBreakdowns: multi,
      singleWordBreakdowns: single,
      particleLeft,
      samples: phrases.slice(0, 5).map((p) => ({
        id: p.id,
        ru: p.russian,
        words: (p.words_breakdown || []).map((w) => w.thai_hidden),
      })),
    },
    null,
    2
  )
);
