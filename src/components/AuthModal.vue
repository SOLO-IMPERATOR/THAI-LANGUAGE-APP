<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 overflow-y-auto"
  >
    <div
      class="w-full max-w-lg bg-white rounded-[32px] border border-slate-100 p-6 sm:p-8 shadow-2xl text-slate-900 my-8 max-h-[92vh] overflow-y-auto relative"
    >
      <button
        v-if="authStore.isAuthenticated"
        @click="authStore.closeAuth()"
        type="button"
        title="Закрыть окно"
        class="absolute top-6 right-6 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
      >
        ✕
      </button>

      <div class="text-center mb-5">
        <ElephantLogo container-class="w-14 h-14 mx-auto mb-3 shadow-lg shadow-indigo-200" icon-class="w-8 h-8" />
        <h2 class="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          {{ headerTitle }}
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          {{ headerSubtitle }}
        </p>
      </div>

      <!-- Wizard steps (register only) -->
      <div
        v-if="mode === 'register'"
        class="mb-6 flex items-center gap-2"
      >
        <button
          type="button"
          class="flex-1 rounded-2xl border px-3 py-2.5 text-left transition"
          :class="registerStep === 1
            ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
            : 'border-slate-200 bg-slate-50'"
          @click="goToStep(1)"
        >
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Шаг 1</div>
          <div class="text-xs font-black text-slate-900">Аккаунт</div>
        </button>
        <div class="h-px w-4 bg-slate-200 flex-shrink-0" />
        <button
          type="button"
          class="flex-1 rounded-2xl border px-3 py-2.5 text-left transition"
          :class="registerStep === 2
            ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
            : 'border-slate-200 bg-slate-50'"
          @click="goToStep(2)"
        >
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Шаг 2</div>
          <div class="text-xs font-black text-slate-900">Цель и профиль</div>
        </button>
      </div>

      <div v-if="errorMessage" class="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ successMessage }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- LOGIN -->
        <template v-if="mode === 'login'">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.email"
              type="email"
              required
              placeholder="example@domain.com"
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Пароль <span class="text-rose-500">*</span>
              </label>
              <button
                @click="showPassword = !showPassword"
                type="button"
                class="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                {{ showPassword ? 'Скрыть' : 'Показать' }}
              </button>
            </div>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="Минимум 6 символов"
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>
        </template>

        <!-- REGISTER STEP 1: account data -->
        <template v-else-if="registerStep === 1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Имя <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="form.firstName"
                type="text"
                required
                placeholder="Иван"
                class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Фамилия <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="form.lastName"
                type="text"
                required
                placeholder="Смирнов"
                class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.email"
              type="email"
              required
              placeholder="example@domain.com"
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Пароль <span class="text-rose-500">*</span>
              </label>
              <button
                @click="showPassword = !showPassword"
                type="button"
                class="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                {{ showPassword ? 'Скрыть' : 'Показать' }}
              </button>
            </div>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="Минимум 6 символов"
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Пол <span class="text-rose-500">*</span>
              <span class="normal-case font-semibold text-slate-400 ml-1">(для частиц ค่ะ / ครับ)</span>
            </label>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                @click="form.gender = 'female'"
                class="p-3 rounded-2xl border text-left transition cursor-pointer"
                :class="form.gender === 'female'
                  ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'"
              >
                <div class="text-xs font-bold text-slate-900">Женский</div>
                <p class="text-[10px] text-slate-500 mt-1">частица ค่ะ / คะ</p>
              </button>
              <button
                type="button"
                @click="form.gender = 'male'"
                class="p-3 rounded-2xl border text-left transition cursor-pointer"
                :class="form.gender === 'male'
                  ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'"
              >
                <div class="text-xs font-bold text-slate-900">Мужской</div>
                <p class="text-[10px] text-slate-500 mt-1">частица ครับ</p>
              </button>
            </div>
          </div>

          <div class="pt-1">
            <label class="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                v-model="form.agreePersonalData"
                type="checkbox"
                class="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 flex-shrink-0 cursor-pointer"
              />
              <span class="text-xs text-slate-600 leading-snug">
                Я согласен(на) на <strong class="text-slate-800">обработку персональных данных</strong> и ознакомлен(а) с
                <button
                  type="button"
                  @click.stop="showPdTermsModal = true"
                  class="text-indigo-600 font-semibold underline hover:text-indigo-700 cursor-pointer inline ml-1"
                >
                  условиями конфиденциальности
                </button>
                <span class="text-rose-500">*</span>
              </span>
            </label>
          </div>
        </template>

        <!-- REGISTER STEP 2: goal, visibility, extra -->
        <template v-else>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Сколько фраз в день? <span class="text-rose-500">*</span>
            </label>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="goalOption in [5, 10, 15, 20, 25]"
                :key="goalOption"
                type="button"
                @click="form.dailyGoal = goalOption"
                class="py-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer active:scale-95"
                :class="
                  form.dailyGoal === goalOption
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                "
              >
                {{ goalOption }}
              </button>
            </div>
            <p class="text-[11px] text-slate-400 mt-1.5">
              Рекомендуем <strong>10 фраз</strong> для устойчивого закрепления без перегрузки.
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Режим видимости <span class="text-rose-500">*</span>
            </label>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                @click="form.isPrivate = false"
                class="p-3 rounded-2xl border text-left transition cursor-pointer"
                :class="!form.isPrivate ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'"
              >
                <div class="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <span>Публичный</span>
                </div>
                <p class="text-[10px] text-slate-500 mt-1 leading-tight">
                  Имя, фото и город видны в рейтинге.
                </p>
              </button>
              <button
                type="button"
                @click="form.isPrivate = true"
                class="p-3 rounded-2xl border text-left transition cursor-pointer"
                :class="form.isPrivate ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'"
              >
                <div class="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <span>Скрытый</span>
                </div>
                <p class="text-[10px] text-slate-500 mt-1 leading-tight">
                  Анонимный режим в рейтинге и сообществе.
                </p>
              </button>
            </div>
          </div>

          <div class="p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <div>
              <h4 class="text-xs font-bold text-slate-900">
                Дополнительные данные
              </h4>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Необязательно. Можно заполнить позже в профиле.
              </p>
            </div>

            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Город или остров
              </label>
              <input
                v-model="form.cityInThailand"
                type="text"
                placeholder="Бангкок, Пхукет, Паттайя, Самуи..."
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
              <div class="flex flex-wrap gap-1.5 mt-2">
                <button
                  v-for="city in popularCities"
                  :key="city"
                  @click="form.cityInThailand = city"
                  type="button"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition cursor-pointer"
                  :class="form.cityInThailand === city ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'"
                >
                  {{ city }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Срок пребывания
              </label>
              <select
                v-model="form.stayDuration"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
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
        </template>

        <!-- Actions -->
        <div class="flex gap-2.5 pt-2">
          <button
            v-if="mode === 'register' && registerStep === 2"
            type="button"
            @click="registerStep = 1"
            class="flex-1 py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Назад
          </button>

          <button
            v-if="mode === 'register' && registerStep === 1"
            type="button"
            @click="goNextStep"
            class="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition shadow-lg shadow-indigo-200 active:scale-[0.99] cursor-pointer"
          >
            Далее
          </button>

          <button
            v-else
            type="submit"
            :disabled="isSubmitting"
            class="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition shadow-lg shadow-indigo-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <span v-if="isSubmitting">Пожалуйста, подождите...</span>
            <span v-else-if="mode === 'register'">Зарегистрироваться</span>
            <span v-else>Войти в аккаунт</span>
          </button>
        </div>
      </form>

      <div class="text-center mt-5 pt-4 border-t border-slate-100">
        <button
          @click="toggleMode"
          type="button"
          class="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
        >
          <span v-if="mode === 'register'">
            Уже зарегистрированы? <strong class="text-indigo-600 underline">Войти по паролю</strong>
          </span>
          <span v-else>
            Впервые у нас? <strong class="text-indigo-600 underline">Создать новый аккаунт</strong>
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="showPdTermsModal"
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-slate-800">
        <div class="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
          <h3 class="font-bold text-sm text-slate-900">Согласие на обработку персональных данных</h3>
          <button
            @click="showPdTermsModal = false"
            class="text-slate-400 hover:text-slate-700 text-sm font-bold"
            type="button"
          >
            ✕
          </button>
        </div>
        <div class="text-xs text-slate-600 space-y-2 max-h-60 overflow-y-auto pr-1 leading-relaxed">
          <p>
            1. Настоящим Пользователь подтверждает согласие на обработку персональных данных (имя, фамилия, адрес электронной почты, сведения о пребывании в Таиланде).
          </p>
          <p>
            2. Цели обработки: предоставление доступа к тренажеру «Тайский фразовик», сохранение прогресса интервальных повторений (SRS), участие в рейтинге и коммуникация в разговорных комнатах.
          </p>
          <p>
            3. Данные защищены и не передаются третьим лицам. В скрытом режиме персональные данные не отображаются другим пользователям приложения.
          </p>
          <p>
            4. Пользователь может в любой момент отозвать согласие или удалить учетную запись через настройки личного кабинета.
          </p>
        </div>
        <button
          @click="showPdTermsModal = false; form.agreePersonalData = true;"
          type="button"
          class="w-full mt-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
        >
          Принять условия
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useAuthStore } from '../authStore.js';
import { useLearningStore } from '../useLearningStore.js';
import ElephantLogo from './ElephantLogo.vue';

const authStore = useAuthStore();
const learningStore = useLearningStore();

const isOpen = computed(() => authStore.isAuthModalOpen || !authStore.isAuthenticated);
const mode = computed(() => authStore.authMode);

const registerStep = ref(1);
const isSubmitting = ref(false);
const showPassword = ref(false);
const showPdTermsModal = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const popularCities = ['Бангкок', 'Пхукет', 'Паттайя', 'Самуи', 'Чиангмай', 'Панган'];

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  gender: 'female',
  dailyGoal: 10,
  cityInThailand: '',
  stayDuration: '',
  isPrivate: false,
  agreePersonalData: false
});

const headerTitle = computed(() => {
  if (mode.value === 'login') return 'Вход в Тайский фразовик';
  if (registerStep.value === 1) return 'Создание аккаунта';
  return 'Настройка профиля';
});

const headerSubtitle = computed(() => {
  if (mode.value === 'login') return 'Введите ваши данные для продолжения тренировки';
  if (registerStep.value === 1) return 'Шаг 1 из 2 — данные для регистрации';
  return 'Шаг 2 из 2 — дневная норма, видимость и доп. данные';
});

watch(mode, () => {
  errorMessage.value = '';
  successMessage.value = '';
  registerStep.value = 1;
});

function toggleMode() {
  errorMessage.value = '';
  successMessage.value = '';
  registerStep.value = 1;
  authStore.authMode = mode.value === 'register' ? 'login' : 'register';
}

function validateStep1() {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    errorMessage.value = 'Укажите имя и фамилию.';
    return false;
  }
  if (!form.email.trim()) {
    errorMessage.value = 'Укажите email.';
    return false;
  }
  if (!form.password || form.password.length < 6) {
    errorMessage.value = 'Пароль должен содержать не менее 6 символов.';
    return false;
  }
  if (form.gender !== 'male' && form.gender !== 'female') {
    errorMessage.value = 'Выберите пол для корректных вежливых частиц.';
    return false;
  }
  if (!form.agreePersonalData) {
    errorMessage.value = 'Для регистрации необходимо дать согласие на обработку персональных данных.';
    return false;
  }
  return true;
}

function goNextStep() {
  errorMessage.value = '';
  successMessage.value = '';
  if (!validateStep1()) return;
  registerStep.value = 2;
}

function goToStep(step) {
  errorMessage.value = '';
  if (step === 2 && !validateStep1()) return;
  registerStep.value = step;
}

async function handleSubmit() {
  errorMessage.value = '';
  successMessage.value = '';

  if (mode.value === 'register') {
    if (registerStep.value === 1) {
      goNextStep();
      return;
    }
    if (!validateStep1()) {
      registerStep.value = 1;
      return;
    }
  }

  isSubmitting.value = true;

  try {
    if (mode.value === 'register') {
      const user = await authStore.registerWithEmail({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        gender: form.gender,
        dailyGoal: form.dailyGoal,
        cityInThailand: form.cityInThailand,
        stayDuration: form.stayDuration,
        isPrivate: form.isPrivate,
        agreePersonalData: form.agreePersonalData
      });

      if (user.dailyGoal) {
        learningStore.settings.dailyGoal = user.dailyGoal;
        await learningStore.updateSetting('dailyGoal', user.dailyGoal);
        learningStore.startNewSession();
      }

      successMessage.value = 'Регистрация прошла успешно!';
      registerStep.value = 1;
    } else {
      const user = await authStore.loginWithEmail(form.email, form.password);
      if (user.dailyGoal) {
        learningStore.settings.dailyGoal = user.dailyGoal;
        learningStore.startNewSession();
      }
      successMessage.value = 'С возвращением!';
    }
  } catch (err) {
    errorMessage.value = err.message || 'Произошла ошибка. Пожалуйста, попробуйте снова.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>
