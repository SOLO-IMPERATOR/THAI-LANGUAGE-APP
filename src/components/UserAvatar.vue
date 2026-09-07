<template>
  <div
    class="overflow-hidden flex items-center justify-center flex-shrink-0 select-none"
    :class="[sizeClass, roundedClass]"
    :style="wrapperStyle"
    :title="title || name"
  >
    <img
      v-if="showPhoto"
      :src="photoUrl"
      :alt="name || 'Аватар'"
      class="w-full h-full object-cover"
      @error="imgFailed = true"
    />
    <span
      v-else
      class="font-black text-white drop-shadow-sm leading-none"
      :class="textClass"
    >
      {{ letters }}
    </span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { gradientForSeed, initialsFromName, isRealPhotoUrl } from '../avatarUtils.js';

const props = defineProps({
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  seed: { type: String, default: '' },
  sizeClass: { type: String, default: 'w-8 h-8' },
  textClass: { type: String, default: 'text-xs' },
  roundedClass: { type: String, default: 'rounded-xl' },
  title: { type: String, default: '' },
});

const imgFailed = ref(false);

watch(
  () => props.photoUrl,
  () => {
    imgFailed.value = false;
  }
);

const showPhoto = computed(
  () => isRealPhotoUrl(props.photoUrl) && !imgFailed.value
);

const letters = computed(() => initialsFromName(props.name, props.email));

const gradientSeed = computed(
  () => props.seed || props.email || props.name || letters.value
);

const wrapperStyle = computed(() => {
  if (showPhoto.value) {
    return {};
  }
  return {
    backgroundImage: gradientForSeed(gradientSeed.value),
  };
});
</script>
