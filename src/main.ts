import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import './index.css';

// PWA Service Worker Registration (active in production)
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log('[PWA] New content available');
        // Prevent infinite reload loops with a debounce check
        const lastReload = sessionStorage.getItem('pwa_last_reload');
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 30000) {
          sessionStorage.setItem('pwa_last_reload', String(now));
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('[PWA] App is ready for offline usage.');
      }
    });
  } catch (swErr) {
    console.warn('[PWA] Service worker registration error:', swErr);
  }
}

const app = createApp(App);
const pinia = createPinia();

// Global Vue error boundary handler to prevent white screens
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Global Error Handler]:', err, info);
};

// Global unhandled promise rejection handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Unhandled Rejection caught]:', event.reason);
  });
}

app.use(pinia);
app.mount('#app');
