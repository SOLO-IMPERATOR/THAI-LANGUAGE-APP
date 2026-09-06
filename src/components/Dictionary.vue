<template>
  <div class="w-full space-y-6">
    <!-- Header with Stats & Search (Bento Card) -->
    <div class="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h2 class="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Разговорный Словарь
            </h2>
            <span class="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100">
              {{ words.length }} {{ getWordDeclension(words.length) }}
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Слова, автоматически деконструированные из разговорных фраз после 5-го дня SRS-повторений.
          </p>
        </div>

        <!-- Search Bar -->
        <div class="relative w-full md:w-80">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по транскрипции или переводу..."
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition"
          />
          <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <!-- Tone Helper Reminder Bar -->
      <div class="text-[11px] text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <span class="text-slate-700 font-semibold">Озвучка слов доступна по клику на динамик (тайская фонетика). Письменность скрыта.</span>
        <div class="flex items-center gap-3 text-[11px] font-medium">
          <span class="text-amber-600 font-bold">а̀ (низкий)</span>
          <span class="text-rose-600 font-bold">а̂ (падающий)</span>
          <span class="text-sky-600 font-bold">а́ (высокий)</span>
          <span class="text-emerald-600 font-bold">а̌ (восходящий)</span>
          <span class="text-slate-500 font-bold">а: (долгий)</span>
        </div>
      </div>
    </div>

    <!-- Words List (Bento Grid) -->
    <div v-if="filteredWords.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="item in filteredWords"
        :key="item.id"
        class="group bg-white hover:bg-slate-50/80 border border-slate-100 hover:border-indigo-200 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-between gap-4"
      >
        <div class="flex-1 min-w-0">
          <!-- Russian Practical Transcription (Thai letters strictly hidden!) -->
          <div class="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition tracking-tight truncate">
            {{ item.transcription_ru }}
          </div>
          <!-- Translation -->
          <div class="text-xs text-slate-500 mt-0.5 line-clamp-2 font-medium">
            {{ item.translation_ru }}
          </div>
        </div>

        <!-- Personal Audio Button for each word -->
        <button
          @click="playWordAudio(item)"
          :disabled="playingId === item.id"
          class="flex-shrink-0 w-11 h-11 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 border border-indigo-100 flex items-center justify-center transition active:scale-95 disabled:opacity-50 shadow-xs"
          :title="`Озвучить «${item.transcription_ru}»`"
          type="button"
        >
          <svg v-if="playingId !== item.id" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else class="w-4 h-4 text-indigo-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="words.length === 0"
      class="bg-white border border-slate-100 rounded-3xl p-10 sm:p-14 text-center shadow-sm"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h3 class="text-xl font-black text-slate-900 mb-2">Словарь пока пуст</h3>
      <p class="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
        Слова появляются здесь автоматически по алгоритму SRS: когда вы успешно повторяете фразу на
        <strong class="text-slate-800">5-й день</strong>, она деконструируется на составные слова для отдельной практики.
      </p>

      <!-- Quick Demo Trigger Button to preview deconstruction immediately -->
      <button
        @click="simulateQuickDeconstruction"
        class="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-indigo-100 transition"
        type="button"
      >
        ✨ Смоделировать триггер 5-го дня (для демо)
      </button>
    </div>

    <!-- Search Not Found State -->
    <div
      v-else
      class="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm"
    >
      <p class="text-xs text-slate-500">
        По запросу «<strong class="text-slate-900">{{ searchQuery }}</strong>» ничего не найдено.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useLearningStore } from '../useLearningStore.js';
import { speechService } from '../speechService.js';

const store = useLearningStore();

const words = computed(() => store.dictionaryWords);
const searchQuery = ref('');
const playingId = ref(null);

const filteredWords = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return words.value;
  return words.value.filter(
    (w) =>
      w.transcription_ru.toLowerCase().includes(q) ||
      w.translation_ru.toLowerCase().includes(q)
  );
});

function playWordAudio(item) {
  if (!item || !item.thai_hidden) return;
  playingId.value = item.id;
  speechService.speakThai(item.thai_hidden, {
    rate: 0.78,
    onStart: () => {
      playingId.value = item.id;
    },
    onEnd: () => {
      playingId.value = null;
    },
    onError: () => {
      playingId.value = null;
    }
  });
}

function getWordDeclension(n) {
  const abs = Math.abs(n) % 100;
  const rem = abs % 10;
  if (abs > 10 && abs < 20) return 'слов';
  if (rem > 1 && rem < 5) return 'слова';
  if (rem === 1) return 'слово';
  return 'слов';
}

async function simulateQuickDeconstruction() {
  // Find first phrase and set it to stage 2, then complete it to trigger deconstruction!
  if (store.phrases.length > 0) {
    const p = store.phrases[0];
    await store.setPhraseStageForTesting(p.id, 2);
    await store.handleSuccess(p);
  }
}
</script>
