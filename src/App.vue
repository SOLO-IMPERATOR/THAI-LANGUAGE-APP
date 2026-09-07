<template>
  <div class="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
    <!-- PWA Install Banner -->
    <InstallBanner />

    <!-- Top Navigation Header -->
    <header class="sticky top-0 z-40 bg-[#f8fafc]/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Logo (Elephant), Title (Тайский фразовик) & Quick Install Button -->
        <div class="flex items-center gap-3 sm:gap-3.5 flex-wrap sm:flex-nowrap">
          <div class="flex items-center gap-3 sm:gap-3.5">
            <ElephantLogo container-class="w-11 h-11 sm:w-12 sm:h-12 shadow-lg shadow-indigo-200 flex-shrink-0" icon-class="w-6 h-6 sm:w-7 sm:h-7" />
            <div>
              <h1 class="text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-none">
                Тайский <span class="text-indigo-600">фразовик</span>
              </h1>
              <p class="text-xs text-slate-400 font-medium tracking-wider mt-1 hidden sm:block">
                Тренажер разговорной речи • Практическая транскрипция • SRS
              </p>
            </div>
          </div>

          <!-- Quick Add to Home Screen Button right next to the logo / title -->
          <button
            v-if="!pwaStore.isInstalled"
            @click="quickInstall"
            type="button"
            id="quick-add-to-homescreen-btn"
            class="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 border border-emerald-300/80 rounded-2xl text-xs font-black transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95 group flex-shrink-0 ml-1 sm:ml-2"
            title="Добавить приложение на главный экран"
          >
            <span class="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs shadow-xs group-hover:scale-110 transition-transform flex-shrink-0">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
              </svg>
            </span>
            <span class="font-extrabold text-emerald-950 hidden xs:inline">На экран</span>
            <span class="hidden md:inline font-extrabold text-emerald-950">«Домой»</span>
          </button>
        </div>

        <!-- Header Actions: Gender Switcher, Leaderboard, User Profile (ЛК) & Settings -->
        <div class="flex items-center gap-2 sm:gap-2.5">
          <!-- Gender Switcher (Kha / Khap) -->
          <div class="inline-flex items-center p-0.5 sm:p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              @click="setGlobalGender('female', true)"
              type="button"
              class="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              :class="store.userGender === 'female' ? 'bg-white text-rose-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'"
              title="Женский вариант: вежливые частицы ค่ะ / คะ (савади кха)"
            >
              <span>👩</span>
              <span class="hidden xs:inline">кха</span>
            </button>
            <button
              @click="setGlobalGender('male', true)"
              type="button"
              class="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              :class="store.userGender === 'male' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'"
              title="Мужской вариант: вежливая частица ครับ (савади кхрап)"
            >
              <span>👨</span>
              <span class="hidden xs:inline">кхап</span>
            </button>
          </div>

          <!-- Weekly Leaderboard Button (Requirement 6) -->
          <button
            @click="communityStore.openCommunity('leaderboard')"
            type="button"
            class="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Недельный рейтинг и сообщество"
          >
            <span class="text-base leading-none">🏆</span>
            <span class="hidden sm:inline">Рейтинг</span>
            <span
              v-if="authStore.currentUser?.weeklyScore"
              class="bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-lg text-[10px] font-black"
            >
              {{ authStore.currentUser.weeklyScore }} XP
            </span>
          </button>

          <!-- User Profile Button (Opens Personal Account / ЛК) -->
          <button
            v-if="authStore.currentUser"
            @click="authStore.openProfile()"
            type="button"
            class="flex items-center gap-2.5 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 shadow-xs transition cursor-pointer group active:scale-95"
            title="Открыть Личный кабинет"
          >
            <!-- User photo avatar or gradient initials -->
            <UserAvatar
              :name="authStore.userFullName"
              :email="authStore.currentUser.email"
              :photo-url="authStore.userAvatar"
              :seed="authStore.currentUser.id || authStore.currentUser.email"
              size-class="w-8 h-8"
              text-class="text-xs"
              rounded-class="rounded-xl border border-white/40 shadow-xs"
            />

            <div class="text-left hidden md:block pr-1">
              <div class="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition leading-none">
                {{ authStore.userFullName }}
              </div>
              <div class="text-[10px] text-slate-400 font-semibold leading-tight mt-0.5">
                Личный кабинет
              </div>
            </div>

            <svg class="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Login / Register button if not logged in -->
          <button
            v-else
            @click="authStore.openAuth('login')"
            type="button"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition cursor-pointer"
          >
            Войти / Регистрация
          </button>

          <!-- Settings Button -->
          <button
            @click="showSettings = true"
            class="p-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs transition focus:outline-none cursor-pointer"
            title="Настройки тренажера"
            type="button"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Bento Grid Container -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
      <!-- Loading Skeleton -->
      <div v-if="store.isLoading" class="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div class="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mb-4"></div>
        <p class="text-sm font-semibold text-slate-500">Загрузка данных тренажера...</p>
      </div>

      <!-- Init Error Fallback -->
      <div v-else-if="initError" class="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center my-6">
        <p class="text-sm font-bold text-rose-800 mb-3">{{ initError }}</p>
        <button
          @click="startApp"
          type="button"
          class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
        >
          Повторить попытку
        </button>
      </div>

      <div v-else>
        <!-- Gentle First-Time Gender Selector Banner -->
        <div
          v-if="!hasExplicitlyChosenGender"
          class="mb-6 p-4 rounded-3xl bg-gradient-to-r from-rose-50 via-indigo-50 to-amber-50 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div class="flex items-center gap-3 text-left">
            <span class="text-2xl flex-shrink-0">🇹🇭</span>
            <div>
              <div class="text-xs font-extrabold text-slate-900">
                Выберите ваш пол: «савади кха» или «савади кхрап»
              </div>
              <div class="text-[11px] text-slate-600">
                Всего в базе 1500 разговорных фраз без повторов, адаптированных под вас.
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              @click="setGlobalGender('female', true)"
              class="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black shadow-2xs transition active:scale-95 cursor-pointer"
            >
              👩 Говорю «кха»
            </button>
            <button
              @click="setGlobalGender('male', true)"
              class="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black shadow-2xs transition active:scale-95 cursor-pointer"
            >
              👨 Говорю «кхап»
            </button>
          </div>
        </div>

        <!-- Trainer View: Bento Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <!-- Bento Tile 1: Daily Norm, Session Progress & Profile Summary (col-span-4) -->
          <div class="col-span-1 lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between space-y-6">
            <div>
              <div class="flex justify-between items-start mb-4">
                <div>
                  <span class="text-xs font-bold text-slate-400 uppercase tracking-widest block">Дневная норма</span>
                  <span class="text-[11px] text-slate-400 font-medium">Серия SRS тренировки</span>
                </div>
                <div class="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>

              <!-- Big Metric Number -->
              <div class="flex items-end gap-2 my-2">
                <span class="text-6xl font-black text-slate-900 tracking-tight">{{ store.settings.dailyGoal }}</span>
                <span class="text-xl text-slate-400 font-bold mb-2">фраз в день</span>
              </div>

              <!-- Session Progress Bar -->
              <div class="space-y-2 pt-2">
                <div class="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Пройдено в серии</span>
                  <span class="text-indigo-600 font-black">{{ store.currentSessionIndex }} / {{ store.sessionQueue.length }}</span>
                </div>
                <div class="flex gap-1.5 h-2.5">
                  <div
                    v-for="idx in Math.max(1, store.sessionQueue.length || store.settings.dailyGoal)"
                    :key="idx"
                    class="h-full flex-grow rounded-full transition-all duration-300"
                    :class="idx <= store.currentSessionIndex ? 'bg-indigo-600' : 'bg-slate-100'"
                  />
                </div>
              </div>
            </div>

            <!-- SRS Memory Stats Card -->
            <div class="pt-4 border-t border-slate-100 space-y-3">
              <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                Статистика интервального повторения
              </span>
              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div class="text-lg font-black text-slate-800">{{ store.newPhrasesCount }}</div>
                  <div class="text-[10px] text-slate-400 font-semibold">Новые</div>
                </div>
                <div class="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
                  <div class="text-lg font-black text-amber-700">{{ store.dueReviewsCount }}</div>
                  <div class="text-[10px] text-amber-600 font-semibold">К повтору</div>
                </div>
                <div class="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div class="text-lg font-black text-emerald-700">{{ store.masteredCount }}</div>
                  <div class="text-[10px] text-emerald-600 font-semibold">Выучено</div>
                </div>
              </div>
            </div>

            <!-- Gender Adaptation Card -->
            <div
              class="p-3.5 rounded-2xl border transition-all"
              :class="store.userGender === 'female' ? 'bg-rose-50/70 border-rose-200/80' : 'bg-indigo-50/70 border-indigo-200/80'"
            >
              <div class="flex items-center justify-between mb-1">
                <span
                  class="text-[10px] font-bold uppercase tracking-widest"
                  :class="store.userGender === 'female' ? 'text-rose-700' : 'text-indigo-700'"
                >
                  Адаптация фраз под пол
                </span>
                <span
                  class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white shadow-2xs"
                  :class="store.userGender === 'female' ? 'text-rose-600' : 'text-indigo-600'"
                >
                  {{ store.userGender === 'female' ? 'Частицы ค่ะ / คะ' : 'Частица ครับ' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <div class="text-xs font-bold text-slate-800">
                  {{ store.userGender === 'female' ? '👩 Вы говорите «савади кха»' : '👨 Вы говорите «савади кхрап»' }}
                </div>
                <button
                  type="button"
                  @click="setGlobalGender(store.userGender === 'female' ? 'male' : 'female', true)"
                  class="text-[11px] font-black underline underline-offset-2 hover:opacity-80 transition cursor-pointer"
                  :class="store.userGender === 'female' ? 'text-rose-700' : 'text-indigo-700'"
                >
                  Сменить
                </button>
              </div>
            </div>

            <!-- Weekly Leaderboard Preview Card -->
            <div
              @click="communityStore.openCommunity('leaderboard')"
              class="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 hover:border-amber-300 transition cursor-pointer flex items-center justify-between group"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-lg flex-shrink-0">
                  🏆
                </div>
                <div>
                  <div class="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition">
                    Недельный рейтинг
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5">
                    Ваш результат: <strong class="text-indigo-600">{{ authStore.currentUser?.weeklyScore || 0 }} XP</strong> • Топ учеников
                  </div>
                </div>
              </div>
              <span class="text-xs font-bold text-amber-700 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>

            <!-- Personal Account (ЛК) Quick Access Card -->
            <div
              v-if="authStore.currentUser"
              @click="authStore.openProfile()"
              class="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 hover:border-indigo-300 transition cursor-pointer flex items-center justify-between group"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl overflow-hidden bg-white border border-indigo-100 flex items-center justify-center flex-shrink-0">
                  <img
                    v-if="authStore.userAvatar"
                    :src="authStore.userAvatar"
                    alt="Фото"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-indigo-700 font-black text-sm">
                    {{ authStore.userInitials }}
                  </span>
                </div>
                <div>
                  <div class="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {{ authStore.userFullName }}
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5">
                    {{ authStore.currentUser.cityInThailand ? `📍 ${authStore.currentUser.cityInThailand}` : 'Личный кабинет' }}
                  </div>
                </div>
              </div>
              <span class="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </div>

          <!-- Bento Tile 2: Flashcard Centerpiece (col-span-8) -->
          <div class="col-span-1 lg:col-span-8">
            <Flashcard />
          </div>

        </div>
      </div>
    </main>

    <!-- Footer Meta (Tech list removed, app renamed) -->
    <footer class="mt-auto border-t border-slate-200/80 px-4 md:px-8 py-5 text-center text-xs text-slate-500">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="font-medium text-slate-600">
          Тайский фразовик • Тренажер разговорного тайского языка
        </div>
        <div class="text-[11px] text-slate-400 font-medium">
          Интервальное повторение SRS • Практическая транскрипция
        </div>
      </div>
    </footer>

    <!-- Auth & Registration Modal (Pure Email & Password, Phrase Count) -->
    <AuthModal />

    <!-- Personal Account Modal (ЛК: Email, Personal Info, Avatar Upload, Thailand Profile) -->
    <UserProfileModal />

    <!-- Community & Weekly Leaderboard Modal -->
    <CommunityModal />

    <!-- PWA Install Modal -->
    <PwaInstallModal />

    <!-- Settings Modal -->
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useLearningStore } from './useLearningStore.js';
import { useAuthStore } from './authStore.js';
import { useCommunityStore } from './communityStore.js';
import { usePwaStore } from './pwaStore.js';
import Flashcard from './components/Flashcard.vue';
import InstallBanner from './components/InstallBanner.vue';
import SettingsModal from './components/SettingsModal.vue';
import AuthModal from './components/AuthModal.vue';
import UserProfileModal from './components/UserProfileModal.vue';
import CommunityModal from './components/CommunityModal.vue';
import PwaInstallModal from './components/PwaInstallModal.vue';
import ElephantLogo from './components/ElephantLogo.vue';
import UserAvatar from './components/UserAvatar.vue';

const store = useLearningStore();
const authStore = useAuthStore();
const communityStore = useCommunityStore();
const pwaStore = usePwaStore();

const showSettings = ref(false);
const initError = ref(null);
const hasExplicitlyChosenGender = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem('thai_frazovik_gender_set') === 'true'
);

async function quickInstall() {
  if (pwaStore.deferredPrompt) {
    await pwaStore.triggerInstallPrompt();
    return;
  }
  await pwaStore.triggerNativePromptImmediately('header');
}

function setGlobalGender(gender, markExplicit = true) {
  store.setUserGender(gender);
  if (markExplicit) {
    try {
      localStorage.setItem('thai_frazovik_gender_set', 'true');
      hasExplicitlyChosenGender.value = true;
    } catch (e) {}
  }
  if (authStore.currentUser) {
    authStore.updateProfile({ gender }).catch(() => {});
  }
}


async function startApp() {
  initError.value = null;

  try {
    pwaStore.initPwa();
  } catch (err) {
    console.warn('PWA init warning:', err);
  }
  try {
    await authStore.initAuth();
  } catch (err) {
    console.warn('Auth init warning:', err);
  }

  try {
    await communityStore.initCommunity();
  } catch (err) {
    console.warn('Community init warning:', err);
  }

  try {
    await store.initialize();
    // Sync dailyGoal with logged-in user preferences
    if (authStore.currentUser?.dailyGoal) {
      store.settings.dailyGoal = authStore.currentUser.dailyGoal;
    }
  } catch (err) {
    console.error('Store initialize error:', err);
    initError.value = 'Произошла ошибка при загрузке базы данных. Нажмите кнопку, чтобы повторить.';
  } finally {
    store.isLoading = false;
  }
}

onMounted(() => {
  startApp();
});
</script>
