/**
 * Warm TTS cache for all phrases (male + female) at natural speed.
 * Client will apply playbackRate locally.
 *
 * Usage: node scripts/warm-tts-cache.mjs
 * Optional: CONCURRENCY=4 node scripts/warm-tts-cache.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function loadSynthesize() {
  // Prefer built CJS via dynamic import of TS source through tsx when available,
  // otherwise import compiled path. For simplicity use node-edge path via serverTts via tsx.
  const modPath = path.join(root, 'src/serverTts.ts');
  try {
    return await import(pathToFileURL(modPath).href);
  } catch {
    // fallback: transpile-less duplicate call via spawning is heavy; require built dist not exported
    throw new Error('Run with: npx tsx scripts/warm-tts-cache.mjs');
  }
}

async function main() {
  const { synthesizeThaiMp3 } = await loadSynthesize();
  const phrases = JSON.parse(
    fs.readFileSync(path.join(root, 'data/thai_phrases_database.json'), 'utf-8')
  );

  const jobs = [];
  for (const p of phrases) {
    if (p.female?.thai) jobs.push({ text: p.female.thai, gender: 'female', id: p.id });
    if (p.male?.thai) jobs.push({ text: p.male.thai, gender: 'male', id: p.id });
  }

  const concurrency = Math.max(1, Number(process.env.CONCURRENCY) || 3);
  let done = 0;
  let hits = 0;
  let misses = 0;
  let fails = 0;

  console.log(`Warming TTS cache: ${jobs.length} audio files, concurrency=${concurrency}`);

  let idx = 0;
  async function worker() {
    while (idx < jobs.length) {
      const current = jobs[idx];
      idx += 1;
      try {
        const res = await synthesizeThaiMp3(current.text, { gender: current.gender });
        if (res.cacheHit) hits += 1;
        else misses += 1;
      } catch (err) {
        fails += 1;
        console.warn(`Fail #${current.id} ${current.gender}:`, err.message || err);
      }
      done += 1;
      if (done % 50 === 0 || done === jobs.length) {
        console.log(`Progress ${done}/${jobs.length} (hits=${hits}, new=${misses}, fail=${fails})`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`Done. hits=${hits} new=${misses} fail=${fails}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
