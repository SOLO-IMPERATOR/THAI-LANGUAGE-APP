/**
 * Gender helpers and canonical phrases loader.
 * Source of truth for phrases is MySQL via /api/phrases (PHP).
 */

let cachedPhrases = [];

export function getCanonicalPhrases() {
  return cachedPhrases;
}

export async function loadCanonicalPhrases() {
  const res = await fetch('/api/phrases');
  if (!res.ok) {
    throw new Error(`Failed to load phrases: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Phrases API returned empty data');
  }
  cachedPhrases = data;
  return cachedPhrases;
}

/**
 * Returns a phrase adapted for the active user's gender (male: khrap / female: kha)
 * ensuring exact polite particles and pronouns are displayed, spoken, and practiced.
 * For a woman, NEVER output "khrap / крап / кхрап".
 */
export function getGenderedPhrase(phrase, gender = 'male') {
  if (!phrase) return null;
  const isFemale = gender === 'female';
  const isQuestion = !!phrase.isQuestion ||
    (typeof phrase.russian === 'string' && phrase.russian.endsWith('?')) ||
    (typeof phrase.translation_ru === 'string' && phrase.translation_ru.endsWith('?'));

  const defaultFemaleParticle = isQuestion ? 'คะ' : 'ค่ะ';
  const defaultFemaleTrParticle = isQuestion ? 'кха́' : 'кха̂';

  let chosenThai = '';
  let chosenTr = '';
  let chosenParticle = '';

  if (isFemale) {
    if (phrase.female?.thai && phrase.female?.transcription_ru) {
      chosenThai = phrase.female.thai;
      chosenTr = phrase.female.transcription_ru;
      chosenParticle = phrase.female.particle || defaultFemaleParticle;
    } else {
      // Fallback derivation if female object is missing in cache
      let rawThai = phrase.thai_hidden || phrase.thai || '';
      let rawTr = phrase.transcription_ru || phrase.ru_tr || '';

      rawThai = rawThai.replace(/ครับ$/, '').trim();
      rawTr = rawTr.replace(/\s+кхра́п$/i, '').replace(/\s+кхрап$/i, '').replace(/\s+крап$/i, '').trim();

      rawThai = rawThai.replace(/\bผม\b/g, 'ฉัน').replace(/^ผม/g, 'ฉัน');
      rawTr = rawTr.replace(/\bпхо̌м\b/gi, 'чхан').replace(/^пхо̌м/gi, 'чхан').replace(/\bпхом\b/gi, 'чхан');

      chosenThai = `${rawThai}${defaultFemaleParticle}`;
      chosenTr = `${rawTr} ${defaultFemaleTrParticle}`;
      chosenParticle = defaultFemaleParticle;
    }

    // Defensive guarantee: NEVER let khrap/крап slip into a female view
    if (chosenThai.endsWith('ครับ')) {
      chosenThai = chosenThai.replace(/ครับ$/, defaultFemaleParticle);
    }
    if (chosenTr.toLowerCase().endsWith('кхра́п') || chosenTr.toLowerCase().endsWith('кхрап') || chosenTr.toLowerCase().endsWith('крап')) {
      chosenTr = chosenTr.replace(/\s+(?:кхра́п|кхрап|крап)$/i, ` ${defaultFemaleTrParticle}`);
    }
  } else {
    if (phrase.male?.thai && phrase.male?.transcription_ru) {
      chosenThai = phrase.male.thai;
      chosenTr = phrase.male.transcription_ru;
      chosenParticle = phrase.male.particle || 'ครับ';
    } else {
      let rawThai = phrase.thai_hidden || phrase.thai || '';
      let rawTr = phrase.transcription_ru || phrase.ru_tr || '';

      rawThai = rawThai.replace(/ค่ะ$/, '').replace(/คะ$/, '').trim();
      rawTr = rawTr.replace(/\s+кха̂$/, '').replace(/\s+кха́$/, '').trim();

      chosenThai = `${rawThai}ครับ`;
      chosenTr = `${rawTr} кхра́п`;
      chosenParticle = 'ครับ';
    }
  }

  // Adapt words breakdown if present (skip polite particles — they are not study words)
  const baseWords = (phrase.words_breakdown || phrase.words || []).filter((w) => {
    if (!w) return false;
    const thai = String(w.thai_hidden || w.thai || '').trim();
    const gloss = String(w.translation_ru || '').toLowerCase();
    if (!thai) return false;
    if (thai === 'ครับ' || thai === 'ค่ะ' || thai === 'คะ') return false;
    if (/ครับ\s*\/\s*ค่ะ/.test(thai)) return false;
    if (gloss.includes('вежливая частица')) return false;
    return true;
  });
  const adaptedWords = baseWords.map((w) => {
    if (!w) return w;
    if (isFemale) {
      if (w.thai_hidden === 'ผม' || w.thai === 'ผม') {
        return {
          thai_hidden: 'ฉัน',
          thai: 'ฉัน',
          transcription_ru: 'чха̌н',
          translation_ru: 'я (жен.)'
        };
      }
    } else {
      if (w.thai_hidden === 'ฉัน' || w.thai === 'ฉัน') {
        return {
          thai_hidden: 'ผม',
          thai: 'ผม',
          transcription_ru: 'пхо̌м',
          translation_ru: 'я (муж.)'
        };
      }
    }
    return w;
  });

  return {
    ...phrase,
    activeGender: isFemale ? 'female' : 'male',
    thai_hidden: chosenThai,
    transcription_ru: chosenTr,
    translation_ru: phrase.russian || phrase.translation_ru,
    polite_particle: chosenParticle,
    words_breakdown: adaptedWords
  };
}
