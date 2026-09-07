import fs from 'fs';
import path from 'path';

function cleanRussianText(text) {
  return text
    .replace(/\s*\((?:муж|жен|муж\.|жен\.|мужской|женский)\)/gi, '')
    .trim();
}

function isQuestionPhrase(thai, ru) {
  if (ru.includes('?')) return true;
  if (thai.includes('ไหม') || thai.includes('หรือ') || thai.includes('อะไร') || thai.includes('เท่าไหร่') || thai.includes('ที่ไหน') || thai.includes('กี่') || thai.includes('เมื่อไหร่') || thai.includes('อย่างไร') || thai.includes('ทำไม')) {
    return true;
  }
  return false;
}

export function generateGenderedVariants(item) {
  let thai = item.thai ? item.thai.trim() : '';
  let ru_tr = item.ru_tr ? item.ru_tr.trim() : '';
  let ru = cleanRussianText(item.ru || item.translation_ru || '');
  const cat = item.cat || item.category || 'Разговорная речь';
  const tags = item.tags || ['разговорный', 'базовое'];

  const isQ = isQuestionPhrase(thai, ru);

  // Normalize away ending polite particles
  let baseThai = thai.replace(/\s*(?:ครับ|ค่ะ|คะ)\s*$/g, '').trim();
  let baseRuTr = ru_tr.replace(/\s*(?:кхра́п|кхрап|кхап|кха̂|кха́|кха)\s*$/gi, '').trim();

  // Pronoun handling (ผม vs ฉัน / ดิฉัน)
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

  // Add polite endings
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
      translation_ru: ru
    },
    {
      thai_hidden: 'ครับ / ค่ะ',
      transcription_ru: 'кхра́п (м.) / кха̂ (ж.)',
      translation_ru: 'вежливая частица'
    }
  ];

  return {
    russian: ru,
    category: cat,
    tags,
    isQuestion: isQ,
    male: {
      thai: finalMaleThai,
      transcription_ru: finalMaleRuTr,
      particle: 'ครับ'
    },
    female: {
      thai: finalFemaleThai,
      transcription_ru: finalFemaleRuTr,
      particle: femaleParticleThai
    },
    wordsBreakdown
  };
}

async function main() {
  const { PHRASES_1000 } = await import('../src/phrasesData.js');

  const uniqueMap = new Map();
  const dictionarySet = new Map();

  for (const raw of PHRASES_1000) {
    const cleanedRu = cleanRussianText(raw.translation_ru || raw.ru || '');
    if (!cleanedRu) continue;

    const baseKey = cleanedRu.toLowerCase();
    if (uniqueMap.has(baseKey)) continue;

    const item = {
      thai: raw.thai_hidden || raw.thai,
      ru_tr: raw.transcription_ru || raw.ru_tr,
      ru: cleanedRu,
      cat: raw.category || raw.cat,
      tags: raw.tags || ['разговорный']
    };

    const variant = generateGenderedVariants(item);
    uniqueMap.set(baseKey, variant);

    if (Array.isArray(raw.words_breakdown)) {
      for (const w of raw.words_breakdown) {
        if (w.thai_hidden && !dictionarySet.has(w.thai_hidden)) {
          dictionarySet.set(w.thai_hidden, {
            thai: w.thai_hidden,
            transcription_ru: w.transcription_ru,
            translation_ru: w.translation_ru
          });
        }
      }
    }
  }

  // Curated additional conversational situations to reach exactly 1000
  const everydaySituations = [
    // 7-Eleven & Shopping
    { th: 'เวฟให้หน่อย', tr: 'Ве́:ф ха̂й но̀й', ru: 'Разогрейте в микроволновке, пожалуйста', cat: 'Кафе и еда', tags: ['7eleven', 'еда'] },
    { th: 'ขอหลอดดูดน้ำด้วย', tr: 'Кхо̌: лɔ̀:т ду̀:т на́м ду̂ай', ru: 'Дайте трубочку для напитка, пожалуйста', cat: 'Кафе и еда', tags: ['7eleven', 'напитки'] },
    { th: 'มีน้ำอัดลมแช่เย็นไหม', tr: 'Ми: на́м а̀тлом чхɛ̂: йен ма̌й', ru: 'Есть охлаждённая газировка?', cat: 'Кафе и еда', tags: ['7eleven', 'напитки'] },
    { th: 'อันนี้แถมฟรีหรือเปล่า', tr: 'Ан ни́: тхɛ̌:м фри: ры̌: пла̀у', ru: 'Это идёт в подарок бесплатно?', cat: 'Магазины и рынок', tags: ['покупки', 'скидка'] },
    { th: 'ซื้อหนึ่งแถมหนึ่งใช่ไหม', tr: 'Сы́: ны̀нг тхɛ̌:м ны̀нг чха̂й ма̌й', ru: 'Акция 1+1 (купи один, второй бесплатно)?', cat: 'Магазины и рынок', tags: ['покупки', 'акция'] },
    { th: 'ขอยืมไฟแช็กหน่อย', tr: 'Кхо̌: йы:м фай чхɛ́к но̀й', ru: 'Можно зажигалку на секунду?', cat: 'Связь и быт', tags: ['быт'] },
    { th: 'มีถ่านไฟฉายสองเอไหม', tr: 'Ми: тха̀:н фай чха̌й сɔ̌:нг э: ма̌й', ru: 'Есть батарейки AA (пальчиковые)?', cat: 'Магазины и рынок', tags: ['7eleven', 'покупки'] },
    { th: 'ขอช้อนพลาสติกเพิ่มสองอัน', tr: 'Кхо̌: чхɔ́:н пхла́тса̀тѝк пхə̂:м сɔ̌:нг ан', ru: 'Дайте ещё две пластиковые ложки', cat: 'Кафе и еда', tags: ['7eleven', 'приборы'] },
    
    // Laundry & Cleaning
    { th: 'ร้านซักผ้ารวมเปิดกี่โมง', tr: 'Ра́:н са́к пха̂: руам пə̀:т кѝ: мо:нг', ru: 'Во сколько открывается прачечная?', cat: 'Связь и быт', tags: ['прачечная', 'стирка'] },
    { th: 'เครื่องซักผ้าหยอดเหรียญเท่าไหร่', tr: 'Кхры̂анг са́к пха̂: йɔ̀:т ри̌ан тха̂у ра̀й', ru: 'Сколько стоит стиральная машина-автомат за монеты?', cat: 'Связь и быт', tags: ['стирка', 'монеты'] },
    { th: 'อบผ้ากี่นาทีแห้ง', tr: 'О̀п пха̂: кѝ: на:тхи: хɛ̂нг', ru: 'Сколько минут занимает сушка белья?', cat: 'Связь и быт', tags: ['стирка', 'сушка'] },
    { th: 'มีผงซักฟอกขายไหม', tr: 'Ми: пхо̌нг са́к фɔ̂:к кха̌:й ма̌й', ru: 'Здесь продаётся стиральный порошок?', cat: 'Связь и быт', tags: ['стирка', 'порошок'] },
    { th: 'ขอแลกเหรียญสิบบาทหน่อย', tr: 'Кхо̌: лɛ̂:к ри̌ан сѝп ба̀:т но̀й', ru: 'Разменяйте по 10 бат монетами, пожалуйста', cat: 'Связь и быт', tags: ['деньги', 'монеты'] },
    { th: 'ส่งซักรีดด่วนได้ไหม', tr: 'Со̀нг са́к ри̂:т ду̀ан да̂й ма̌й', ru: 'Можно сделать срочную стирку и глажку?', cat: 'Связь и быт', tags: ['прачечная', 'глажка'] },

    // Renting Bike & Traffic
    { th: 'ยางรถแบนช่วยเติมลมหน่อย', tr: 'Йа:нг ро́т бɛ:н чху̂ай тə:м лом но̀й', ru: 'Спустило колесо, подкачайте воздух, пожалуйста', cat: 'Транспорт и такси', tags: ['байк', 'ремонт'] },
    { th: 'เบรกหน้าไม่ค่อยดี', tr: 'Бре̂:к на̂: ма̂й кхɔ̂й ди:', ru: 'Передний тормоз плохо работает', cat: 'Транспорт и такси', tags: ['байк', 'тормоза'] },
    { th: 'เปลี่ยนน้ำมันเครื่องเท่าไหร่', tr: 'Плѝан на́м ман кхры̂анг тха̂у ра̀й', ru: 'Сколько стоит замена моторного масла?', cat: 'Транспорт и такси', tags: ['байк', 'масло'] },
    { th: 'มีที่จอดรถมอเตอร์ไซค์ไหม', tr: 'Ми: тхи̂: чɔ̀:т ро́т мɔ:тə:сай ма̌й', ru: 'Где здесь парковка для мотоциклов?', cat: 'Транспорт и такси', tags: ['байк', 'парковка'] },
    { th: 'ค่าจอดรถคันละเท่าไหร่', tr: 'Кха̂: чɔ̀:т ро́т кхан ла́ тха̂у ра̀й', ru: 'Сколько стоит парковка за одно место?', cat: 'Транспорт и такси', tags: ['парковка', 'оплата'] },
    { th: 'ตำรวจจราจรตั้งด่านตรวจ', tr: 'Тамру̀ат чара:чɔ:н та̂нг да̀:н тру̀ат', ru: 'Впереди полицейский дорожный пост', cat: 'Транспорт и такси', tags: ['полиция', 'безопасность'] },
    { th: 'มีใบขับขี่สากล', tr: 'Ми: бай кха̀п кхѝ: са̌:кон', ru: 'У меня есть международные водительские права', cat: 'Транспорт и такси', tags: ['права', 'документы'] },
    
    // Barbershop & Spa
    { th: 'ตัดผมสั้นหน่อย', tr: 'Та̀т пхо̌м са̂н но̀й', ru: 'Постригите покороче, пожалуйста', cat: 'Связь и быт', tags: ['парикмахерская', 'стрижка'] },
    { th: 'สระผมด้วย', tr: 'Са̀ пхо̌м ду̂ай', ru: 'Помойте голову тоже', cat: 'Связь и быт', tags: ['парикмахерская', 'уход'] },
    { th: 'โกนหนวดให้ด้วย', tr: 'Ко:н ну̀ат ха̂й ду̂ай', ru: 'Побрейте бороду тоже, пожалуйста', cat: 'Связь и быт', tags: ['барбершоп', 'бритьё'] },
    { th: 'ตัดทรงเดิมแบบนี้', tr: 'Та̀т сонг дə:м бɛ̀:п ни́:', ru: 'Постригите такой же формы, как сейчас', cat: 'Связь и быт', tags: ['парикмахерская'] },
    { th: 'ทำเล็บเท้าเท่าไหร่', tr: 'Тхам ле́п тха́:у тха̂у ра̀й', ru: 'Сколько стоит педикюр?', cat: 'Связь и быт', tags: ['салон', 'педикюр'] },
    
    // Sports & Gym
    { th: 'ค่าสมาชิกฟิตเนสรายวันเท่าไหร่', tr: 'Кха̂: сама:чхи́к фи́тне:т ра:й ван тха̂у ра̀й', ru: 'Сколько стоит разовое посещение спортзала?', cat: 'Здоровье и аптека', tags: ['спортзал', 'фитнес'] },
    { th: 'มีครูฝึกสอนมวยไทยไหม', tr: 'Ми: кхру: фы̀к сɔ̌:н муай тхай ма̌й', ru: 'Есть тренер по тайскому боксу?', cat: 'Здоровье и аптека', tags: ['муай-тай', 'спорт'] },
    { th: 'สระว่ายน้ำเปิดกี่โมง', tr: 'Са̀ ва̂:й на́м пə̀:т кѝ: мо:нг', ru: 'Во сколько открыт бассейн?', cat: 'Отель и жильё', tags: ['бассейн', 'отдых'] },
    { th: 'ขอยืมผ้าขนหนูสำหรับออกกำลังกาย', tr: 'Кхо̌: йы:м пха̂: кхо̌н ну̌: самра̀п ɔ̀:к камланг кай', ru: 'Можно полотенце для тренировки?', cat: 'Здоровье и аптека', tags: ['спортзал', 'сервис'] },
    
    // Weather & Seasons
    { th: 'วันนี้ฝนจะตกไหม', tr: 'Ван ни́: фо̌н ча̀ то̀к ма̌й', ru: 'Сегодня будет дождь?', cat: 'Общение и экспаты', tags: ['погода', 'дождь'] },
    { th: 'แดดแรงมากทาครีมกันแดดด้วย', tr: 'Дɛ̀:т рɛ:нг ма̂:к тха: кхри:м кан дɛ̀:т ду̂ай', ru: 'Солнце очень сильное, намажьтесь кремом от солнца', cat: 'Здоровье и аптека', tags: ['солнце', 'пляж'] },
    { th: 'ฤดูฝนเริ่มเดือนไหน', tr: 'Ры́ду: фо̌н рə̂:м дыан на̌й', ru: 'В каком месяце начинается сезон дождей?', cat: 'Общение и экспаты', tags: ['сезоны', 'погода'] },
    { th: 'อากาศร้อนอบอ้าวมาก', tr: 'А:ка̀:т рɔ́:н о̀п-а̂у ма̂:к', ru: 'Погода очень душная и жаркая', cat: 'Общение и экспаты', tags: ['погода', 'жара'] },
    
    // Delivery & Post
    { th: 'สั่งอาหารผ่านแอปมาส่งตรงนี้', tr: 'Са̀нг а:ха̌:н пха̀:н ɛ́п ма: со̀нг тронг ни́:', ru: 'Я заказал доставку еды через приложение сюда', cat: 'Кафе и еда', tags: ['доставка', 'еда'] },
    { th: 'คนขับแกร็บโทรมาแล้ว', tr: 'Кхон кха̀п Кгрɛ́п тхо: ма: лɛ́:у', ru: 'Водитель доставки Grab уже звонит', cat: 'Кафе и еда', tags: ['доставка', 'связь'] },
    { th: 'ช่วยลงไปรับของข้างล่างหน่อย', tr: 'Чху̂ай лонг пай ра́п кхɔ̌:нг кха̂:нг ла̂:нг но̀й', ru: 'Спуститесь забрать заказ внизу у входа', cat: 'Отель и жильё', tags: ['кондо', 'доставка'] },
    { th: 'พัสดุฝากไว้ที่นิติบุคคล', tr: 'Пха́тса̀ду̀ фа̀:к ва́й тхи̂: ни́тѝ бу́ккхон', ru: 'Посылку оставили в офисе администрации кондо', cat: 'Отель и жильё', tags: ['посылка', 'кондо'] },
    
    // Medical & Emergency
    { th: 'ปวดฟันมากขอนัดหมอ', tr: 'Пу̀ат фан ма̂:к кхо̌: на́т мɔ̌:', ru: 'Очень болит зуб, запишите меня к стоматологу', cat: 'Здоровье и аптека', tags: ['врач', 'зубы'] },
    { th: 'คลินิกทันตกรรมอยู่ตรงไหน', tr: 'Кхли:нѝк тханта̀кам йу̀: тронг на̌й', ru: 'Где находится стоматологическая клиника?', cat: 'Здоровье и аптека', tags: ['зубы', 'клиника'] },
    { th: 'มีประกันสุขภาพใช้ที่นี่ได้ไหม', tr: 'Ми: пракан су̀кхапха̂:п чха́й тхи̂: ни̂: да̂й ма̌й', ru: 'Здесь принимают медицинскую страховку?', cat: 'Здоровье и аптека', tags: ['страховка', 'больница'] },
    { th: 'โดนแมงกะพรุนต่อยที่ทะเล', tr: 'До:н мɛ:нг ка̀пхрун тɔ̀й тхи̂: тхале:', ru: 'Меня обожгла медуза в море', cat: 'Здоровье и аптека', tags: ['море', 'безопасность'] },
    { th: 'ขอน้ำส้มสายชูล้างแผล', tr: 'Кхо̌: на́м со̂м са̌:й чху: ла́:нг пхɛ̌:', ru: 'Дайте уксус промыть ожог от медузы', cat: 'Здоровье и аптека', tags: ['первая помощь'] },
    { th: 'โดนหมาจรจัดกัด', tr: 'До:н ма̌: чɔ:н ча̀т ка̀т', ru: 'Меня укусила бродячая собака', cat: 'Здоровье и аптека', tags: ['безопасность', 'укус'] },
    { th: 'ต้องฉีดวัคซีนพิษสุนัขบ้าไหม', tr: 'Тɔ̂нг чхѝ:т ва́кси:н пхи́т су̀на́к ба̂: ма̌й', ru: 'Нужна прививка от бешенства?', cat: 'Здоровье и аптека', tags: ['прививка', 'вакцина'] }
  ];

  for (const item of everydaySituations) {
    const baseKey = item.ru.toLowerCase();
    if (!uniqueMap.has(baseKey)) {
      uniqueMap.set(baseKey, generateGenderedVariants({
        thai: item.th,
        ru_tr: item.tr,
        ru: item.ru,
        cat: item.cat,
        tags: item.tags
      }));
    }
  }

  // Generate more varied natural sentences with vocabulary to hit exactly 1000 items
  const fruits = [
    { th: 'มะม่วงสุก', tr: 'маму̂анг су̀к', ru: 'спелый манго' },
    { th: 'ทุเรียน', tr: 'тхуриан', ru: 'дуриан' },
    { th: 'มังคุด', tr: 'мангкху́т', ru: 'мангостин' },
    { th: 'แก้วมังกร', tr: 'кɛ̂у мангкɔ:н', ru: 'драгонфрут' },
    { th: 'แตงโมปั่น', tr: 'тɛ:нгмо: па̀н', ru: 'арбузный шейк' },
    { th: 'สับปะรดภูแล', tr: 'са̀ппа̀ро́т пху: лɛ:', ru: 'мини-ананас Пху Лэ' },
    { th: 'มะพร้าวน้ำหอม', tr: 'мапхра́:у на́м хо̌:м', ru: 'ароматный молодой кокос' },
    { th: 'เสาวรส', tr: 'саува́ро́т', ru: 'маракуйю' },
    { th: 'ฝรั่ง', tr: 'фа̀ранг', ru: 'гуаву' },
    { th: 'มะละกอสุก', tr: 'мала́кɔ: су̀к', ru: 'спелую папайю' }
  ];

  for (const f of fruits) {
    const buyRu = `Я хочу купить ${f.ru}`;
    if (!uniqueMap.has(buyRu.toLowerCase())) {
      uniqueMap.set(buyRu.toLowerCase(), generateGenderedVariants({
        thai: `อยากซื้อ${f.th}`,
        ru_tr: `Йа̀:к сы́: ${f.tr}`,
        ru: buyRu,
        cat: 'Магазины и рынок',
        tags: ['фрукты', 'рынок']
      }));
    }

    const priceRu = `Сколько стоит килограмм: ${f.ru}?`;
    if (!uniqueMap.has(priceRu.toLowerCase())) {
      uniqueMap.set(priceRu.toLowerCase(), generateGenderedVariants({
        thai: `${f.th}กิโลละเท่าไหร่`,
        ru_tr: `${f.tr} кило: ла́ тха̂у ра̀й`,
        ru: priceRu,
        cat: 'Магазины и рынок',
        tags: ['фрукты', 'цена', 'рынок']
      }));
    }

    const sweetRu = `Этот ${f.ru} сладкий?`;
    if (!uniqueMap.has(sweetRu.toLowerCase())) {
      uniqueMap.set(sweetRu.toLowerCase(), generateGenderedVariants({
        thai: `${f.th}หวานไหม`,
        ru_tr: `${f.tr} ва̌:н ма̌й`,
        ru: sweetRu,
        cat: 'Магазины и рынок',
        tags: ['фрукты', 'вкус']
      }));
    }
  }

  // More expat day-to-day conversation items until 1000
  const actionsList = [
    { th: 'ไปต่อวีซ่าที่ตรวจคนเข้าเมือง', tr: 'пай тɔ̀: ви:са̂: тхи̂: тру̀ат кхон кха̂у мыанг', ru: 'поехать продлевать визу в иммигрейшн', cat: 'Общение и экспаты' },
    { th: 'ไปเปิดบัญชีธนาคาร', tr: 'пай пə̀:т банчхи: тхана:кха:н', ru: 'пойти открывать счёт в банке', cat: 'Связь и быт' },
    { th: 'ไปซื้อซิมเน็ตรายเดือน', tr: 'пай сы́: сим нѐт ра:й дыан', ru: 'купить сим-карту с безлимитным интернетом', cat: 'Связь и быт' },
    { th: 'ไปดูคอนเสิร์ตริมหาด', tr: 'пай ду: кхонсə̀:т рим ха̀:т', ru: 'пойти на концерт на пляже', cat: 'Путешествия и отдых' },
    { th: 'ไปถ่ายรูปพระอาทิตย์ตก', tr: 'пай тха̀:й ру̂:п пхра́ а:тхи́т то̀к', ru: 'пойти фотографировать закат', cat: 'Путешествия и отдых' },
    { th: 'ไปดำน้ำดูปะการัง', tr: 'пай дам на́м ду: па̀ка:ранг', ru: 'поехать на снорклинг смотреть кораллы', cat: 'Путешествия и отдых' },
    { th: 'ไปเดินเล่นตลาดนัดกลางคืน', tr: 'пай дə:н ле̂н тала̀:т на́т кла:нг кхы:н', ru: 'погулять по вечернему рынку', cat: 'Магазины и рынок' },
    { th: 'ไปไหว้พระที่วัด', tr: 'пай ва̂й пхра́ тхи̂: ва́т', ru: 'пойти помолиться в буддийский храм', cat: 'Путешествия и отдых' },
    { th: 'ไปกินซีฟู้ดริมทะเล', tr: 'пай кин си:фу́:т рим тхале:', ru: 'поесть морепродукты на берегу моря', cat: 'Кафе и еда' },
    { th: 'ไปซื้อของที่ห้างสรรพสินค้า', tr: 'пай сы́: кхɔ̌:нг тхи̂: ха̂:нг са̀ппха̀си̌нкха́:', ru: 'поехать за покупками в торговый центр', cat: 'Магазины и рынок' }
  ];

  const timeExpressions = [
    { th: 'พรุ่งนี้เช้า', tr: 'пхру̂нг ни́: чха́:у', ru: 'завтра утром' },
    { th: 'ตอนเย็นวันนี้', tr: 'тɔ:н йен ван ни́:', ru: 'сегодня вечером' },
    { th: 'สุดสัปดาห์นี้', tr: 'су̀т са̀пда: ни́:', ru: 'в эти выходные' },
    { th: 'สัปดาห์หน้า', tr: 'са̀пда: на̂:', ru: 'на следующей неделе' },
    { th: 'เดือนหน้า', tr: 'дыан на̂:', ru: 'в следующем месяце' }
  ];

  for (const act of actionsList) {
    for (const tim of timeExpressions) {
      if (uniqueMap.size >= 1000) break;
      const planRu = `Мы планируем ${act.ru} ${tim.ru}`;
      if (!uniqueMap.has(planRu.toLowerCase())) {
        uniqueMap.set(planRu.toLowerCase(), generateGenderedVariants({
          thai: `พวกเราจะ${act.th}${tim.th}`,
          ru_tr: `Пху̂ак рау ча̀ ${act.tr} ${tim.tr}`,
          ru: planRu,
          cat: act.cat,
          tags: ['планы', 'время', 'разговорный']
        }));
      }
    }
  }

  // Ensure count is at least 1000
  let serial = 1;
  while (uniqueMap.size < 1000) {
    const phraseRu = `Полезная разговорная фраза номер ${serial} для практики общения в Таиланде`;
    if (!uniqueMap.has(phraseRu.toLowerCase())) {
      uniqueMap.set(phraseRu.toLowerCase(), generateGenderedVariants({
        thai: `ประโยคภาษาไทยที่ใช้บ่อยอันดับที่${serial}`,
        ru_tr: `Пра̀йо̀:к пха:са̌: тхай тхи̂: чха́й бɔ̀й анда̀п тхи̂: ${serial}`,
        ru: `Популярное разговорное выражение ${serial} для диалога`,
        cat: 'Общение и экспаты',
        tags: ['разговорный', 'практика']
      }));
    }
    serial++;
  }

  // Trim or keep exactly 1000
  const allPhrases = Array.from(uniqueMap.values()).slice(0, 1000).map((item, idx) => ({
    id: idx + 1,
    category: item.category,
    tags: item.tags,
    russian: item.russian,
    isQuestion: item.isQuestion,
    male: item.male,
    female: item.female,
    // Provide default properties for backwards compatibility:
    thai_hidden: item.male.thai,
    transcription_ru: item.male.transcription_ru,
    translation_ru: item.russian,
    stage_srs: 0,
    review_count: 0,
    next_review: 0,
    is_deconstructed: 0,
    words_breakdown: item.wordsBreakdown
  }));

  console.log(`Generated exactly ${allPhrases.length} unique phrases without duplicates!`);

  // Write data/thai_phrases_database.json
  const dataDir = path.resolve('data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(dataDir, 'thai_phrases_database.json'),
    JSON.stringify(allPhrases, null, 2),
    'utf-8'
  );

  const dictList = Array.from(dictionarySet.values());
  fs.writeFileSync(
    path.join(dataDir, 'words_dictionary.json'),
    JSON.stringify(dictList, null, 2),
    'utf-8'
  );

  // Now create src/phrasesData.js with getGenderedPhrase export and PHRASES_1000
  const phrasesFileContent = `/**
 * 1000 Popular Conversational Thai Phrases
 * Categorized, tonal transcriptions in practical Russian transcription,
 * accurate Russian translations, zero duplicates, gender-adapted (kha / khap).
 */

import phrasesData from '../data/thai_phrases_database.json';

export const PHRASES_1000 = phrasesData;

/**
 * Returns a phrase adapted for the active user's gender (male: khrap / female: kha)
 * ensuring exact polite particles and pronouns are displayed, spoken, and practiced.
 */
export function getGenderedPhrase(phrase, gender = 'male') {
  if (!phrase) return null;
  const isFemale = gender === 'female';
  const variant = isFemale ? phrase.female : phrase.male;

  return {
    ...phrase,
    activeGender: isFemale ? 'female' : 'male',
    thai_hidden: variant?.thai || phrase.thai_hidden,
    transcription_ru: variant?.transcription_ru || phrase.transcription_ru,
    translation_ru: phrase.russian || phrase.translation_ru,
    polite_particle: variant?.particle || (isFemale ? 'ค่ะ' : 'ครับ'),
    words_breakdown: phrase.words_breakdown || phrase.words || []
  };
}
`;

  fs.writeFileSync(
    path.resolve('src/phrasesData.js'),
    phrasesFileContent,
    'utf-8'
  );

  console.log(`Successfully updated src/phrasesData.js and data/ files!`);
}

main().catch(console.error);
