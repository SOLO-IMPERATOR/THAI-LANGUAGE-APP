<template>
  <div class="w-full">
    <!-- Card Container: Bento Centerpiece -->
    <div
      v-if="phrase"
      class="bg-white rounded-[32px] p-5 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between relative transition-all duration-300 min-h-[500px] w-full max-w-full overflow-hidden"
    >
      <!-- Top Meta Bar: Category, Tags, and Tone Legend -->
      <div class="w-full pb-3 border-b border-slate-100">
        <!-- Row 1: Category & Tags with interactive tag manager -->
        <div class="flex items-center justify-between gap-2 flex-wrap min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap min-w-0 max-w-full">
            <!-- Category Badge -->
            <span class="bg-indigo-50 text-indigo-700 text-[11px] px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider border border-indigo-100 flex-shrink-0">
              {{ phrase.category }}
            </span>

            <!-- Quick Gender Switcher (Kha / Khap) -->
            <div class="inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 flex-shrink-0">
              <button
                @click="setGender('male')"
                type="button"
                class="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg transition"
                :class="store.userGender === 'male' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'"
                title="Мужской вариант: вежливая частица кхра́п / кхап (ครับ)"
              >
                👨 кхап
              </button>
              <button
                @click="setGender('female')"
                type="button"
                class="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg transition"
                :class="store.userGender === 'female' ? 'bg-white text-rose-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'"
                title="Женский вариант: вежливая частица кха̂ / кха́ (ค่ะ / คะ)"
              >
                👩 кха
              </button>
            </div>

            <!-- Phrase Tags (Contained and truncated so they do not stretch mobile) -->
            <span
              v-for="tag in phrase.tags || []"
              :key="tag"
              class="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-lg font-semibold transition max-w-[120px] sm:max-w-[160px] min-w-0"
            >
              <span class="truncate">#{{ tag }}</span>
              <button
                @click.stop="removeTag(tag)"
                type="button"
                class="text-slate-400 hover:text-rose-600 transition flex-shrink-0"
                title="Удалить тег"
              >
                ✕
              </button>
            </span>

            <!-- Add Tag Button & Inline Input Popover -->
            <div class="relative inline-block">
              <button
                @click="showTagInput = !showTagInput"
                type="button"
                class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-100 transition flex items-center gap-1 flex-shrink-0"
                title="Назначить тег этой фразе"
              >
                <span>+</span>
                <span>Тег</span>
              </button>

              <!-- Tag Popover (bounded inside viewport) -->
              <div
                v-if="showTagInput"
                class="absolute left-0 top-full mt-2 z-30 w-56 sm:w-64 max-w-[calc(100vw-3rem)] p-3 bg-white rounded-2xl shadow-xl border border-slate-200 text-xs text-slate-800 animate-in fade-in zoom-in-95"
              >
                <div class="flex justify-between items-center mb-2">
                  <span class="font-bold text-[11px] uppercase tracking-wider text-slate-500">Добавить тег:</span>
                  <button @click="showTagInput = false" class="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div class="flex gap-1 mb-2">
                  <input
                    v-model="newTagText"
                    @keyup.enter="addNewTag"
                    type="text"
                    placeholder="Например: еда, такси..."
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    @click="addNewTag"
                    type="button"
                    class="px-2.5 py-1 bg-indigo-600 text-white rounded-xl font-bold text-[10px]"
                  >
                    OK
                  </button>
                </div>

                <!-- Existing Tag Suggestions -->
                <div v-if="availableTagsToSuggest.length > 0" class="pt-1 border-t border-slate-100">
                  <span class="text-[10px] text-slate-400 block mb-1">Существующие теги:</span>
                  <div class="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    <button
                      v-for="st in availableTagsToSuggest"
                      :key="st"
                      @click="assignExistingTag(st)"
                      type="button"
                      class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition"
                    >
                      #{{ st }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tone Legend Button -->
          <button
            @click="showToneLegend = !showToneLegend"
            class="p-1.5 text-xs text-slate-400 hover:text-indigo-600 transition flex items-center gap-1 focus:outline-none flex-shrink-0"
            title="Памятка тонов тайского языка"
            type="button"
          >
            <span class="text-[11px] font-bold">Памятка тонов</span>
            <svg class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-180': showToneLegend }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Tone Legend Drawer -->
      <div
        v-if="showToneLegend"
        class="w-full my-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-1.5 transition-all animate-fadeIn"
      >
        <div class="font-bold text-indigo-700 text-xs mb-1">Обозначения тонов в русской практической транскрипции:</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
          <div><span class="text-amber-600 font-mono font-bold">а̀</span> — Низкий (\)</div>
          <div><span class="text-rose-600 font-mono font-bold">а̂</span> — Падающий (^)</div>
          <div><span class="text-sky-600 font-mono font-bold">а́</span> — Высокий (/)</div>
          <div><span class="text-emerald-600 font-mono font-bold">а̌</span> — Восходящий (v)</div>
          <div><span class="text-slate-500 font-mono font-bold">а:</span> — Долгий гласный</div>
          <div><span class="text-slate-600 font-mono font-bold">а</span> — Средний (ровный)</div>
        </div>
      </div>

      <!-- Card Main Body -->
      <div class="my-auto py-5 flex flex-col items-center text-center w-full">
        <!-- Audio Playback Controls: Primary Circle Button + Speed Switcher (0.5x, 0.7x, 1.0x, 1.2x) -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
          <!-- Main Play Button -->
          <button
            @click="playAudio()"
            :disabled="isPlayingAudio"
            class="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-75 focus:outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm cursor-pointer"
            :title="`Воспроизвести речь на выбранной скорости (${currentSpeed}×)`"
            type="button"
          >
            <span
              v-if="isPlayingAudio"
              class="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-75"
            />
            <svg
              v-if="!isPlayingAudio"
              class="w-8 h-8 ml-1 text-indigo-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg
              v-else
              class="w-7 h-7 text-indigo-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18V6l-4 4H5v4h3l4 4z" />
            </svg>
          </button>

          <!-- Interactive Speed Selector Pill Group (0.5x, 0.7x, 1.0x, 1.2x) -->
          <div class="inline-flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span class="px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider hidden xs:inline">
              Скорость
            </span>
            <button
              v-for="speed in speedOptions"
              :key="speed"
              @click="setSpeedAndPlay(speed)"
              :disabled="isPlayingAudio"
              type="button"
              class="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              :class="
                currentSpeed === speed
                  ? 'bg-white text-indigo-700 shadow-xs font-black ring-1 ring-slate-200/80 scale-102'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              "
              :title="`Установить скорость ${speed}× и прослушать`"
            >
              {{ speed === 1 ? '1.0×' : speed + '×' }}
            </button>
          </div>
        </div>

        <!-- Russian Practical Transcription -->
        <div class="mb-3 w-full px-2">
          <span class="text-[11px] uppercase tracking-widest text-slate-400 font-bold block mb-1">
            Практическая транскрипция с тонами
          </span>
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            {{ phrase.transcription_ru }}
          </h2>
        </div>

        <!-- Russian Word / Meaning Displayed on Card (as requested: "появлялось русское слово например здравствуйте и я должен на тайском его сказать") -->
        <div class="mt-1 mb-4 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 inline-block max-w-xl">
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
            Русское значение фразы:
          </span>
          <p class="text-base sm:text-lg font-bold text-slate-800">
            {{ phrase.translation_ru }}
          </p>
        </div>

        <!-- Word-by-Word Learning Section (Revealed when user clicks "Учить") -->
        <div
          v-if="isLearningExpanded"
          class="mt-3 p-4 sm:p-5 rounded-3xl bg-indigo-50/70 border border-indigo-200 w-full text-left animate-in fade-in duration-300"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                📖
              </div>
              <div>
                <h4 class="text-xs font-black uppercase tracking-wider text-indigo-900">
                  Пословный перевод и фонетический разбор
                </h4>
                <p class="text-[11px] text-slate-500">
                  Составные слова и тоновые модуляции фразы:
                </p>
              </div>
            </div>
            <button
              @click="isLearningExpanded = false"
              class="text-xs font-bold text-slate-400 hover:text-slate-600"
              type="button"
            >
              Свернуть
            </button>
          </div>

          <!-- Words Breakdown Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div
              v-for="(word, idx) in phrase.words_breakdown || []"
              :key="idx"
              class="p-3 bg-white rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-between"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black text-indigo-700 tracking-wide font-mono">
                    {{ word.transcription_ru }}
                  </span>
                </div>
                <div class="text-xs font-medium text-slate-700 mt-0.5">
                  {{ word.translation_ru }}
                </div>
              </div>

              <!-- Pronounce single word -->
              <button
                @click="playSingleWord(word.thai_hidden)"
                type="button"
                class="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Послушать это слово"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Direct Advance / Repeat actions inside "Учить" -->
          <div class="pt-3 border-t border-indigo-100 flex flex-col sm:flex-row items-center gap-2">
            <button
              @click="acceptVerificationAndAdvance"
              type="button"
              class="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-md shadow-indigo-200 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>✓ Запомнил фразу (+1 повторение)</span>
            </button>
            <button
              @click="handleRepeatInSession"
              type="button"
              class="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>🔄 Повторить в этой сессии</span>
            </button>
          </div>
        </div>

        <!-- Real-Time Pronunciation Feedback Section (Activated by "Уже знаю" or Mic) -->
        <div
          v-if="isTestingPronunciation"
          class="mt-4 p-5 rounded-3xl bg-slate-50 border border-slate-200 w-full text-left animate-in fade-in duration-300 space-y-4"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h4 class="text-xs font-black uppercase tracking-wider text-slate-900">
                  Проверка ответа (th-TH)
                </h4>
                <p class="text-[11px] text-slate-500">
                  Нажмите на микрофон для записи или подтвердите знание:
                </p>
              </div>
            </div>
            <button
              @click="closePronunciationTest"
              class="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              type="button"
            >
              ✕
            </button>
          </div>

          <!-- Microphone Big Controller -->
          <div class="flex flex-col items-center justify-center py-2">
            <button
              @click="toggleThaiListening"
              :disabled="!isSpeechSupported"
              class="relative flex items-center justify-center w-16 h-16 rounded-full transition-all active:scale-95 shadow-lg focus:outline-none cursor-pointer"
              :class="
                isListening
                  ? 'bg-rose-600 text-white shadow-rose-200 ring-4 ring-rose-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 ring-4 ring-indigo-50'
              "
              type="button"
            >
              <span
                v-if="isListening"
                class="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping"
              />
              <svg v-if="!isListening" class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <svg v-else class="w-7 h-7 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>

            <span class="text-xs font-bold mt-2 text-slate-700">
              {{ isListening ? 'Слушаю вас... Говорите на тайском' : 'Нажмите на значок микрофона и произнесите ответ' }}
            </span>
          </div>

          <!-- Spoken Transcript display -->
          <div v-if="spokenThaiText" class="p-3 bg-white rounded-2xl border border-slate-200 text-center">
            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Распознано системой (th-TH):
            </span>
            <div class="text-lg font-bold text-slate-900 font-sans">
              {{ spokenThaiText }}
            </div>
          </div>

          <!-- Listen reference audio button -->
          <div class="pt-2 border-t border-slate-200 flex items-center justify-center">
            <button
              @click="playAudio()"
              type="button"
              class="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🔊 Послушать эталон ({{ currentSpeed }}×)</span>
            </button>
          </div>


          <!-- Pronunciation Real-time Analysis Card -->
          <div
            v-if="pronunciationAnalysis"
            class="p-4 rounded-2xl border transition-all animate-in fade-in duration-200"
            :class="
              pronunciationAnalysis.score >= 80
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : pronunciationAnalysis.score >= 60
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            "
          >
            <!-- Score & Verdict Header -->
            <div class="flex items-center justify-between pb-3 border-b border-current/10">
              <div>
                <h5 class="text-xs font-black uppercase tracking-wider">
                  {{ pronunciationAnalysis.feedbackTitle }}
                </h5>
                <p class="text-[11px] opacity-90 mt-0.5">
                  {{ pronunciationAnalysis.feedbackTip }}
                </p>
              </div>

              <!-- Score Badge -->
              <div class="flex items-center gap-1">
                <span class="text-2xl font-black">{{ pronunciationAnalysis.score }}%</span>
              </div>
            </div>

            <!-- Syllable-by-syllable feedback chips -->
            <div class="pt-3 space-y-2">
              <span class="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                Пословный разбор артикуляции и тонов:
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="(syl, sIdx) in pronunciationAnalysis.syllableResults"
                  :key="sIdx"
                  class="p-2.5 rounded-xl bg-white/80 border border-current/15 text-slate-900 text-xs flex flex-col justify-between"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-indigo-700 font-mono">{{ syl.transcription_ru }}</span>
                    <span
                      class="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md"
                      :class="
                        syl.status === 'perfect'
                          ? 'bg-emerald-100 text-emerald-800'
                          : syl.status === 'good'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      "
                    >
                      {{ syl.status === 'perfect' ? 'Точно' : syl.status === 'good' ? 'Близко' : 'Слабо' }}
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-500 mt-1 leading-snug">
                    {{ syl.note }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons: Compare with Native Audio & Accept -->
            <div class="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-current/10 mt-3">
              <button
                @click="playAudio()"
                type="button"
                class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <span>🔊 Послушать эталон ({{ currentSpeed }}×)</span>
              </button>


              <button
                @click="acceptVerificationAndAdvance"
                type="button"
                class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-indigo-200 transition active:scale-95 ml-auto"
              >
                <span>Засчитать и продолжить</span>
                <span class="ml-1">→</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 5th-Day SRS Trigger Notification Banner -->
        <div
          v-if="deconstructResult && deconstructResult.deconstructed"
          class="mt-4 p-4 rounded-3xl bg-amber-50 border border-amber-200 w-full text-left animate-in fade-in"
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl flex-shrink-0">🎉</div>
            <div>
              <div class="font-extrabold text-amber-900 text-xs uppercase tracking-wider">
                Триггер 5-го дня SRS сработал!
              </div>
              <div class="text-xs text-amber-800 mt-1 leading-relaxed">
                Фраза закреплена на 5-й день и успешно деконструирована на составные слова.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Action Area: Exactly 3 primary actions -->
      <!-- 1. "Пропустить" | 2. "Учить" (показывает перевод) | 3. "Уже знаю" (проверка голосом) -->
      <div class="w-full pt-4 border-t border-slate-100">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <!-- 1. Пропустить -->
          <button
            @click="handleSkip"
            class="h-13 sm:h-14 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 active:scale-98 transition text-xs uppercase tracking-wider flex items-center justify-center shadow-xs"
            type="button"
          >
            Пропустить
          </button>

          <!-- 2. Учить (показывает пословный перевод и фонетику) -->
          <button
            @click="handleLearn"
            class="h-13 sm:h-14 bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold rounded-2xl hover:bg-indigo-100 active:scale-98 transition text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs"
            type="button"
          >
            <span>Учить</span>
            <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>

          <!-- 3. Уже знаю (проверка произношения на тайском) -->
          <button
            @click="handleAlreadyKnow"
            class="h-13 sm:h-14 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-98 transition text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            type="button"
          >
            <span>Уже знаю</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty Session State -->
    <div
      v-else
      class="bg-white rounded-[32px] p-8 sm:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 text-center flex flex-col items-center justify-center min-h-[460px]"
    >
      <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-4 text-2xl shadow-sm">
        🎉
      </div>
      <h3 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
        Сессия практики завершена!
      </h3>
      <p class="text-xs sm:text-sm text-slate-500 max-w-sm mt-2 mb-6 leading-relaxed">
        Вы выполнили текущую цель по тайским фразам. Прогресс сохранен в локальной базе SRS.
      </p>

      <!-- Action buttons: Repeat Same Session OR Start New Session -->
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
        <!-- 1. Повторить ещё раз -->
        <button
          @click="store.repeatCurrentSession()"
          type="button"
          class="w-full sm:w-auto flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl border border-slate-200 shadow-xs transition active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Повторить ещё раз</span>
        </button>

        <!-- 2. Новая сессия -->
        <button
          @click="store.startNewSession()"
          type="button"
          class="w-full sm:w-auto flex-1 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span>Новая сессия</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useLearningStore } from '../useLearningStore.js';
import { speechService } from '../speechService.js';

const store = useLearningStore();

const phrase = computed(() => store.currentPhrase);

function setGender(gender) {
  store.setUserGender(gender);
  try {
    localStorage.setItem('thai_frazovik_gender_set', 'true');
  } catch (e) {}
}

const isPlayingAudio = ref(false);
const showToneLegend = ref(false);
const isLearningExpanded = ref(false);
const isTestingPronunciation = ref(false);

const isListening = ref(false);
const isSpeechSupported = ref(speechService.isSpeechRecognitionSupported());
const spokenThaiText = ref('');
const pronunciationAnalysis = ref(null);
const deconstructResult = ref(null);

// Tags UI state
const showTagInput = ref(false);
const newTagText = ref('');

const availableTagsToSuggest = computed(() => {
  if (!phrase.value) return [];
  const currentTags = phrase.value.tags || [];
  return store.allTags.filter((t) => !currentTags.includes(t));
});

watch(
  () => phrase.value?.id,
  () => {
    // Reset state for new card
    isLearningExpanded.value = false;
    isTestingPronunciation.value = false;
    spokenThaiText.value = '';
    pronunciationAnalysis.value = null;
    deconstructResult.value = null;
    showTagInput.value = false;
    stopListening();
  }
);

onUnmounted(() => {
  speechService.stopSpeaking();
  stopListening();
});

const speedOptions = [0.5, 0.7, 1.0, 1.2];
const currentSpeed = computed(() => {
  const s = Number(store.settings?.playbackRate);
  if (speedOptions.includes(s)) return s;
  const match = speedOptions.find((opt) => Math.abs(opt - s) < 0.05);
  return match || 0.7;
});

function setSpeedAndPlay(speed) {
  store.setPlaybackRate(speed);
  playAudio(speed);
}

function playAudio(rate = null) {
  if (!phrase.value) return;
  const targetRate = rate !== null ? Number(rate) : currentSpeed.value;
  isPlayingAudio.value = true;
  speechService.speakThai(phrase.value.thai_hidden, {
    rate: targetRate,
    gender: store.userGender,
    onStart: () => {
      isPlayingAudio.value = true;
    },
    onEnd: () => {
      isPlayingAudio.value = false;
    },
    onError: () => {
      isPlayingAudio.value = false;
    }
  });
}

function playSingleWord(thaiWord) {
  if (!thaiWord) return;
  speechService.speakThai(thaiWord, { rate: Math.max(0.5, currentSpeed.value * 0.9), gender: store.userGender });
}


function handleSkip() {
  stopListening();
  store.skipCurrentPhrase();
}

function handleLearn() {
  // Reveal word-by-word breakdown and translations
  isLearningExpanded.value = !isLearningExpanded.value;
  if (isLearningExpanded.value) {
    // Also play audio to assist learning at user speed
    playAudio();
  }
}


function handleAlreadyKnow() {
  // Open answer verification panel (do NOT trigger mic automatically to avoid unsolicited permission prompts)
  isTestingPronunciation.value = true;
}

function handleRepeatInSession() {
  store.repeatInSession();
}

function closePronunciationTest() {
  stopListening();
  isTestingPronunciation.value = false;
}

function startThaiListening() {
  if (!isSpeechSupported.value || isListening.value) return;

  isListening.value = true;
  spokenThaiText.value = '';

  speechService.startThaiRecognition({
    onResult: ({ interim, final, text }) => {
      spokenThaiText.value = text;
      // Real-time analysis as user speaks
      if (phrase.value && (final || interim)) {
        try {
          pronunciationAnalysis.value = speechService.analyzeThaiPronunciation(text, phrase.value);
        } catch (analysisErr) {
          console.warn('Pronunciation analysis error:', analysisErr);
        }
      }
    },
    onError: (err) => {
      console.warn('Thai STT error:', err);
      isListening.value = false;
    },
    onEnd: (finalTranscript) => {
      isListening.value = false;
      const finalText = finalTranscript || spokenThaiText.value;
      if (phrase.value && finalText) {
        try {
          pronunciationAnalysis.value = speechService.analyzeThaiPronunciation(finalText, phrase.value);
        } catch (analysisErr) {
          console.warn('Pronunciation analysis error on end:', analysisErr);
        }
      }
    }
  });
}

function stopListening() {
  if (isListening.value) {
    speechService.stopRecognition();
    isListening.value = false;
  }
}

function toggleThaiListening() {
  if (isListening.value) {
    stopListening();
  } else {
    startThaiListening();
  }
}

async function acceptVerificationAndAdvance() {
  stopListening();
  if (!phrase.value) return;

  const res = await store.handleSuccess(phrase.value);
  deconstructResult.value = res;
  isTestingPronunciation.value = false;
}

// Tag Operations
async function addNewTag() {
  if (!newTagText.value.trim() || !phrase.value) return;
  await store.addTagToPhrase(phrase.value.id, newTagText.value);
  newTagText.value = '';
  showTagInput.value = false;
}

async function assignExistingTag(tag) {
  if (!phrase.value) return;
  await store.addTagToPhrase(phrase.value.id, tag);
  showTagInput.value = false;
}

async function removeTag(tag) {
  if (!phrase.value) return;
  await store.removeTagFromPhrase(phrase.value.id, tag);
}

// Helper methods for SRS indicators
function getSRSStageText(stage) {
  const s = Number(stage) || 0;
  if (s === 0) return 'Новая фраза • Готова к изучению';
  if (s === 1) return 'Интервал 3 дня • 1-е закрепление';
  if (s === 2) return 'Интервал 5 дней • ⚡ Триггер деконструкции';
  if (s === 3) return 'Интервал 7 дней • 1 неделя';
  if (s === 4) return 'Интервал 14 дней • 2 недели';
  return 'Интервал 30 дней • Долговременная память';
}

function getSRSIntervalDays(step) {
  const days = [3, 5, 7, 14, 30];
  return days[step - 1] || 30;
}

function getSRSIntervalTitle(step) {
  const titles = [
    '3 дня (начальное закрепление)',
    '5 дней (триггер авто-разбивки в словарь)',
    '7 дней (недельный повтор)',
    '14 дней (2 недели)',
    '30 дней (освоено)'
  ];
  return titles[step - 1] || 'Освоено';
}

function getNounEnding(number, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]];
}
</script>
