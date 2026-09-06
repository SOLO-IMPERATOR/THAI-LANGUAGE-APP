import { defineStore } from 'pinia';

export const usePwaStore = defineStore('pwa', {
  state: () => ({
    deferredPrompt: null,
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    isAndroid: false,
    showInstallModal: false,
    isBannerDismissed: false,
    installTriggerSource: 'header', // 'registration' | 'header' | 'banner'
    initialized: false
  }),

  actions: {
    initPwa() {
      if (typeof window === 'undefined' || this.initialized) return;
      this.initialized = true;

      // Detect standalone display mode
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      this.isInstalled = isStandalone;

      const ua = window.navigator.userAgent.toLowerCase();
      this.isIOS = /iphone|ipad|ipod/.test(ua);
      this.isAndroid = /android/.test(ua);

      // Listen for Chromium / Android install prompt
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        this.isInstallable = true;
      });

      // Listen for successful installation
      window.addEventListener('appinstalled', () => {
        this.isInstalled = true;
        this.isInstallable = false;
        this.deferredPrompt = null;
        this.showInstallModal = false;
      });
    },

    openInstallModal(source = 'header') {
      this.installTriggerSource = source;
      this.showInstallModal = true;
    },

    closeInstallModal() {
      this.showInstallModal = false;
    },

    dismissBanner() {
      this.isBannerDismissed = true;
    },

    async triggerInstallPrompt() {
      if (!this.deferredPrompt) {
        return false;
      }
      try {
        await this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          this.isInstalled = true;
          this.isInstallable = false;
          this.deferredPrompt = null;
          this.showInstallModal = false;
          return true;
        }
      } catch (err) {
        console.warn('PWA install error:', err);
      }
      return false;
    }
  }
});
