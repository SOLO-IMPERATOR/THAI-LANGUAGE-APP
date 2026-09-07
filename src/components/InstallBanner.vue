<template>
  <div v-if="!pwaStore.isInstalled && !pwaStore.isBannerDismissed">
    <div
      class="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white px-3 sm:px-4 py-2.5 text-xs shadow-sm"
    >
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        <div class="flex items-center gap-2.5 text-center sm:text-left">
          <div class="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
            </svg>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-center sm:justify-start">
            <span class="font-extrabold tracking-tight">На главный экран — как Telegram:</span>
            <span class="text-emerald-100 font-medium">нажмите кнопку и подтвердите установку</span>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end flex-shrink-0">
          <button
            @click="handleInstallClick"
            class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 text-emerald-900 text-xs font-black uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span>Добавить на экран</span>
          </button>
          <button
            @click="pwaStore.dismissBanner()"
            class="p-1.5 text-white/80 hover:text-white transition rounded-lg hover:bg-white/10 cursor-pointer"
            title="Скрыть"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Sticky floating CTA (Telegram-like) when banner dismissed but not installed -->
  <button
    v-if="!pwaStore.isInstalled && pwaStore.isBannerDismissed"
    type="button"
    @click="handleInstallClick"
    class="fixed z-[60] bottom-5 right-4 sm:bottom-6 sm:right-6 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-xl shadow-emerald-900/30 flex items-center gap-2 cursor-pointer active:scale-95"
    title="Добавить на главный экран"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
    </svg>
    На экран
  </button>
</template>

<script setup>
import { usePwaStore } from '../pwaStore.js';

const pwaStore = usePwaStore();

async function handleInstallClick() {
  // Prefer native 1-tap prompt when available (Chrome/Edge/Android)
  if (pwaStore.deferredPrompt) {
    await pwaStore.triggerInstallPrompt();
    return;
  }
  await pwaStore.triggerNativePromptImmediately('banner');
}
</script>
