<template>
  <div
    v-if="isOpen"
    @click.self="authStore.closeProfile()"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
  >
    <div
      class="w-full max-w-xl bg-white rounded-[32px] border border-slate-100 p-6 sm:p-8 shadow-2xl text-slate-900 my-8 max-h-[92vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Close button -->
      <button
        @click="authStore.closeProfile()"
        type="button"
        title="Закрыть Личный кабинет"
        class="absolute top-6 right-6 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
      >
        ✕
      </button>

      <!-- Header: Личный Кабинет -->
      <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight leading-none">
            Личный кабинет
          </h2>
          <p class="text-xs text-slate-400 font-medium mt-1">
            Управление профилем, личными данными и целями практики
          </p>
        </div>
      </div>

      <!-- Feedback notifications -->
      <div v-if="successNotice" class="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
        <svg class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ successNotice }}</span>
      </div>

      <div v-if="errorNotice" class="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center gap-2">
        <svg class="w-4 h-4 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ errorNotice }}</span>
      </div>

      <!-- 1. Avatar / Profile Photo Upload Section -->
      <div class="mb-6 p-5 rounded-3xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
        <!-- Avatar Preview with drag-and-drop support -->
        <div
          class="relative w-24 h-24 rounded-full overflow-hidden bg-indigo-100 border-4 border-white shadow-md flex-shrink-0 flex items-center justify-center group"
          :class="{ 'ring-2 ring-indigo-500': isDraggingOver }"
          @dragover.prevent="isDraggingOver = true"
          @dragleave.prevent="isDraggingOver = false"
          @drop.prevent="handleDrop"
        >
          <!-- Custom image if present -->
          <img
            v-if="userPhoto"
            :src="userPhoto"
            alt="Фото профиля"
            class="w-full h-full object-cover"
          />
          <!-- Fallback Initials / Glyph -->
          <div
            v-else
            class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-2xl font-black"
          >
            {{ authStore.userInitials }}
          </div>

          <!-- Quick hover overlay to pick photo -->
          <label
            class="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-[10px] font-bold"
          >
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Изменить</span>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileSelect"
            />
          </label>
        </div>

        <div class="text-center sm:text-left flex-1">
          <h3 class="text-sm font-bold text-slate-900">
            Фотография профиля
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Загрузите аватар (PNG, JPG, WebP) или перетащите файл прямо сюда.
          </p>

          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
            <label
              class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Загрузить фото</span>
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileSelect"
              />
            </label>

            <button
              v-if="userPhoto"
              @click="removePhoto"
              type="button"
              class="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold transition cursor-pointer"
            >
              Удалить фото
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Form: Личные данные & Email -->
      <form @submit.prevent="saveChanges" class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- First Name -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Имя <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="formData.firstName"
              type="text"
              required
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          <!-- Last Name -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Фамилия <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="formData.lastName"
              type="text"
              required
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>
        </div>

        <!-- Email (Read-only identifier or editable) -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Email (Логин)
          </label>
          <input
            v-model="formData.email"
            type="email"
            required
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        <!-- Gender Selection (Kha / Khap) -->
        <div class="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-2.5">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Пол ученика (Вежливые частицы кха / кхап)
            </label>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              Важно для тайского
            </span>
          </div>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            В тайском языке женщины используют частицы <strong>ค่ะ / คะ (кха)</strong>, а мужчины — <strong>ครับ (кхрап)</strong>. Это одна фраза, но тренажёр отображает и озвучивает форму строго для вашего пола.
          </p>

          <div class="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              @click="formData.gender = 'female'"
              class="p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between"
              :class="
                formData.gender === 'female'
                  ? 'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-400/40 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80'
              "
            >
              <div class="flex items-center gap-2 font-bold text-xs">
                <span class="text-base">👩</span>
                <span>Женский (кха)</span>
              </div>
              <span class="text-[10px] text-slate-500 mt-1">Окончания ค่ะ / คะ</span>
            </button>

            <button
              type="button"
              @click="formData.gender = 'male'"
              class="p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between"
              :class="
                formData.gender === 'male'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-950 ring-2 ring-indigo-400/40 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80'
              "
            >
              <div class="flex items-center gap-2 font-bold text-xs">
                <span class="text-base">👨</span>
                <span>Мужской (кхап)</span>
              </div>
              <span class="text-[10px] text-slate-500 mt-1">Окончание ครับ</span>
            </button>
          </div>
        </div>


        <!-- 3. Профиль в Таиланде (Вынесен в ЛК) -->
        <div class="p-5 rounded-3xl bg-indigo-50/50 border border-indigo-100 space-y-4">
          <div class="flex items-center gap-2 text-indigo-900">
            <span class="text-lg">🌴</span>
            <h4 class="text-xs font-bold uppercase tracking-wider">
              Профиль в Таиланде
            </h4>
          </div>

          <!-- City in Thailand -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Город или остров проживания
            </label>
            <input
              v-model="formData.cityInThailand"
              type="text"
              placeholder="Бангкок, Пхукет, Паттайя, Самуи..."
              class="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
            <!-- Quick Suggestion chips -->
            <div class="flex flex-wrap gap-1.5 mt-2">
              <button
                v-for="city in popularCities"
                :key="city"
                @click="formData.cityInThailand = city"
                type="button"
                class="text-[10px] font-semibold px-2.5 py-1 rounded-xl border transition cursor-pointer"
                :class="formData.cityInThailand === city ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'"
              >
                {{ city }}
              </button>
            </div>
          </div>

          <!-- Stay Duration -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Срок пребывания в Таиланде
            </label>
            <select
              v-model="formData.stayDuration"
              class="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              <option value="">Не указано</option>
              <option value="Турист / Отпуск">Турист / Отпуск</option>
              <option value="Меньше 1 месяца">Меньше 1 месяца</option>
              <option value="1–6 месяцев">1–6 месяцев</option>
              <option value="6–12 месяцев">6–12 месяцев</option>
              <option value="1–3 года">1–3 года</option>
              <option value="Более 3 лет (постоянно)">Более 3 лет (постоянно)</option>
              <option value="Зимовщик (каждый сезон)">Зимовщик (каждый сезон)</option>
            </select>
          </div>
        </div>

        <!-- 4. Настройки обучения: Дневная норма фраз -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Дневная норма фраз в день / за сессию
          </label>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="goal in [5, 10, 15, 20, 25]"
              :key="goal"
              type="button"
              @click="formData.dailyGoal = goal"
              class="py-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer active:scale-95"
              :class="
                formData.dailyGoal === goal
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              "
            >
              {{ goal }}
            </button>
          </div>
        </div>

        <!-- 5. Режим видимости в рейтинге (С отступом) -->
        <div class="mt-6 p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-base">🛡️</span>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-900">
                Режим видимости в рейтинге
              </label>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Выберите, как ваш профиль будет отображаться другим ученикам в таблице лидеров:
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              @click="formData.isPrivate = false"
              class="p-3.5 rounded-2xl border text-left transition cursor-pointer text-xs font-semibold"
              :class="!formData.isPrivate ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'"
            >
              <div class="font-bold flex items-center gap-1.5">
                <span>🌍</span>
                <span>Публичный</span>
              </div>
              <span class="block text-[11px] font-normal opacity-90 mt-1 leading-snug">
                Виден в рейтинге с вашим именем, аватаром и городом проживания
              </span>
            </button>
            <button
              type="button"
              @click="formData.isPrivate = true"
              class="p-3.5 rounded-2xl border text-left transition cursor-pointer text-xs font-semibold"
              :class="formData.isPrivate ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'"
            >
              <div class="font-bold flex items-center gap-1.5">
                <span>🔒</span>
                <span>Скрытый режим</span>
              </div>
              <span class="block text-[11px] font-normal opacity-90 mt-1 leading-snug">
                Анонимный ученик. Ваше имя, фото и город скрыты от других
              </span>
            </button>
          </div>
        </div>

        <!-- Action Buttons: Save Changes & Logout -->
        <div class="pt-4 border-t border-slate-100 space-y-3">
          <div class="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              :disabled="isSaving"
              class="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg shadow-indigo-200 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <span v-if="isSaving">Сохраняем...</span>
              <span v-else>Сохранить изменения</span>
            </button>

            <button
              @click="showLogoutConfirm = true"
              type="button"
              class="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold transition cursor-pointer active:scale-95"
            >
              Выйти из аккаунта
            </button>
          </div>

          <!-- In-modal Logout Confirmation Box (Zero window.confirm block) -->
          <div
            v-if="showLogoutConfirm"
            class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in"
          >
            <div class="text-xs font-semibold text-center sm:text-left">
              Вы уверены, что хотите выйти из аккаунта?
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto justify-center">
              <button
                @click="confirmLogout"
                type="button"
                class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Да, выйти
              </button>
              <button
                @click="showLogoutConfirm = false"
                type="button"
                class="px-3.5 py-2 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useAuthStore } from '../authStore.js';
import { useLearningStore } from '../useLearningStore.js';

const authStore = useAuthStore();
const learningStore = useLearningStore();

const isOpen = computed(() => authStore.isProfileModalOpen);
const userPhoto = computed(() => authStore.currentUser?.avatarUrl || '');

const isDraggingOver = ref(false);
const isSaving = ref(false);
const showLogoutConfirm = ref(false);
const successNotice = ref('');
const errorNotice = ref('');

const popularCities = ['Бангкок', 'Пхукет', 'Паттайя', 'Самуи', 'Чиангмай', 'Панган', 'Хуахин', 'Краби'];

const formData = reactive({
  firstName: '',
  lastName: '',
  email: '',
  gender: 'female',
  cityInThailand: '',
  stayDuration: '',
  dailyGoal: 10,
  isPrivate: false
});

// Sync data when modal opens
watch(isOpen, (opened) => {
  if (opened && authStore.currentUser) {
    successNotice.value = '';
    errorNotice.value = '';
    showLogoutConfirm.value = false;
    formData.firstName = authStore.currentUser.firstName || '';
    formData.lastName = authStore.currentUser.lastName || '';
    formData.email = authStore.currentUser.email || '';
    formData.gender = authStore.currentUser.gender || learningStore.userGender || 'female';
    formData.cityInThailand = authStore.currentUser.cityInThailand || '';
    formData.stayDuration = authStore.currentUser.stayDuration || '';
    formData.dailyGoal = authStore.currentUser.dailyGoal || learningStore.settings.dailyGoal || 10;
    formData.isPrivate = !!authStore.currentUser.isPrivate;
  }
});


// Process file upload and compress to Base64 data URL
function processImageFile(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    errorNotice.value = 'Пожалуйста, выберите файл изображения (PNG, JPG, WebP).';
    return;
  }

  // Max 5MB raw
  if (file.size > 5 * 1024 * 1024) {
    errorNotice.value = 'Размер файла превышает 5 МБ. Пожалуйста, выберите изображение меньшего размера.';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    // Compress via canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 320;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const optimizedUrl = canvas.toDataURL('image/jpeg', 0.85);
      authStore.updateProfilePhoto(optimizedUrl);
      successNotice.value = 'Фотография профиля успешно обновлена!';
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (file) {
    processImageFile(file);
  }
}

function handleDrop(event) {
  isDraggingOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    processImageFile(file);
  }
}

async function removePhoto() {
  await authStore.removeProfilePhoto();
  successNotice.value = 'Фотография профиля удалена.';
}

async function saveChanges() {
  successNotice.value = '';
  errorNotice.value = '';
  isSaving.value = true;

  try {
    const updatedUser = await authStore.updateProfile({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      gender: formData.gender,
      cityInThailand: formData.cityInThailand.trim(),
      stayDuration: formData.stayDuration.trim(),
      dailyGoal: Number(formData.dailyGoal) || 10,
      isPrivate: formData.isPrivate
    });

    // Update learning store daily goal
    if (updatedUser.dailyGoal) {
      learningStore.settings.dailyGoal = updatedUser.dailyGoal;
      await learningStore.updateSetting('dailyGoal', updatedUser.dailyGoal);
      learningStore.startNewSession();
    }

    successNotice.value = 'Данные профиля успешно сохранены!';
  } catch (err) {
    errorNotice.value = err.message || 'Не удалось сохранить изменения.';
  } finally {
    isSaving.value = false;
  }
}

function confirmLogout() {
  showLogoutConfirm.value = false;
  authStore.logout();
}
</script>
