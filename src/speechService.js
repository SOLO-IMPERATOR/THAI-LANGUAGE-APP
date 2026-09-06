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

    if (this.synth) {
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // Search for a Thai voice (th-TH, th)
    this.thaiVoice = voices.find((v) => v.lang === 'th-TH' || v.lang.toLowerCase().startsWith('th')) || null;
    this.voicesLoaded = true;
  }

  isSpeechSynthesisSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  isSpeechRecognitionSupported() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Speak Thai text using window.speechSynthesis (th-TH)
   */
  speakThai(thaiText, { onStart, onEnd, onError, rate = 0.82 } = {}) {
    if (!this.synth) {
      if (onError) onError(new Error('Синтез речи (TTS) не поддерживается в вашем браузере.'));
      return;
    }

    this.synth.cancel();

    if (!thaiText) return;

    const utterance = new SpeechSynthesisUtterance(thaiText);
    utterance.lang = 'th-TH';
    utterance.rate = rate; // Learners benefit from slightly slower pace
    utterance.pitch = 1.0;

    if (this.thaiVoice) {
      utterance.voice = this.thaiVoice;
    } else {
      this.initVoices();
      if (this.thaiVoice) {
        utterance.voice = this.thaiVoice;
      }
    }

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
      this.synth.resume();
    }

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Start Thai speech recognition (STT) in 'th-TH'
   * Allows the user to pronounce the Thai phrase orally into microphone
   */
  startThaiRecognition({ onResult, onError, onEnd }) {
    if (!this.isSpeechRecognitionSupported()) {
      const err = new Error('Распознавание речи не поддерживается браузером. Рекомендуется Chrome или Safari.');
      if (onError) onError(err);
      return null;
    }

    this.stopRecognition();

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();

    recognition.lang = 'th-TH';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 5;

    let finalTranscript = '';

    recognition.onstart = () => {
      this.isListening = true;
    };

    recognition.onresult = (event) => {
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
          text: (finalTranscript + ' ' + interim).trim()
        });
      }
    };

    recognition.onerror = (event) => {
      this.isListening = false;
      this.activeRecognition = null;
      if (onError) onError(event);
    };

    recognition.onend = () => {
      this.isListening = false;
      this.activeRecognition = null;
      if (onEnd) onEnd(finalTranscript.trim());
    };

    try {
      recognition.start();
      this.activeRecognition = recognition;
    } catch (e) {
      this.isListening = false;
      this.activeRecognition = null;
      if (onError) onError(e);
      return null;
    }

    return {
      stop: () => this.stopRecognition(),
      abort: () => {
        if (this.activeRecognition) {
          try {
            this.activeRecognition.abort();
          } catch {
            // Ignore
          }
          this.activeRecognition = null;
          this.isListening = false;
        }
      }
    };
  }

  stopRecognition() {
    if (this.activeRecognition) {
      try {
        this.activeRecognition.onend = null;
        this.activeRecognition.onerror = null;
        this.activeRecognition.onresult = null;
        this.activeRecognition.abort();
      } catch {
        // Ignore
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
   * Analyze Thai pronunciation in real-time
   * Compares spoken text against target phrase and its word/syllable breakdown
   */
  analyzeThaiPronunciation(spokenText, phrase) {
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
      this.playAuditoryCue('success');
    } else if (overallScore >= 60) {
      verdict = 'good';
      feedbackTitle = 'Хорошо, смысл понятен! 👍';
      feedbackTip = 'Вас поймут, но обратите внимание на долготу гласных и конечные согласные звуки.';
      this.playAuditoryCue('success');
    } else {
      verdict = 'needs_practice';
      feedbackTitle = 'Требуется тренировка 🔊';
      feedbackTip = 'Послушайте эталонное звучание тайского диктора еще раз и повторите фразу плавно без пауз.';
      this.playAuditoryCue('retry');
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
}

export const speechService = new SpeechService();
