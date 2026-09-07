<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
    <div class="w-full max-w-md rounded-[32px] bg-white border border-slate-100 p-6 sm:p-8 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100">
        <h3 class="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span>Настройки тренажера</span>
        </h3>
        <button
          @click="$emit('close')"
          class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          type="button"
        >
          ✕
        </button>
      </div>

      <div class="py-4 space-y-6">
        <!-- 0. Gender Selection (Kha / Khap) -->
        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Пол ученика (кха / кхап)
            </label>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              Вежливые частицы
            </span>
          </div>
          <p class="text-[11px] text-slate-500 mb-3 leading-relaxed">
            В тайском языке для женщин обязательны частицы <strong>ค่ะ / คะ (кха)</strong>, а для мужчин — <strong>ครับ (кхап)</strong>. Все 900 фраз тренажёра адаптируются под ваш пол без изменения общего состава.
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="setGender('female')"
              class="py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
              :class="
                store.userGender === 'female'
                  ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-400/30 font-black shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              "
            >
              <span>👩</span>
              <span>Женский (кха)</span>
            </button>
            <button
              type="button"
              @click="setGender('male')"
              class="py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
              :class="
                store.userGender === 'male'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-400/30 font-black shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              "
            >
              <span>👨</span>
              <span>Мужской (кхап)</span>
            </button>
          </div>
        </div>

        <!-- 1. Daily Goal Selector -->
        <div>

          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Дневная норма фраз
          </label>
          <div class="grid grid-cols-4 gap-2 mb-2">
            <button
              v-for="goal in [3, 5, 10]"
              :key="goal"
              @click="setGoal(goal)"
              type="button"
              class="py-2.5 rounded-2xl text-xs font-bold border transition active:scale-95"
              :class="
                store.settings.dailyGoal === goal && !isCustomGoal
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              "
            >
              {{ goal }}
            </button>
            <button
              @click="isCustomGoal = true"
              type="button"
              class="py-2.5 rounded-2xl text-xs font-bold border transition active:scale-95"
              :class="
                isCustomGoal
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              "
            >
              Свое
            </button>
          </div>

          <!-- Custom Number Input -->
          <div v-if="isCustomGoal" class="flex items-center gap-2 mt-2">
            <input
              v-model.number="customGoalValue"
              @change="applyCustomGoal"
              type="number"
              min="1"
              max="50"
              placeholder="Количество..."
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
            <button
              @click="applyCustomGoal"
              class="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider text-white transition shadow-sm"
              type="button"
            >
              ОК
            </button>
          </div>
        </div>

        <!-- 2. Training Mode -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Режим тренировки
          </label>
          <div class="space-y-2">
            <label
              v-for="mode in modes"
              :key="mode.id"
              class="flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition active:scale-[0.99]"
              :class="
                store.settings.trainingMode === mode.id
                  ? 'bg-indigo-50/70 border-indigo-300 text-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
              "
            >
              <input
                type="radio"
                name="trainingMode"
                :value="mode.id"
                :checked="store.settings.trainingMode === mode.id"
                @change="setTrainingMode(mode.id)"
                class="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <div class="text-xs font-bold text-slate-900">{{ mode.title }}</div>
                <div class="text-[11px] text-slate-500 leading-relaxed mt-0.5">{{ mode.desc }}</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 3. Audio Playback Speed Selector (0.5x, 0.7x, 1.0x, 1.2x) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Скорость озвучки (TTS)
            </label>
            <span class="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
              {{ formatSpeedLabel(store.settings.playbackRate) }}
            </span>
          </div>

          <div class="grid grid-cols-4 gap-2 mb-2">
            <button
              v-for="spd in [0.5, 0.7, 1.0, 1.2]"
              :key="spd"
              @click="setSpeed(spd)"
              type="button"
              class="py-2.5 rounded-2xl text-xs font-bold border transition active:scale-95 cursor-pointer"
              :class="
                isCurrentSpeed(spd)
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 font-black'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              "
            >
              {{ spd === 1 ? '1.0×' : spd + '×' }}
            </button>
          </div>

          <div class="flex items-center justify-between mt-1 px-1">
            <span class="text-[11px] text-slate-500">
              {{ getSpeedDescription(store.settings.playbackRate) }}
            </span>
            <button
              @click="testSpeedVoice"
              type="button"
              class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition"
            >
              <span>🔊 Тест звука</span>
            </button>
          </div>
        </div>

        <!-- 4. Notifications & Reminders -->
        <div class="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-bold text-slate-900">Напоминания о тренировке</div>
              <div class="text-[11px] text-slate-500 mt-0.5">Push-уведомления для соблюдения интервалов SRS</div>
            </div>
            <button
              @click="toggleNotifications"
              type="button"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="store.settings.notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-300'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="store.settings.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Time Picker (Hour and Minute) -->
          <div v-if="store.settings.notificationsEnabled" class="pt-3 border-t border-slate-200">
            <label class="block text-[11px] font-bold text-slate-600 mb-2">Время ежедневного напоминания:</label>
            <div class="flex items-center gap-2">
              <select
                :value="store.settings.reminderHour"
                @change="updateHour($event.target.value)"
                class="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                <option v-for="h in 24" :key="h - 1" :value="h - 1">
                  {{ String(h - 1).padStart(2, '0') }}:00
                </option>
              </select>

              <span class="text-xs text-slate-400 font-bold">:</span>

              <select
                :value="store.settings.reminderMinute"
                @change="updateMinute($event.target.value)"
                class="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                <option :value="0">00 мин</option>
                <option :value="15">15 мин</option>
                <option :value="30">30 мин</option>
                <option :value="45">45 мин</option>
              </select>

              <button
                @click="sendTestNotification"
                type="button"
                class="ml-auto px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[11px] font-bold text-indigo-600 border border-indigo-100 transition shadow-xs"
                title="Проверить работу уведомлений прямо сейчас"
              >
                Тест
              </button>
            </div>
          </div>
        </div>

        <!-- 4. SRS Structure & Progress Info -->
        <div class="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div class="font-bold text-slate-900">Интервалы SRS тренажера:</div>
          <div class="text-[11px] text-slate-600 space-y-1.5">
            <div>• <strong class="text-slate-800">День 3</strong>: первое закрепление фразы</div>
            <div>• <strong class="text-amber-700">День 5 (Триггер!)</strong>: автоматическая деконструкция в словарь</div>
            <div>• <strong class="text-slate-800">День 7</strong>: недельное повторение</div>
            <div>• <strong class="text-slate-800">День 14</strong>: двухнедельное закрепление</div>
            <div>• <strong class="text-emerald-700">День 30</strong>: долговременная память (освоено)</div>
          </div>
        </div>

        <!-- Reset Button -->
        <div class="pt-2">
          <button
            @click="confirmReset"
            class="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold uppercase tracking-wider transition active:scale-98"
            type="button"
          >
            Сбросить весь прогресс к начальным фразам
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useLearningStore } from '../useLearningStore.js';
import { useAuthStore } from '../authStore.js';
import { speechService } from '../speechService.js';

const emit = defineEmits(['close']);
const store = useLearningStore();
const authStore = useAuthStore();

function setGender(gender) {
  store.setUserGender(gender);
  if (authStore.currentUser) {
    authStore.updateProfile({ gender }).catch(() => {});
  }
}

function isCurrentSpeed(speed) {
  const current = Number(store.settings?.playbackRate) || 0.7;
  return Math.abs(current - speed) < 0.05;
}

function setSpeed(spd) {
  store.setPlaybackRate(spd);
}

function formatSpeedLabel(speed) {
  const s = Number(speed) || 0.7;
  return s === 1 ? '1.0×' : `${s}×`;
}

function getSpeedDescription(speed) {
  const s = Number(speed) || 0.7;
  if (Math.abs(s - 0.5) < 0.05) return 'Очень медленно для детального разбора тонов';
  if (Math.abs(s - 0.7) < 0.05) return 'Замедленно (рекомендуется для учебы)';
  if (Math.abs(s - 1.0) < 0.05) return 'Обычный темп естественной тайской речи';
  if (Math.abs(s - 1.2) < 0.05) return 'Быстрый темп для тренировки беглого слуха';
  return `${s}× скорость`;
}

function testSpeedVoice() {
  const sample = store.userGender === 'female' ? 'สวัสดีค่ะ' : 'สวัสดีครับ';
  speechService.speakThai(sample, {
    rate: Number(store.settings?.playbackRate) || 0.7,
    gender: store.userGender
  });
}


const isCustomGoal = ref(![3, 5, 10].includes(store.settings.dailyGoal));
const customGoalValue = ref(store.settings.dailyGoal);

const modes = [
  {
    id: 'mix',
    title: 'Микс (рекомендуется)',
    desc: 'Сбалансированная тренировка: повторение фраз по SRS + изучение новых'
  },
  {
    id: 'review',
    title: 'Только повторение',
    desc: 'Отработка только ранее пройденных фраз, требующих закрепления'
  },
  {
    id: 'new',
    title: 'Только новые',
    desc: 'Фокус исключительно на освоении новых разговорных паттернов'
  }
];

function setGoal(val) {
  isCustomGoal.value = false;
  store.updateSetting('dailyGoal', val);
}

function applyCustomGoal() {
  const v = Math.max(1, Math.min(50, Number(customGoalValue.value) || 5));
  customGoalValue.value = v;
  store.updateSetting('dailyGoal', v);
}

function setTrainingMode(mode) {
  store.updateSetting('trainingMode', mode);
}

async function toggleNotifications() {
  if (!store.settings.notificationsEnabled) {
    const granted = await store.requestNotificationPermission();
    if (!granted) {
      alert('Пожалуйста, разрешите уведомления в настройках вашего браузера.');
    }
  } else {
    store.updateSetting('notificationsEnabled', false);
  }
}

function updateHour(val) {
  store.updateSetting('reminderHour', Number(val));
}

function updateMinute(val) {
  store.updateSetting('reminderMinute', Number(val));
}

function sendTestNotification() {
  store.showInstantNotification(
    'Тестовое напоминание (SRS)',
    'Пора повторить разговорные фразы тайского языка!'
  );
}

async function confirmReset() {
  if (confirm('Вы уверены? Весь прогресс повторений и словарь будут сброшены.')) {
    await store.resetAllData();
    emit('close');
  }
}
</script>
