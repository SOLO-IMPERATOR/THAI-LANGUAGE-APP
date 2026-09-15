import { defineStore } from 'pinia';
import { db, initDatabase, INITIAL_PHRASES } from './db.js';
import { getGenderedPhrase } from './phrasesData.js';
import { clampDailyGoal, DAILY_GOAL_DEFAULT } from './dailyGoal.js';

const ACTIVE_SESSION_KEY = 'activeSession';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
      dailyGoal: DAILY_GOAL_DEFAULT,
      trainingMode: 'mix', // 'new' | 'review' | 'mix'
      reminderHour: 10,
      reminderMinute: 0,
      notificationsEnabled: false,
      playbackRate: typeof localStorage !== 'undefined' ? (parseFloat(localStorage.getItem('thai_frazovik_speed')) || 0.7) : 0.7
    },
    // Active training session queue
    sessionQueue: [],
    currentSessionIndex: 0,
    sessionDate: '',
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
    reminderTimerId: null,
    /** Skip wiping an in-progress restored session when applying server SRS. */
    _sessionRestored: false
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

    /** Daily study goal (new phrases); reviews are separate and do not fill this. */
    studyGoalCount: (state) => clampDailyGoal(state.settings.dailyGoal),

    studyCompletedCount: (state) => Number(state.sessionStats?.newLearned) || 0,

    sessionReviewCount: (state) => state.sessionQueue.filter((p) => p.isReview).length,

    isCurrentReview: (state) => {
      const item = state.sessionQueue[state.currentSessionIndex];
      return !!item?.isReview;
    },

    newPhrasesCount: (state) => state.phrases.filter((p) => p.stage_srs === 0).length,

    dueReviewsCount: (state) => {
      const now = Date.now();
      return state.phrases.filter((p) => p.stage_srs > 0 && p.next_review <= now).length;
    },

    allReviewedCount: (state) => state.phrases.filter((p) => (p.review_count || 0) > 0 || p.stage_srs > 0).length,

    masteredCount: (state) => state.phrases.filter((p) => (Number(p.stage_srs) || 0) >= 3).length,

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

      // SRS must be applied BEFORE building the session, otherwise mix mode
      // treats already-learned phrases as "new" and skips due reviews (3 instead of 3+3).
      try {
        const userId = this.getActiveUserId();
        if (userId) {
          await this.applyServerSrsProgress(userId);
        }
      } catch (err) {
        console.warn('applyServerSrsProgress error:', err);
      }

      try {
        const restored = await this.tryRestoreSession();
        // Fresh queue when nothing meaningful was done yet — pick up latest due reviews.
        if (!restored || this.isSessionNoProgress()) {
          this.startNewSession();
        }
      } catch (err) {
        console.warn('session restore/start error:', err);
        try {
          this.startNewSession();
        } catch (_) {}
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

        // Only refresh phrase fields on an in-progress queue; session build
        // happens in initialize() / login after this returns.
        if (this.sessionQueue?.length) {
          this.refreshSessionQueueFromPhrases();
          await this.persistActiveSession();
        }
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
          if (savedDailyGoal) this.settings.dailyGoal = clampDailyGoal(savedDailyGoal.value);

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
      const next = key === 'dailyGoal' ? clampDailyGoal(value) : value;
      this.settings[key] = next;
      try {
        if (db && db.settings) {
          await db.settings.put({ key, value: next });
        }
      } catch (err) {
        console.warn('Dexie settings write error:', err);
      }

      if (key === 'reminderHour' || key === 'reminderMinute' || key === 'notificationsEnabled') {
        this.setupReminderSchedule();
      }

      // Changing daily goal / mode must rebuild a fresh (not started) session —
      // including after restore of an older queue with a different size.
      if (key === 'trainingMode' || key === 'dailyGoal') {
        if (this.canSafelyRebuildSession()) {
          this.startNewSession();
        } else if (key === 'dailyGoal') {
          // Mid-session: resize remaining queue toward the new goal
          this.resizeSessionToGoal(next);
        }
      }

      if (key === 'dailyGoal') {
        this.syncDailyGoalToProfile(next);
      }
    },

    /** True when the user has not yet progressed in today's session. */
    isSessionNoProgress() {
      return (
        (Number(this.currentSessionIndex) || 0) === 0 &&
        (Number(this.sessionStats?.completedCount) || 0) === 0 &&
        (Number(this.sessionStats?.newLearned) || 0) === 0 &&
        (Number(this.sessionStats?.reviewsDone) || 0) === 0 &&
        !this.sessionQueue.some((p) => p.demotedThisSession) &&
        !this.sessionQueue.some((p) => p.awaitingRecall && !p.isReview)
      );
    },

    canSafelyRebuildSession() {
      return this.isSessionNoProgress();
    },

    /**
     * Trim or top-up today's queue when user changes dailyGoal mid-session.
     * Study cards and review cards are capped separately by the daily goal.
     */
    resizeSessionToGoal(goal) {
      const target = clampDailyGoal(goal);
      const idx = this.currentSessionIndex;
      const kept = [];
      let studyKept = 0;
      let reviewKept = 0;

      for (let i = 0; i < this.sessionQueue.length; i += 1) {
        const item = this.sessionQueue[i];
        const pastOrCurrent = i <= idx;
        if (item.isReview) {
          if (pastOrCurrent || reviewKept < target) {
            kept.push(item);
            reviewKept += 1;
          }
        } else if (pastOrCurrent || studyKept < target) {
          kept.push(item);
          studyKept += 1;
        }
      }

      // Top up study cards if under goal
      if (studyKept < target) {
        const seen = new Set(kept.map((p) => p.id));
        for (const p of this.phrases) {
          if (studyKept >= target) break;
          if (seen.has(p.id)) continue;
          if ((Number(p.stage_srs) || 0) > 0) continue;
          kept.push({
            ...p,
            awaitingRecall: false,
            isReview: false,
            demotedThisSession: false
          });
          seen.add(p.id);
          studyKept += 1;
        }
      }

      this.sessionQueue = kept.length ? kept : this.sessionQueue;
      if (this.currentSessionIndex >= this.sessionQueue.length) {
        this.currentSessionIndex = Math.max(0, this.sessionQueue.length - 1);
      }
      this.persistActiveSession();
    },

    async syncDailyGoalToProfile(goal) {
      try {
        const { useAuthStore } = await import('./authStore.js');
        const auth = useAuthStore();
        if (auth.currentUser && !auth.currentUser.isGuest) {
          const g = clampDailyGoal(goal);
          if (Number(auth.currentUser.dailyGoal) !== g) {
            await auth.updateProfile({ dailyGoal: g });
          }
        }
      } catch (err) {
        console.warn('syncDailyGoalToProfile:', err);
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
      const goal = clampDailyGoal(this.settings.dailyGoal);

      let availablePhrases = [...this.phrases];

      if (this.selectedCategory !== 'all') {
        availablePhrases = availablePhrases.filter((p) => p.category === this.selectedCategory);
      }

      if (this.selectedTag !== 'all') {
        availablePhrases = availablePhrases.filter((p) => Array.isArray(p.tags) && p.tags.includes(this.selectedTag));
      }

      const dueReviews = availablePhrases.filter((p) => p.stage_srs > 0 && p.next_review <= now);
      const newPhrases = availablePhrases.filter((p) => p.stage_srs === 0);
      const futureReviews = availablePhrases.filter((p) => p.stage_srs > 0 && p.next_review > now);

      let studyQueue = [];
      let reviewQueue = [];

      if (this.settings.trainingMode === 'new') {
        studyQueue = newPhrases.slice(0, goal);
      } else if (this.settings.trainingMode === 'review') {
        reviewQueue =
          dueReviews.length > 0 ? dueReviews.slice(0, goal) : futureReviews.slice(0, goal);
      } else {
        // mix: up to `goal` new + up to `goal` reviews (reviews do not fill the study quota)
        studyQueue = newPhrases.slice(0, goal);
        reviewQueue = dueReviews.slice(0, goal);
        if (studyQueue.length === 0 && reviewQueue.length === 0 && availablePhrases.length > 0) {
          studyQueue = availablePhrases.filter((p) => p.stage_srs === 0).slice(0, goal);
          if (studyQueue.length === 0) {
            reviewQueue = availablePhrases.filter((p) => p.stage_srs > 0).slice(0, goal);
          }
        }
      }

      const seen = new Set();
      const uniqueQueue = [];
      const pushMarked = (p, isReview) => {
        if (!p || seen.has(p.id)) return;
        seen.add(p.id);
        // Reviews open directly in recall (Проверить / Забыл only).
        uniqueQueue.push({
          ...p,
          awaitingRecall: !!isReview,
          isReview: !!isReview,
          demotedThisSession: false
        });
      };

      // Study (new) cards first, then reviews — so «Пропустить» walks the study pool
      // before landing on recall-only reviews.
      studyQueue.forEach((p) => pushMarked(p, false));
      reviewQueue.forEach((p) => pushMarked(p, true));

      this.sessionQueue = uniqueQueue;
      this.lastCompletedSession = uniqueQueue.map((p) => ({ ...p }));
      this.currentSessionIndex = 0;
      this.sessionDate = todayKey();
      this._sessionRestored = false;
      this.sessionStats = {
        completedCount: 0,
        newLearned: 0,
        reviewsDone: 0,
        deconstructedToday: 0
      };
      this.persistActiveSession();
    },

    sessionSnapshot() {
      return {
        date: this.sessionDate || todayKey(),
        goal: clampDailyGoal(this.settings.dailyGoal),
        index: this.currentSessionIndex,
        stats: { ...this.sessionStats },
        queue: this.sessionQueue.map((p) => ({
          id: p.id,
          awaitingRecall: !!p.awaitingRecall,
          isReview: !!p.isReview,
          demotedThisSession: !!p.demotedThisSession
        })),
        lastCompletedIds: (this.lastCompletedSession || []).map((p) => p.id)
      };
    },

    async persistActiveSession() {
      try {
        if (!db?.settings) return;
        await db.settings.put({ key: ACTIVE_SESSION_KEY, value: this.sessionSnapshot() });
      } catch (err) {
        console.warn('persistActiveSession error:', err);
      }
    },

    refreshSessionQueueFromPhrases() {
      if (!this.sessionQueue?.length) return;
      this.sessionQueue = this.sessionQueue
        .map((item) => {
          const fresh = this.phrases.find((p) => p.id === item.id);
          if (!fresh) return null;
          return {
            ...fresh,
            awaitingRecall: !!item.awaitingRecall,
            isReview: !!item.isReview,
            demotedThisSession: !!item.demotedThisSession
          };
        })
        .filter(Boolean);
    },

    async tryRestoreSession() {
      try {
        if (!db?.settings) return false;
        const row = await db.settings.get(ACTIVE_SESSION_KEY);
        const saved = row?.value;
        if (!saved || !Array.isArray(saved.queue) || saved.queue.length === 0) return false;
        if (saved.date !== todayKey()) return false;

        const currentGoal = clampDailyGoal(this.settings.dailyGoal);
        const savedGoal = clampDailyGoal(saved.goal ?? saved.queue.length);
        // Reviews start with awaitingRecall=true; that is not "progress".
        const noProgress =
          (Number(saved.index) || 0) === 0 &&
          (Number(saved.stats?.completedCount) || 0) === 0 &&
          (Number(saved.stats?.reviewsDone) || 0) === 0 &&
          !saved.queue.some((e) => e.demotedThisSession) &&
          !saved.queue.some((e) => e.awaitingRecall && !e.isReview);

        // Goal changed since last queue build and session not started → rebuild
        if (noProgress && savedGoal !== currentGoal) {
          return false;
        }

        const hydrated = [];
        for (const entry of saved.queue) {
          const fresh = this.phrases.find((p) => p.id === entry.id);
          if (!fresh) continue;
          const isReview =
            entry.isReview != null ? !!entry.isReview : (Number(fresh.stage_srs) || 0) > 0;
          const demotedThisSession = !!entry.demotedThisSession;
          // Active review cards always stay in recall until forgotten → normal practice.
          const awaitingRecall =
            isReview && !demotedThisSession ? true : !!entry.awaitingRecall;
          hydrated.push({
            ...fresh,
            awaitingRecall,
            isReview,
            demotedThisSession
          });
        }
        if (hydrated.length === 0) return false;

        // Soft-fix: study cards must not exceed daily goal
        let queue = hydrated;
        const studyInQueue = queue.filter((p) => !p.isReview).length;
        if (noProgress && studyInQueue > currentGoal) {
          return false;
        }
        if (!noProgress && studyInQueue > currentGoal && currentGoal >= 1) {
          // Keep progress; drop unused study cards from the tail first
          const idx = Math.min(Math.max(0, Number(saved.index) || 0), queue.length);
          const kept = [];
          let studyKept = 0;
          for (let i = 0; i < queue.length; i += 1) {
            const item = queue[i];
            if (i < idx) {
              kept.push(item);
              if (!item.isReview) studyKept += 1;
              continue;
            }
            if (!item.isReview) {
              if (studyKept >= currentGoal) continue;
              studyKept += 1;
            } else {
              const reviewCap = currentGoal;
              const reviewsKept = kept.filter((p) => p.isReview).length;
              if (reviewsKept >= reviewCap) continue;
            }
            kept.push(item);
          }
          queue = kept.length ? kept : queue.slice(0, Math.max(idx + 1, 1));
        }

        this.sessionQueue = queue;
        this.currentSessionIndex = Math.min(
          Math.max(0, Number(saved.index) || 0),
          queue.length
        );
        this.sessionStats = {
          completedCount: Number(saved.stats?.completedCount) || 0,
          newLearned: Number(saved.stats?.newLearned) || 0,
          reviewsDone: Number(saved.stats?.reviewsDone) || 0,
          deconstructedToday: Number(saved.stats?.deconstructedToday) || 0
        };
        this.sessionDate = saved.date;
        const lastIds = Array.isArray(saved.lastCompletedIds) ? saved.lastCompletedIds : queue.map((p) => p.id);
        this.lastCompletedSession = lastIds
          .map((id) => this.phrases.find((p) => p.id === id))
          .filter(Boolean);
        this._sessionRestored = true;
        await this.persistActiveSession();
        return true;
      } catch (err) {
        console.warn('tryRestoreSession error:', err);
        return false;
      }
    },

    /**
     * Insert item into remaining queue (after current index).
     * @param {object} item
     * @param {{ skipImmediate?: boolean }} opts - if skipImmediate, never put as next card when possible
     */
    insertIntoRemainingQueue(item, { skipImmediate = false } = {}) {
      const idx = this.currentSessionIndex;
      if (this.sessionQueue.length === idx) {
        this.sessionQueue.push(item);
        return;
      }
      const minInsert = skipImmediate
        ? Math.min(idx + 1, this.sessionQueue.length)
        : idx;
      const maxInsert = this.sessionQueue.length;
      const span = Math.max(1, maxInsert - minInsert + 1);
      const insertAt = minInsert + Math.floor(Math.random() * span);
      this.sessionQueue.splice(insertAt, 0, item);
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
      this.sessionDate = todayKey();
      this.sessionQueue = this.sessionQueue.map((p) => ({ ...p, awaitingRecall: false }));
      this.persistActiveSession();
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
     * Skip current phrase: no SRS change. Re-queues among remaining practice cards
     * (before pending reviews) so Skip walks the whole study pool, not only reviews.
     */
    skipCurrentPhrase() {
      if (this.sessionQueue.length <= 1) {
        this.persistActiveSession();
        return;
      }
      const idx = this.currentSessionIndex;
      const current = this.sessionQueue[idx];
      if (!current) return;

      this.sessionQueue.splice(idx, 1);
      const item = {
        ...current,
        awaitingRecall: false,
        isReview: false
      };

      // Insert before the first pending review-recall card so we don't jump
      // straight into reviews while practice cards remain.
      let firstReview = -1;
      for (let i = idx; i < this.sessionQueue.length; i += 1) {
        if (this.sessionQueue[i].isReview && this.sessionQueue[i].awaitingRecall) {
          firstReview = i;
          break;
        }
      }

      let insertAt = firstReview === -1 ? this.sessionQueue.length : firstReview;
      // If the next card is already a review, put the skipped study card after all
      // reviews so index stays on that review only when no practice remains —
      // but when practice remains after idx, insertAt is already past them.
      // Avoid re-showing the same card: never insert at `idx` when other cards exist.
      if (insertAt === idx && this.sessionQueue.length > idx) {
        insertAt = this.sessionQueue.length;
      }

      this.sessionQueue.splice(insertAt, 0, item);

      // Skipped the last card: after splice idx === length; show first unfinished
      // (items before original idx are already done via success).
      if (this.currentSessionIndex >= this.sessionQueue.length) {
        this.currentSessionIndex = Math.max(0, this.sessionQueue.length - 1);
      }

      this.persistActiveSession();
    },

    /**
     * After practice: mark for recall only. Card returns solely as recall check.
     * On forget later it re-enters as a normal practice phrase.
     */
    queueForRecall() {
      const idx = this.currentSessionIndex;
      const current = this.sessionQueue[idx];
      if (!current) return;

      // Already awaiting recall — do not re-queue as practice
      if (current.awaitingRecall) return;

      const item = { ...current, awaitingRecall: true };
      this.sessionQueue.splice(idx, 1);
      this.insertIntoRemainingQueue(item, { skipImmediate: true });
      this.persistActiveSession();
    },

    isCurrentAwaitingRecall() {
      const item = this.sessionQueue[this.currentSessionIndex];
      return !!item?.awaitingRecall;
    },

    isCurrentReviewCard() {
      return !!this.sessionQueue[this.currentSessionIndex]?.isReview;
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

      // Session role (review vs new) is fixed when the queue is built — not by current SRS stage.
      const qItem = this.sessionQueue[this.currentSessionIndex];
      const wasReview = !!qItem?.isReview;
      if (qItem) {
        Object.assign(qItem, updatedData, {
          awaitingRecall: false
        });
      }

      // Stats: only new study cards fill the daily goal counter; reviews are separate.
      if (wasReview) {
        this.sessionStats.reviewsDone += 1;
      } else {
        this.sessionStats.completedCount += 1;
        this.sessionStats.newLearned += 1;
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
      this.persistActiveSession();

      return {
        deconstructed: isTrigger5thDay,
        newWordsCount: newWordsAddedCount,
        nextStage,
        reviewCount: nextReviewCount,
        nextReviewDate: new Date(nextReviewTimestamp)
      };
    },

    /**
     * Forgot during recall:
     * - Review cards: demote SRS by 1 stage once, then become a normal practice card.
     * - New study cards (post-memorize recall): no SRS change, re-queue as practice.
     * Second forget of a demoted review in this session does not demote further.
     */
    async handleForgotInSession(phrase) {
      if (!phrase) {
        this.repeatInSession();
        return;
      }

      const idx = this.currentSessionIndex;
      const current = this.sessionQueue[idx];
      if (!current || current.id !== phrase.id) {
        this.repeatInSession();
        return;
      }

      const previousStage = Number(current.stage_srs ?? phrase.stage_srs) || 0;
      const wasReview = !!current.isReview;

      if (wasReview && !current.demotedThisSession && previousStage > 0) {
        const nextStage = Math.max(1, previousStage - 1);
        const intervalMs = SRS_INTERVALS_MS[nextStage] || 3 * 24 * 60 * 60 * 1000;
        const updatedData = {
          stage_srs: nextStage,
          next_review: Date.now() + intervalMs
        };

        await db.phrases.update(phrase.id, updatedData);
        const localPhrase = this.phrases.find((p) => p.id === phrase.id);
        if (localPhrase) Object.assign(localPhrase, updatedData);

        Object.assign(current, updatedData, {
          demotedThisSession: true
        });

        await this.syncPhraseSrsToServer(phrase.id, {
          ...updatedData,
          review_count: localPhrase?.review_count ?? phrase.review_count ?? 0,
          is_deconstructed: localPhrase?.is_deconstructed ?? phrase.is_deconstructed ?? 0,
          tags: localPhrase?.tags || phrase.tags
        }, {
          result: 'failure',
          stageBefore: previousStage,
          stageAfter: nextStage,
          reviewCount: localPhrase?.review_count ?? phrase.review_count ?? 0
        });
      } else if (wasReview) {
        current.demotedThisSession = true;
      }

      // After «Забыл» the card becomes a normal practice card for this session.
      current.isReview = false;
      current.awaitingRecall = false;

      this.repeatInSession();
    },

    /**
     * Forgot / repeat: clear recall + review flags and mix back as normal practice.
     */
    repeatInSession() {
      if (this.sessionQueue.length <= 1) {
        const only = this.sessionQueue[this.currentSessionIndex];
        if (only) {
          only.awaitingRecall = false;
          only.isReview = false;
        }
        this.persistActiveSession();
        return;
      }
      const current = this.sessionQueue[this.currentSessionIndex];
      if (!current) return;

      const item = {
        ...current,
        awaitingRecall: false,
        isReview: false,
        demotedThisSession: !!current.demotedThisSession
      };
      this.sessionQueue.splice(this.currentSessionIndex, 1);
      this.insertIntoRemainingQueue(item, { skipImmediate: true });
      this.persistActiveSession();
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
      try {
        await db.settings.delete(ACTIVE_SESSION_KEY);
      } catch (_) {}
      await initDatabase();
      await this.loadAllPhrases();
      await this.loadDictionary();
      this._sessionRestored = false;
      this.startNewSession();
    }
  }
});
