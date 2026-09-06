<template>
  <div
    :class="containerClass"
    class="flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white shadow-md shadow-indigo-200 flex-shrink-0"
  >
    <!-- Stylized Thai Elephant (Chang) Vector Glyph -->
    <svg
      :class="iconClass"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="transition-transform group-hover:scale-105"
    >
      <!-- Elephant Body, Legs & Back -->
      <path
        d="M20 48V40C20 31.163 27.163 24 36 24H44C47.314 24 50 26.686 50 30V48H44V38H40V48H32V38H26V48H20Z"
        fill="currentColor"
        opacity="0.95"
      />
      <!-- Elephant Head and Raised Trunk -->
      <path
        d="M28 27C24.5 25 20 25.5 17 28.5C14.5 31 14 34.5 14 38C14 41 15 44 17 45C18.5 45.8 20 45 20.2 43.5C20.4 42 19.5 41 18.5 40.2C17.5 39.4 17.2 38 17.2 36.8C17.2 34.5 18 32.5 19.5 31C21.2 29.3 23.8 29 26 30.5L28 27Z"
        fill="currentColor"
      />
      <!-- Ear Flap with golden accent -->
      <path
        d="M32 26C29 26 26.5 28.5 26.5 32C26.5 35.5 28.5 38 31 38.5C31.8 38.6 32.5 38 32.5 37.2V26.5C32.5 26.2 32.3 26 32 26Z"
        fill="#fbbf24"
        opacity="0.95"
      />
      <!-- Eye -->
      <circle cx="26" cy="30" r="1.5" fill="#312e81" />
      <!-- Ceremonial Thai Saddle Blanket / Rug -->
      <path
        d="M36 27H43C44.1 27 45 27.9 45 29V34C45 35.1 44.1 36 43 36H36C34.9 36 34 35.1 34 34V29C34 27.9 34.9 27 36 27Z"
        fill="#fbbf24"
      />
      <circle cx="39.5" cy="31.5" r="1.2" fill="#d97706" />
      <!-- Auspicious Thai Sparkle -->
      <path
        d="M48 16L49 19L52 20L49 21L48 24L47 21L44 20L47 19L48 16Z"
        fill="#fbbf24"
      />
    </svg>
  </div>
</template>

<script setup>
defineProps({
  containerClass: {
    type: String,
    default: 'w-11 h-11'
  },
  iconClass: {
    type: String,
    default: 'w-7 h-7'
  }
});
</script>
