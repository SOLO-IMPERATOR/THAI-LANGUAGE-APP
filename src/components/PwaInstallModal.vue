<template>
  <div
    v-if="pwaStore.showInstallModal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in overflow-y-auto"
  >
    <div class="w-full max-w-md bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-800 relative my-6 max-h-[92vh] overflow-y-auto">
      <!-- Close Button -->
      <button
        @click="pwaStore.closeInstallModal()"
        class="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
        type="button"
        title="Закрыть"
      >
        ✕
      </button>

      <!-- App Icon & Header -->
      <div class="flex items-center gap-3.5 mb-4">
        <ElephantLogo container-class="w-14 h-14 shadow-lg shadow-indigo-200 flex-shrink-0" icon-class="w-8 h-8" />
        <div>
          <span
            v-if="pwaStore.installTriggerSource === 'registration'"
            class="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block mb-1 shadow-2xs"
          >
            🎉 Регистрация завершена!
          </span>
          <span
            v-else
            class="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full inline-block mb-1 shadow-2xs"
          >
            📱 Быстрое добавление
          </span>
          <h3 class="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Добавить приложение на главный экран
          </h3>
          <p class="text-xs text-slate-500 font-medium mt-0.5">
            Тайский фразовик PWA
          </p>
        </div>
      </div>

      <!-- Motivational Lead Text -->
      <p class="text-xs text-slate-600 leading-relaxed mb-4">
        Установите приложение на экран вашего смартфона или компьютера, чтобы заниматься разговорным тайским языком каждый день с максимальным комфортом:
      </p>

      <!-- Motivation Bullets with rich styling -->
      <div class="space-y-2.5 mb-5 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-emerald-50/50 p-4 rounded-2xl border border-indigo-100/80 text-xs text-slate-700">
        <div class="flex items-start gap-2.5">
          <div class="w-6 h-6 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs mt-0.5">
            ⚡
          </div>
          <div>
            <span class="font-bold text-slate-900">Мгновенный запуск в 1 клик</span>
            <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Приложение открывается прямо с экрана «Домой» — без ввода ссылок в браузере и поиска в закладках.
            </p>
          </div>
        </div>

        <div class="flex items-start gap-2.5">
          <div class="w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs mt-0.5">
            📶
          </div>
          <div>
            <span class="font-bold text-slate-900">100% Офлайн-доступ</span>
            <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Все 1500 фраз, русская транскрипция и карточки работают в такси, самолёте, на пляже и в магазинах 7-Eleven без интернета.
            </p>
          </div>
        </div>

        <div class="flex items-start gap-2.5">
          <div class="w-6 h-6 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs mt-0.5">
            🔊
          </div>
          <div>
            <span class="font-bold text-slate-900">Полноэкранный режим без рамок</span>
            <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Никакой адресной строки и лишних вкладок — интерфейс выглядит и работает быстро и плавно, как нативное приложение.
            </p>
          </div>
        </div>
      </div>

      <!-- Action Area: Native Prompt (Android/Chrome/Edge) -->
      <div v-if="pwaStore.deferredPrompt" class="space-y-2">
        <button
          @click="handleNativeInstall"
          type="button"
          class="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-200 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
          </svg>
          <span>Добавить на главный экран</span>
        </button>
      </div>

      <!-- Action Area: iOS Safari Instructions -->
      <div v-else-if="pwaStore.isIOS" class="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span>📲 Как добавить на экран iPhone / iPad:</span>
        </div>
        <ol class="space-y-2.5 text-xs text-slate-700 pl-0.5">
          <li class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
            <span>Нажмите кнопку <strong>«Поделиться»</strong> (значок квадрата со стрелкой вверх <span class="inline-block">⬆️</span> в нижней панели Safari).</span>
          </li>
          <li class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
            <span>Прокрутите список действий вниз и нажмите <strong>«На экран «Домой»»</strong> (значок <span class="inline-block">➕</span>).</span>
          </li>
          <li class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
            <span>Нажмите <strong>«Добавить»</strong> в правом верхнем углу экрана.</span>
          </li>
        </ol>
        <button
          @click="pwaStore.closeInstallModal()"
          type="button"
          class="w-full mt-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-100"
        >
          ✓ Понятно, добавляю
        </button>
      </div>

      <!-- Action Area: Desktop Browser Guide -->
      <div v-else class="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div class="text-xs text-slate-700 leading-relaxed">
          Чтобы установить приложение на компьютер или телефон, нажмите на значок установки <strong>«⊕»</strong> в правой части адресной строки браузера или выберите в меню браузера: <strong>«Установить Тайский фразовик»</strong>.
        </div>
        <button
          @click="handleNativeInstall"
          type="button"
          class="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-100"
        >
          Добавить на экран
        </button>
      </div>

      <!-- Secondary action button -->
      <div class="mt-4 text-center">
        <button
          @click="pwaStore.closeInstallModal()"
          class="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer py-1"
          type="button"
        >
          Продолжить в браузере
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePwaStore } from '../pwaStore.js';
import ElephantLogo from './ElephantLogo.vue';

const pwaStore = usePwaStore();

async function handleNativeInstall() {
  const installed = await pwaStore.triggerInstallPrompt();
  if (!installed && !pwaStore.deferredPrompt) {
    pwaStore.closeInstallModal();
  }
}
</script>
