import fs from 'fs';
import path from 'path';

const existingData = JSON.parse(fs.readFileSync(path.resolve('data/thai_phrases_database.json'), 'utf-8'));

// Filter out serial filler entries
const cleanPhrases = existingData.filter(p =>
  !p.russian.includes('Полезная разговорная фраза') &&
  !p.russian.includes('Популярное разговорное выражение') &&
  !p.thai_hidden.includes('อันดับที่')
);

console.log('Clean phrases from existing database:', cleanPhrases.length);

const additions = [
  {
    russian: 'Где ближайший банкомат с нормальной комиссией?',
    category: 'Связь и быт',
    tags: ['деньги', 'банкомат', 'банки'],
    isQuestion: true,
    baseThai: 'ตู้เอทีเอ็มที่ใกล้ที่สุดอยู่ตรงไหน',
    baseTr: 'Ту̂: э:тхи:эм тхи̂: кла̂й тхи̂:су̀т йу̀: тронг на̌й',
    words: [
      { thai_hidden: 'ตู้เอทีเอ็ม', transcription_ru: 'ту̂: э:тхи:эм', translation_ru: 'банкомат' },
      { thai_hidden: 'ที่ใกล้ที่สุด', transcription_ru: 'тхи̂: кла̂й тхи̂:су̀т', translation_ru: 'ближайший' },
      { thai_hidden: 'อยู่ตรงไหน', transcription_ru: 'йу̀: тронг на̌й', translation_ru: 'находится где' }
    ]
  },
  {
    russian: 'Можно оплатить переводом через приложение банка?',
    category: 'Цены и счёт',
    tags: ['оплата', 'банк', 'перевод'],
    isQuestion: true,
    baseThai: 'โอนเงินผ่านแอปธนาคารได้ไหม',
    baseTr: 'О:н нгон пха̀:н ɛ́п тхана:кха:н да̂й ма̌й',
    words: [
      { thai_hidden: 'โอนเงิน', transcription_ru: 'о:н нгон', translation_ru: 'перевести деньги' },
      { thai_hidden: 'ผ่านแอป', transcription_ru: 'пха̀:н ɛ́п', translation_ru: 'через приложение' },
      { thai_hidden: 'ได้ไหม', transcription_ru: 'да̂й ма̌й', translation_ru: 'можно?' }
    ]
  },
  {
    russian: 'Пожалуйста, сделайте кондиционер потише',
    category: 'Отель и жильё',
    tags: ['кондиционер', 'номер', 'жильё'],
    isQuestion: false,
    baseThai: 'ช่วยหรี่แอร์ลงหน่อย',
    baseTr: 'Чху̂ай рѝ: ɛ: лонг но̀й',
    words: [
      { thai_hidden: 'ช่วย', transcription_ru: 'чху̂ай', translation_ru: 'помогите/пожалуйста' },
      { thai_hidden: 'หรี่แอร์', transcription_ru: 'рѝ: ɛ:', translation_ru: 'убавить кондиционер' },
      { thai_hidden: 'หน่อย', transcription_ru: 'но̀й', translation_ru: 'немного' }
    ]
  },
  {
    russian: 'Кондиционер течёт и капает вода',
    category: 'Отель и жильё',
    tags: ['кондиционер', 'ремонт', 'кондо'],
    isQuestion: false,
    baseThai: 'แอร์มีน้ำหยดรั่ว',
    baseTr: 'Э: ми: на́м йот ру̂а',
    words: [
      { thai_hidden: 'แอร์', transcription_ru: 'ɛ:', translation_ru: 'кондиционер' },
      { thai_hidden: 'มีน้ำหยด', transcription_ru: 'ми: на́м йот', translation_ru: 'капает вода' },
      { thai_hidden: 'รั่ว', transcription_ru: 'ру̂а', translation_ru: 'протекать' }
    ]
  },
  {
    russian: 'В кондо отключили электричество?',
    category: 'Отель и жильё',
    tags: ['кондо', 'электричество', 'быт'],
    isQuestion: true,
    baseThai: 'ไฟดับในคอนโดใช่ไหม',
    baseTr: 'Фай да̀п най кхондо: чха̂й ма̌й',
    words: [
      { thai_hidden: 'ไฟดับ', transcription_ru: 'фай да̀п', translation_ru: 'свет погас / отключение' },
      { thai_hidden: 'ในคอนโด', transcription_ru: 'най кхондо:', translation_ru: 'в кондоминиуме' },
      { thai_hidden: 'ใช่ไหม', transcription_ru: 'чха̂й ма̌й', translation_ru: 'верно?' }
    ]
  },
  {
    russian: 'Есть горячая вода в душе?',
    category: 'Отель и жильё',
    tags: ['душ', 'вода', 'отель'],
    isQuestion: true,
    baseThai: 'มีน้ำอุ่นในห้องอาบน้ำไหม',
    baseTr: 'Ми: на́м у̀н най хɔ̂нг а̀:п на́м ма̌й',
    words: [
      { thai_hidden: 'น้ำอุ่น', transcription_ru: 'на́м у̀н', translation_ru: 'горячая/тёплая вода' },
      { thai_hidden: 'ในห้องอาบน้ำ', transcription_ru: 'най хɔ̂нг а̀:п на́м', translation_ru: 'в душе/ванной' },
      { thai_hidden: 'ไหม', transcription_ru: 'ма̌й', translation_ru: 'вопросительная частица' }
    ]
  },
  {
    russian: 'Где ночной рынок с уличной едой?',
    category: 'Кафе и еда',
    tags: ['ночной рынок', 'еда', 'рынок'],
    isQuestion: true,
    baseThai: 'ตลาดโต้รุ่งที่มีของกินอยู่ตรงไหน',
    baseTr: 'Тала̀:т то̂:ру̂нг тхи̂: ми: кхɔ̌:нг кин йу̀: тронг на̌й',
    words: [
      { thai_hidden: 'ตลาดโต้รุ่ง', transcription_ru: 'тала̀:т то̂:ру̂нг', translation_ru: 'ночной рынок' },
      { thai_hidden: 'ของกิน', transcription_ru: 'кхɔ̌:нг кин', translation_ru: 'еда' },
      { thai_hidden: 'อยู่ตรงไหน', transcription_ru: 'йу̀: тронг на̌й', translation_ru: 'где находится' }
    ]
  },
  {
    russian: 'Где здесь можно зарядить телефон?',
    category: 'Связь и быт',
    tags: ['телефон', 'зарядка', 'кафе'],
    isQuestion: true,
    baseThai: 'ตรงนี้มีที่ชาร์จแบตโทรศัพท์ไหม',
    baseTr: 'Тронг ни́: ми: тхи̂: чха́:т бɛ̀т тхо:ра́са̀п ма̌й',
    words: [
      { thai_hidden: 'ตรงนี้', transcription_ru: 'тронг ни́:', translation_ru: 'здесь' },
      { thai_hidden: 'ที่ชาร์จแบต', transcription_ru: 'тхи̂: чха́:т бɛ̀т', translation_ru: 'зарядка/розетка' },
      { thai_hidden: 'โทรศัพท์', transcription_ru: 'тхо:ра́са̀п', translation_ru: 'телефон' }
    ]
  },
  {
    russian: 'У вас есть зарядный кабель Type-C?',
    category: 'Связь и быт',
    tags: ['кабель', 'телефон', 'техника'],
    isQuestion: true,
    baseThai: 'มีสายชาร์จไทป์ซีไหม',
    baseTr: 'Ми: са̌:й чха́:т тха́йпси: ма̌й',
    words: [
      { thai_hidden: 'สายชาร์จ', transcription_ru: 'са̌:й чха́:т', translation_ru: 'зарядный кабель' },
      { thai_hidden: 'ไทป์ซี', transcription_ru: 'тха́йпси:', translation_ru: 'Type-C' },
      { thai_hidden: 'ไหม', transcription_ru: 'ма̌й', translation_ru: 'вопрос: есть ли?' }
    ]
  },
  {
    russian: 'Помогите поднять чемодан по лестнице',
    category: 'Отель и жильё',
    tags: ['багаж', 'отель', 'помощь'],
    isQuestion: false,
    baseThai: 'ช่วยยกกระเป๋าขึ้นบันไดหน่อย',
    baseTr: 'Чху̂ай йо́к крапа̌у кхы̂н бандай но̀й',
    words: [
      { thai_hidden: 'ช่วยยก', transcription_ru: 'чху̂ай йо́к', translation_ru: 'помогите поднять' },
      { thai_hidden: 'กระเป๋า', transcription_ru: 'крапа̌у', translation_ru: 'чемодан/сумку' },
      { thai_hidden: 'ขึ้นบันได', transcription_ru: 'кхы̂н бандай', translation_ru: 'по лестнице вверх' }
    ]
  },
  {
    russian: 'Вызовите такси через приложение, пожалуйста',
    category: 'Транспорт и такси',
    tags: ['такси', 'приложение', 'поездка'],
    isQuestion: false,
    baseThai: 'ช่วยเรียกรถแท็กซี่ผ่านแอปให้หน่อย',
    baseTr: 'Чху̂ай ри̂ак ро́т тхɛ́кси̂: пха̀:н ɛ́п ха̂й но̀й',
    words: [
      { thai_hidden: 'เรียกรถแท็กซี่', transcription_ru: 'ри̂ак ро́т тхɛ́кси̂:', translation_ru: 'вызвать такси' },
      { thai_hidden: 'ผ่านแอป', transcription_ru: 'пха̀:н ɛ́п', translation_ru: 'через приложение' },
      { thai_hidden: 'ให้หน่อย', transcription_ru: 'ха̂й но̀й', translation_ru: 'пожалуйста для меня' }
    ]
  },
  {
    russian: 'Сколько минут займёт дорога?',
    category: 'Транспорт и такси',
    tags: ['время', 'дорога', 'такси'],
    isQuestion: true,
    baseThai: 'ใช้เวลากี่นาทีถึง',
    baseTr: 'Чха́й ве:ла: кѝ: на:тхи: тхы̌нг',
    words: [
      { thai_hidden: 'ใช้เวลา', transcription_ru: 'чха́й ве:ла:', translation_ru: 'займёт времени' },
      { thai_hidden: 'กี่นาที', transcription_ru: 'кѝ: на:тхи:', translation_ru: 'сколько минут' },
      { thai_hidden: 'ถึง', transcription_ru: 'тхы̌нг', translation_ru: 'до прибытия' }
    ]
  },
  {
    russian: 'Сделайте напиток без льда',
    category: 'Кафе и еда',
    tags: ['напитки', 'кафе', 'лёд'],
    isQuestion: false,
    baseThai: 'ไม่ใส่น้ำแข็ง',
    baseTr: 'Ма̂й са̀й на́м кхɛ̌нг',
    words: [
      { thai_hidden: 'ไม่ใส่', transcription_ru: 'ма̂й са̀й', translation_ru: 'не класть / без' },
      { thai_hidden: 'น้ำแข็ง', transcription_ru: 'на́м кхɛ̌нг', translation_ru: 'лёд' }
    ]
  },
  {
    russian: 'Без сахара и без сиропа, пожалуйста',
    category: 'Кафе и еда',
    tags: ['сахар', 'кофе', 'сироп'],
    isQuestion: false,
    baseThai: 'ไม่ใส่น้ำตาลและไม่ใส่น้ำเชื่อม',
    baseTr: 'Ма̂й са̀й на́мта:н лɛ́ ма̂й са̀й на́м чхы̂ам',
    words: [
      { thai_hidden: 'น้ำตาล', transcription_ru: 'на́мта:н', translation_ru: 'сахар' },
      { thai_hidden: 'น้ำเชื่อม', transcription_ru: 'на́м чхы̂ам', translation_ru: 'сироп' }
    ]
  },
  {
    russian: 'У вас есть меню с фотографиями блюд?',
    category: 'Кафе и еда',
    tags: ['меню', 'кафе', 'еда'],
    isQuestion: true,
    baseThai: 'มีเมนูที่มีรูปภาพอาหารไหม',
    baseTr: 'Ми: ме:ну: тхи̂: ми: ру̂:п пха̂:п а:ха̌:н ма̌й',
    words: [
      { thai_hidden: 'มีเมนู', transcription_ru: 'ми: ме:ну:', translation_ru: 'есть меню' },
      { thai_hidden: 'รูปภาพอาหาร', transcription_ru: 'ру̂:п пха̂:п а:ха̌:н', translation_ru: 'фотографии еды' },
      { thai_hidden: 'ไหม', transcription_ru: 'ма̌й', translation_ru: 'вопрос: есть ли?' }
    ]
  }
];

const mappedAdditions = additions.map(item => {
  const isQuestion = item.isQuestion;
  const femaleParticle = isQuestion ? 'คะ' : 'ค่ะ';
  const femaleTrParticle = isQuestion ? 'кха́' : 'кха̂';

  return {
    category: item.category,
    tags: item.tags,
    russian: item.russian,
    isQuestion: item.isQuestion,
    male: {
      thai: `${item.baseThai}ครับ`,
      transcription_ru: `${item.baseTr} кхра́п`,
      particle: 'ครับ'
    },
    female: {
      thai: `${item.baseThai}${femaleParticle}`,
      transcription_ru: `${item.baseTr} ${femaleTrParticle}`,
      particle: femaleParticle
    },
    thai_hidden: `${item.baseThai}ครับ`,
    transcription_ru: `${item.baseTr} кхра́п`,
    translation_ru: item.russian,
    stage_srs: 0,
    review_count: 0,
    next_review: 0,
    is_deconstructed: 0,
    words_breakdown: item.words
  };
});

const combined = [...cleanPhrases, ...mappedAdditions];

// Standardize and ensure strict zero-leakage gender adaptation
const curated900 = combined.slice(0, 900).map((phrase, idx) => {
  const isQuestion = phrase.isQuestion ||
    phrase.russian.endsWith('?') ||
    (phrase.male?.thai && (phrase.male.thai.includes('ไหม') || phrase.male.thai.includes('อะไร') || phrase.male.thai.includes('หรือ') || phrase.male.thai.includes('เท่าไหร่') || phrase.male.thai.includes('ไหน')));

  // Ensure male variant ends with ครับ and uses ผม
  let maleThai = phrase.male?.thai || phrase.thai_hidden || '';
  let maleTr = phrase.male?.transcription_ru || phrase.transcription_ru || '';

  // Clean any trailing kha particles from male
  maleThai = maleThai.replace(/ค่ะ$/, '').replace(/คะ$/, '').trim();
  maleTr = maleTr.replace(/\s+кха̂$/, '').replace(/\s+кха́$/, '').trim();
  if (!maleThai.endsWith('ครับ')) maleThai = `${maleThai}ครับ`;
  if (!maleTr.toLowerCase().endsWith('кхра́п') && !maleTr.toLowerCase().endsWith('кхрап')) {
    maleTr = `${maleTr} кхра́п`;
  }

  // Ensure female variant ends with ค่ะ/คะ and uses ฉัน
  let femaleThai = phrase.female?.thai || phrase.thai_hidden || '';
  let femaleTr = phrase.female?.transcription_ru || phrase.transcription_ru || '';

  // Clean any trailing khrap particles from female
  femaleThai = femaleThai.replace(/ครับ$/, '').replace(/ค่ะ$/, '').replace(/คะ$/, '').trim();
  femaleTr = femaleTr.replace(/\s+кхра́п$/i, '').replace(/\s+кхрап$/i, '').replace(/\s+крап$/i, '').replace(/\s+кха̂$/, '').replace(/\s+кха́$/, '').trim();

  // Replace male pronoun ผม with ฉัน in female version
  femaleThai = femaleThai.replace(/\bผม\b/g, 'ฉัน').replace(/^ผม/g, 'ฉัน');
  femaleTr = femaleTr.replace(/\bпхо̌м\b/gi, 'чхан').replace(/^пхо̌м/gi, 'чхан').replace(/\bпхом\b/gi, 'чхан');

  const femaleParticle = isQuestion ? 'คะ' : 'ค่ะ';
  const femaleTrParticle = isQuestion ? 'кха́' : 'кха̂';

  femaleThai = `${femaleThai}${femaleParticle}`;
  femaleTr = `${femaleTr} ${femaleTrParticle}`;

  return {
    id: idx + 1,
    category: phrase.category || 'Общение и экспаты',
    tags: phrase.tags && phrase.tags.length > 0 ? phrase.tags : ['разговорный', 'базовое'],
    russian: phrase.russian || phrase.translation_ru,
    isQuestion: !!isQuestion,
    male: {
      thai: maleThai,
      transcription_ru: maleTr,
      particle: 'ครับ'
    },
    female: {
      thai: femaleThai,
      transcription_ru: femaleTr,
      particle: femaleParticle
    },
    thai_hidden: maleThai,
    transcription_ru: maleTr,
    translation_ru: phrase.russian || phrase.translation_ru,
    stage_srs: phrase.stage_srs || 0,
    review_count: phrase.review_count || 0,
    next_review: phrase.next_review || 0,
    is_deconstructed: phrase.is_deconstructed || 0,
    words_breakdown: phrase.words_breakdown || []
  };
});

console.log('Total curated phrases:', curated900.length);

// Strict checks
const ruKeys = new Set();
let ruDupes = 0;
curated900.forEach(p => {
  const k = p.russian.toLowerCase().trim();
  if (ruKeys.has(k)) ruDupes++;
  ruKeys.add(k);
});

console.log('Unique Russian phrases:', ruKeys.size, 'Duplicates:', ruDupes);

let femaleBad = 0;
let maleBad = 0;
curated900.forEach(p => {
  if (p.female.thai.endsWith('ครับ') || p.female.transcription_ru.endsWith('кхра́п')) femaleBad++;
  if (p.male.thai.endsWith('ค่ะ') || p.male.thai.endsWith('คะ') || p.male.transcription_ru.endsWith('кха̂')) maleBad++;
});

console.log('Female bad entries (ending with khrap):', femaleBad);
console.log('Male bad entries (ending with kha):', maleBad);

if (curated900.length === 900 && ruDupes === 0 && femaleBad === 0 && maleBad === 0) {
  fs.writeFileSync(path.resolve('data/thai_phrases_database.json'), JSON.stringify(curated900, null, 2), 'utf-8');
  console.log('SUCCESS: Written exactly 900 unique phrases to data/thai_phrases_database.json!');
} else {
  console.error('Validation failed!');
  process.exit(1);
}
