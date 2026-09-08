import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import './index.css';

// PWA: check for new builds and activate them promptly after deploy
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] New content available — activating update');
        updateSW(true);
      },
      onOfflineReady() {
        console.log('[PWA] App is ready for offline usage.');
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        const check = () => {
          try {
            registration.update();
          } catch (e) {
            console.warn('[PWA] update check failed', e);
          }
        };

        // Periodic + on focus so installed PWAs pick up deploys
        setInterval(check, 5 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        window.addEventListener('focus', check);
        // One early check after boot
        setTimeout(check, 15_000);
      },
    });
  } catch (swErr) {
    console.warn('[PWA] Service worker registration error:', swErr);
  }
}

const app = createApp(App);
const pinia = createPinia();

app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Global Error Handler]:', err, info);
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Unhandled Rejection caught]:', event.reason);
  });
}

app.use(pinia);
app.mount('#app');
