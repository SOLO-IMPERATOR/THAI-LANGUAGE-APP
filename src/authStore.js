import { defineStore } from 'pinia';
import { db } from './db.js';
import { usePwaStore } from './pwaStore.js';

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
      return state.currentUser?.avatarUrl || null;
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
     * Register via Email & Password with customizable Phrase Count, Privacy Mode, and Personal Data Consent
     */
    async registerWithEmail({
      firstName,
      lastName,
      email,
      password,
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

      if (password.length < 6) {
        throw new Error('Пароль должен содержать не менее 6 символов.');
      }

      const cleanEmail = email.trim().toLowerCase();
      // Check if user already exists
      const existing = await db.users.where('email').equals(cleanEmail).first();
      if (existing) {
        throw new Error('Пользователь с таким Email уже существует. Пожалуйста, войдите в систему.');
      }

      const parsedGoal = Number(dailyGoal) > 0 ? Number(dailyGoal) : 10;

      const newUser = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        password: password,
        dailyGoal: parsedGoal,
        authProvider: 'email',
        cityInThailand: (cityInThailand || '').trim(),
        stayDuration: (stayDuration || '').trim(),
        avatarUrl: avatarUrl || '',
        isPrivate: !!isPrivate,
        weeklyScore: 0,
        createdAt: Date.now()
      };

      const id = await db.users.add(newUser);
      newUser.id = id;

      this.setCurrentUser(newUser);

      // Offer PWA installation immediately after registration as requested in Requirement 8
      try {
        const pwaStore = usePwaStore();
        setTimeout(() => {
          pwaStore.openInstallModal('registration');
        }, 500);
      } catch (pwaErr) {
        console.warn('PWA trigger after registration warning:', pwaErr);
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
      const user = await db.users.where('email').equals(cleanEmail).first();

      if (!user) {
        throw new Error('Пользователь с таким Email не найден. Проверьте правильность ввода или зарегистрируйтесь.');
      }

      if (user.password && user.password !== password) {
        throw new Error('Неверный пароль. Пожалуйста, проверьте ввод.');
      }

      this.setCurrentUser(user);
      return user;
    },

    /**
     * Update user profile fields (personal data, privacy, city, stay, dailyGoal, etc.)
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
      return await this.updateProfile({ avatarUrl: '' });
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

