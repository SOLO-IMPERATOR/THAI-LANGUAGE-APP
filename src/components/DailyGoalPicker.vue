<template>
  <div>
    <label v-if="label" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
      {{ label }}
    </label>
    <div class="grid grid-cols-5 gap-2 mb-2">
      <button
        v-for="goal in presets"
        :key="goal"
        type="button"
        @click="pickPreset(goal)"
        class="py-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer active:scale-95"
        :class="
          modelValue === goal && !customMode
            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
        "
      >
        {{ goal }}
      </button>
      <button
        type="button"
        @click="openCustom"
        class="py-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer active:scale-95"
        :class="
          customMode
            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
        "
      >
        Свое
      </button>
    </div>

    <div v-if="customMode" class="flex items-center gap-2 mt-2">
      <input
        v-model.number="customDraft"
        type="number"
        :min="min"
        :max="max"
        placeholder="Своё число…"
        class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        @change="applyCustom"
        @keyup.enter="applyCustom"
      />
      <button
        type="button"
        class="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider text-white transition shadow-sm cursor-pointer"
        @click="applyCustom"
      >
        ОК
      </button>
    </div>

    <p v-if="hint" class="text-[11px] text-slate-400 mt-1.5">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import {
  DAILY_GOAL_PRESETS,
  DAILY_GOAL_MIN,
  DAILY_GOAL_MAX,
  clampDailyGoal,
  isPresetDailyGoal
} from '../dailyGoal.js';

const props = defineProps({
  modelValue: { type: Number, required: true },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  min: { type: Number, default: DAILY_GOAL_MIN },
  max: { type: Number, default: DAILY_GOAL_MAX }
});

const emit = defineEmits(['update:modelValue']);

const presets = DAILY_GOAL_PRESETS;
const customMode = ref(!isPresetDailyGoal(props.modelValue));
const customDraft = ref(props.modelValue);

watch(
  () => props.modelValue,
  (v) => {
    customMode.value = !isPresetDailyGoal(v);
    customDraft.value = v;
  }
);

function pickPreset(goal) {
  customMode.value = false;
  emit('update:modelValue', goal);
}

function openCustom() {
  customMode.value = true;
  customDraft.value = props.modelValue;
}

function applyCustom() {
  const v = clampDailyGoal(customDraft.value, props.modelValue);
  customDraft.value = v;
  emit('update:modelValue', v);
}
</script>
