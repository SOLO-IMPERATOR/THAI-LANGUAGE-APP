/**
 * Speech Service:
 * - Web Speech API (TTS for Thai & Speech Recognition for THAI 'th-TH')
 * - Real-Time Pronunciation Analysis & Feedback
 * - Web Audio API synthesizer for instant auditory cues (Success & Guidance Chimes)
 */

class SpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.thaiVoice = null;
    this.activeRecognition = null;
    this.isListening = false;
    this.voicesLoaded = false;
    this.audioContext = null;
    this._speakTimer = null;
    this._activeAudio = null;
    this._objectUrl = null;
    this._ttsRequestId = 0;
    this.preferServerTts = true;
    this._recognitionWantOpen = false;
    this._sttGeneration = 0;
    this._sttRestartTimer = null;
    this._sttRestartsThisHold = 0;

    if (this.synth) {
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
      if (typeof setTimeout !== 'undefined') {
        setTimeout(() => this.initVoices(), 250);
        setTimeout(() => this.initVoices(), 1000);
      }
    }
  }

  getAllVoices() {
    if (!this.synth?.getVoices) return [];
    try {
      return this.synth.getVoices() || [];
    } catch {
      return [];
    }
  }

  isThaiVoice(voice) {
    if (!voice) return false;
    const lang = String(voice.lang || '').toLowerCase().replace('_', '-');
    const name = String(voice.name || '').toLowerCase();
    return (
      lang === 'th' ||
      lang === 'th-th' ||
      lang.startsWith('th-') ||
      /thai|ไทย|ภาษาไทย/.test(name)
    );
  }

  /**
   * Rank Thai voices: prefer neural/cloud female (Google Thai / Premwadee / Kanya),
   * avoid robotic local engines that sound like gibberish.
   */
  scoreThaiVoice(voice, preferredGender = 'female') {
    if (!this.isThaiVoice(voice)) return -Infinity;
    const name = String(voice.name || '').toLowerCase();
    let score = 100;

    if (/google|microsoft|natural|online|neural|premium|enhanced|wavenet/.test(name)) score += 60;
    if (/espeak|festival|mbrola|compact|pico|flite/.test(name)) score -= 80;

    const femaleHint = /female|woman|girl|kanya|premwadee|narisa|somsi|หญิง/.test(name);
    const maleHint = /male|man|boy|niwat|somchai|ชาย/.test(name);

    if (preferredGender === 'female') {
      if (femaleHint) score += 40;
      if (maleHint) score -= 35;
      // Google's single Thai voice is female-sounding
      if (/google/.test(name) && !maleHint) score += 25;
    } else {
      if (maleHint) score += 40;
      if (femaleHint) score -= 35;
    }

    return score;
  }

  pickThaiVoice(preferredGender = 'female') {
    const voices = this.getAllVoices();
    const thaiVoices = voices.filter((v) => this.isThaiVoice(v));
    if (thaiVoices.length === 0) return null;

    thaiVoices.sort(
      (a, b) => this.scoreThaiVoice(b, preferredGender) - this.scoreThaiVoice(a, preferredGender)
    );
    return thaiVoices[0];
  }

  initVoices() {
    if (!this.synth) return;
    const voices = this.getAllVoices();
    if (!voices.length) return;

    // Default cache: best female Thai voice (historical app behavior)
    this.thaiVoice = this.pickThaiVoice('female');
    this.voicesLoaded = !!this.thaiVoice || voices.some((v) => this.isThaiVoice(v));
  }

  isSpeechSynthesisSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  isSpeechRecognitionSupported() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  hasThaiVoice() {
    this.initVoices();
    return !!this.pickThaiVoice('female') || !!this.thaiVoice;
  }

  /**
   * Speak Thai via server neural TTS (same voice in all browsers).
   * Falls back to browser speechSynthesis only if server TTS fails.
   */
  speakThai(thaiText, { onStart, onEnd, onError, rate = 0.82, gender = 'female' } = {}) {
    const text = String(thaiText || '').trim();
    if (!text) return;

    if (!/[\u0E00-\u0E7F]/.test(text)) {
      if (onError) onError(new Error('Нет тайского текста для озвучки.'));
      return;
    }

    this.stopSpeaking();

    const preferredGender = gender === 'male' ? 'male' : 'female';
    const playbackRate = Math.min(1.4, Math.max(0.4, Number(rate) || 0.82));

    if (this.preferServerTts) {
      this.speakViaServer(text, {
        gender: preferredGender,
        rate: playbackRate,
        onStart,
        onEnd,
        onError: (err) => {
          console.warn('Server TTS failed, falling back to browser voices:', err);
          this.speakViaBrowser(text, {
            gender: preferredGender,
            rate: playbackRate,
            onStart,
            onEnd,
            onError
          });
        }
      });
      return;
    }

    this.speakViaBrowser(text, {
      gender: preferredGender,
      rate: playbackRate,
      onStart,
      onEnd,
      onError
    });
  }

  async speakViaServer(text, { gender, rate, onStart, onEnd, onError }) {
    const requestId = ++this._ttsRequestId;
    try {
      // Always fetch natural-speed cached audio; speed is applied client-side.
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, gender })
      });

      if (requestId !== this._ttsRequestId) return;

      if (!res.ok) {
        let message = `TTS HTTP ${res.status}`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch (_) {}
        throw new Error(message);
      }

      const blob = await res.blob();
      if (requestId !== this._ttsRequestId) return;

      if (!blob || blob.size < 100) {
        throw new Error('Empty TTS audio');
      }

      if (this._objectUrl) {
        URL.revokeObjectURL(this._objectUrl);
        this._objectUrl = null;
      }

      const url = URL.createObjectURL(blob);
      this._objectUrl = url;
      const audio = new Audio(url);
      audio.playbackRate = Math.min(1.4, Math.max(0.4, Number(rate) || 1));
      // Keep pitch compensation off so Thai tones stay natural when slowing down
      try {
        audio.preservesPitch = true;
      } catch (_) {}
      this._activeAudio = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };
      audio.onended = () => {
        if (this._activeAudio === audio) this._activeAudio = null;
        if (this._objectUrl === url) {
          URL.revokeObjectURL(url);
          this._objectUrl = null;
        }
        if (onEnd) onEnd();
      };
      audio.onerror = () => {
        if (this._activeAudio === audio) this._activeAudio = null;
        if (this._objectUrl === url) {
          URL.revokeObjectURL(url);
          this._objectUrl = null;
        }
        if (onError) onError(new Error('Audio playback failed'));
      };

      await audio.play();
    } catch (err) {
      if (requestId !== this._ttsRequestId) return;
      if (onError) onError(err);
    }
  }

  speakViaBrowser(thaiText, { onStart, onEnd, onError, rate = 0.82, gender = 'female' } = {}) {
    if (!this.synth) {
      if (onError) onError(new Error('Синтез речи (TTS) не поддерживается в вашем браузере.'));
      return;
    }

    const text = String(thaiText || '').trim();
    if (!text) return;

    if (this._speakTimer) {
      clearTimeout(this._speakTimer);
      this._speakTimer = null;
    }

    try {
      this.synth.cancel();
    } catch (_) {}

    const preferredGender = gender === 'male' ? 'male' : 'female';

    const run = () => {
      this.initVoices();
      const voice = this.pickThaiVoice(preferredGender) || this.thaiVoice;

      if (!voice) {
        const err = new Error(
          'Тайский голос не найден в браузере. Серверная озвучка тоже недоступна.'
        );
        if (onError) onError(err);
        console.warn(err.message, this.getAllVoices().map((v) => `${v.name} [${v.lang}]`));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang || 'th-TH';
      utterance.rate = Math.min(1.4, Math.max(0.4, Number(rate) || 0.82));
      utterance.pitch = preferredGender === 'female' ? 1.05 : 0.98;
      utterance.volume = 1;

      utterance.onstart = () => {
        if (onStart) onStart();
      };
      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      utterance.onerror = (event) => {
        if (event.error !== 'canceled' && onError) {
          onError(event);
        }
      };

      if (this.synth.paused) {
        try {
          this.synth.resume();
        } catch (_) {}
      }

      this.synth.speak(utterance);
    };

    this._speakTimer = setTimeout(run, 60);
  }

  stopSpeaking() {
    this._ttsRequestId += 1;
    if (this._speakTimer) {
      clearTimeout(this._speakTimer);
      this._speakTimer = null;
    }
    if (this._activeAudio) {
      try {
        this._activeAudio.pause();
        this._activeAudio.src = '';
      } catch (_) {}
      this._activeAudio = null;
    }
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
      this._objectUrl = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Start Thai speech recognition (STT) in 'th-TH'.
   * keepAlive: if the browser ends the session while PTT is held, start a *new*
   * SpeechRecognition instance (reusing one object leaks mic state in Chrome).
   */
  startThaiRecognition({
    onResult,
    onError,
    onEnd,
    continuous = true,
    keepAlive = false,
    shouldContinue = null
  } = {}) {
    if (!this.isSpeechRecognitionSupported()) {
      const err = new Error('Распознавание речи не поддерживается браузером. Рекомендуется Chrome или Safari.');
      if (onError) onError(err);
      return null;
    }

    this.abortRecognitionHard();
    this._sttGeneration += 1;
    const generation = this._sttGeneration;
    this._recognitionWantOpen = true;
    this._sttRestartsThisHold = 0;

    let finalTranscript = '';
    let endedIntentionally = false;
    const MAX_RESTARTS_PER_HOLD = 6;

    const stillWantOpen = () =>
      keepAlive &&
      this._recognitionWantOpen &&
      !endedIntentionally &&
      generation === this._sttGeneration &&
      this._sttRestartsThisHold < MAX_RESTARTS_PER_HOLD &&
      (typeof shouldContinue !== 'function' || !!shouldContinue());

    const finish = (intentional) => {
      if (generation !== this._sttGeneration) return;
      this._recognitionWantOpen = false;
      this.isListening = false;
      this.activeRecognition = null;
      if (onEnd) onEnd(finalTranscript.trim(), { intentional });
    };

    const bindAndStart = () => {
      if (generation !== this._sttGeneration || !this._recognitionWantOpen || endedIntentionally) {
        return;
      }

      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRec();
      recognition.lang = 'th-TH';
      recognition.interimResults = true;
      recognition.continuous = !!continuous;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        if (generation !== this._sttGeneration) return;
        this.isListening = true;
        this.activeRecognition = recognition;
      };

      recognition.onresult = (event) => {
        if (generation !== this._sttGeneration) return;
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }
        if (onResult) {
          onResult({
            final: finalTranscript.trim(),
            interim: interim.trim(),
            text: (finalTranscript + ' ' + interim).trim(),
            isFinalSegment: !interim,
            complete: false
          });
        }
      };

      recognition.onerror = (event) => {
        if (generation !== this._sttGeneration) return;
        const errName = event?.error || '';
        if (errName === 'no-speech' || errName === 'aborted') return;
        if (errName === 'not-allowed' || errName === 'service-not-allowed') {
          endedIntentionally = true;
          this._recognitionWantOpen = false;
          if (onError) onError(event);
          return;
        }
        // "network" / busy often recover on a fresh instance after a short pause
        if (onError) onError(event);
      };

      recognition.onend = () => {
        if (generation !== this._sttGeneration) return;
        if (this.activeRecognition === recognition) {
          this.activeRecognition = null;
        }
        this.isListening = false;

        if (stillWantOpen()) {
          this._sttRestartsThisHold += 1;
          // Give Chrome time to release the mic before opening a new session
          this._sttRestartTimer = setTimeout(() => {
            this._sttRestartTimer = null;
            if (!stillWantOpen()) {
              finish(endedIntentionally);
              return;
            }
            bindAndStart();
          }, 220);
          return;
        }

        finish(endedIntentionally);
      };

      try {
        recognition.start();
        this.activeRecognition = recognition;
      } catch (e) {
        // InvalidStateError: previous session still closing — retry once
        this._sttRestartTimer = setTimeout(() => {
          this._sttRestartTimer = null;
          if (generation !== this._sttGeneration || endedIntentionally || !this._recognitionWantOpen) {
            finish(endedIntentionally);
            return;
          }
          try {
            bindAndStart();
          } catch (err2) {
            if (onError) onError(err2);
            finish(false);
          }
        }, 280);
      }
    };

    bindAndStart();

    return {
      stop: () => {
        endedIntentionally = true;
        this._recognitionWantOpen = false;
        // Bump generation so any late onend/restart is ignored
        if (generation === this._sttGeneration) {
          this._sttGeneration += 1;
        }
        this.abortRecognitionHard();
        if (onEnd) onEnd(finalTranscript.trim(), { intentional: true });
      },
      abort: () => {
        endedIntentionally = true;
        this._recognitionWantOpen = false;
        if (generation === this._sttGeneration) {
          this._sttGeneration += 1;
        }
        this.abortRecognitionHard();
      }
    };
  }

  /** Hard-close mic/recognition: clear timers, drop handlers, abort. */
  abortRecognitionHard() {
    if (this._sttRestartTimer) {
      clearTimeout(this._sttRestartTimer);
      this._sttRestartTimer = null;
    }
    this._recognitionWantOpen = false;
    const rec = this.activeRecognition;
    this.activeRecognition = null;
    this.isListening = false;
    if (!rec) return;
    try {
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
    } catch (_) {}
    try {
      if (typeof rec.abort === 'function') rec.abort();
      else if (typeof rec.stop === 'function') rec.stop();
    } catch (_) {
      try {
        rec.stop?.();
      } catch (_) {}
    }
  }

  stopRecognition({ silent = false } = {}) {
    if (silent) {
      this.abortRecognitionHard();
      return;
    }
    this._recognitionWantOpen = false;
    if (this._sttRestartTimer) {
      clearTimeout(this._sttRestartTimer);
      this._sttRestartTimer = null;
    }
    const rec = this.activeRecognition;
    if (rec) {
      try {
        if (typeof rec.stop === 'function') {
          rec.stop();
        } else {
          this.abortRecognitionHard();
          return;
        }
      } catch {
        this.abortRecognitionHard();
        return;
      }
      this.activeRecognition = null;
    }
    this.isListening = false;
  }

  /**
   * Web Audio API synthesis for auditory cues:
   * 'success': Pleasant 3-note ascending melodic chime (C5 - E5 - G5)
   * 'retry': Warm pedagogical 2-note guidance tone (A4 - D4)
   */
  playAuditoryCue(type = 'success') {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      if (type === 'success') {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0.001, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.36);
        });
      } else {
        const notes = [440.0, 329.63]; // A4, E4
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0.001, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.36);
        });
      }
    } catch (e) {
      console.warn('Audio chime playback error:', e);
    }
  }

  /**
   * Helper: Normalize Thai text by removing spaces and non-Thai punctuation
   */
  normalizeThai(text) {
    if (!text) return '';
    return text
      .trim()
      .replace(/[\s.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, '')
      .replace(/\u200B/g, ''); // Remove zero-width spaces
  }

  /**
   * Levenshtein Distance calculation between two strings
   */
  levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Analyze Thai pronunciation.
   * @param {{ playCue?: boolean }} options - set playCue:false to skip chimes (e.g. live preview)
   */
  analyzeThaiPronunciation(spokenText, phrase, options = {}) {
    const playCue = options.playCue !== false;
    if (!spokenText || !phrase) {
      return {
        score: 0,
        verdict: 'unclear',
        feedbackTitle: 'Звук не распознан',
        feedbackTip: 'Произнесите фразу на тайском громче и ближе к микрофону.',
        syllableResults: []
      };
    }

    const cleanSpoken = this.normalizeThai(spokenText);
    const cleanTarget = this.normalizeThai(phrase.thai_hidden);

    if (cleanSpoken.length === 0) {
      return {
        score: 0,
        verdict: 'unclear',
        feedbackTitle: 'Слишком тихо',
        feedbackTip: 'Произнесите фразу еще раз четко.',
        syllableResults: []
      };
    }

    // Overall character similarity
    const maxLen = Math.max(cleanSpoken.length, cleanTarget.length);
    const distance = this.levenshtein(cleanSpoken, cleanTarget);
    const rawRatio = Math.max(0, 1 - distance / maxLen);

    // Exact or direct inclusion boosts
    const isExact = cleanSpoken === cleanTarget;
    const isSubstring = cleanSpoken.includes(cleanTarget) || cleanTarget.includes(cleanSpoken);

    let overallScore = Math.round(rawRatio * 100);
    if (isExact) overallScore = 100;
    else if (isSubstring && overallScore < 85) overallScore = Math.min(95, overallScore + 15);

    // Analyze individual words/syllables
    const words = phrase.words_breakdown || [
      { thai_hidden: phrase.thai_hidden, transcription_ru: phrase.transcription_ru, translation_ru: phrase.translation_ru }
    ];

    let matchedWordsCount = 0;
    const syllableResults = words.map((w) => {
      const cleanWord = this.normalizeThai(w.thai_hidden);
      const isWordInSpoken = cleanSpoken.includes(cleanWord);

      let wordScore = 0;
      let status = 'poor'; // 'perfect' | 'good' | 'poor'
      let note = '';

      if (isWordInSpoken) {
        wordScore = 100;
        status = 'perfect';
        note = 'Чистое попадание в тон и артикуляцию';
        matchedWordsCount += 1;
      } else {
        // Calculate sub-similarity
        const wDist = this.levenshtein(cleanSpoken, cleanWord);
        const wMax = Math.max(cleanSpoken.length, cleanWord.length);
        const ratio = 1 - wDist / wMax;

        if (ratio >= 0.55) {
          wordScore = Math.round(ratio * 100);
          status = 'good';
          note = 'Близко по звучанию. Обратите внимание на тон и долготу';
          matchedWordsCount += 0.7;
        } else {
          wordScore = Math.max(20, Math.round(ratio * 100));
          status = 'poor';
          note = 'Слово пропущено или смазан звук';
        }
      }

      // Add specific Thai phonetic hints based on transcription diacritics
      const tr = w.transcription_ru || '';
      if (tr.includes(':')) {
        note += ' (помните: гласный долгий)';
      }
      if (tr.includes('̂')) {
        note += ' (нисходящий падающий тон)';
      } else if (tr.includes('̀')) {
        note += ' (низкий тон)';
      } else if (tr.includes('́')) {
        note += ' (высокий тон)';
      } else if (tr.includes('̌')) {
        note += ' (восходящий тон)';
      }

      return {
        thai: w.thai_hidden,
        transcription_ru: w.transcription_ru,
        translation_ru: w.translation_ru,
        status,
        score: wordScore,
        note
      };
    });

    // Re-calibrate overall score based on syllable matches
    const syllableAvg = Math.round((matchedWordsCount / words.length) * 100);
    overallScore = Math.max(overallScore, syllableAvg);

    // Determine verdict, pedagogical feedback title and actionable tip
    let verdict = 'poor';
    let feedbackTitle = '';
    let feedbackTip = '';

    if (overallScore >= 80) {
      verdict = 'excellent';
      feedbackTitle = 'Великолепное произношение! 🎯';
      feedbackTip = 'Тайский носитель понял бы вас моментально. Тон и гласные выдержаны точно.';
      if (playCue) this.playAuditoryCue('success');
    } else if (overallScore >= 60) {
      verdict = 'good';
      feedbackTitle = 'Хорошо, смысл понятен! 👍';
      feedbackTip = 'Вас поймут, но обратите внимание на долготу гласных и конечные согласные звуки.';
      if (playCue) this.playAuditoryCue('success');
    } else {
      verdict = 'needs_practice';
      feedbackTitle = 'Требуется тренировка 🔊';
      feedbackTip = 'Послушайте эталонное звучание тайского диктора еще раз и повторите фразу плавно без пауз.';
      if (playCue) this.playAuditoryCue('retry');
    }

    return {
      score: overallScore,
      verdict,
      cleanSpoken,
      spokenText,
      feedbackTitle,
      feedbackTip,
      syllableResults
    };
  }

  /**
   * Normalize Russian practical transcription for typed recall answers.
   */
  normalizeTranscription(text) {
    if (!text) return '';
    return String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]/gi, '');
  }

  /**
   * Check typed or spoken answer against phrase (Thai script or RU transcription).
   */
  matchesPhraseAnswer(input, phrase, minSpeechScore = 70) {
    if (!phrase) return { ok: false, score: 0, via: null };
    const raw = String(input || '').trim();
    if (!raw) return { ok: false, score: 0, via: null };

    const hasThai = /[\u0E00-\u0E7F]/.test(raw);
    if (hasThai) {
      const spoken = this.normalizeThai(raw);
      const target = this.normalizeThai(phrase.thai_hidden);
      if (!spoken || !target) return { ok: false, score: 0, via: null };
      if (spoken === target) return { ok: true, score: 100, via: 'thai' };
      const dist = this.levenshtein(spoken, target);
      const score = Math.max(0, Math.round((1 - dist / Math.max(target.length, 1)) * 100));
      return { ok: score >= minSpeechScore, score, via: 'thai' };
    }

    const typed = this.normalizeTranscription(raw);
    const targetRu = this.normalizeTranscription(phrase.transcription_ru);
    if (typed && targetRu) {
      if (typed === targetRu) return { ok: true, score: 100, via: 'transcription' };
      const dist = this.levenshtein(typed, targetRu);
      const score = Math.max(0, Math.round((1 - dist / Math.max(targetRu.length, 1)) * 100));
      if (score >= minSpeechScore) return { ok: true, score, via: 'transcription' };
    }

    // Fallback: treat as spoken Thai via STT text
    const analysis = this.analyzeThaiPronunciation(raw, phrase);
    return {
      ok: analysis.score >= minSpeechScore,
      score: analysis.score,
      via: 'speech',
      analysis
    };
  }
}

export const speechService = new SpeechService();
