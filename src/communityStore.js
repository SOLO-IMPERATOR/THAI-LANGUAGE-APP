import { defineStore } from 'pinia';
import { db } from './db.js';
import { createRoomVoiceChat } from './voiceChat.js';

function sid(v) {
  return v === null || v === undefined ? '' : String(v);
}

function idEq(a, b) {
  return sid(a) === sid(b);
}

const SEED_USERS = [
  {
    id: '101',
    email: 'alex.bkk@gmail.com',
    firstName: 'Алексей',
    lastName: 'Смирнов',
    cityInThailand: 'Бангкок (Сукхумвит)',
    stayDuration: '1.5 года',
    weeklyScore: 420,
    isPrivate: false,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30
  },
  {
    id: '102',
    email: 'kate.phuket@gmail.com',
    firstName: 'Екатерина',
    lastName: 'Соколова',
    cityInThailand: 'Пхукет (Раваи)',
    stayDuration: '8 месяцев',
    weeklyScore: 360,
    isPrivate: false,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20
  },
  {
    id: '103',
    email: 'mikhail.cnm@gmail.com',
    firstName: 'Михаил',
    lastName: 'Волков',
    cityInThailand: 'Чиангмай (Нимман)',
    stayDuration: '2 года',
    weeklyScore: 310,
    isPrivate: false,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15
  },
  {
    id: '104',
    email: 'anna.pty@gmail.com',
    firstName: 'Анна',
    lastName: 'Морозова',
    cityInThailand: 'Паттайя (Джомтьен)',
    stayDuration: '5 месяцев',
    weeklyScore: 250,
    isPrivate: false,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10
  },
  {
    id: '105',
    email: 'secret.user@gmail.com',
    firstName: 'Дмитрий',
    lastName: 'Кузнецов',
    cityInThailand: 'Самуи',
    stayDuration: '1 год',
    weeklyScore: 210,
    isPrivate: true,
    avatarUrl: '',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5
  },
  {
    id: '106',
    email: 'olga.kpg@gmail.com',
    firstName: 'Ольга',
    lastName: 'Новикова',
    cityInThailand: 'Панган (Шритану)',
    stayDuration: '10 месяцев',
    weeklyScore: 180,
    isPrivate: false,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
  }
];

export const useCommunityStore = defineStore('community', {
  state: () => ({
    isCommunityModalOpen: false,
    activeTab: 'leaderboard',
    communityUsers: [...SEED_USERS],
    friendRequests: [],
    directMessages: [],
    rooms: [],
    roomMessages: [],
    activeChatFriend: null,
    activeRoom: null,
    selectedProfileUser: null,
    showCreateRoomModal: false,
    isInitialized: false,
    pollUserId: null,
    _pollTimer: null,
    // Voice chat
    voiceEnabled: false,
    voiceStatus: 'off',
    voicePeers: [],
    voiceMuted: false,
    _voiceSession: null
  }),

  getters: {
    friendIds: (state) => (currentUserId) => {
      const uid = sid(currentUserId);
      if (!uid) return [];
      return state.friendRequests
        .filter((r) => r.status === 'accepted' && (idEq(r.fromUserId, uid) || idEq(r.toUserId, uid)))
        .map((r) => (idEq(r.fromUserId, uid) ? sid(r.toUserId) : sid(r.fromUserId)));
    },

    friendsList: (state) => (currentUserId) => {
      const ids = state.friendIds(currentUserId);
      return state.communityUsers.filter((u) => ids.includes(sid(u.id)));
    },

    incomingRequests: (state) => (currentUserId) => {
      const uid = sid(currentUserId);
      if (!uid) return [];
      return state.friendRequests
        .filter((r) => idEq(r.toUserId, uid) && r.status === 'pending')
        .map((r) => {
          const fromUser = state.communityUsers.find((u) => idEq(u.id, r.fromUserId)) || {
            firstName: 'Пользователь',
            lastName: ''
          };
          return { ...r, fromUser };
        });
    },

    outgoingRequests: (state) => (currentUserId) => {
      const uid = sid(currentUserId);
      if (!uid) return [];
      return state.friendRequests
        .filter((r) => idEq(r.fromUserId, uid) && r.status === 'pending')
        .map((r) => {
          const toUser = state.communityUsers.find((u) => idEq(u.id, r.toUserId)) || {
            firstName: 'Пользователь',
            lastName: ''
          };
          return { ...r, toUser };
        });
    },

    leaderboard: (state) => (currentUser) => {
      const list = [...state.communityUsers];
      if (currentUser && !list.some((u) => idEq(u.id, currentUser.id))) {
        list.push({
          id: sid(currentUser.id),
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          cityInThailand: currentUser.cityInThailand || 'Таиланд',
          stayDuration: currentUser.stayDuration || '',
          weeklyScore: currentUser.weeklyScore || 0,
          isPrivate: !!currentUser.isPrivate,
          avatarUrl: currentUser.avatarUrl || ''
        });
      } else if (currentUser) {
        const idx = list.findIndex((u) => idEq(u.id, currentUser.id));
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            ...currentUser,
            id: sid(currentUser.id),
            weeklyScore: currentUser.weeklyScore || list[idx].weeklyScore || 0
          };
        }
      }
      return list.sort((a, b) => (b.weeklyScore || 0) - (a.weeklyScore || 0));
    },

    currentRoomMessages: (state) => {
      if (!state.activeRoom) return [];
      return state.roomMessages
        .filter((m) => idEq(m.roomId, state.activeRoom.id))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    },

    currentFriendMessages: (state) => (currentUserId) => {
      if (!state.activeChatFriend || !currentUserId) return [];
      const friendId = sid(state.activeChatFriend.id);
      const uid = sid(currentUserId);
      return state.directMessages
        .filter(
          (m) =>
            (idEq(m.senderId, uid) && idEq(m.receiverId, friendId)) ||
            (idEq(m.senderId, friendId) && idEq(m.receiverId, uid))
        )
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
  },

  actions: {
    async apiJson(url, opts = {}) {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        ...opts
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data;
    },

    async fetchUsersFromServer() {
      try {
        const serverUsers = await this.apiJson('/api/users');
        if (!Array.isArray(serverUsers) || serverUsers.length === 0) return;
        for (const su of serverUsers) {
          this.addUserLocally({
            id: sid(su.id),
            email: su.email,
            firstName: su.firstName || su.username?.split(' ')[0] || 'Пользователь',
            lastName: su.lastName || su.username?.split(' ').slice(1).join(' ') || '',
            gender: su.gender || 'male',
            cityInThailand: su.cityInThailand || 'Таиланд',
            stayDuration: su.stayDuration || '',
            weeklyScore: su.weeklyScore || su.xp || 50,
            isPrivate: su.isPrivate === true,
            avatarUrl: su.avatar || su.avatarUrl || ''
          });
        }
      } catch (err) {
        console.warn('Could not fetch server community users:', err);
      }
    },

    addUserLocally(user) {
      if (!user) return;
      const idx = this.communityUsers.findIndex(
        (u) => idEq(u.id, user.id) || (user.email && u.email?.toLowerCase() === user.email?.toLowerCase())
      );
      const mapped = {
        id: sid(user.id),
        email: user.email,
        firstName: user.firstName || 'Пользователь',
        lastName: user.lastName || '',
        gender: user.gender || 'female',
        cityInThailand: user.cityInThailand || user.city || 'Таиланд',
        stayDuration: user.stayDuration || '',
        weeklyScore: user.weeklyScore || user.xp || 60,
        isPrivate: user.isPrivate === true,
        avatarUrl: user.avatarUrl || user.avatar || ''
      };
      if (idx !== -1) {
        this.communityUsers[idx] = { ...this.communityUsers[idx], ...mapped };
      } else {
        this.communityUsers.unshift(mapped);
      }
    },

    mergeById(list, incoming, key = 'id') {
      const map = new Map(list.map((x) => [sid(x[key]), x]));
      for (const item of incoming || []) {
        map.set(sid(item[key]), item);
      }
      return [...map.values()];
    },

    async syncSocial() {
      const userId = sid(this.pollUserId);
      if (!userId) return;
      try {
        const params = new URLSearchParams({ userId });
        if (this.activeRoom?.id) {
          params.set('roomId', sid(this.activeRoom.id));
          const maxRoomMsg = this.roomMessages
            .filter((m) => idEq(m.roomId, this.activeRoom.id))
            .reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
          params.set('roomMsgAfter', String(maxRoomMsg));
        }
        if (this.activeChatFriend?.id) {
          params.set('dmPeerId', sid(this.activeChatFriend.id));
          const maxDm = this.directMessages
            .filter(
              (m) =>
                idEq(m.senderId, userId) ||
                idEq(m.receiverId, userId)
            )
            .filter(
              (m) =>
                idEq(m.senderId, this.activeChatFriend.id) ||
                idEq(m.receiverId, this.activeChatFriend.id)
            )
            .reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
          params.set('dmAfter', String(maxDm));
        }

        const data = await this.apiJson(`/api/social/sync?${params.toString()}`);
        if (Array.isArray(data.friendRequests)) {
          this.friendRequests = data.friendRequests.map((r) => ({
            ...r,
            fromUserId: sid(r.fromUserId),
            toUserId: sid(r.toUserId)
          }));
        }
        if (Array.isArray(data.rooms)) {
          this.rooms = data.rooms.map((r) => ({
            ...r,
            id: sid(r.id),
            creatorId: sid(r.creatorId),
            memberIds: (r.memberIds || []).map(sid),
            pendingMemberIds: (r.pendingMemberIds || []).map(sid)
          }));
          if (this.activeRoom) {
            const fresh = this.rooms.find((r) => idEq(r.id, this.activeRoom.id));
            if (fresh) this.activeRoom = fresh;
          }
        }
        if (Array.isArray(data.roomMessages) && data.roomMessages.length) {
          this.roomMessages = this.mergeById(this.roomMessages, data.roomMessages);
        }
        if (Array.isArray(data.directMessages) && data.directMessages.length) {
          this.directMessages = this.mergeById(this.directMessages, data.directMessages);
        }
      } catch (err) {
        console.warn('Social sync failed:', err);
      }
    },

    startPolling(userId) {
      this.pollUserId = sid(userId);
      if (this._pollTimer) clearInterval(this._pollTimer);
      this._pollTimer = setInterval(() => {
        this.fetchUsersFromServer();
        this.syncSocial();
      }, 4000);
    },

    async initCommunity(currentUser) {
      if (currentUser?.id) {
        this.pollUserId = sid(currentUser.id);
      }

      if (!this.isInitialized) {
        await this.fetchUsersFromServer();
        if (db.users) {
          try {
            const dexieUsers = await db.users.toArray();
            for (const du of dexieUsers) this.addUserLocally(du);
          } catch (_) {}
        }
        if (currentUser) this.syncCurrentUser(currentUser);
        this.isInitialized = true;
      } else {
        await this.fetchUsersFromServer();
        if (currentUser) this.syncCurrentUser(currentUser);
      }

      if (this.pollUserId) {
        await this.syncSocial();
        this.startPolling(this.pollUserId);
      }
    },

    syncCurrentUser(user) {
      if (!user) return;
      this.addUserLocally({
        ...user,
        id: sid(user.id),
        weeklyScore: user.weeklyScore || user.xp || 50,
        avatarUrl: user.avatarUrl || user.avatar || ''
      });
      this.pollUserId = sid(user.id);
    },

    addScoreToUser(userId, points = 10) {
      const u = this.communityUsers.find((user) => idEq(user.id, userId));
      if (u) u.weeklyScore = (u.weeklyScore || 0) + points;
    },

    setActiveTab(tab) {
      this.activeTab = tab;
      if (tab !== 'friends') this.activeChatFriend = null;
      if (tab !== 'rooms') {
        this.stopVoiceChat();
        this.activeRoom = null;
      }
    },

    async sendFriendRequest(currentUserId, targetUserId) {
      const fromUserId = sid(currentUserId);
      const toUserId = sid(targetUserId);
      if (!fromUserId || !toUserId || fromUserId === toUserId) {
        return { success: false, error: 'Некорректный запрос' };
      }
      try {
        const res = await this.apiJson('/api/friends/request', {
          method: 'POST',
          body: JSON.stringify({ fromUserId, toUserId })
        });
        if (res.request) {
          this.friendRequests = this.mergeById(this.friendRequests, [res.request]);
        }
        await this.syncSocial();
        return { success: !!res.ok, error: res.error };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    respondFriendRequest(requestId, status) {
      if (status === 'accepted') return this.acceptFriendRequest(requestId);
      return this.rejectFriendRequest(requestId);
    },

    async acceptFriendRequest(requestId) {
      return this._respond(requestId, 'accepted');
    },

    async rejectFriendRequest(requestId) {
      return this._respond(requestId, 'rejected');
    },

    async _respond(requestId, status) {
      const userId = sid(this.pollUserId);
      try {
        const res = await this.apiJson('/api/friends/respond', {
          method: 'POST',
          body: JSON.stringify({ requestId, userId, status })
        });
        await this.syncSocial();
        return res;
      } catch (e) {
        console.warn(e);
        return { ok: false, error: e.message };
      }
    },

    async cancelFriendRequest(currentUserId, targetUserId) {
      try {
        const res = await this.apiJson('/api/friends/cancel', {
          method: 'POST',
          body: JSON.stringify({
            fromUserId: sid(currentUserId),
            targetUserId: sid(targetUserId)
          })
        });
        await this.syncSocial();
        return { success: !!res.ok };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    openProfilePreview(user) {
      this.selectedProfileUser = user || null;
    },

    closeProfilePreview() {
      this.selectedProfileUser = null;
    },

    getFriendshipStatus(currentUserId, targetUserId) {
      const a = sid(currentUserId);
      const b = sid(targetUserId);
      if (!a || !b) return 'none';
      if (a === b) return 'self';
      const rel = this.friendRequests.find(
        (r) =>
          (idEq(r.fromUserId, a) && idEq(r.toUserId, b)) ||
          (idEq(r.fromUserId, b) && idEq(r.toUserId, a))
      );
      if (!rel) return 'none';
      if (rel.status === 'accepted') return 'friend';
      if (rel.status === 'pending') {
        return idEq(rel.fromUserId, a) ? 'sent' : 'received';
      }
      return 'none';
    },

    openDirectChat(friend) {
      this.activeChatFriend = { ...friend, id: sid(friend.id) };
      this.activeTab = 'friends';
      this.syncSocial();
    },

    closeDirectChat() {
      this.activeChatFriend = null;
      this.activeTab = 'friends';
    },

    async sendDirectMessage(senderId, receiverId, text) {
      if (!text || !text.trim()) return;
      try {
        const res = await this.apiJson('/api/dm', {
          method: 'POST',
          body: JSON.stringify({
            senderId: sid(senderId),
            receiverId: sid(receiverId),
            text: text.trim()
          })
        });
        if (res.message) {
          this.directMessages = this.mergeById(this.directMessages, [res.message]);
        }
      } catch (e) {
        console.warn('DM failed', e);
      }
    },

    openRoom(room) {
      this.activeRoom = room;
      this.activeTab = 'rooms';
      this.syncSocial();
    },

    closeRoom() {
      this.stopVoiceChat();
      this.activeRoom = null;
      this.activeTab = 'rooms';
    },

    async requestJoinRoom(roomId, userId) {
      try {
        const res = await this.joinRoom({ id: roomId }, { id: userId });
        return {
          ok: true,
          joined: res?.status === 'joined',
          pending: res?.status === 'pending' || res?.status === 'pending_approval',
          error: null
        };
      } catch (e) {
        return { ok: false, joined: false, error: e.message };
      }
    },

    async createRoom({
      title,
      description = '',
      creator,
      creatorId,
      creatorName,
      isPublic = true,
      requireApproval = false,
      invitedFriendIds = []
    }) {
      if (!title || !title.trim()) {
        throw new Error('Укажите название комнаты общения.');
      }
      const cId = sid(creatorId || creator?.id);
      const cName =
        creatorName ||
        `${creator?.firstName || ''} ${creator?.lastName || ''}`.trim() ||
        creator?.email ||
        'Пользователь';

      try {
        const res = await this.apiJson('/api/rooms', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            creatorId: cId,
            creatorName: cName,
            isPublic: !!isPublic,
            requireApproval: !!requireApproval,
            invitedFriendIds: (invitedFriendIds || []).map(sid)
          })
        });
        if (!res.ok || !res.room) {
          console.warn(res.error || 'Не удалось создать комнату');
          return null;
        }
        this.rooms = this.mergeById(this.rooms, [res.room]);
        this.showCreateRoomModal = false;
        this.activeRoom = res.room;
        await this.syncSocial();
        return res.room;
      } catch (e) {
        console.warn('createRoom failed', e);
        return null;
      }
    },

    async joinRoom(room, currentUser) {
      if (!room || !currentUser) return { status: 'error' };
      try {
        const res = await this.apiJson(`/api/rooms/${encodeURIComponent(sid(room.id))}/join`, {
          method: 'POST',
          body: JSON.stringify({ userId: sid(currentUser.id) })
        });
        if (res.room) {
          this.rooms = this.mergeById(this.rooms, [res.room]);
          if (res.status === 'joined') this.activeRoom = res.room;
        }
        await this.syncSocial();
        return { status: res.status || 'joined', room: res.room };
      } catch (e) {
        return { status: 'error', error: e.message };
      }
    },

    async approveJoinRequest(roomId, userId) {
      const creatorId = sid(this.pollUserId);
      const res = await this.apiJson(`/api/rooms/${encodeURIComponent(sid(roomId))}/approve`, {
        method: 'POST',
        body: JSON.stringify({ creatorId, userId: sid(userId) })
      });
      if (res.room) this.rooms = this.mergeById(this.rooms, [res.room]);
      await this.syncSocial();
    },

    async rejectJoinRequest(roomId, userId) {
      const creatorId = sid(this.pollUserId);
      const res = await this.apiJson(`/api/rooms/${encodeURIComponent(sid(roomId))}/reject`, {
        method: 'POST',
        body: JSON.stringify({ creatorId, userId: sid(userId) })
      });
      if (res.room) this.rooms = this.mergeById(this.rooms, [res.room]);
      await this.syncSocial();
    },

    async deleteRoom(roomId) {
      const userId = sid(this.pollUserId);
      if (!userId || !roomId) return { ok: false, error: 'Нет доступа' };
      try {
        const res = await this.apiJson(`/api/rooms/${encodeURIComponent(sid(roomId))}/delete`, {
          method: 'POST',
          body: JSON.stringify({ userId })
        });
        if (res.ok) {
          this.rooms = this.rooms.filter((r) => !idEq(r.id, roomId));
          if (this.activeRoom && idEq(this.activeRoom.id, roomId)) {
            await this.stopVoiceChat();
            this.activeRoom = null;
          }
          await this.syncSocial();
        }
        return res;
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    inviteFriendToRoom(roomId, friendId) {
      // Joining as member via create invite is handled at create time;
      // for live invite, approve-style join as member:
      this.apiJson(`/api/rooms/${encodeURIComponent(sid(roomId))}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId: sid(friendId) })
      }).then(() => this.syncSocial());
    },

    async sendRoomMessage(roomId, senderOrId, textOrName, maybeText = null, thaiPhrase = null) {
      let senderId;
      let senderName;
      let text;
      let phrase;

      if (maybeText !== null) {
        senderId = senderOrId;
        senderName = textOrName || 'Пользователь';
        text = maybeText;
        phrase = thaiPhrase;
      } else {
        const sender = senderOrId || {};
        senderId = sender.id;
        senderName =
          `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email || 'Пользователь';
        text = textOrName;
        phrase = maybeText || thaiPhrase;
      }

      if (!text || !text.trim()) return;
      try {
        const res = await this.apiJson(`/api/rooms/${encodeURIComponent(sid(roomId))}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            senderId: sid(senderId),
            senderName,
            text: text.trim(),
            thaiPhrase: phrase || null
          })
        });
        if (res.message) {
          this.roomMessages = this.mergeById(this.roomMessages, [res.message]);
        }
      } catch (e) {
        console.warn('Room message failed', e);
      }
    },

    async startVoiceChat(currentUser) {
      if (!this.activeRoom || !currentUser?.id) return { ok: false, error: 'Нет комнаты' };
      if (this._voiceSession) await this.stopVoiceChat();
      const displayName =
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
        currentUser.email ||
        'Ученик';
      try {
        this._voiceSession = createRoomVoiceChat({
          roomId: sid(this.activeRoom.id),
          userId: sid(currentUser.id),
          displayName,
          onPeers: (peers) => {
            this.voicePeers = peers;
          },
          onStatus: (st) => {
            this.voiceStatus = st;
            this.voiceEnabled = st === 'live' || st === 'connecting';
          },
          onError: (err) => console.warn('Voice error', err)
        });
        await this._voiceSession.start();
        this.voiceEnabled = true;
        return { ok: true };
      } catch (e) {
        this.voiceEnabled = false;
        this.voiceStatus = 'off';
        this._voiceSession = null;
        return { ok: false, error: e.message || 'Микрофон недоступен' };
      }
    },

    async stopVoiceChat() {
      if (this._voiceSession) {
        try {
          await this._voiceSession.stop();
        } catch (_) {}
      }
      this._voiceSession = null;
      this.voiceEnabled = false;
      this.voiceStatus = 'off';
      this.voicePeers = [];
      this.voiceMuted = false;
    },

    setVoiceMuted(muted) {
      this.voiceMuted = !!muted;
      this._voiceSession?.setMuted(this.voiceMuted);
    },

    openCommunity(tab = 'leaderboard') {
      this.activeTab = tab;
      this.isCommunityModalOpen = true;
      this.syncSocial();
    },

    closeCommunity() {
      this.isCommunityModalOpen = false;
      this.activeChatFriend = null;
      this.stopVoiceChat();
    }
  }
});
