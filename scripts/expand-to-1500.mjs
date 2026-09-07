/**
 * Expand phrase DB to 1500 conversational phrases.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EXTRA_PHRASES, assertExtraCount } from './extra_phrases_600.mjs';
import { TOPUP_PHRASES } from './extra_phrases_topup.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
const phrasesPath = path.join(dataDir, 'thai_phrases_database.json');
const wordsPath = path.join(dataDir, 'words_dictionary.json');

function cleanRussianText(text) {
  return String(text || '')
    .replace(/\s*\((?:муж|жен|муж\.|жен\.|мужской|женский)\)/gi, '')
    .trim();
}

function isQuestionPhrase(thai, ru) {
  if (ru.includes('?')) return true;
  if (
    thai.includes('ไหม') ||
    thai.includes('หรือ') ||
    thai.includes('อะไร') ||
    thai.includes('เท่าไหร่') ||
    thai.includes('ที่ไหน') ||
    thai.includes('กี่') ||
    thai.includes('เมื่อไหร่') ||
    thai.includes('อย่างไร') ||
    thai.includes('ทำไม')
  ) {
    return true;
  }
  return false;
}

function generateGenderedVariants(item) {
  let thai = item.thai ? item.thai.trim() : '';
  let ru_tr = item.ru_tr ? item.ru_tr.trim() : '';
  let ru = cleanRussianText(item.ru || item.translation_ru || '');
  const cat = item.cat || item.category || 'Разговорная речь';
  const tags = item.tags || ['разговорный'];

  const isQ = isQuestionPhrase(thai, ru);

  let baseThai = thai.replace(/\s*(?:ครับ|ค่ะ|คะ)\s*$/g, '').trim();
  let baseRuTr = ru_tr.replace(/\s*(?:кхра́п|кхрап|кхап|кха̂|кха́|кха)\s*$/gi, '').trim();

  let maleThai = baseThai;
  let maleRuTr = baseRuTr;
  let femaleThai = baseThai;
  let femaleRuTr = baseRuTr;

  if (baseThai.startsWith('ฉัน') || baseThai.startsWith('ดิฉัน')) {
    maleThai = baseThai.replace(/^(?:ฉัน|ดิฉัน)/, 'ผม');
    maleRuTr = baseRuTr.replace(/^(?:Чха̌н|Дича̌н|Дичан|Чхан)\s*/i, 'Пхо̌м ');
  } else if (baseThai.startsWith('ผม')) {
    femaleThai = baseThai.replace(/^ผม/, 'ฉัน');
    femaleRuTr = baseRuTr.replace(/^Пхо̌м\s*/i, 'Чха̌н ');
  }

  const finalMaleThai = `${maleThai}ครับ`;
  const finalMaleRuTr = `${maleRuTr} кхра́п`;

  const femaleParticleThai = isQ ? 'คะ' : 'ค่ะ';
  const femaleParticleRuTr = isQ ? 'кха́' : 'кха̂';
  const finalFemaleThai = `${femaleThai}${femaleParticleThai}`;
  const finalFemaleRuTr = `${femaleRuTr} ${femaleParticleRuTr}`;

  const wordsBreakdown = [
    {
      thai_hidden: baseThai,
      transcription_ru: baseRuTr,
      translation_ru: ru,
    },
    {
      thai_hidden: 'ครับ / ค่ะ',
      transcription_ru: 'кхра́п (м.) / кха̂ (ж.)',
      translation_ru: 'вежливая частица',
    },
  ];

  return {
    russian: ru,
    category: cat,
    tags,
    isQuestion: isQ,
    male: {
      thai: finalMaleThai,
      transcription_ru: finalMaleRuTr,
      particle: 'ครับ',
    },
    female: {
      thai: finalFemaleThai,
      transcription_ru: finalFemaleRuTr,
      particle: femaleParticleThai,
    },
    wordsBreakdown,
  };
}

function isNonConversational(phrase) {
  const ru = (phrase.russian || phrase.translation_ru || '').trim();
  const thai = (phrase.male?.thai || phrase.thai_hidden || phrase.thai || '').trim();

  if (/продлевать визу в иммигрейшн/i.test(ru)) return true;
  if (ru.length > 90) return true;
  if (thai.replace(/ครับ|ค่ะ|คะ/g, '').length > 48) return true;
  if (/впереди полицейский дорожный пост/i.test(ru)) return true;
  if (/полезная разговорная фраза|фраза\s*\d+/i.test(ru)) return true;

  return false;
}

function seedFromExisting(raw) {
  const thai = (raw.male?.thai || raw.thai_hidden || raw.thai || '')
    .replace(/\s*(?:ครับ|ค่ะ|คะ)\s*$/g, '')
    .trim();
  const ru_tr = (raw.male?.transcription_ru || raw.transcription_ru || '')
    .replace(/\s*(?:кхра́п|кхрап|кхап|кха̂|кха́|кха)\s*$/gi, '')
    .trim();
  return {
    thai,
    ru_tr,
    ru: (raw.russian || raw.translation_ru || '').trim(),
    cat: raw.category || 'Разговорная речь',
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t) => !/^(мужской|женский|базовое)$/i.test(t))
      : ['разговорный'],
  };
}

function toDbRecord(variant, id) {
  return {
    id,
    category: variant.category,
    tags: variant.tags?.length ? variant.tags : ['разговорный'],
    russian: variant.russian,
    isQuestion: !!variant.isQuestion,
    male: variant.male,
    female: variant.female,
    thai_hidden: variant.male.thai,
    transcription_ru: variant.male.transcription_ru,
    translation_ru: variant.russian,
    stage_srs: 0,
    review_count: 0,
    next_review: 0,
    is_deconstructed: 0,
    words_breakdown: variant.wordsBreakdown || [],
  };
}

function collectWords(phrases) {
  const map = new Map();
  for (const p of phrases) {
    for (const side of [p.male, p.female]) {
      if (!side?.thai) continue;
      if (!map.has(side.thai)) {
        map.set(side.thai, {
          thai: side.thai,
          transcription_ru: side.transcription_ru || '',
          translation_ru: p.russian || '',
        });
      }
    }
    for (const w of p.words_breakdown || []) {
      const thai = (w.thai_hidden || w.thai || '').trim();
      if (!thai || /ครับ\s*\/\s*ค่ะ/.test(thai)) continue;
      if (!map.has(thai)) {
        map.set(thai, {
          thai,
          transcription_ru: w.transcription_ru || '',
          translation_ru: w.translation_ru || '',
        });
      }
    }
  }
  return [...map.values()];
}

function main() {
  assertExtraCount();

  const existing = JSON.parse(fs.readFileSync(phrasesPath, 'utf-8'));
  const kept = existing.filter((p) => !isNonConversational(p));
  const dropped = existing.length - kept.length;

  const uniqueByRu = new Map();
  const uniqueByThai = new Map();

  const pushSeed = (seed) => {
    if (!seed.ru || !seed.thai) return;
    const ruKey = seed.ru.toLowerCase();
    const thaiKey = seed.thai.replace(/\s+/g, '');
    if (uniqueByRu.has(ruKey) || uniqueByThai.has(thaiKey)) return;
    const variant = generateGenderedVariants(seed);
    uniqueByRu.set(ruKey, variant);
    uniqueByThai.set(thaiKey, variant);
  };

  for (const p of kept) pushSeed(seedFromExisting(p));

  for (const r of [
    {
      thai: 'จะไปต่อวีซ่าพรุ่งนี้',
      ru_tr: 'ча̀ пай тɔ̀: ви:са̂: пхру̂нг ни́:',
      ru: 'Завтра поеду продлевать визу',
      cat: 'Общение и экспаты',
      tags: ['виза', 'планы'],
    },
    {
      thai: 'อิมมิเกรชันอยู่ที่ไหน',
      ru_tr: 'иммигре́йшан йу̀: тхи̂: на̌й',
      ru: 'Где находится иммиграция?',
      cat: 'Город и ориентирование',
      tags: ['виза', 'ориентирование'],
    },
    {
      thai: 'ต่อวีซ่ากี่วัน',
      ru_tr: 'тɔ̀: ви:са̂: кѝ: ван',
      ru: 'На сколько дней продлевают визу?',
      cat: 'Общение и экспаты',
      tags: ['виза'],
    },
  ]) {
    pushSeed(r);
  }

  for (const seed of EXTRA_PHRASES) pushSeed(seed);
  for (const seed of TOPUP_PHRASES) pushSeed(seed);

  let phrases = [...uniqueByRu.values()].map((v, idx) => toDbRecord(v, idx + 1));
  console.log(`Unique after merge: ${phrases.length}`);

  phrases = phrases.slice(0, 1500).map((p, idx) => ({ ...p, id: idx + 1 }));

  if (phrases.length < 1500) {
    throw new Error(`Need 1500 phrases, got ${phrases.length}. Add more seeds.`);
  }

  const words = collectWords(phrases);
  fs.writeFileSync(phrasesPath, JSON.stringify(phrases, null, 2), 'utf-8');
  fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2), 'utf-8');

  console.log(`Dropped non-conversational: ${dropped}`);
  console.log(`Wrote phrases: ${phrases.length}`);
  console.log(`Wrote words: ${words.length}`);
  const cats = {};
  phrases.forEach((p) => {
    cats[p.category] = (cats[p.category] || 0) + 1;
  });
  console.log('Categories:', cats);
}

main();
