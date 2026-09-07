import { defineStore } from 'pinia';

export const usePwaStore = defineStore('pwa', {
  state: () => ({
    deferredPrompt: null as any,
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    isAndroid: false,
    showInstallModal: false,
    isBannerDismissed: false,
    pendingNativePrompt: false,
    installTriggerSource: 'header', // 'registration' | 'header' | 'banner'
    initialized: false
  }),

  actions: {
    initPwa() {
      if (typeof window === 'undefined' || this.initialized) return;
      this.initialized = true;

      // Detect standalone display mode (already installed as PWA)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      this.isInstalled = isStandalone;

      const ua = window.navigator.userAgent.toLowerCase();
      this.isIOS = /iphone|ipad|ipod/.test(ua);
      this.isAndroid = /android/.test(ua);

      // Listen for Chromium / Android native install prompt
      window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        this.deferredPrompt = e;
        this.isInstallable = true;

        // If a registration or auto-trigger was waiting for the native prompt, trigger it immediately!
        if (this.pendingNativePrompt) {
          this.pendingNativePrompt = false;
          setTimeout(() => {
            this.triggerInstallPrompt();
          }, 300);
        }
      });

      // Listen for successful installation
      window.addEventListener('appinstalled', () => {
        this.isInstalled = true;
        this.isInstallable = false;
        this.deferredPrompt = null;
        this.showInstallModal = false;
        this.pendingNativePrompt = false;
        console.log('PWA successfully installed to home screen!');
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

    /**
     * Trigger native browser install prompt automatically.
     * If deferredPrompt is ready, calls prompt() directly.
     * If not yet fired, queues it for instant trigger.
     */
    async triggerNativePromptImmediately(source = 'registration') {
      if (this.isInstalled) return;

      this.installTriggerSource = source;

      if (this.deferredPrompt) {
        return await this.triggerInstallPrompt();
      }

      // If on Android / Chromium but event hasn't fired yet, mark pending
      if (!this.isIOS) {
        this.pendingNativePrompt = true;
        // Also set a 1.5s fallback to show the guided modal if native event does not fire
        setTimeout(() => {
          if (this.pendingNativePrompt && !this.isInstalled) {
            this.pendingNativePrompt = false;
            this.openInstallModal(source);
          }
        }, 1500);
      } else {
        // iOS requires manual Add to Home Screen via Safari Share sheet
        this.openInstallModal(source);
      }
    },

    async triggerInstallPrompt() {
      if (!this.deferredPrompt) {
        // Fallback to guided modal
        this.openInstallModal(this.installTriggerSource);
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
        console.warn('PWA native install error:', err);
        this.openInstallModal(this.installTriggerSource);
      }
      return false;
    }
  }
});
