import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EdgeTTS } from 'node-edge-tts';

const CACHE_DIR = path.resolve(process.cwd(), 'data/tts-cache');

/** Always synthesize/cache at natural speed; client applies playbackRate. */
export const TTS_BASE_RATE = 1;

const VOICES = {
  female: { voice: 'th-TH-PremwadeeNeural', lang: 'th-TH' },
  male: { voice: 'th-TH-NiwatNeural', lang: 'th-TH' },
} as const;

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cacheKey(text: string, gender: 'female' | 'male'): string {
  const payload = `v2|${gender}|base|${text}`;
  return crypto.createHash('sha1').update(payload).digest('hex');
}

async function synthesizeWithEdge(
  text: string,
  gender: 'female' | 'male',
  outPath: string
): Promise<void> {
  const cfg = VOICES[gender];
  const tts = new EdgeTTS({
    voice: cfg.voice,
    lang: cfg.lang,
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    rate: '+0%',
    timeout: 45000,
  });
  await tts.ttsPromise(text, outPath);
}

/** Fallback: Google Translate TTS (single Thai voice, ~female). */
async function synthesizeWithGoogleTranslate(text: string, outPath: string): Promise<void> {
  const chunk = text.slice(0, 180);
  const url =
    'https://translate.google.com/translate_tts?' +
    new URLSearchParams({
      ie: 'UTF-8',
      q: chunk,
      tl: 'th',
      client: 'tw-ob',
    }).toString();

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
      Referer: 'https://translate.google.com/',
    },
  });

  if (!res.ok) {
    throw new Error(`Google TTS HTTP ${res.status}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) {
    throw new Error('Google TTS returned empty audio');
  }
  fs.writeFileSync(outPath, buf);
}

export async function synthesizeThaiMp3(
  text: string,
  options: { gender?: string } = {}
): Promise<{ filePath: string; cacheHit: boolean; provider: string }> {
  const clean = String(text || '').trim();
  if (!clean) {
    throw new Error('text required');
  }
  if (!/[\u0E00-\u0E7F]/.test(clean)) {
    throw new Error('Thai text required');
  }

  const gender = options.gender === 'male' ? 'male' : 'female';

  ensureCacheDir();
  const key = cacheKey(clean, gender);
  const filePath = path.join(CACHE_DIR, `${key}.mp3`);

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
    return { filePath, cacheHit: true, provider: 'cache' };
  }

  const tmpPath = `${filePath}.tmp`;
  try {
    await synthesizeWithEdge(clean, gender, tmpPath);
    fs.renameSync(tmpPath, filePath);
    return { filePath, cacheHit: false, provider: 'edge' };
  } catch (edgeErr: any) {
    console.warn('Edge TTS failed, falling back to Google Translate TTS:', edgeErr?.message || edgeErr);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_) {}
    await synthesizeWithGoogleTranslate(clean, tmpPath);
    fs.renameSync(tmpPath, filePath);
    return { filePath, cacheHit: false, provider: 'google-translate' };
  }
}

export function getTtsCacheDir() {
  return CACHE_DIR;
}
