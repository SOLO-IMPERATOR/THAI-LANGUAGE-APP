<template>
  <div class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="emit('close')" />

    <div
      class="relative w-full sm:max-w-3xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Список фраз"
    >
      <div class="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100">
        <div>
          <h2 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Все фразы</h2>
          <p class="text-[11px] text-slate-500 mt-0.5">
            {{ filtered.length }} из {{ store.phrases.length }} · поиск по русскому и фильтры
          </p>
        </div>
        <button
          type="button"
          class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold cursor-pointer"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="px-5 sm:px-6 py-3 space-y-3 border-b border-slate-50">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Поиск по русским словам…"
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div class="flex flex-wrap gap-2">
          <select
            v-model="statusFilter"
            class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Статус: все</option>
            <option value="new">Новые</option>
            <option value="learning">В изучении</option>
            <option value="due">К повтору</option>
            <option value="mastered">Выученные</option>
          </select>

          <select
            v-model="categoryFilter"
            class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[10rem]"
          >
            <option value="all">Категория: все</option>
            <option v-for="cat in store.categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>

          <select
            v-model="tagFilter"
            class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[10rem]"
          >
            <option value="all">Тег: все</option>
            <option v-for="tag in store.allTags" :key="tag" :value="tag">#{{ tag }}</option>
          </select>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-5 sm:px-6 py-3 space-y-2">
        <div
          v-if="filtered.length === 0"
          class="py-12 text-center text-sm text-slate-400 font-medium"
        >
          Ничего не найдено
        </div>

        <article
          v-for="item in filtered"
          :key="item.id"
          class="rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50/60 p-3.5 transition"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-black text-slate-900 leading-snug">
                {{ item.russian || item.translation_ru }}
              </p>
              <p class="text-xs text-indigo-700 font-bold mt-1 truncate">
                {{ gendered(item).transcription_ru }}
              </p>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                  {{ item.category || '—' }}
                </span>
                <span
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg"
                  :class="statusBadgeClass(item)"
                >
                  {{ statusLabel(item) }}
                </span>
                <span
                  v-for="tag in (item.tags || []).slice(0, 3)"
                  :key="tag"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 flex items-center justify-center cursor-pointer active:scale-95"
              title="Озвучить"
              @click="playPhrase(item)"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useLearningStore } from '../useLearningStore.js';
import { getGenderedPhrase } from '../phrasesData.js';
import { speechService } from '../speechService.js';

const emit = defineEmits(['close']);

const store = useLearningStore();
const searchQuery = ref('');
const statusFilter = ref('all');
const categoryFilter = ref('all');
const tagFilter = ref('all');

function gendered(raw) {
  return getGenderedPhrase(raw, store.userGender) || raw;
}

function statusOf(p) {
  const stage = Number(p.stage_srs) || 0;
  const now = Date.now();
  if (stage === 0) return 'new';
  if (stage >= 3) return 'mastered';
  if (p.next_review && p.next_review <= now) return 'due';
  return 'learning';
}

function statusLabel(p) {
  const map = {
    new: 'Новая',
    learning: 'В изучении',
    due: 'К повтору',
    mastered: 'Выучена'
  };
  return map[statusOf(p)] || '—';
}

function statusBadgeClass(p) {
  const s = statusOf(p);
  if (s === 'new') return 'bg-slate-100 text-slate-700';
  if (s === 'due') return 'bg-amber-50 text-amber-800';
  if (s === 'mastered') return 'bg-emerald-50 text-emerald-800';
  return 'bg-indigo-50 text-indigo-800';
}

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return store.phrases.filter((p) => {
    const ru = String(p.russian || p.translation_ru || '').toLowerCase();
    if (q && !ru.includes(q)) return false;
    if (categoryFilter.value !== 'all' && p.category !== categoryFilter.value) return false;
    if (tagFilter.value !== 'all' && !(Array.isArray(p.tags) && p.tags.includes(tagFilter.value))) return false;
    if (statusFilter.value !== 'all' && statusOf(p) !== statusFilter.value) return false;
    return true;
  });
});

function playPhrase(raw) {
  const g = gendered(raw);
  if (!g?.thai_hidden) return;
  speechService.speakThai(g.thai_hidden, {
    rate: Number(store.settings?.playbackRate) || 0.7,
    gender: store.userGender
  });
}
</script>
