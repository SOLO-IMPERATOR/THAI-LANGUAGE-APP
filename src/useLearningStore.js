import { defineStore } from 'pinia';
import { db, initDatabase, INITIAL_PHRASES } from './db.js';
import { getGenderedPhrase } from './phrasesData.js';

// SRS Interval map in milliseconds per user specification:
// Day 3 -> Day 5 -> Day 7 (week) -> Day 14 (2 weeks) -> Day 30 (month)
export const SRS_INTERVALS_MS = {
  1: 3 * 24 * 60 * 60 * 1000,  // 3 days
  2: 5 * 24 * 60 * 60 * 1000,  // 5 days -> trigger point
  3: 7 * 24 * 60 * 60 * 1000,  // 7 days (1 week)
  4: 14 * 24 * 60 * 60 * 1000, // 14 days (2 weeks)
  5: 30 * 24 * 60 * 60 * 1000  // 30 days (1 month)
};

export const useLearningStore = defineStore('learning', {
  state: () => ({
    phrases: [],
    dictionaryWords: [],
    userGender: typeof localStorage !== 'undefined' ? (localStorage.getItem('thai_frazovik_gender') || 'female') : 'female',
    settings: {
      dailyGoal: 5,
      trainingMode: 'mix', // 'new' | 'review' | 'mix'
      reminderHour: 10,
      reminderMinute: 0,
      notificationsEnabled: false,
      playbackRate: typeof localStorage !== 'undefined' ? (parseFloat(localStorage.getItem('thai_frazovik_speed')) || 0.7) : 0.7
    },
    // Active training session queue
    sessionQueue: [],
    currentSessionIndex: 0,
    isLoading: true,
    isInitialized: false,
    sessionStats: {
      completedCount: 0,
      newLearned: 0,
      reviewsDone: 0,
      deconstructedToday: 0
    },
    lastCompletedSession: [],
    selectedCategory: 'all',
    selectedTag: 'all',
    reminderTimerId: null
  }),

  getters: {
    currentPhrase: (state) => {
      if (state.sessionQueue.length === 0) return null;
      if (state.currentSessionIndex >= state.sessionQueue.length) return null;
      const raw = state.sessionQueue[state.currentSessionIndex];
      return getGenderedPhrase(raw, state.userGender);
    },

    isSessionComplete: (state) => {
      return state.sessionQueue.length > 0 && state.currentSessionIndex >= state.sessionQueue.length;
    },

    queueRemainingCount: (state) => {
      return Math.max(0, state.sessionQueue.length - state.currentSessionIndex);
    },

    queueTotalCount: (state) => state.sessionQueue.length,

    newPhrasesCount: (state) => state.phrases.filter((p) => p.stage_srs === 0).length,

    dueReviewsCount: (state) => {
      const now = Date.now();
      return state.phrases.filter((p) => p.stage_srs > 0 && p.next_review <= now).length;
    },

    allReviewedCount: (state) => state.phrases.filter((p) => (p.review_count || 0) > 0 || p.stage_srs > 0).length,

    deconstructedPhrasesCount: (state) => state.phrases.filter((p) => p.is_deconstructed).length,

    categories: (state) => {
      const set = new Set(state.phrases.map((p) => p.category).filter(Boolean));
      return Array.from(set);
    },

    allTags: (state) => {
      const tagSet = new Set();
      state.phrases.forEach((p) => {
        if (Array.isArray(p.tags)) {
          p.tags.forEach((t) => tagSet.add(t));
        }
      });
      return Array.from(tagSet).sort();
    },

    tagCounts: (state) => {
      const counts = {};
      state.phrases.forEach((p) => {
        if (Array.isArray(p.tags)) {
          p.tags.forEach((t) => {
            counts[t] = (counts[t] || 0) + 1;
          });
        }
      });
      return counts;
    }
  },

  actions: {
    /**
     * Initialize Dexie DB, load settings and cached state
     */
    async initialize() {
      this.isLoading = true;
      try {
        await initDatabase();
      } catch (err) {
        console.warn('initDatabase encountered error, continuing with fallback:', err);
      }

      try {
        await this.loadAllPhrases();
      } catch (err) {
        console.warn('loadAllPhrases encountered error:', err);
      }

      // Guarantee phrases are populated
      if (!this.phrases || this.phrases.length === 0) {
        this.phrases = INITIAL_PHRASES.map((p, idx) => ({
          ...p,
          id: idx + 1,
          review_count: p.review_count || 0
        }));
      }

      try {
        await this.loadDictionary();
      } catch (err) {
        console.warn('loadDictionary error:', err);
      }

      try {
        await this.loadSettings();
      } catch (err) {
        console.warn('loadSettings error:', err);
      }

      try {
        this.setupReminderSchedule();
      } catch (err) {
        console.warn('setupReminderSchedule error:', err);
      }

      try {
        this.startNewSession();
      } catch (err) {
        console.warn('startNewSession error:', err);
      }

      try {
        const userId = this.getActiveUserId();
        if (userId) {
          await this.applyServerSrsProgress(userId);
        }
      } catch (err) {
        console.warn('applyServerSrsProgress error:', err);
      }

      this.isInitialized = true;
      this.isLoading = false;
    },

    async loadAllPhrases() {
      try {
        if (db && db.phrases) {
          const loaded = await db.phrases.toArray();
          if (loaded && loaded.length > 0) {
            this.phrases = loaded;
            return;
          }
        }
      } catch (err) {
        console.warn('Dexie phrases read error, using INITIAL_PHRASES:', err);
      }
      this.phrases = INITIAL_PHRASES.map((p, idx) => ({
        ...p,
        id: idx + 1,
        review_count: p.review_count || 0
      }));
    },

    getActiveUserId() {
      try {
        const raw = localStorage.getItem('thai_frazovik_current_user');
        if (!raw) return null;
        const user = JSON.parse(raw);
        if (!user?.id || user.isGuest) return null;
        return user.id;
      } catch {
        return null;
      }
    },

    async syncPhraseSrsToServer(phraseId, updatedData, event) {
      const userId = this.getActiveUserId();
      if (!userId) return;

      try {
        await fetch(`/api/users/${encodeURIComponent(userId)}/srs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phraseId,
            stage_srs: updatedData.stage_srs,
            review_count: updatedData.review_count,
            next_review: updatedData.next_review,
            is_deconstructed: updatedData.is_deconstructed,
            tags: updatedData.tags,
            event
          })
        });
      } catch (err) {
        console.warn('SRS server sync failed:', err);
      }
    },

    async applyServerSrsProgress(userId) {
      if (!userId) return;

      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}/srs`);
        if (!res.ok) return;
        const data = await res.json();
        const serverProgress = Array.isArray(data.progress) ? data.progress : [];

        // If server empty but local has SRS data — upload local once
        if (serverProgress.length === 0) {
          const localStudied = this.phrases.filter(
            (p) => (p.stage_srs || 0) > 0 || (p.review_count || 0) > 0 || p.is_deconstructed
          );
          if (localStudied.length > 0) {
            await fetch(`/api/users/${encodeURIComponent(userId)}/srs/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                progress: localStudied.map((p) => ({
                  phraseId: p.id,
                  stage_srs: p.stage_srs || 0,
                  review_count: p.review_count || 0,
                  next_review: p.next_review || 0,
                  is_deconstructed: p.is_deconstructed || 0,
                  tags: p.tags || []
                }))
              })
            });
          }
          return;
        }

        const byId = new Map(serverProgress.map((p) => [p.phraseId, p]));
        for (const phrase of this.phrases) {
          const remote = byId.get(phrase.id);
          if (!remote) continue;
          const patch = {
            stage_srs: remote.stage_srs || 0,
            review_count: remote.review_count || 0,
            next_review: remote.next_review || 0,
            is_deconstructed: remote.is_deconstructed || 0
          };
          if (Array.isArray(remote.tags) && remote.tags.length > 0) {
            patch.tags = remote.tags;
          }
          Object.assign(phrase, patch);
          await db.phrases.update(phrase.id, patch);
        }

        this.startNewSession();
      } catch (err) {
        console.warn('Failed to apply server SRS progress:', err);
      }
    },

    async resetLocalSrsToCanonical() {
      for (const phrase of this.phrases) {
        const patch = {
          stage_srs: 0,
          review_count: 0,
          next_review: 0,
          is_deconstructed: 0
        };
        Object.assign(phrase, patch);
        try {
          await db.phrases.update(phrase.id, patch);
        } catch (_) {}
      }
      this.startNewSession();
    },

    async loadDictionary() {
      try {
        if (db && db.dictionary_words) {
          this.dictionaryWords = await db.dictionary_words.toArray();
          return;
        }
      } catch (err) {
        console.warn('Dexie dictionary read error:', err);
      }
      this.dictionaryWords = [];
    },

    async loadSettings() {
      try {
        if (db && db.settings) {
          const savedDailyGoal = await db.settings.get('dailyGoal');
          if (savedDailyGoal) this.settings.dailyGoal = Number(savedDailyGoal.value) || 5;

          const savedMode = await db.settings.get('trainingMode');
          if (savedMode) this.settings.trainingMode = savedMode.value;

          const savedHour = await db.settings.get('reminderHour');
          if (savedHour) this.settings.reminderHour = Number(savedHour.value);

          const savedMinute = await db.settings.get('reminderMinute');
          if (savedMinute) this.settings.reminderMinute = Number(savedMinute.value);

          const savedNotif = await db.settings.get('notificationsEnabled');
          if (savedNotif) this.settings.notificationsEnabled = Boolean(savedNotif.value);

          const savedRate = await db.settings.get('playbackRate');
          if (savedRate && savedRate.value !== undefined) {
            this.settings.playbackRate = Number(savedRate.value) || 0.7;
          }
        }
      } catch (err) {
        console.warn('Dexie settings read error, using defaults:', err);
      }
    },

    async updateSetting(key, value) {
      this.settings[key] = value;
      try {
        if (db && db.settings) {
          await db.settings.put({ key, value });
        }
      } catch (err) {
        console.warn('Dexie settings write error:', err);
      }

      if (key === 'reminderHour' || key === 'reminderMinute' || key === 'notificationsEnabled') {
        this.setupReminderSchedule();
      }

      // If training mode or daily goal changed, refresh session queue if user is at beginning
      if ((key === 'trainingMode' || key === 'dailyGoal') && this.currentSessionIndex === 0) {
        this.startNewSession();
      }
    },

    setPlaybackRate(rate) {
      const validRates = [0.5, 0.7, 1.0, 1.2];
      const num = Number(rate);
      const target = validRates.includes(num) ? num : (validRates.find(r => Math.abs(r - num) < 0.05) || 0.7);
      this.settings.playbackRate = target;
      try {
        localStorage.setItem('thai_frazovik_speed', String(target));
      } catch (e) {}
      this.updateSetting('playbackRate', target);
    },

    setUserGender(gender) {
      if (gender === 'male' || gender === 'female') {
        this.userGender = gender;
        try {
          localStorage.setItem('thai_frazovik_gender', gender);
        } catch (e) {}
      }
    },

    /**
     * Build active session queue based on filters and mode:
     * - Filters: Category & Tag
     * - Mode: 'new', 'review', or 'mix'
     * - Guarantee: phrases never repeat within the queue and prioritize unstudied phrases!
     */
    startNewSession() {
      const now = Date.now();
      const goal = Math.max(1, Number(this.settings.dailyGoal) || 5);
      let queue = [];

      let availablePhrases = [...this.phrases];

      // Filter by Category
      if (this.selectedCategory !== 'all') {
        availablePhrases = availablePhrases.filter((p) => p.category === this.selectedCategory);
      }

      // Filter by Tag
      if (this.selectedTag !== 'all') {
        availablePhrases = availablePhrases.filter((p) => Array.isArray(p.tags) && p.tags.includes(this.selectedTag));
      }

      const dueReviews = availablePhrases.filter((p) => p.stage_srs > 0 && p.next_review <= now);
      const newPhrases = availablePhrases.filter((p) => p.stage_srs === 0);
      const futureReviews = availablePhrases.filter((p) => p.stage_srs > 0 && p.next_review > now);

      if (this.settings.trainingMode === 'new') {
        queue = newPhrases.slice(0, goal);
      } else if (this.settings.trainingMode === 'review') {
        if (dueReviews.length > 0) {
          queue = dueReviews.slice(0, goal);
        } else {
          queue = futureReviews.slice(0, goal);
        }
      } else {
        // 'mix' mode: combine due reviews and new phrases
        const reviewsToTake = dueReviews.slice(0, Math.ceil(goal / 2));
        const neededNew = Math.max(0, goal - reviewsToTake.length);
        const newToTake = newPhrases.slice(0, neededNew);

        queue = [...reviewsToTake, ...newToTake];

        if (queue.length < goal && dueReviews.length > reviewsToTake.length) {
          const extraReviews = dueReviews.slice(reviewsToTake.length, reviewsToTake.length + (goal - queue.length));
          queue = [...queue, ...extraReviews];
        }

        if (queue.length < goal && newPhrases.length > newToTake.length) {
          const extraNew = newPhrases.slice(newToTake.length, newToTake.length + (goal - queue.length));
          queue = [...queue, ...extraNew];
        }
      }

      // Fallback: If empty after filters, include whatever matches filter
      if (queue.length === 0 && availablePhrases.length > 0) {
        queue = availablePhrases.slice(0, goal);
      }

      // Deduplicate queue so that phrases never repeat!
      const seen = new Set();
      const uniqueQueue = [];
      for (const p of queue) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          uniqueQueue.push(p);
        }
      }

      // If still fewer than goal, fill from remaining available phrases
      if (uniqueQueue.length < goal && availablePhrases.length > uniqueQueue.length) {
        for (const p of availablePhrases) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            uniqueQueue.push(p);
            if (uniqueQueue.length >= goal) break;
          }
        }
      }

      this.sessionQueue = uniqueQueue;
      this.lastCompletedSession = [...uniqueQueue];
      this.currentSessionIndex = 0;
      this.sessionStats.completedCount = 0;
    },

    /**
     * Repeat the current/last completed session with the same phrases
     */
    repeatCurrentSession() {
      if (this.lastCompletedSession && this.lastCompletedSession.length > 0) {
        const ids = this.lastCompletedSession.map((p) => p.id);
        const refreshed = ids.map((id) => this.phrases.find((p) => p.id === id)).filter(Boolean);
        this.sessionQueue = refreshed.length > 0 ? refreshed : [...this.lastCompletedSession];
      } else if (this.sessionQueue.length > 0) {
        const ids = this.sessionQueue.map((p) => p.id);
        const refreshed = ids.map((id) => this.phrases.find((p) => p.id === id)).filter(Boolean);
        this.sessionQueue = refreshed.length > 0 ? refreshed : [...this.sessionQueue];
      }
      this.currentSessionIndex = 0;
      this.sessionStats.completedCount = 0;
    },

    setCategoryFilter(category) {
      this.selectedCategory = category;
      this.startNewSession();
    },

    setTagFilter(tag) {
      this.selectedTag = tag;
      this.startNewSession();
    },

    /**
     * Add a tag to a phrase and persist
     */
    async addTagToPhrase(phraseId, tag) {
      if (!tag || !tag.trim()) return;
      const cleanTag = tag.trim().replace(/^#/, '').toLowerCase();

      const phrase = this.phrases.find((p) => p.id === phraseId);
      if (!phrase) return;

      const currentTags = Array.isArray(phrase.tags) ? [...phrase.tags] : [];
      if (!currentTags.includes(cleanTag)) {
        currentTags.push(cleanTag);
        phrase.tags = currentTags;
        await db.phrases.update(phraseId, { tags: currentTags });
        await this.syncPhraseSrsToServer(phraseId, {
          stage_srs: phrase.stage_srs,
          review_count: phrase.review_count,
          next_review: phrase.next_review,
          is_deconstructed: phrase.is_deconstructed,
          tags: currentTags
        });

        // Update in session queue
        const qItem = this.sessionQueue.find((p) => p.id === phraseId);
        if (qItem) qItem.tags = currentTags;
      }
    },

    /**
     * Remove a tag from a phrase and persist
     */
    async removeTagFromPhrase(phraseId, tagToRemove) {
      const phrase = this.phrases.find((p) => p.id === phraseId);
      if (!phrase || !Array.isArray(phrase.tags)) return;

      const updatedTags = phrase.tags.filter((t) => t !== tagToRemove);
      phrase.tags = updatedTags;
      await db.phrases.update(phraseId, { tags: updatedTags });
      await this.syncPhraseSrsToServer(phraseId, {
        stage_srs: phrase.stage_srs,
        review_count: phrase.review_count,
        next_review: phrase.next_review,
        is_deconstructed: phrase.is_deconstructed,
        tags: updatedTags
      });

      const qItem = this.sessionQueue.find((p) => p.id === phraseId);
      if (qItem) qItem.tags = updatedTags;
    },

    /**
     * Set multiple tags on a phrase
     */
    async setPhraseTags(phraseId, newTags) {
      const phrase = this.phrases.find((p) => p.id === phraseId);
      if (!phrase) return;

      const cleanTags = Array.from(new Set(newTags.map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean)));
      phrase.tags = cleanTags;
      await db.phrases.update(phraseId, { tags: cleanTags });
      await this.syncPhraseSrsToServer(phraseId, {
        stage_srs: phrase.stage_srs,
        review_count: phrase.review_count,
        next_review: phrase.next_review,
        is_deconstructed: phrase.is_deconstructed,
        tags: cleanTags
      });

      const qItem = this.sessionQueue.find((p) => p.id === phraseId);
      if (qItem) qItem.tags = cleanTags;
    },

    /**
     * Skip current phrase: moves it to the end of the active queue without penalizing SRS
     */
    skipCurrentPhrase() {
      if (this.sessionQueue.length <= 1) return;
      const current = this.sessionQueue[this.currentSessionIndex];
      if (!current) return;

      this.sessionQueue.splice(this.currentSessionIndex, 1);
      this.sessionQueue.push(current);
    },

    /**
     * After practice check/learn: mark for recall and put at end of queue.
     * Recall must not open immediately — only when the card comes up again.
     */
    queueForRecall() {
      const idx = this.currentSessionIndex;
      const current = this.sessionQueue[idx];
      if (!current) return;

      const item = { ...current, awaitingRecall: true };
      this.sessionQueue.splice(idx, 1);
      this.sessionQueue.push(item);
      // Index stays: next phrase (if any) is now at idx.
      // If this was the only card, it remains at idx with awaitingRecall.
    },

    isCurrentAwaitingRecall() {
      const item = this.sessionQueue[this.currentSessionIndex];
      return !!item?.awaitingRecall;
    },

    /**
     * Handle Successful Verification:
     * - Increments review_count
     * - Advance SRS stage
     * - Set next_review according to interval
     * - TRIGGER ON DAY 5: When phrase completes Stage 2, deconstruct into dictionary_words
     */
    async handleSuccess(phrase) {
      if (!phrase) return { deconstructed: false, newWordsCount: 0 };

      const now = Date.now();
      const previousStage = Number(phrase.stage_srs) || 0;
      const previousReviewCount = Number(phrase.review_count) || 0;
      let nextStage = Math.min(5, previousStage + 1);
      let nextReviewCount = previousReviewCount + 1;
      let intervalMs = SRS_INTERVALS_MS[nextStage] || 30 * 24 * 60 * 60 * 1000;
      let nextReviewTimestamp = now + intervalMs;

      let isTrigger5thDay = false;
      let newWordsAddedCount = 0;

      if (previousStage >= 2 && !phrase.is_deconstructed) {
        isTrigger5thDay = true;
      }

      const updatedData = {
        stage_srs: nextStage,
        review_count: nextReviewCount,
        next_review: nextReviewTimestamp
      };

      if (isTrigger5thDay) {
        updatedData.is_deconstructed = 1;
        newWordsAddedCount = await this.deconstructPhraseWords(phrase);
        this.sessionStats.deconstructedToday += 1;
      }

      // Update in Dexie
      await db.phrases.update(phrase.id, updatedData);

      // Update in local store
      const localPhrase = this.phrases.find((p) => p.id === phrase.id);
      if (localPhrase) {
        Object.assign(localPhrase, updatedData);
      }

      // Persist SRS + history to SQLite
      await this.syncPhraseSrsToServer(phrase.id, {
        ...updatedData,
        tags: localPhrase?.tags || phrase.tags
      }, {
        result: 'success',
        stageBefore: previousStage,
        stageAfter: nextStage,
        reviewCount: nextReviewCount
      });

      // Update queue item
      if (this.sessionQueue[this.currentSessionIndex]) {
        Object.assign(this.sessionQueue[this.currentSessionIndex], updatedData, {
          awaitingRecall: false
        });
      }

      // Stats
      this.sessionStats.completedCount += 1;
      if (previousStage === 0) {
        this.sessionStats.newLearned += 1;
      } else {
        this.sessionStats.reviewsDone += 1;
      }

      // Award XP to weekly leaderboard
      try {
        const { useAuthStore } = await import('./authStore.js');
        const auth = useAuthStore();
        if (auth.currentUser) {
          const currentScore = (auth.currentUser.weeklyScore || 0) + 10;
          await auth.updateProfile({ weeklyScore: currentScore });
          const { useCommunityStore } = await import('./communityStore.js');
          const community = useCommunityStore();
          community.addScoreToUser(auth.currentUser.id, 10);
        }
      } catch (scoreErr) {
        console.warn('Score award warning:', scoreErr);
      }

      // Advance queue pointer — phrase leaves the active session path
      this.currentSessionIndex += 1;

      return {
        deconstructed: isTrigger5thDay,
        newWordsCount: newWordsAddedCount,
        nextStage,
        reviewCount: nextReviewCount,
        nextReviewDate: new Date(nextReviewTimestamp)
      };
    },

    /**
     * Repeat phrase later in the current session (practice again, clear recall flag)
     */
    repeatInSession() {
      if (this.sessionQueue.length <= 1) {
        const only = this.sessionQueue[this.currentSessionIndex];
        if (only) only.awaitingRecall = false;
        return;
      }
      const current = this.sessionQueue[this.currentSessionIndex];
      if (!current) return;

      const item = { ...current, awaitingRecall: false };
      this.sessionQueue.splice(this.currentSessionIndex, 1);
      this.sessionQueue.push(item);
    },

    /**
     * Automatically break down phrase into dictionary_words
     */
    async deconstructPhraseWords(phrase) {
      if (!phrase.words_breakdown || phrase.words_breakdown.length === 0) {
        return 0;
      }

      let addedCount = 0;
      const existingWords = await db.dictionary_words.toArray();

      for (const word of phrase.words_breakdown) {
        const thai = String(word.thai_hidden || word.thai || '').trim();
        const gloss = String(word.translation_ru || '').toLowerCase();
        if (!thai) continue;
        if (thai === 'ครับ' || thai === 'ค่ะ' || thai === 'คะ') continue;
        if (/ครับ\s*\/\s*ค่ะ/.test(thai)) continue;
        if (gloss.includes('вежливая частица')) continue;

        const alreadyExists = existingWords.some(
          (w) => w.thai_hidden === word.thai_hidden || w.transcription_ru.toLowerCase() === word.transcription_ru.toLowerCase()
        );

        if (!alreadyExists) {
          await db.dictionary_words.add({
            thai_hidden: word.thai_hidden,
            transcription_ru: word.transcription_ru,
            translation_ru: word.translation_ru,
            source_phrase_id: phrase.id
          });
          addedCount += 1;
        }
      }

      await this.loadDictionary();
      return addedCount;
    },

    /**
     * Handle Failure (wrong answer or marked as forgot)
     */
    async handleFailure(phrase) {
      if (!phrase) return;

      const resetTimestamp = Date.now() + 15 * 60 * 1000;
      const updatedData = {
        stage_srs: 1,
        next_review: resetTimestamp
      };

      await db.phrases.update(phrase.id, updatedData);

      const localPhrase = this.phrases.find((p) => p.id === phrase.id);
      if (localPhrase) {
        Object.assign(localPhrase, updatedData);
      }

      await this.syncPhraseSrsToServer(phrase.id, {
        ...updatedData,
        review_count: localPhrase?.review_count ?? phrase.review_count ?? 0,
        is_deconstructed: localPhrase?.is_deconstructed ?? phrase.is_deconstructed ?? 0,
        tags: localPhrase?.tags || phrase.tags
      }, {
        result: 'failure',
        stageBefore: Number(phrase.stage_srs) || 0,
        stageAfter: 1,
        reviewCount: localPhrase?.review_count ?? phrase.review_count ?? 0
      });

      this.skipCurrentPhrase();
    },

    /**
     * Fast-forward SRS stage (useful for testing)
     */
    async setPhraseStageForTesting(phraseId, targetStage) {
      const now = Date.now();
      const update = {
        stage_srs: targetStage,
        review_count: targetStage,
        next_review: now - 1000
      };
      await db.phrases.update(phraseId, update);
      const phrase = this.phrases.find((p) => p.id === phraseId);
      if (phrase) Object.assign(phrase, update);
      await this.syncPhraseSrsToServer(phraseId, {
        ...update,
        is_deconstructed: phrase?.is_deconstructed || 0,
        tags: phrase?.tags
      });
      await this.loadAllPhrases();
      this.startNewSession();
    },

    /**
     * Notifications & Reminder Scheduling
     */
    async requestNotificationPermission() {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
      }
      const perm = await Notification.requestPermission();
      const granted = perm === 'granted';
      await this.updateSetting('notificationsEnabled', granted);
      if (granted) {
        this.showInstantNotification('Напоминания включены!', 'Тренажер напомнит вам повторить тайские фразы по расписанию.');
      }
      return granted;
    },

    showInstantNotification(title, body) {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'thai-spoken-reminder'
        });
      }
    },

    setupReminderSchedule() {
      if (this.reminderTimerId) {
        clearTimeout(this.reminderTimerId);
        this.reminderTimerId = null;
      }

      if (!this.settings.notificationsEnabled) return;

      const now = new Date();
      const target = new Date();
      target.setHours(Number(this.settings.reminderHour) || 10);
      target.setMinutes(Number(this.settings.reminderMinute) || 0);
      target.setSeconds(0);
      target.setMilliseconds(0);

      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }

      const delayMs = target.getTime() - now.getTime();

      this.reminderTimerId = setTimeout(() => {
        this.showInstantNotification(
          'Время разговорной практики!',
          'Пора повторить разговорные тайские фразы для закрепления в долговременной памяти (SRS).'
        );
        this.setupReminderSchedule();
      }, delayMs);
    },

    /**
     * Reset database to initial seed for fresh start
     */
    async resetAllData() {
      await db.phrases.clear();
      await db.dictionary_words.clear();
      await initDatabase();
      await this.loadAllPhrases();
      await this.loadDictionary();
      this.startNewSession();
    }
  }
});
