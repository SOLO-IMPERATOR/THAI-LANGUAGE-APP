import { defineStore } from 'pinia';
import { db } from './db.js';
import { usePwaStore } from './pwaStore.ts';
import { useCommunityStore } from './communityStore.js';
import { useLearningStore } from './useLearningStore.js';

const STORAGE_KEY = 'thai_frazovik_current_user';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null,
    isAuthModalOpen: false,
    isProfileModalOpen: false,
    authMode: 'register', // 'register' | 'login'
    allUsers: []
  }),

  getters: {
    isAuthenticated: (state) => !!state.currentUser && !state.currentUser.isGuest,
    userFullName: (state) => {
      if (!state.currentUser) return '';
      const name = `${state.currentUser.firstName || ''} ${state.currentUser.lastName || ''}`.trim();
      return name || state.currentUser.email || 'Пользователь';
    },
    userInitials: (state) => {
      if (!state.currentUser) return 'U';
      const f = (state.currentUser.firstName || '').charAt(0).toUpperCase();
      const l = (state.currentUser.lastName || '').charAt(0).toUpperCase();
      return (f + l) || state.currentUser.email?.charAt(0).toUpperCase() || 'U';
    },
    userAvatar: (state) => {
      const url = state.currentUser?.avatarUrl || state.currentUser?.avatar || null;
      // Emoji placeholders are not real photos — UI shows gradient instead
      if (!url) return null;
      if (typeof url === 'string' && url.startsWith('data:image/')) return url;
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url;
      if (typeof url === 'string' && url.startsWith('blob:')) return url;
      return null;
    },
    userGender: (state) => {
      return state.currentUser?.gender || 'male';
    }
  },

  actions: {
    /**
     * Load current session from localStorage and Dexie
     */
    async initAuth() {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed.isGuest || parsed.email === 'guest@local' || parsed.authProvider === 'guest')) {
            localStorage.removeItem(STORAGE_KEY);
            this.currentUser = null;
          } else if (parsed && parsed.email) {
            this.currentUser = parsed;
            // Sync user gender into learning store
            try {
              const learning = useLearningStore();
              if (parsed.gender) {
                learning.setUserGender(parsed.gender);
              }
            } catch (err) {}
          }
        }

        if (db.users) {
          this.allUsers = await db.users.toArray();
        }
      } catch (e) {
        console.warn('Auth init warning:', e);
      }
    },

    /**
     * Register via Email & Password with Gender, Phrase Count, Privacy Mode, and Personal Data Consent
     */
    async registerWithEmail({
      firstName,
      lastName,
      email,
      password,
      gender = 'female', // 'male' | 'female'
      dailyGoal = 10,
      cityInThailand = '',
      stayDuration = '',
      avatarUrl = '',
      isPrivate = false,
      agreePersonalData = false
    }) {
      if (!agreePersonalData) {
        throw new Error('Для регистрации необходимо дать согласие на обработку персональных данных.');
      }

      if (!firstName || !lastName || !email || !password) {
        throw new Error('Пожалуйста, заполните обязательные поля: Имя, Фамилия, Email и Пароль.');
      }

      if (!gender || (gender !== 'male' && gender !== 'female')) {
        throw new Error('Пожалуйста, выберите пол (Мужской или Женский) для правильного подбора вежливых частиц кха/кхрап.');
      }

      if (password.length < 6) {
        throw new Error('Пароль должен содержать не менее 6 символов.');
      }

      const cleanEmail = email.trim().toLowerCase();
      
      // Check local dexie
      const existing = await db.users.where('email').equals(cleanEmail).first();
      if (existing) {
        throw new Error('Пользователь с таким Email уже существует. Пожалуйста, войдите в систему.');
      }

      const parsedGoal = Number(dailyGoal) > 0 ? Number(dailyGoal) : 10;
      const defaultAvatar = gender === 'female' ? '👩' : '👨';

      const newUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        password: password,
        gender: gender,
        dailyGoal: parsedGoal,
        authProvider: 'email',
        cityInThailand: (cityInThailand || '').trim() || 'Бангкок',
        stayDuration: (stayDuration || '').trim() || 'Турист / Отпуск',
        avatarUrl: avatarUrl || defaultAvatar,
        isPrivate: !!isPrivate,
        weeklyScore: 0,
        xp: 10,
        level: 1,
        streak: 1,
        createdAt: Date.now()
      };

      // 1. Save to local Dexie
      try {
        const id = await db.users.add(newUser);
        newUser.localId = id;
      } catch (dbErr) {
        console.warn('Dexie save error:', dbErr);
      }

      // 2. Sync to Server so other devices & leaderboard immediately see the user!
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newUser.id,
            email: newUser.email,
            username: `${newUser.firstName} ${newUser.lastName}`.trim(),
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            gender: newUser.gender,
            avatar: newUser.avatarUrl,
            cityInThailand: newUser.cityInThailand,
            stayDuration: newUser.stayDuration,
            dailyGoal: newUser.dailyGoal,
            xp: newUser.xp,
            level: newUser.level,
            streak: newUser.streak,
            isPrivate: newUser.isPrivate,
            registeredAt: new Date().toISOString()
          })
        });
        if (!res.ok) {
          console.warn('Server registration returned status:', res.status);
        }
      } catch (netErr) {
        console.warn('Network registration sync error:', netErr);
      }

      // 3. Update active session and learning gender
      this.setCurrentUser(newUser);

      try {
        const learningStore = useLearningStore();
        learningStore.setUserGender(gender);
        await learningStore.applyServerSrsProgress(newUser.id);
      } catch (e) {}

      // 4. Update communityStore immediately
      try {
        const communityStore = useCommunityStore();
        communityStore.addUserLocally({
          id: newUser.id,
          username: `${newUser.firstName} ${newUser.lastName}`.trim(),
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          gender: newUser.gender,
          avatar: newUser.avatarUrl,
          city: newUser.cityInThailand,
          stayDuration: newUser.stayDuration,
          level: newUser.level,
          xp: newUser.xp,
          streak: newUser.streak,
          registeredAt: new Date().toISOString(),
          isCurrentUser: true,
          isFriend: false
        });
      } catch (commErr) {
        console.warn('Community store sync error:', commErr);
      }

      // 5. Trigger native browser PWA install prompt automatically!
      try {
        const pwaStore = usePwaStore();
        pwaStore.triggerNativePromptImmediately('registration');
      } catch (pwaErr) {
        console.warn('PWA native trigger warning:', pwaErr);
      }

      return newUser;
    },

    /**
     * Login via Email & Password
     */
    async loginWithEmail(email, password) {
      if (!email || !password) {
        throw new Error('Введите Email и Пароль.');
      }

      const cleanEmail = email.trim().toLowerCase();
      let user = await db.users.where('email').equals(cleanEmail).first();

      // If not in local Dexie, try server /api/users
      if (!user) {
        try {
          const res = await fetch('/api/users');
          if (res.ok) {
            const serverUsers = await res.json();
            const found = serverUsers.find((u) => u.email?.toLowerCase() === cleanEmail);
            if (found) {
              user = found;
              await db.users.add(user).catch(() => {});
            }
          }
        } catch (e) {}
      }

      if (!user) {
        throw new Error('Пользователь с таким Email не найден. Проверьте правильность ввода или зарегистрируйтесь.');
      }

      if (user.password && user.password !== password) {
        throw new Error('Неверный пароль. Пожалуйста, проверьте ввод.');
      }

      this.setCurrentUser(user);

      if (user.gender) {
        try {
          const learningStore = useLearningStore();
          learningStore.setUserGender(user.gender);
          await learningStore.applyServerSrsProgress(user.id);
        } catch (e) {}
      } else {
        try {
          const learningStore = useLearningStore();
          await learningStore.applyServerSrsProgress(user.id);
        } catch (e) {}
      }

      return user;
    },

    /**
     * Update user profile fields (personal data, privacy, city, stay, dailyGoal, gender, etc.)
     */
    async updateProfile(updates) {
      if (!this.currentUser) return;
      
      const updatedUser = {
        ...this.currentUser,
        ...updates
      };

      if (this.currentUser.id && db.users) {
        try {
          await db.users.update(this.currentUser.id, updates);
        } catch (dbErr) {
          console.warn('Could not update profile in Dexie:', dbErr);
        }
      }

      // Sync to server
      try {
        fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: updatedUser.id,
            email: updatedUser.email,
            gender: updatedUser.gender,
            avatar: updatedUser.avatarUrl,
            username: `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim(),
            cityInThailand: updatedUser.cityInThailand,
            dailyGoal: updatedUser.dailyGoal
          })
        }).catch(() => {});
      } catch (e) {}

      if (updates.gender) {
        try {
          const learningStore = useLearningStore();
          learningStore.setUserGender(updates.gender);
        } catch (e) {}
      }

      this.setCurrentUser(updatedUser);
      return updatedUser;
    },

    /**
     * Upload / Update Profile Avatar photo (Base64 data URL)
     */
    async updateProfilePhoto(avatarDataUrl) {
      return await this.updateProfile({ avatarUrl: avatarDataUrl });
    },

    /**
     * Remove custom profile photo
     */
    async removeProfilePhoto() {
      const defaultAvatar = this.currentUser?.gender === 'female' ? '👩' : '👨';
      return await this.updateProfile({ avatarUrl: defaultAvatar });
    },

    setCurrentUser(user) {
      this.currentUser = user;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn('Could not save user to storage:', e);
      }
      this.isAuthModalOpen = false;
    },

    logout() {
      this.currentUser = null;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('Storage cleanup warning:', e);
      }
      try {
        const learningStore = useLearningStore();
        learningStore.resetLocalSrsToCanonical();
      } catch (e) {}
      this.isProfileModalOpen = false;
      this.authMode = 'login';
      this.isAuthModalOpen = true;
    },

    openAuth(mode = 'register') {
      this.authMode = mode;
      this.isAuthModalOpen = true;
    },

    closeAuth() {
      if (this.isAuthenticated) {
        this.isAuthModalOpen = false;
      }
    },

    openProfile() {
      this.isProfileModalOpen = true;
    },

    closeProfile() {
      this.isProfileModalOpen = false;
    }
  }
});
