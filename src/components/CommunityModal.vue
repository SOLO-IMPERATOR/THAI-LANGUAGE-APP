<template>
  <div
    v-if="communityStore.isCommunityModalOpen"
    @click.self="communityStore.closeCommunity()"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
  >
    <div
      class="w-full max-w-2xl bg-white rounded-[32px] border border-slate-100 p-5 sm:p-7 shadow-2xl text-slate-900 my-6 max-h-[92vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Close Button -->
      <button
        @click="communityStore.closeCommunity()"
        type="button"
        title="Закрыть сообщество"
        class="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer z-10"
      >
        ✕
      </button>

      <!-- Modal Header -->
      <div class="flex items-center gap-3 pb-4 border-b border-slate-100 pr-10">
        <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl shadow-xs">
          🏆
        </div>
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight leading-none">
            Сообщество и рейтинг
          </h2>
          <p class="text-xs text-slate-400 font-medium mt-1">
            Недельный рейтинг, друзья и разговорные комнаты в Таиланде
          </p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl my-4 flex-shrink-0 overflow-x-auto">
        <button
          @click="setTab('leaderboard')"
          type="button"
          class="flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          :class="activeTab === 'leaderboard' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <span>🏆 Рейтинг недели</span>
        </button>

        <button
          @click="setTab('friends')"
          type="button"
          class="flex-1 min-w-[90px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap relative"
          :class="activeTab === 'friends' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <span>👥 Друзья</span>
          <span
            v-if="incomingCount > 0"
            class="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black"
          >
            {{ incomingCount }}
          </span>
        </button>

        <button
          @click="setTab('rooms')"
          type="button"
          class="flex-1 min-w-[90px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          :class="activeTab === 'rooms' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <span>💬 Комнаты</span>
        </button>
      </div>

      <!-- Feedback Toast Banner -->
      <div
        v-if="noticeMessage"
        class="mb-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold flex items-center justify-between animate-in fade-in"
      >
        <span>{{ noticeMessage }}</span>
        <button @click="noticeMessage = ''" class="text-indigo-400 hover:text-indigo-600 text-xs cursor-pointer">✕</button>
      </div>

      <!-- Tab 1: Leaderboard (Недельный рейтинг) -->
      <div v-if="activeTab === 'leaderboard'" class="flex-1 overflow-y-auto space-y-4 pr-1">
        <!-- Current User Status Card & Privacy Hint -->
        <div class="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-amber-50/80 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-200 flex-shrink-0">
              <img
                v-if="authStore.userAvatar"
                :src="authStore.userAvatar"
                alt="Ваш аватар"
                class="w-full h-full object-cover rounded-2xl"
              />
              <span v-else>{{ authStore.userInitials }}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-900">{{ authStore.userFullName }}</span>
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-md"
                  :class="authStore.currentUser?.isPrivate ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'"
                >
                  {{ authStore.currentUser?.isPrivate ? '🔒 Скрытый режим' : '🌍 Публичный профиль' }}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Ваши очки за неделю: <strong class="text-indigo-600">{{ authStore.currentUser?.weeklyScore || 0 }} XP</strong>
                • Место в топе: <strong class="text-slate-800">#{{ currentUserRank }}</strong>
              </p>
            </div>
          </div>

          <button
            @click="authStore.openProfile()"
            type="button"
            class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
          >
            ⚙️ Изменить режим
          </button>
        </div>

        <!-- Leaderboard Table -->
        <div class="space-y-2">
          <div
            v-for="(user, index) in leaderboardUsers"
            :key="user.id"
            class="p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3"
            :class="
              isCurrentUser(user.id)
                ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200'
                : 'bg-white border-slate-100 hover:border-slate-200 shadow-xs'
            "
          >
            <!-- Rank & Avatar (Clickable to view public profile) -->
            <div
              class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer group"
              @click="openProfilePreview(user)"
              title="Нажмите, чтобы посмотреть профиль"
            >
              <!-- Medal or Rank Number -->
              <div class="w-6 sm:w-7 text-center font-black flex-shrink-0">
                <span v-if="index === 0" class="text-lg sm:text-xl">🥇</span>
                <span v-else-if="index === 1" class="text-lg sm:text-xl">🥈</span>
                <span v-else-if="index === 2" class="text-lg sm:text-xl">🥉</span>
                <span v-else class="text-xs text-slate-400 font-bold">#{{ index + 1 }}</span>
              </div>

              <!-- Avatar -->
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:ring-2 group-hover:ring-indigo-300 transition">
                <!-- If private and NOT current user -> show anonymous mask -->
                <template v-if="user.isPrivate && !isCurrentUser(user.id)">
                  <span class="text-base">👤</span>
                </template>
                <template v-else>
                  <img
                    v-if="user.avatarUrl"
                    :src="user.avatarUrl"
                    :alt="user.firstName"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-indigo-700 font-black text-xs">
                    {{ (user.firstName?.[0] || 'У') + (user.lastName?.[0] || '') }}
                  </span>
                </template>
              </div>

              <!-- User Info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
                    <template v-if="user.isPrivate && !isCurrentUser(user.id)">
                      Анонимный ученик
                    </template>
                    <template v-else>
                      {{ user.firstName }} {{ user.lastName }}
                    </template>
                  </span>

                  <!-- Gender particle badge -->
                  <span
                    v-if="user.gender"
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600"
                    :title="user.gender === 'female' ? 'Говорит с вежливой частицей кха̂ (жен.)' : 'Говорит с вежливой частицей кхра́п (муж.)'"
                  >
                    {{ user.gender === 'female' ? '👩 кха' : '👨 кхап' }}
                  </span>

                  <!-- Badge if current user -->
                  <span
                    v-if="isCurrentUser(user.id)"
                    class="text-[9px] uppercase font-black bg-indigo-600 text-white px-1.5 py-0.2 rounded"
                  >
                    Вы
                  </span>

                  <!-- Private tag -->
                  <span
                    v-if="user.isPrivate"
                    class="text-[10px] text-slate-400 font-medium flex items-center gap-0.5"
                    title="Скрытый режим: личные данные скрыты"
                  >
                    🔒
                  </span>
                </div>

                <div class="text-[10px] sm:text-[11px] text-slate-500 truncate mt-0.5">
                  <template v-if="user.isPrivate && !isCurrentUser(user.id)">
                    Таиланд • Статистика скрыта
                  </template>
                  <template v-else>
                    {{ user.cityInThailand ? `📍 ${user.cityInThailand}` : '📍 Таиланд' }}
                    {{ user.stayDuration ? `• ${user.stayDuration}` : '' }}
                  </template>
                </div>
              </div>
            </div>

            <!-- Score & Friend Action (Cleanly formatted, no text clipping) -->
            <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div class="text-right flex-shrink-0">
                <span class="text-xs sm:text-sm font-black text-indigo-700">{{ user.weeklyScore || 0 }}</span>
                <span class="text-[9px] sm:text-[10px] font-bold text-slate-400 block -mt-1">XP</span>
              </div>

              <!-- Friend Request Button (only for other users) -->
              <div v-if="!isCurrentUser(user.id)" class="flex-shrink-0">
                <!-- Already Friend -->
                <button
                  v-if="isFriend(user.id)"
                  @click="openDirectChat(user)"
                  type="button"
                  class="px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] sm:text-[11px] font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                  title="Открыть чат с другом"
                >
                  <span>💬 Чат</span>
                </button>

                <!-- Request sent -> Can cancel request -->
                <button
                  v-else-if="hasPendingRequest(user.id)"
                  @click="handleCancelFriendRequest(user.id)"
                  type="button"
                  class="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] sm:text-[11px] font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                  title="Отменить отправленную заявку"
                >
                  <span>✕ Отменить</span>
                </button>

                <!-- Add Friend -->
                <button
                  v-else
                  @click="sendFriendRequest(user)"
                  type="button"
                  class="px-2 sm:px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] sm:text-[11px] font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                >
                  <span>+ В друзья</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Friends & Requests (Друзья и заявки) -->
      <div v-else-if="activeTab === 'friends'" class="flex-1 overflow-y-auto space-y-4 pr-1">
        <!-- Direct Chat Sub-view (if active chat friend is selected) -->
        <div v-if="communityStore.activeChatFriend" class="flex flex-col h-[400px]">
          <!-- Chat Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <button
                @click="communityStore.closeDirectChat()"
                type="button"
                class="text-xs font-bold text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ← Назад к друзьям
              </button>
              <div class="font-bold text-xs text-slate-900">
                Диалог: {{ communityStore.activeChatFriend.firstName }} {{ communityStore.activeChatFriend.lastName }}
              </div>
            </div>
            <div class="text-[11px] text-slate-400">
              {{ communityStore.activeChatFriend.cityInThailand || 'Таиланд' }}
            </div>
          </div>

          <!-- Chat Messages Body -->
          <div class="flex-1 overflow-y-auto p-3 space-y-2.5">
            <div
              v-for="msg in friendMessages"
              :key="msg.id"
              class="flex flex-col max-w-[80%]"
              :class="msg.senderId === currentUserId ? 'ml-auto items-end' : 'mr-auto items-start'"
            >
              <div
                class="p-3 rounded-2xl text-xs font-medium"
                :class="
                  msg.senderId === currentUserId
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-100 text-slate-900 rounded-bl-none'
                "
              >
                {{ msg.text }}
              </div>
              <span class="text-[9px] text-slate-400 px-1 mt-0.5">
                {{ formatTime(msg.timestamp) }}
              </span>
            </div>

            <div v-if="friendMessages.length === 0" class="text-center py-10 text-xs text-slate-400">
              Напишите первое сообщение или поделитесь тайской фразой!
            </div>
          </div>

          <!-- Chat Input Bar -->
          <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
            <input
              v-model="newDirectMessageText"
              @keyup.enter="handleSendDirectMessage"
              type="text"
              placeholder="Напишите сообщение другу..."
              class="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              @click="handleSendDirectMessage"
              type="button"
              class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition cursor-pointer"
            >
              Отправить
            </button>
          </div>
        </div>

        <!-- Normal Friends & Requests List View -->
        <div v-else class="space-y-5">
          <!-- Section 1: Incoming Friend Requests -->
          <div v-if="incomingFriendRequests.length > 0" class="space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <span>🔔 Входящие заявки в друзья ({{ incomingFriendRequests.length }})</span>
            </h4>

            <div class="space-y-2">
              <div
                v-for="req in incomingFriendRequests"
                :key="req.id"
                class="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-xs">
                    {{ req.fromUser?.firstName?.[0] || 'П' }}
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-900">
                      {{ req.fromUser?.firstName }} {{ req.fromUser?.lastName }}
                    </div>
                    <div class="text-[10px] text-slate-500">
                      {{ req.fromUser?.cityInThailand || 'Таиланд' }} • хочет добавить вас в друзья
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    @click="respondRequest(req.id, 'accepted')"
                    type="button"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Принять
                  </button>
                  <button
                    @click="respondRequest(req.id, 'rejected')"
                    type="button"
                    class="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Friends List -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ваши друзья ({{ myFriends.length }})
              </h4>
              <span class="text-[11px] text-indigo-600 font-semibold cursor-pointer" @click="setTab('leaderboard')">
                + Найти в рейтинге
              </span>
            </div>

            <div v-if="myFriends.length > 0" class="space-y-2">
              <div
                v-for="friend in myFriends"
                :key="friend.id"
                class="p-3 bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl overflow-hidden bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                    <img v-if="friend.avatarUrl" :src="friend.avatarUrl" class="w-full h-full object-cover" />
                    <span v-else>{{ (friend.firstName?.[0] || 'Д') + (friend.lastName?.[0] || '') }}</span>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-900">
                      {{ friend.firstName }} {{ friend.lastName }}
                    </div>
                    <div class="text-[11px] text-slate-500">
                      {{ friend.cityInThailand ? `📍 ${friend.cityInThailand}` : '📍 Таиланд' }}
                      • {{ friend.weeklyScore || 0 }} XP
                    </div>
                  </div>
                </div>

                <button
                  @click="openDirectChat(friend)"
                  type="button"
                  class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>💬 Написать</span>
                </button>
              </div>
            </div>

            <div v-else class="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500">
              У вас пока нет добавленных друзей. Перейдите во вкладку «Рейтинг недели» и отправьте заявку другим ученикам!
            </div>
          </div>

          <!-- Section 3: Outgoing Friend Requests (Cancellation enabled) -->
          <div v-if="outgoingFriendRequests.length > 0" class="space-y-2 pt-2 border-t border-slate-100">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">
              Исходящие заявки ({{ outgoingFriendRequests.length }})
            </h4>

            <div class="space-y-2">
              <div
                v-for="req in outgoingFriendRequests"
                :key="req.id"
                class="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {{ req.toUser?.firstName?.[0] || 'П' }}
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-slate-900 truncate">
                      {{ req.toUser?.firstName }} {{ req.toUser?.lastName }}
                    </div>
                    <div class="text-[10px] text-slate-500 truncate">
                      {{ req.toUser?.cityInThailand || 'Таиланд' }} • Ожидает ответа
                    </div>
                  </div>
                </div>

                <button
                  @click="handleCancelFriendRequest(req.toUserId)"
                  type="button"
                  class="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold transition cursor-pointer flex-shrink-0 whitespace-nowrap"
                  title="Отменить заявку"
                >
                  ✕ Отменить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Rooms (Разговорные комнаты) -->
      <div v-else-if="activeTab === 'rooms'" class="flex-1 overflow-y-auto space-y-4 pr-1">
        <!-- Room Chat Sub-view (if a room is active) -->
        <div v-if="communityStore.activeRoom" class="flex flex-col h-[420px]">
          <!-- Room Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <button
                @click="communityStore.closeRoom()"
                type="button"
                class="text-xs font-bold text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ← Все комнаты
              </button>
              <div>
                <div class="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span>{{ communityStore.activeRoom.title }}</span>
                  <span
                    class="text-[9px] uppercase font-black px-1.5 py-0.2 rounded"
                    :class="communityStore.activeRoom.isPublic ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'"
                  >
                    {{ communityStore.activeRoom.isPublic ? 'Публичная' : 'Приватная' }}
                  </span>
                </div>
                <p class="text-[10px] text-slate-400 truncate max-w-sm">
                  {{ communityStore.activeRoom.description }}
                </p>
              </div>
            </div>
            <div class="text-[11px] text-slate-400 font-semibold">
              Участников: {{ (communityStore.activeRoom.memberIds || []).length }}
            </div>
          </div>

          <!-- Room Messages Body -->
          <div class="flex-1 overflow-y-auto p-3 space-y-3">
            <div
              v-for="msg in roomMessages"
              :key="msg.id"
              class="flex flex-col max-w-[85%]"
              :class="msg.senderId === currentUserId ? 'ml-auto items-end' : 'mr-auto items-start'"
            >
              <span class="text-[10px] font-bold text-slate-500 px-1 mb-0.5">
                {{ msg.senderName }}
              </span>

              <div
                class="p-3 rounded-2xl text-xs"
                :class="
                  msg.senderId === currentUserId
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-100 text-slate-900 rounded-bl-none'
                "
              >
                {{ msg.text }}
              </div>

              <span class="text-[9px] text-slate-400 px-1 mt-0.5">
                {{ formatTime(msg.timestamp) }}
              </span>
            </div>

            <div v-if="roomMessages.length === 0" class="text-center py-10 text-xs text-slate-400">
              В комнате пока нет сообщений. Начните обсуждение фраз на тайском!
            </div>
          </div>

          <!-- Room Input Bar -->
          <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
            <input
              v-model="newRoomMessageText"
              @keyup.enter="handleSendRoomMessage"
              type="text"
              placeholder="Напишите в комнату (например: как сказать счет пожалуйста?)..."
              class="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              @click="handleSendRoomMessage"
              type="button"
              class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition cursor-pointer"
            >
              Отправить
            </button>
          </div>
        </div>

        <!-- Rooms Overview List -->
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">
                Разговорные комнаты
              </h4>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Общайтесь на тайском, задавайте вопросы экспатам и делитесь опытом
              </p>
            </div>
            <button
              @click="showCreateRoom = true"
              type="button"
              class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>+ Создать комнату</span>
            </button>
          </div>

          <!-- Create Room Inline Form -->
          <div
            v-if="showCreateRoom"
            class="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-slate-900 space-y-3 animate-in fade-in"
          >
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black uppercase tracking-wider text-indigo-900">
                Новая разговорная комната
              </h5>
              <button @click="showCreateRoom = false" class="text-xs text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕ Отмена
              </button>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Название комнаты</label>
              <input
                v-model="newRoomTitle"
                type="text"
                placeholder="Например: Тайский сленг на Самуи"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Описание и цель</label>
              <input
                v-model="newRoomDesc"
                type="text"
                placeholder="Для кого комната и какие фразы отрабатываем"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer text-xs font-semibold">
                <input type="radio" v-model="newRoomIsPublic" :value="true" />
                <span>🌍 Публичная</span>
              </label>
              <label class="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer text-xs font-semibold">
                <input type="radio" v-model="newRoomIsPublic" :value="false" />
                <span>🔒 Только для друзей</span>
              </label>
            </div>

            <!-- Approval Mode (Режим по одобрению - Requirement 8) -->
            <label class="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer text-xs">
              <input
                type="checkbox"
                v-model="newRoomRequireApproval"
                class="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span class="font-bold text-slate-800 block">✋ Вход только по одобрению создателя</span>
                <span class="text-[11px] text-slate-500 block mt-0.5">Новые участники смогут присоединиться только после того, как вы подтвердите их заявку</span>
              </div>
            </label>

            <button
              @click="handleCreateRoom"
              type="button"
              class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer"
            >
              Создать и войти
            </button>
          </div>

          <!-- Empty State if no rooms (Requirement 5) -->
          <div
            v-if="communityStore.rooms.length === 0 && !showCreateRoom"
            class="text-center py-12 px-4 bg-slate-50 border border-slate-100 rounded-3xl space-y-3"
          >
            <div class="text-3xl">💬</div>
            <h4 class="text-sm font-bold text-slate-700">Нет активных комнат</h4>
            <p class="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Тестовые комнаты удалены. Создайте первую тематическую комнату для практики тайского языка с другими учениками!
            </p>
            <button
              @click="showCreateRoom = true"
              type="button"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              + Создать комнату
            </button>
          </div>

          <!-- Rooms Cards Grid -->
          <div v-else class="space-y-3">
            <div
              v-for="room in communityStore.rooms"
              :key="room.id"
              class="p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h5 class="text-xs font-bold text-slate-900">{{ room.title }}</h5>
                  <span
                    class="text-[9px] uppercase font-black px-2 py-0.5 rounded-full"
                    :class="room.isPublic ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'"
                  >
                    {{ room.isPublic ? 'Публичная' : 'Для друзей' }}
                  </span>
                  <span
                    v-if="room.requireApproval"
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                  >
                    ✋ По одобрению
                  </span>
                </div>
                <p class="text-[11px] text-slate-500 leading-snug">
                  {{ room.description }}
                </p>
                <div class="text-[10px] text-slate-400">
                  Создатель: {{ room.creatorName }} • Участников: {{ (room.memberIds || []).length }}
                </div>
              </div>

              <!-- Action button for room -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  @click="handleJoinRoom(room)"
                  type="button"
                  class="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
                  :class="
                    isRoomMember(room)
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  "
                >
                  {{ isRoomMember(room) ? 'Войти в чат' : room.requireApproval ? 'Запросить доступ' : 'Присоединиться' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Public / Private User Profile Preview Card (Requirement 4) -->
    <div
      v-if="previewUser"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      @click.self="closeProfilePreview"
    >
      <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 relative animate-in zoom-in-95">
        <!-- Close Button -->
        <button
          @click="closeProfilePreview"
          type="button"
          class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition cursor-pointer"
        >
          ✕
        </button>

        <!-- Avatar & Header -->
        <div class="flex flex-col items-center text-center pt-1">
          <div class="w-20 h-20 rounded-3xl overflow-hidden bg-slate-100 border-2 border-indigo-100 flex items-center justify-center shadow-xs">
            <template v-if="previewUser.isPrivate && !isCurrentUser(previewUser.id)">
              <span class="text-3xl">👤</span>
            </template>
            <template v-else>
              <img
                v-if="previewUser.avatarUrl"
                :src="previewUser.avatarUrl"
                :alt="previewUser.firstName"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-2xl font-black text-indigo-700">
                {{ (previewUser.firstName?.[0] || 'У') + (previewUser.lastName?.[0] || '') }}
              </span>
            </template>
          </div>

          <h3 class="text-base font-bold text-slate-900 mt-3 flex items-center gap-1.5 justify-center">
            <template v-if="previewUser.isPrivate && !isCurrentUser(previewUser.id)">
              Анонимный ученик
            </template>
            <template v-else>
              {{ previewUser.firstName }} {{ previewUser.lastName }}
            </template>
            <span
              v-if="isCurrentUser(previewUser.id)"
              class="text-[9px] uppercase font-black bg-indigo-600 text-white px-1.5 py-0.2 rounded"
            >
              Вы
            </span>
          </h3>

          <!-- Mode & Location badges -->
          <div class="mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
            <span
              class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
              :class="previewUser.isPrivate ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'"
            >
              {{ previewUser.isPrivate ? '🔒 Скрытый режим' : '🌍 Публичный профиль' }}
            </span>
            <span
              v-if="!previewUser.isPrivate || isCurrentUser(previewUser.id)"
              class="text-slate-500 text-xs font-medium"
            >
              {{ previewUser.cityInThailand ? `📍 ${previewUser.cityInThailand}` : '📍 Таиланд' }}
            </span>
          </div>
        </div>

        <!-- Profile Stats Info -->
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
          <div class="flex items-center justify-between py-1 border-b border-slate-200/60">
            <span class="text-slate-500 font-medium">Очки за неделю</span>
            <span class="font-black text-indigo-700">{{ previewUser.weeklyScore || 0 }} XP</span>
          </div>
          <div
            v-if="!previewUser.isPrivate || isCurrentUser(previewUser.id)"
            class="flex items-center justify-between py-1 border-b border-slate-200/60"
          >
            <span class="text-slate-500 font-medium">Срок в Таиланде</span>
            <span class="font-bold text-slate-800">{{ previewUser.stayDuration || 'Не указан' }}</span>
          </div>
          <div class="flex items-center justify-between py-1">
            <span class="text-slate-500 font-medium">Видимость</span>
            <span class="font-bold text-slate-800">
              {{ previewUser.isPrivate ? 'Персональные данные скрыты' : 'Открытый профиль' }}
            </span>
          </div>
        </div>

        <!-- Explanatory note if private -->
        <div
          v-if="previewUser.isPrivate && !isCurrentUser(previewUser.id)"
          class="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 leading-snug"
        >
          Этот ученик активировал приватный режим. Фото и имя защищены настройками конфиденциальности.
        </div>

        <!-- Action buttons in preview card -->
        <div class="space-y-2 pt-1">
          <!-- Current User self -->
          <button
            v-if="isCurrentUser(previewUser.id)"
            @click="closeProfilePreview(); authStore.openProfile()"
            type="button"
            class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            ⚙️ Редактировать свой профиль
          </button>

          <!-- Friend -->
          <button
            v-else-if="isFriend(previewUser.id)"
            @click="closeProfilePreview(); openDirectChat(previewUser)"
            type="button"
            class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>💬 Открыть диалог</span>
          </button>

          <!-- Pending Outgoing Request Sent -->
          <button
            v-else-if="hasPendingRequest(previewUser.id)"
            @click="handleCancelFriendRequest(previewUser.id); closeProfilePreview()"
            type="button"
            class="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>✕ Отменить отправленную заявку</span>
          </button>

          <!-- Not friend and public -->
          <button
            v-else-if="!previewUser.isPrivate"
            @click="sendFriendRequest(previewUser); closeProfilePreview()"
            type="button"
            class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>+ Добавить в друзья</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useCommunityStore } from '../communityStore.js';
import { useAuthStore } from '../authStore.js';

const communityStore = useCommunityStore();
const authStore = useAuthStore();

const activeTab = computed(() => communityStore.activeTab);
const currentUserId = computed(() => authStore.currentUser?.id || 0);

const noticeMessage = ref('');
const newDirectMessageText = ref('');
const newRoomMessageText = ref('');

// Create Room form state
const showCreateRoom = ref(false);
const newRoomTitle = ref('');
const newRoomDesc = ref('');
const newRoomIsPublic = ref(true);
const newRoomRequireApproval = ref(false);

function setTab(tab) {
  communityStore.setActiveTab(tab);
}

// User profile preview (Requirement 4)
const previewUser = computed(() => communityStore.selectedProfileUser);

function openProfilePreview(user) {
  communityStore.openProfilePreview(user);
}

function closeProfilePreview() {
  communityStore.closeProfilePreview();
}

// Leaderboard list
const leaderboardUsers = computed(() => communityStore.leaderboard(authStore.currentUser));

// Current user rank
const currentUserRank = computed(() => {
  const idx = leaderboardUsers.value.findIndex((u) => u.id === currentUserId.value);
  return idx !== -1 ? idx + 1 : 1;
});

function isCurrentUser(uid) {
  return currentUserId.value === uid;
}

function isFriend(uid) {
  return communityStore.friendIds(currentUserId.value).includes(uid);
}

function hasPendingRequest(uid) {
  return communityStore.friendRequests.some(
    (r) =>
      r.status === 'pending' &&
      ((r.fromUserId === currentUserId.value && r.toUserId === uid) ||
        (r.toUserId === currentUserId.value && r.fromUserId === uid))
  );
}

// Friends
const myFriends = computed(() => communityStore.friendsList(currentUserId.value));
const incomingFriendRequests = computed(() => communityStore.incomingRequests(currentUserId.value));
const outgoingFriendRequests = computed(() => communityStore.outgoingRequests(currentUserId.value));
const incomingCount = computed(() => incomingFriendRequests.value.length);

// Chat messages
const friendMessages = computed(() => communityStore.currentFriendMessages(currentUserId.value));
const roomMessages = computed(() => communityStore.currentRoomMessages);

function sendFriendRequest(targetUser) {
  if (!currentUserId.value) {
    authStore.openAuth('login');
    return;
  }
  const res = communityStore.sendFriendRequest(currentUserId.value, targetUser.id);
  if (res.success) {
    noticeMessage.value = `Заявка в друзья пользователю ${targetUser.firstName} отправлена!`;
  } else {
    noticeMessage.value = res.error;
  }
}

function handleCancelFriendRequest(targetUserId) {
  if (!currentUserId.value) return;
  const res = communityStore.cancelFriendRequest(currentUserId.value, targetUserId);
  if (res.success) {
    noticeMessage.value = 'Заявка в друзья успешно отменена.';
  }
}

function respondRequest(requestId, status) {
  communityStore.respondFriendRequest(requestId, status);
  if (status === 'accepted') {
    noticeMessage.value = 'Заявка принята! Теперь вы друзья и можете общаться.';
  }
}

function openDirectChat(friend) {
  communityStore.openDirectChat(friend);
}

function handleSendDirectMessage() {
  if (!newDirectMessageText.value.trim() || !communityStore.activeChatFriend) return;
  communityStore.sendDirectMessage(
    currentUserId.value,
    communityStore.activeChatFriend.id,
    newDirectMessageText.value.trim()
  );
  newDirectMessageText.value = '';
}

function isRoomMember(room) {
  return Array.isArray(room.memberIds) && room.memberIds.includes(currentUserId.value);
}

function handleJoinRoom(room) {
  if (!currentUserId.value) {
    authStore.openAuth('login');
    return;
  }

  if (isRoomMember(room)) {
    communityStore.openRoom(room);
    return;
  }

  const res = communityStore.requestJoinRoom(room.id, currentUserId.value);
  if (res.joined) {
    communityStore.openRoom(room);
  } else {
    noticeMessage.value = 'Запрос на вступление в комнату отправлен создателю.';
  }
}

function handleCreateRoom() {
  if (!newRoomTitle.value.trim()) return;
  const room = communityStore.createRoom({
    title: newRoomTitle.value.trim(),
    description: newRoomDesc.value.trim() || 'Практика тайского языка',
    creatorId: currentUserId.value,
    creatorName: authStore.userFullName,
    isPublic: newRoomIsPublic.value,
    requireApproval: newRoomRequireApproval.value
  });

  showCreateRoom.value = false;
  newRoomTitle.value = '';
  newRoomDesc.value = '';
  newRoomRequireApproval.value = false;
  communityStore.openRoom(room);
}

function handleSendRoomMessage() {
  if (!newRoomMessageText.value.trim() || !communityStore.activeRoom) return;
  communityStore.sendRoomMessage(
    communityStore.activeRoom.id,
    currentUserId.value,
    authStore.userFullName,
    newRoomMessageText.value.trim()
  );
  newRoomMessageText.value = '';
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>
