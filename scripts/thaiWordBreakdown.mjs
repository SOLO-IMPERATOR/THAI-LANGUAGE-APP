/**
 * Build real per-word breakdowns for Thai phrases (no polite particles).
 */
export const POLITE_PARTICLES_THAI = new Set(['ครับ', 'ค่ะ', 'คะ']);
export const POLITE_PARTICLE_COMBO = 'ครับ / ค่ะ';

/** Core conversational lexicon: thai -> { transcription_ru, translation_ru } */
export const CORE_LEXICON = {
  สวัสดี: { transcription_ru: 'сава̀тди:', translation_ru: 'здравствуйте / привет' },
  สบาย: { transcription_ru: 'саба:й', translation_ru: 'хорошо / комфортно' },
  ดี: { transcription_ru: 'ди:', translation_ru: 'хорошо / хороший' },
  ไหม: { transcription_ru: 'ма̌й', translation_ru: 'вопросительная частица' },
  ขอบคุณ: { transcription_ru: 'кхо̀:п кхун', translation_ru: 'спасибо' },
  มาก: { transcription_ru: 'ма̂:к', translation_ru: 'очень / много' },
  ไม่: { transcription_ru: 'ма̂й', translation_ru: 'не / нет' },
  เป็นไร: { transcription_ru: 'пѐн рай', translation_ru: 'проблема / ничего' },
  ขอโทษ: { transcription_ru: 'кхо̌: тхо̂:т', translation_ru: 'извините' },
  ยินดี: { transcription_ru: 'йин ди:', translation_ru: 'рад / с удовольствием' },
  ที่: { transcription_ru: 'тхи̂:', translation_ru: 'который / что / в' },
  ได้: { transcription_ru: 'да̂й', translation_ru: 'мочь / получать' },
  รู้จัก: { transcription_ru: 'ру́: ча̀к', translation_ru: 'знать / быть знакомым' },
  แล้ว: { transcription_ru: 'лɛ́:у', translation_ru: 'уже / потом' },
  เจอ: { transcription_ru: 'чə:', translation_ru: 'встречать' },
  กัน: { transcription_ru: 'кан', translation_ru: 'взаимно / вместе' },
  ใหม่: { transcription_ru: 'ма̀й', translation_ru: 'новый / снова' },
  โชค: { transcription_ru: 'чо̂:к', translation_ru: 'удача' },
  ด้วย: { transcription_ru: 'ду̂ай', translation_ru: 'тоже / пожалуйста (частица)' },
  อร่อย: { transcription_ru: 'аро̀й', translation_ru: 'вкусно' },
  เผ็ด: { transcription_ru: 'пхѐт', translation_ru: 'острый' },
  นิด: { transcription_ru: 'ни́т', translation_ru: 'чуть' },
  หน่อย: { transcription_ru: 'но̀й', translation_ru: 'немного / пожалуйста' },
  นิดหน่อย: { transcription_ru: 'ни́т но̀й', translation_ru: 'чуть-чуть' },
  ใส่: { transcription_ru: 'са̀й', translation_ru: 'класть / добавлять' },
  น้ำ: { transcription_ru: 'на́м', translation_ru: 'вода' },
  ตาล: { transcription_ru: 'та:н', translation_ru: 'пальма / сахар' },
  แข็ง: { transcription_ru: 'кхɛ̌нг', translation_ru: 'твёрдый / лёд' },
  เชื่อม: { transcription_ru: 'чхы̂ам', translation_ru: 'сироп / соединять' },
  ผง: { transcription_ru: 'пхо̌нг', translation_ru: 'порошок' },
  ชู: { transcription_ru: 'чу:', translation_ru: 'усиливать' },
  รส: { transcription_ru: 'ро́т', translation_ru: 'вкус' },
  ขอ: { transcription_ru: 'кхо̌:', translation_ru: 'просить / хочу' },
  เปล่า: { transcription_ru: 'пла̀у', translation_ru: 'пустой / простой' },
  หนึ่ง: { transcription_ru: 'ны̀нг', translation_ru: 'один' },
  ขวด: { transcription_ru: 'кху̀ат', translation_ru: 'бутылка' },
  เอา: { transcription_ru: 'ау', translation_ru: 'брать / хотеть' },
  เช็ค: { transcription_ru: 'че́к', translation_ru: 'чек / проверить' },
  บิล: { transcription_ru: 'бин', translation_ru: 'счёт' },
  เช็คบิล: { transcription_ru: 'че́к бин', translation_ru: 'принести счёт' },
  เก็บ: { transcription_ru: 'кѐп', translation_ru: 'брать / хранить' },
  เงิน: { transcription_ru: 'нгəн', translation_ru: 'деньги' },
  เมนู: { transcription_ru: 'мэ:ну:', translation_ru: 'меню' },
  สั่ง: { transcription_ru: 'са̀нг', translation_ru: 'заказывать' },
  อาหาร: { transcription_ru: 'а:ха̌:н', translation_ru: 'еда' },
  กิน: { transcription_ru: 'кин', translation_ru: 'есть / кушать' },
  นี่: { transcription_ru: 'ни̂:', translation_ru: 'здесь / это' },
  นี้: { transcription_ru: 'ни́:', translation_ru: 'этот' },
  ที่นี่: { transcription_ru: 'тхи̂: ни̂:', translation_ru: 'здесь' },
  ห่อ: { transcription_ru: 'хо̀:', translation_ru: 'упаковать' },
  กลับ: { transcription_ru: 'кла̀п', translation_ru: 'возвращаться' },
  บ้าน: { transcription_ru: 'ба̂:н', translation_ru: 'дом' },
  กระดาษ: { transcription_ru: 'крада̀:т', translation_ru: 'бумага' },
  ทิชชู่: { transcription_ru: 'тхи́тчу̂:', translation_ru: 'салфетки' },
  ช้อน: { transcription_ru: 'чо́:н', translation_ru: 'ложка' },
  ส้อม: { transcription_ru: 'со̂:м', translation_ru: 'вилка' },
  อัน: { transcription_ru: 'ан', translation_ru: 'штука / это' },
  ราคา: { transcription_ru: 'ра:кха:', translation_ru: 'цена' },
  เท่าไหร่: { transcription_ru: 'тха̂у ра̀й', translation_ru: 'сколько стоит?' },
  ลด: { transcription_ru: 'ло́т', translation_ru: 'снижать' },
  แพง: { transcription_ru: 'пхɛ:нг', translation_ru: 'дорогой' },
  เกิน: { transcription_ru: 'кə:н', translation_ru: 'слишком' },
  ไป: { transcription_ru: 'пай', translation_ru: 'идти / ехать' },
  ถูก: { transcription_ru: 'тху̀:к', translation_ru: 'дешёвый / правильно' },
  ผม: { transcription_ru: 'пхо̌м', translation_ru: 'я (муж.)' },
  ฉัน: { transcription_ru: 'чха̌н', translation_ru: 'я (жен.)' },
  คุณ: { transcription_ru: 'кхун', translation_ru: 'вы / ты' },
  ชื่อ: { transcription_ru: 'чы̂:', translation_ru: 'имя / звать' },
  อะไร: { transcription_ru: 'а̀рай', translation_ru: 'что?' },
  มา: { transcription_ru: 'ма:', translation_ru: 'приходить' },
  จาก: { transcription_ru: 'ча̀:к', translation_ru: 'из / от' },
  มี: { transcription_ru: 'ми:', translation_ru: 'есть / иметь' },
  อยู่: { transcription_ru: 'йу̀:', translation_ru: 'находиться / жить' },
  ตรงไหน: { transcription_ru: 'тронг на̌й', translation_ru: 'где именно?' },
  ที่ไหน: { transcription_ru: 'тхи̂: на̌й', translation_ru: 'где?' },
  ไหน: { transcription_ru: 'на̌й', translation_ru: 'где / какой' },
  อยาก: { transcription_ru: 'йа̀:к', translation_ru: 'хотеть' },
  จะ: { transcription_ru: 'ча̀', translation_ru: 'буду / собираюсь' },
  ช่วย: { transcription_ru: 'чху̂ай', translation_ru: 'помогите / пожалуйста' },
  พูด: { transcription_ru: 'пху̂:т', translation_ru: 'говорить' },
  ช้า: { transcription_ru: 'ча́:', translation_ru: 'медленно' },
  อีก: { transcription_ru: 'ѝ:к', translation_ru: 'ещё' },
  ที: { transcription_ru: 'тхи:', translation_ru: 'раз' },
  เข้าใจ: { transcription_ru: 'кха̂у чай', translation_ru: 'понимать' },
  หรือ: { transcription_ru: 'ры̌:', translation_ru: 'или' },
  ยัง: { transcription_ru: 'йанг', translation_ru: 'ещё / пока' },
  ไง: { transcription_ru: 'нгай', translation_ru: 'как' },
  ยังไง: { transcription_ru: 'йанг нгай', translation_ru: 'как?' },
  บ้าง: { transcription_ru: 'ба̂:нг', translation_ru: 'немного / как насчёт' },
  คน: { transcription_ru: 'кхон', translation_ru: 'человек' },
  วัน: { transcription_ru: 'ван', translation_ru: 'день' },
  นี้: { transcription_ru: 'ни́:', translation_ru: 'этот' },
  วันนี้: { transcription_ru: 'ван ни́:', translation_ru: 'сегодня' },
  พรุ่งนี้: { transcription_ru: 'пхру̂нг ни́:', translation_ru: 'завтра' },
  เมื่อ: { transcription_ru: 'мы̂а', translation_ru: 'когда' },
  กี่: { transcription_ru: 'кѝ:', translation_ru: 'сколько' },
  บาท: { transcription_ru: 'ба̂:т', translation_ru: 'бат' },
  รถ: { transcription_ru: 'ро́т', translation_ru: 'машина / транспорт' },
  แท็กซี่: { transcription_ru: 'тхɛ́кси̂:', translation_ru: 'такси' },
  โรงแรม: { transcription_ru: 'ро:нг рɛ:м', translation_ru: 'отель' },
  ห้อง: { transcription_ru: 'хɔ̂нг', translation_ru: 'комната' },
  เปิด: { transcription_ru: 'пə̀:т', translation_ru: 'открыть' },
  ปิด: { transcription_ru: 'пѝт', translation_ru: 'закрыть' },
  แอร์: { transcription_ru: 'ɛ:', translation_ru: 'кондиционер' },
  เช้า: { transcription_ru: 'ча́у', translation_ru: 'утро' },
  บ่าย: { transcription_ru: 'ба̀й', translation_ru: 'день / после полудня' },
  เย็น: { transcription_ru: 'йен', translation_ru: 'вечер / прохладный' },
  ตอน: { transcription_ru: 'то:н', translation_ru: 'время / период' },
  สำหรับ: { transcription_ru: 'са̌мра̀п', translation_ru: 'для' },
  ให้: { transcription_ru: 'ха̂й', translation_ru: 'давать / для' },
  ดู: { transcription_ru: 'ду:', translation_ru: 'смотреть' },
  รู้: { transcription_ru: 'ру́:', translation_ru: 'знать' },
  คิด: { transcription_ru: 'кхи́т', translation_ru: 'думать' },
  ต้องการ: { transcription_ru: 'то̂нгка:н', translation_ru: 'нуждаться / хотеть' },
  ต้อง: { transcription_ru: 'то̂нг', translation_ru: 'должен' },
  สามารถ: { transcription_ru: 'са̌:ма̂:т', translation_ru: 'мочь / способен' },
  ใช้: { transcription_ru: 'чха́й', translation_ru: 'использовать' },
  เวลา: { transcription_ru: 'ве:ла:', translation_ru: 'время' },
  นาที: { transcription_ru: 'на:тхи:', translation_ru: 'минута' },
  ถึง: { transcription_ru: 'тхы̌нг', translation_ru: 'доезжать / до' },
  ใน: { transcription_ru: 'най', translation_ru: 'в' },
  และ: { transcription_ru: 'лɛ́', translation_ru: 'и' },
  แต่: { transcription_ru: 'тɛ̀:', translation_ru: 'но' },
  ก็: { transcription_ru: 'кɔ̂:', translation_ru: 'тоже / же' },
  ว่า: { transcription_ru: 'ва̂:', translation_ru: 'что / говорить' },
  ของ: { transcription_ru: 'кхɔ̌:нг', translation_ru: 'вещь / чей' },
  นี้: { transcription_ru: 'ни́:', translation_ru: 'этот' },
  นั้น: { transcription_ru: 'на́н', translation_ru: 'тот' },
  ใช่: { transcription_ru: 'чха̂й', translation_ru: 'да / верно' },
  ใช่ไหม: { transcription_ru: 'чха̂й ма̌й', translation_ru: 'верно?' },
  ได้ไหม: { transcription_ru: 'да̂й ма̌й', translation_ru: 'можно?' },
  อย่างไร: { transcription_ru: 'йа̀:нг рай', translation_ru: 'как?' },
  ทำไม: { transcription_ru: 'тхаммай', translation_ru: 'почему?' },
  เมื่อไหร่: { transcription_ru: 'мы̂а рай', translation_ru: 'когда?' },
  ใคร: { transcription_ru: 'кхрай', translation_ru: 'кто?' },
  ทาง: { transcription_ru: 'тха:нг', translation_ru: 'путь / дорога' },
  ซ้าย: { transcription_ru: 'са́:й', translation_ru: 'лево' },
  ขวา: { transcription_ru: 'кхва̌:', translation_ru: 'право' },
  ตรง: { transcription_ru: 'тронг', translation_ru: 'прямо / именно' },
  ใกล้: { transcription_ru: 'кла̂й', translation_ru: 'близко' },
  ไกล: { transcription_ru: 'клай', translation_ru: 'далеко' },
  ซื้อ: { transcription_ru: 'сы́:', translation_ru: 'покупать' },
  ขาย: { transcription_ru: 'кха̌:й', translation_ru: 'продавать' },
  จ่าย: { transcription_ru: 'ча̀:й', translation_ru: 'платить' },
  บัตร: { transcription_ru: 'ба̀т', translation_ru: 'карта' },
  เครดิต: { transcription_ru: 'кхредѝт', translation_ru: 'кредит' },
  เงินสด: { transcription_ru: 'нгəн со̀т', translation_ru: 'наличные' },
  ร้อน: { transcription_ru: 'рɔ́:н', translation_ru: 'горячий / жарко' },
  หนาว: { transcription_ru: 'на̌:у', translation_ru: 'холодный' },
  ป่วย: { transcription_ru: 'пу̀ай', translation_ru: 'болеть' },
  หมอ: { transcription_ru: 'мɔ̌:', translation_ru: 'врач' },
  ยา: { transcription_ru: 'йа:', translation_ru: 'лекарство' },
  โรงพยาบาล: { transcription_ru: 'ро:нг пхайаба:н', translation_ru: 'больница' },
  ร้าน: { transcription_ru: 'ра́:н', translation_ru: 'магазин / лавка' },
  คาเฟ่: { transcription_ru: 'кафɛ̂:', translation_ru: 'кафе' },
  กาแฟ: { transcription_ru: 'ка:фɛ:', translation_ru: 'кофе' },
  ชา: { transcription_ru: 'ча:', translation_ru: 'чай' },
  เบียร์: { transcription_ru: 'биа', translation_ru: 'пиво' },
  ข้าว: { transcription_ru: 'кха̂у', translation_ru: 'рис / еда' },
  ผัด: { transcription_ru: 'пха̀т', translation_ru: 'жаркое / жарить' },
  ต้ม: { transcription_ru: 'то̂м', translation_ru: 'варить / суп' },
  หวาน: { transcription_ru: 'ва̌:н', translation_ru: 'сладкий' },
  เค็ม: { transcription_ru: 'кхем', translation_ru: 'солёный' },
  จอง: { transcription_ru: 'чо:нг', translation_ru: 'бронировать' },
  ว่าง: { transcription_ru: 'ва̂:нг', translation_ru: 'свободный' },
  เต็ม: { transcription_ru: 'тем', translation_ru: 'полный' },
  คืน: { transcription_ru: 'кхы:н', translation_ru: 'ночь / ночёвка' },
  คืนนี้: { transcription_ru: 'кхы:н ни́:', translation_ru: 'сегодня ночью' },
  นอน: { transcription_ru: 'нɔ:н', translation_ru: 'спать' },
  ตื่น: { transcription_ru: 'ты̀:н', translation_ru: 'просыпаться' },
  อาบ: { transcription_ru: 'а̀:п', translation_ru: 'купаться' },
  อาบน้ำ: { transcription_ru: 'а̀:п на́м', translation_ru: 'принять душ' },
  ฝักบัว: { transcription_ru: 'фа̀к буа', translation_ru: 'душ' },
  สวย: { transcription_ru: 'су̌ай', translation_ru: 'красивый' },
  หล่อ: { transcription_ru: 'лɔ̀:', translation_ru: 'красивый (о мужчине)' },
  น่ารัก: { transcription_ru: 'на̂: ра́к', translation_ru: 'милый' },
  รัก: { transcription_ru: 'ра́к', translation_ru: 'любить' },
  ชอบ: { transcription_ru: 'чхɔ̂:п', translation_ru: 'нравится' },
  เกลียด: { transcription_ru: 'клѝат', translation_ru: 'ненавидеть' },
  เหนื่อย: { transcription_ru: 'ны̀ай', translation_ru: 'уставший' },
  หิว: { transcription_ru: 'хи̌у', translation_ru: 'голодный' },
  กระหาย: { transcription_ru: 'краха̌:й', translation_ru: 'хочется пить' },
  รอ: { transcription_ru: 'рɔ:', translation_ru: 'ждать' },
  สักครู่: { transcription_ru: 'са̀к кхру̂:', translation_ru: 'минутку' },
  เดี๋ยว: { transcription_ru: 'диау', translation_ru: 'сейчас / скоро' },
  ก่อน: { transcription_ru: 'кɔ̀:н', translation_ru: 'сначала / прежде' },
  หลัง: { transcription_ru: 'ла̌нг', translation_ru: 'после / сзади' },
  ข้าง: { transcription_ru: 'кха̂:нг', translation_ru: 'сторона / рядом' },
  บน: { transcription_ru: 'бон', translation_ru: 'наверху' },
  ล่าง: { transcription_ru: 'ла̂:нг', translation_ru: 'внизу' },
  นอก: { transcription_ru: 'нɔ̂:к', translation_ru: 'снаружи' },
  วันพรุ่งนี้: { transcription_ru: 'ван пхру̂нг ни́:', translation_ru: 'завтра' },
  เมื่อวาน: { transcription_ru: 'мы̂а ва:н', translation_ru: 'вчера' },
  ตอนนี้: { transcription_ru: 'то:н ни́:', translation_ru: 'сейчас' },
  ตอนเช้า: { transcription_ru: 'то:н ча́у', translation_ru: 'утром' },
  ตอนบ่าย: { transcription_ru: 'то:н ба̀й', translation_ru: 'днём' },
  ตอนเย็น: { transcription_ru: 'то:н йен', translation_ru: 'вечером' },
  ราตรีสวัสดิ์: { transcription_ru: 'ра:три́ сава̀т', translation_ru: 'спокойной ночи' },
  กรุณา: { transcription_ru: 'каруна:', translation_ru: 'пожалуйста (вежл.)' },
  อนุญาต: { transcription_ru: 'ануйа̂:т', translation_ru: 'разрешение' },
  ถาม: { transcription_ru: 'тха̌:м', translation_ru: 'спрашивать' },
  ตอบ: { transcription_ru: 'то̀:п', translation_ru: 'отвечать' },
  บอก: { transcription_ru: 'бɔ̀:к', translation_ru: 'сказать' },
  ฟัง: { transcription_ru: 'фанг', translation_ru: 'слушать' },
  เขียน: { transcription_ru: 'кхи̌ан', translation_ru: 'писать' },
  อ่าน: { transcription_ru: 'а̀:н', translation_ru: 'читать' },
  เรียน: { transcription_ru: 'риан', translation_ru: 'учиться' },
  สอน: { transcription_ru: 'сɔ̌:н', translation_ru: 'учить / преподавать' },
  ภาษา: { transcription_ru: 'пха:са̌:', translation_ru: 'язык' },
  ไทย: { transcription_ru: 'тхай', translation_ru: 'тайский / Таиланд' },
  รัสเซีย: { transcription_ru: 'ра́тсиа', translation_ru: 'Россия' },
  อังกฤษ: { transcription_ru: 'ангрѝт', translation_ru: 'английский' },
  คนไทย: { transcription_ru: 'кхон тхай', translation_ru: 'тайцы' },
  คนรัสเซีย: { transcription_ru: 'кхон ра́тсиа', translation_ru: 'русские' },
  วิซ่า: { transcription_ru: 'ви:са̂:', translation_ru: 'виза' },
  วีซ่า: { transcription_ru: 'ви:са̂:', translation_ru: 'виза' },
  ต่อ: { transcription_ru: 'тɔ̀:', translation_ru: 'продлевать / продолжать' },
  พาสปอร์ต: { transcription_ru: 'пха̂:спɔ̂:т', translation_ru: 'паспорт' },
  ตั๋ว: { transcription_ru: 'ту̌а', translation_ru: 'билет' },
  เครื่องบิน: { transcription_ru: 'кхры̂анг бин', translation_ru: 'самолёт' },
  สนามบิน: { transcription_ru: 'сана̌:м бин', translation_ru: 'аэропорт' },
  สถานี: { transcription_ru: 'сатха̌:ни:', translation_ru: 'станция' },
  BTS: { transcription_ru: 'би:ти:э́с', translation_ru: 'BTS' },
  MRT: { transcription_ru: 'эм:а:ти:', translation_ru: 'MRT' },
  กรุงเทพ: { transcription_ru: 'крунг тхе̂п', translation_ru: 'Бангкок' },
  ภูเก็ต: { transcription_ru: 'пху:ке́т', translation_ru: 'Пхукет' },
  พัทยา: { transcription_ru: 'пхаттайа:', translation_ru: 'Паттайя' },
  เชียงใหม่: { transcription_ru: 'чианг ма̀й', translation_ru: 'Чиангмай' },
  ทะเล: { transcription_ru: 'тхале:', translation_ru: 'море' },
  หาด: { transcription_ru: 'ха̀:т', translation_ru: 'пляж' },
  ภูเขา: { transcription_ru: 'пху: кха̌у', translation_ru: 'гора' },
  วัด: { transcription_ru: 'ва́т', translation_ru: 'храм' },
  ตลาด: { transcription_ru: 'тала̀:т', translation_ru: 'рынок' },
  ห้าง: { transcription_ru: 'ха̂:нг', translation_ru: 'ТЦ / универмаг' },
  ร้านอาหาร: { transcription_ru: 'ра́:н а:ха̌:н', translation_ru: 'ресторан' },
  แอป: { transcription_ru: 'ɛ́п', translation_ru: 'приложение' },
  ผ่าน: { transcription_ru: 'пха̀:н', translation_ru: 'через / проходить' },
  โอน: { transcription_ru: 'о:н', translation_ru: 'перевод (денег)' },
  ธนาคาร: { transcription_ru: 'тхана:кха:н', translation_ru: 'банк' },
  เอทีเอ็ม: { transcription_ru: 'э:тхи:эм', translation_ru: 'банкомат' },
  ตู้: { transcription_ru: 'ту̂:', translation_ru: 'шкаф / аппарат' },
  โทรศัพท์: { transcription_ru: 'тхо:ра́са̀п', translation_ru: 'телефон' },
  อินเทอร์เน็ต: { transcription_ru: 'интə:не́т', translation_ru: 'интернет' },
  ไวไฟ: { transcription_ru: 'вайфай', translation_ru: 'Wi‑Fi' },
  รหัส: { transcription_ru: 'раха̀т', translation_ru: 'код / пароль' },
  ผ่าน: { transcription_ru: 'пха̀:н', translation_ru: 'через' },
  รูป: { transcription_ru: 'ру̂:п', translation_ru: 'фото / картинка' },
  ภาพ: { transcription_ru: 'пха̂:п', translation_ru: 'изображение' },
  ไฟ: { transcription_ru: 'фай', translation_ru: 'огонь / свет / электричество' },
  ดับ: { transcription_ru: 'да̀п', translation_ru: 'гаснуть' },
  คอนโด: { transcription_ru: 'кхондо:', translation_ru: 'кондо' },
  กุญแจ: { transcription_ru: 'кунчɛ:', translation_ru: 'ключ' },
  ประตู: { transcription_ru: 'прату:', translation_ru: 'дверь' },
  หน้าต่าง: { transcription_ru: 'на̂: та̀:нг', translation_ru: 'окно' },
  เตียง: { transcription_ru: 'тианг', translation_ru: 'кровать' },
  ผ้า: { transcription_ru: 'пха̂:', translation_ru: 'ткань / полотенце' },
  สบู่: { transcription_ru: 'сабу̀:', translation_ru: 'мыло' },
  แชมพู: { transcription_ru: 'чɛ:мпху:', translation_ru: 'шампунь' },
  ทำความสะอาด: { transcription_ru: 'тхам кхва:м са̀:а:т', translation_ru: 'убирать / чистить' },
  ซัก: { transcription_ru: 'са́к', translation_ru: 'стирать' },
  ผ้า: { transcription_ru: 'пха̂:', translation_ru: 'бельё / ткань' },
  รีด: { transcription_ru: 'ри̂т', translation_ru: 'гладить' },
  กระเป๋า: { transcription_ru: 'крапа̌у', translation_ru: 'сумка / чемодан' },
  หนัก: { transcription_ru: 'на̀к', translation_ru: 'тяжёлый' },
  เบา: { transcription_ru: 'бау', translation_ru: 'лёгкий' },
  ยก: { transcription_ru: 'йо́к', translation_ru: 'поднимать' },
  ขึ้น: { transcription_ru: 'кхы̂н', translation_ru: 'вверх / подниматься' },
  ลง: { transcription_ru: 'лонг', translation_ru: 'вниз / снижать' },
  บันได: { transcription_ru: 'бандай', translation_ru: 'лестница' },
  เรียก: { transcription_ru: 'ри̂ак', translation_ru: 'звать / вызывать' },
  ขับ: { transcription_ru: 'кха̀п', translation_ru: 'водить' },
  ช้าๆ: { transcription_ru: 'ча́: ча́:', translation_ru: 'медленно' },
  เร็ว: { transcription_ru: 'рэу', translation_ru: 'быстро' },
  หยุด: { transcription_ru: 'йу̀т', translation_ru: 'остановка / остановиться' },
  เลี้ยว: { transcription_ru: 'ли́ау', translation_ru: 'поворачивать' },
  ตรงไป: { transcription_ru: 'тронг пай', translation_ru: 'прямо' },
  เสีย: { transcription_ru: 'си̌а', translation_ru: 'сломано / испорчено' },
  ทำงาน: { transcription_ru: 'тхам нга:н', translation_ru: 'работать' },
  งาน: { transcription_ru: 'нга:н', translation_ru: 'работа' },
  ทํา: { transcription_ru: 'тхам', translation_ru: 'делать' },
  ทำ: { transcription_ru: 'тхам', translation_ru: 'делать' },
  อยาก: { transcription_ru: 'йа̀:к', translation_ru: 'хотеть' },
  เอา: { transcription_ru: 'ау', translation_ru: 'брать / хотеть' },
  อัน: { transcription_ru: 'ан', translation_ru: 'штука / это' },
  แบบ: { transcription_ru: 'бɛ̀:п', translation_ru: 'вид / тип' },
  สี: { transcription_ru: 'си̌:', translation_ru: 'цвет' },
  ขนาด: { transcription_ru: 'кхана̀:т', translation_ru: 'размер' },
  ใหญ่: { transcription_ru: 'йа̀й', translation_ru: 'большой' },
  เล็ก: { transcription_ru: 'ле́к', translation_ru: 'маленький' },
  พอ: { transcription_ru: 'пхɔ:', translation_ru: 'достаточно' },
  หมด: { transcription_ru: 'мо̀т', translation_ru: 'закончилось' },
  เหลือ: { transcription_ru: 'лы̌а', translation_ru: 'осталось' },
  อีกที: { transcription_ru: 'ѝ:к тхи:', translation_ru: 'ещё раз' },
  ค่อย: { transcription_ru: 'кхɔ̂й', translation_ru: 'постепенно' },
  นาน: { transcription_ru: 'на:н', translation_ru: 'долго' },
  สั้น: { transcription_ru: 'са̂н', translation_ru: 'короткий' },
  ยาว: { transcription_ru: 'йа:у', translation_ru: 'длинный' },
  ผิด: { transcription_ru: 'пхѝт', translation_ru: 'ошибка / неправильно' },
};

export function stripPoliteParticleThai(thai) {
  return String(thai || '')
    .replace(/\s*(?:ครับ|ค่ะ|คะ)\s*$/g, '')
    .trim();
}

export function stripPoliteParticleTr(tr) {
  return String(tr || '')
    .replace(/\s*(?:кхра́п|кхрап|кхап|кха̂|кха́|кха)\s*$/gi, '')
    .trim();
}

export function isPoliteParticleWord(word) {
  const thai = String(word?.thai_hidden || word?.thai || '').trim();
  const tr = String(word?.translation_ru || '').toLowerCase();
  if (!thai) return true;
  if (POLITE_PARTICLES_THAI.has(thai)) return true;
  if (thai === POLITE_PARTICLE_COMBO || /ครับ\s*\/\s*ค่ะ/.test(thai)) return true;
  if (tr.includes('вежливая частица')) return true;
  return false;
}

export function buildLexicon(extraWords = []) {
  const map = new Map();

  const add = (thai, transcription_ru = '', translation_ru = '', prefer = false) => {
    const key = stripPoliteParticleThai(thai);
    if (!key || POLITE_PARTICLES_THAI.has(key) || /ครับ\s*\/\s*ค่ะ/.test(key)) return;
    if (key.length > 18) return;
    const tr = stripPoliteParticleTr(transcription_ru);
    const prev = map.get(key);
    if (!prev || prefer || (!prev.translation_ru && translation_ru) || key.length < 8) {
      map.set(key, {
        thai: key,
        transcription_ru: tr || prev?.transcription_ru || '',
        translation_ru: translation_ru || prev?.translation_ru || '',
      });
    }
  };

  for (const [thai, meta] of Object.entries(CORE_LEXICON)) {
    add(thai, meta.transcription_ru, meta.translation_ru, true);
  }

  for (const w of extraWords) {
    add(w.thai || w.thai_hidden, w.transcription_ru, w.translation_ru, false);
  }

  return map;
}

/**
 * Longest-match Thai segmentation using lexicon.
 */
export function segmentThai(thai, lexicon) {
  const text = stripPoliteParticleThai(thai);
  if (!text) return [];

  const out = [];
  let i = 0;
  const maxLen = 18;

  while (i < text.length) {
    let matched = null;
    const limit = Math.min(maxLen, text.length - i);
    for (let len = limit; len >= 1; len--) {
      const sub = text.slice(i, i + len);
      if (lexicon.has(sub)) {
        matched = lexicon.get(sub);
        break;
      }
    }

    if (matched) {
      out.push({ ...matched });
      i += matched.thai.length;
      continue;
    }

    let j = i + 1;
    while (j < text.length) {
      let found = false;
      const lim = Math.min(maxLen, text.length - j);
      for (let len = lim; len >= 1; len--) {
        if (lexicon.has(text.slice(j, j + len))) {
          found = true;
          break;
        }
      }
      if (found) break;
      j += 1;
    }
    const chunk = text.slice(i, j);
    out.push({
      thai: chunk,
      transcription_ru: '',
      translation_ru: '',
    });
    i = j;
  }

  return out.filter((w) => w.thai && !POLITE_PARTICLES_THAI.has(w.thai));
}

function alignTranscription(segments, baseRuTr) {
  const parts = stripPoliteParticleTr(baseRuTr).split(/\s+/).filter(Boolean);
  if (segments.length === 0) return segments;

  if (parts.length === segments.length) {
    return segments.map((seg, idx) => ({
      ...seg,
      transcription_ru: seg.transcription_ru || parts[idx],
    }));
  }

  if (segments.length === 1) {
    return [
      {
        ...segments[0],
        transcription_ru: segments[0].transcription_ru || parts.join(' '),
      },
    ];
  }

  return segments.map((seg) => ({
    ...seg,
    transcription_ru: seg.transcription_ru || '',
  }));
}

/**
 * Split Thai into exactly N parts. Prefer lexicon atoms (ไม่, ใส่, น้ำ, ตาล…).
 */
function splitThaiIntoN(thai, n, lexicon) {
  const text = thai;
  if (n <= 0) return null;
  if (n === 1) return [text];
  if (n > text.length) return null;

  const memo = new Map();
  function rec(start, left) {
    const key = `${start}:${left}`;
    if (memo.has(key)) return memo.get(key);

    if (left === 1) {
      const piece = text.slice(start);
      const hit = lexicon.has(piece);
      // Strongly reward known words; penalize tiny leftovers of 1 char unless inevitable
      const score = hit ? 100 + piece.length : piece.length === 1 ? -20 : 1;
      const result = { score, parts: [piece] };
      memo.set(key, result);
      return result;
    }

    let best = null;
    const maxEnd = text.length - (left - 1);
    for (let end = start + 1; end <= maxEnd; end++) {
      const piece = text.slice(start, end);
      const hit = lexicon.has(piece);
      const score = hit ? 100 + Math.min(piece.length, 6) : piece.length === 1 ? -15 : 0;
      const rest = rec(end, left - 1);
      if (!rest) continue;
      const total = score + rest.score;
      if (!best || total > best.score) {
        best = { score: total, parts: [piece, ...rest.parts] };
      }
    }
    memo.set(key, best);
    return best;
  }

  const best = rec(0, n);
  return best?.parts || null;
}

/**
 * Breakdown follows Russian transcription spacing (Mai | Sai | Nam | Tan),
 * never includes polite particles ครับ/ค่ะ/คะ.
 */
export function buildWordsBreakdown(baseThai, baseRuTr, russian = '', lexicon) {
  const thai = stripPoliteParticleThai(baseThai);
  const tr = stripPoliteParticleTr(baseRuTr);
  if (!thai) return [];

  const trParts = tr.split(/\s+/).filter(Boolean);
  let segments = [];

  if (trParts.length >= 2) {
    const parts = splitThaiIntoN(thai, trParts.length, lexicon);
    if (parts && parts.length === trParts.length) {
      segments = parts.map((piece, idx) => {
        const meta = lexicon.get(piece);
        return {
          thai: piece,
          transcription_ru: meta?.transcription_ru || trParts[idx],
          translation_ru: meta?.translation_ru || '',
        };
      });
    }
  }

  if (segments.length === 0) {
    segments = segmentThai(thai, lexicon);
  }

  if (segments.length === 0) {
    segments = [
      {
        thai,
        transcription_ru: tr,
        translation_ru: russian || '',
      },
    ];
  }

  segments = alignTranscription(segments, tr);

  return segments
    .filter((w) => !isPoliteParticleWord(w))
    .map((w) => ({
      thai_hidden: w.thai,
      transcription_ru: w.transcription_ru || '',
      translation_ru:
        w.translation_ru || (segments.length === 1 ? russian || '' : ''),
    }));
}
