/**
 * Free on-device Thai STT via Whisper (WASM) — no paid API.
 * Push-to-talk records with MediaRecorder; on release we transcribe locally.
 */

const MODEL_ID = 'Xenova/whisper-tiny';
const TARGET_SR = 16000;

let pipelinePromise = null;
let transcriber = null;
let loadError = null;

export function isLocalSttSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined' &&
    typeof AudioContext !== 'undefined'
  );
}

function pickRecorderMime() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

export function getPreferredRecorderMime() {
  return pickRecorderMime();
}

async function getTranscriber(onProgress) {
  if (transcriber) return transcriber;
  if (loadError) throw loadError;
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      transcriber = await pipeline('automatic-speech-recognition', MODEL_ID, {
        dtype: 'q8',
        progress_callback: (ev) => {
          if (typeof onProgress === 'function') onProgress(ev);
        }
      });
      return transcriber;
    })().catch((err) => {
      loadError = err;
      pipelinePromise = null;
      throw err;
    });
  }
  return pipelinePromise;
}

/** Warm-up / download model in background (cached after first time). */
export function prefetchLocalStt(onProgress) {
  if (!isLocalSttSupported()) return Promise.resolve(null);
  return getTranscriber(onProgress).catch((err) => {
    console.warn('Local STT prefetch failed:', err);
    return null;
  });
}

function mixToMono(audioBuffer) {
  const { numberOfChannels, length } = audioBuffer;
  if (numberOfChannels === 1) return audioBuffer.getChannelData(0).slice(0);
  const out = new Float32Array(length);
  for (let c = 0; c < numberOfChannels; c++) {
    const ch = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) out[i] += ch[i] / numberOfChannels;
  }
  return out;
}

function resampleLinear(input, fromRate, toRate) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const newLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = pos - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

export async function blobToWhisperAudio(blob) {
  const ab = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(ab.slice(0));
    const mono = mixToMono(decoded);
    return resampleLinear(mono, decoded.sampleRate, TARGET_SR);
  } finally {
    try {
      await ctx.close();
    } catch (_) {}
  }
}

/**
 * Transcribe a recorded Blob to Thai text (free, on-device).
 * @returns {Promise<string>}
 */
export async function transcribeThaiBlob(blob, { onProgress } = {}) {
  if (!blob || blob.size < 200) {
    throw new Error('Слишком короткая запись — удерживайте дольше и говорите громче.');
  }

  const asr = await getTranscriber(onProgress);
  const audio = await blobToWhisperAudio(blob);

  const result = await asr(audio, {
    language: 'thai',
    task: 'transcribe',
    chunk_length_s: 30,
    // Short push-to-talk clips
    return_timestamps: false
  });

  const text = String(result?.text || '').trim();
  return text;
}
