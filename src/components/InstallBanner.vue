<template>
  <div v-if="!pwaStore.isInstalled && !pwaStore.isBannerDismissed">
    <!-- Motivational PWA Bar -->
    <div
      class="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs shadow-sm transition-all"
    >
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        <div class="flex items-center gap-2.5 text-center sm:text-left">
          <div class="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center flex-shrink-0 shadow-xs text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
            </svg>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-center sm:justify-start">
            <span class="font-extrabold tracking-tight">Добавьте приложение на главный экран:</span>
            <span class="text-emerald-100 font-medium">быстрый запуск в 1 клик и 100% офлайн-режим без интернета!</span>
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
            title="Скрыть напоминание"
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
</template>

<script setup>
import { usePwaStore } from '../pwaStore.js';

const pwaStore = usePwaStore();

function handleInstallClick() {
  pwaStore.openInstallModal('banner');
}
</script>
