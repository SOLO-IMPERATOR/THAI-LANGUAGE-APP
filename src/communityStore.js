import { defineStore } from 'pinia';
import { db } from './db.js';

// Default seed community users with realistic active profiles in Thailand
const SEED_USERS = [
  {
    id: 101,
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
    id: 102,
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
    id: 103,
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
    id: 104,
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
    id: 105,
    email: 'secret.user@gmail.com',
    firstName: 'Дмитрий',
    lastName: 'Кузнецов',
    cityInThailand: 'Самуи',
    stayDuration: '1 год',
    weeklyScore: 210,
    isPrivate: true, // Скрытый режим!
    avatarUrl: '',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5
  },
  {
    id: 106,
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

// Conversation rooms (empty by default, user-created)
const SEED_ROOMS = [];

export const useCommunityStore = defineStore('community', {
  state: () => ({
    isCommunityModalOpen: false,
    activeTab: 'leaderboard', // 'leaderboard' | 'friends' | 'rooms' | 'chat'
    communityUsers: [...SEED_USERS],
    friendRequests: [], // { id, fromUserId, toUserId, status: 'pending'|'accepted'|'rejected', createdAt }
    directMessages: [], // { id, senderId, receiverId, text, timestamp }
    rooms: [],
    roomMessages: [], // { id, roomId, senderId, senderName, text, timestamp, thaiPhrase }
    activeChatFriend: null, // Friend object currently open in direct message
    activeRoom: null, // Room object currently open
    selectedProfileUser: null, // User profile currently open in preview card
    showCreateRoomModal: false,
    isInitialized: false
  }),

  getters: {
    // Current user's friend IDs (accepted requests only)
    friendIds: (state) => (currentUserId) => {
      if (!currentUserId) return [];
      const accepted = state.friendRequests.filter(
        (r) => (r.fromUserId === currentUserId || r.toUserId === currentUserId) && r.status === 'accepted'
      );
      return accepted.map((r) => (r.fromUserId === currentUserId ? r.toUserId : r.fromUserId));
    },

    // Current user's confirmed friend user objects
    friendsList: (state) => (currentUserId) => {
      const ids = state.friendIds(currentUserId);
      return state.communityUsers.filter((u) => ids.includes(u.id));
    },

    // Pending incoming friend requests for current user
    incomingRequests: (state) => (currentUserId) => {
      if (!currentUserId) return [];
      return state.friendRequests
        .filter((r) => r.toUserId === currentUserId && r.status === 'pending')
        .map((r) => {
          const fromUser = state.communityUsers.find((u) => u.id === r.fromUserId) || {
            firstName: 'Пользователь',
            lastName: ''
          };
          return {
            ...r,
            fromUser
          };
        });
    },

    // Pending outgoing friend requests sent by current user
    outgoingRequests: (state) => (currentUserId) => {
      if (!currentUserId) return [];
      return state.friendRequests
        .filter((r) => r.fromUserId === currentUserId && r.status === 'pending')
        .map((r) => {
          const toUser = state.communityUsers.find((u) => u.id === r.toUserId) || {
            firstName: 'Пользователь',
            lastName: ''
          };
          return {
            ...r,
            toUser
          };
        });
    },

    // Leaderboard ranking list (includes current user and other community members)
    leaderboard: (state) => (currentUser) => {
      const list = [...state.communityUsers];
      if (currentUser && !list.some((u) => u.id === currentUser.id)) {
        list.push({
          id: currentUser.id,
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
        // Sync current user's weekly score and privacy
        const idx = list.findIndex((u) => u.id === currentUser.id);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            ...currentUser,
            weeklyScore: currentUser.weeklyScore || list[idx].weeklyScore || 0
          };
        }
      }

      // Sort by weeklyScore descending
      return list.sort((a, b) => (b.weeklyScore || 0) - (a.weeklyScore || 0));
    },

    // Room chat messages for active room
    currentRoomMessages: (state) => {
      if (!state.activeRoom) return [];
      return state.roomMessages.filter((m) => m.roomId === state.activeRoom.id);
    },

    // Direct chat messages between current user and active friend
    currentFriendMessages: (state) => (currentUserId) => {
      if (!state.activeChatFriend || !currentUserId) return [];
      const friendId = state.activeChatFriend.id;
      return state.directMessages.filter(
        (m) =>
          (m.senderId === currentUserId && m.receiverId === friendId) ||
          (m.senderId === friendId && m.receiverId === currentUserId)
      );
    }
  },

  actions: {
    async fetchUsersFromServer() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const serverUsers = await res.json();
          if (Array.isArray(serverUsers) && serverUsers.length > 0) {
            for (const su of serverUsers) {
              const existingIdx = this.communityUsers.findIndex(
                (u) => u.id === su.id || (su.email && u.email?.toLowerCase() === su.email?.toLowerCase())
              );
              const mapped = {
                id: su.id,
                email: su.email,
                firstName: su.firstName || su.username?.split(' ')[0] || 'Пользователь',
                lastName: su.lastName || su.username?.split(' ').slice(1).join(' ') || '',
                gender: su.gender || 'male',
                cityInThailand: su.cityInThailand || 'Таиланд',
                stayDuration: su.stayDuration || '',
                weeklyScore: su.weeklyScore || su.xp || 50,
                isPrivate: su.isPrivate === true,
                avatarUrl: su.avatar || su.avatarUrl || ''
              };
              if (existingIdx !== -1) {
                this.communityUsers[existingIdx] = {
                  ...this.communityUsers[existingIdx],
                  ...mapped
                };
              } else {
                this.communityUsers.push(mapped);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch server community users:', err);
      }
    },

    addUserLocally(user) {
      if (!user) return;
      const idx = this.communityUsers.findIndex(
        (u) => u.id === user.id || (user.email && u.email?.toLowerCase() === user.email?.toLowerCase())
      );
      const mapped = {
        id: user.id,
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

    async initCommunity(currentUser) {
      if (this.isInitialized) {
        await this.fetchUsersFromServer();
        return;
      }

      try {
        // Load friend requests from Dexie or localStorage
        const storedRequests = localStorage.getItem('thai_frazovik_friend_requests');
        if (storedRequests) {
          this.friendRequests = JSON.parse(storedRequests);
        }

        const storedDirectMsgs = localStorage.getItem('thai_frazovik_direct_messages');
        if (storedDirectMsgs) {
          this.directMessages = JSON.parse(storedDirectMsgs);
        }

        const storedRooms = localStorage.getItem('thai_frazovik_rooms');
        if (storedRooms) {
          const parsed = JSON.parse(storedRooms);
          this.rooms = Array.isArray(parsed) ? parsed.filter((r) => r.id !== 1 && r.id !== 2 && r.id !== 3) : [];
          this.saveRooms();
        } else {
          this.rooms = [];
        }

        const storedRoomMsgs = localStorage.getItem('thai_frazovik_room_messages');
        if (storedRoomMsgs) {
          const parsedMsgs = JSON.parse(storedRoomMsgs);
          this.roomMessages = Array.isArray(parsedMsgs) ? parsedMsgs.filter((m) => m.roomId !== 1 && m.roomId !== 2 && m.roomId !== 3) : [];
          this.saveRoomMessages();
        } else {
          this.roomMessages = [];
        }

        // Fetch registered users from server and Dexie
        await this.fetchUsersFromServer();

        // Also fetch from Dexie users table if available
        if (db.users) {
          try {
            const dexieUsers = await db.users.toArray();
            for (const du of dexieUsers) {
              this.addUserLocally(du);
            }
          } catch (dexErr) {}
        }

        // Add current user to community if authenticated
        if (currentUser) {
          this.syncCurrentUser(currentUser);
        }

        // Setup background polling so when another user registers on another device, they appear
        if (typeof window !== 'undefined') {
          setInterval(() => {
            this.fetchUsersFromServer();
          }, 15000);
        }
      } catch (err) {
        console.warn('Community init warning:', err);
      } finally {
        this.isInitialized = true;
      }
    },

    syncCurrentUser(user) {
      if (!user) return;
      const idx = this.communityUsers.findIndex(
        (u) => u.id === user.id || (user.email && u.email?.toLowerCase() === user.email?.toLowerCase())
      );
      const userItem = {
        id: user.id,
        email: user.email,
        firstName: user.firstName || 'Пользователь',
        lastName: user.lastName || '',
        gender: user.gender || 'male',
        cityInThailand: user.cityInThailand || 'Таиланд',
        stayDuration: user.stayDuration || '',
        weeklyScore: user.weeklyScore || 50,
        isPrivate: !!user.isPrivate,
        avatarUrl: user.avatarUrl || ''
      };

      if (idx !== -1) {
        this.communityUsers[idx] = { ...this.communityUsers[idx], ...userItem };
      } else {
        this.communityUsers.unshift(userItem);
      }
    },

    addScoreToUser(userId, points = 10) {
      const u = this.communityUsers.find((user) => user.id === userId);
      if (u) {
        u.weeklyScore = (u.weeklyScore || 0) + points;
      }
    },

    // Set active navigation tab in community modal
    setActiveTab(tab) {
      this.activeTab = tab;
      if (tab !== 'friends') {
        this.activeChatFriend = null;
      }
      if (tab !== 'rooms') {
        this.activeRoom = null;
      }
    },

    // Send friend request
    sendFriendRequest(currentUserId, targetUserId) {
      if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
        return { success: false, error: 'Некорректный запрос' };
      }

      // Check if relationship already exists
      const existing = this.friendRequests.find(
        (r) =>
          (r.fromUserId === currentUserId && r.toUserId === targetUserId) ||
          (r.fromUserId === targetUserId && r.toUserId === currentUserId)
      );

      if (existing) {
        if (existing.status === 'rejected') {
          existing.status = 'pending';
          existing.fromUserId = currentUserId;
          existing.toUserId = targetUserId;
          this.saveFriendRequests();
          return { success: true };
        }
        if (existing.status === 'accepted') {
          return { success: false, error: 'Вы уже друзья' };
        }
        return { success: false, error: 'Заявка уже отправлена' };
      }

      const newReq = {
        id: Date.now(),
        fromUserId: currentUserId,
        toUserId: targetUserId,
        status: 'pending',
        createdAt: Date.now()
      };

      this.friendRequests.push(newReq);
      this.saveFriendRequests();
      return { success: true };
    },

    // Respond to incoming friend request
    respondFriendRequest(requestId, status) {
      if (status === 'accepted') {
        this.acceptFriendRequest(requestId);
      } else {
        this.rejectFriendRequest(requestId);
      }
    },

    // Accept friend request ("Другом становится только после принятия заявки")
    acceptFriendRequest(requestId) {
      const req = this.friendRequests.find((r) => r.id === requestId);
      if (req) {
        req.status = 'accepted';
        this.saveFriendRequests();
      }
    },

    // Reject friend request
    rejectFriendRequest(requestId) {
      const req = this.friendRequests.find((r) => r.id === requestId);
      if (req) {
        req.status = 'rejected';
        this.saveFriendRequests();
      }
    },

    // Cancel outgoing friend request
    cancelFriendRequest(currentUserId, targetUserIdOrReqId) {
      if (!currentUserId || !targetUserIdOrReqId) return { success: false };
      const idx = this.friendRequests.findIndex(
        (r) =>
          r.status === 'pending' &&
          ((r.fromUserId === currentUserId && r.toUserId === targetUserIdOrReqId) ||
            r.id === targetUserIdOrReqId)
      );
      if (idx !== -1) {
        this.friendRequests.splice(idx, 1);
        this.saveFriendRequests();
        return { success: true };
      }
      return { success: false };
    },

    // Open User Profile Preview
    openProfilePreview(user) {
      this.selectedProfileUser = user || null;
    },

    // Close User Profile Preview
    closeProfilePreview() {
      this.selectedProfileUser = null;
    },

    // Check relationship status between current user and target user
    getFriendshipStatus(currentUserId, targetUserId) {
      if (!currentUserId || !targetUserId) return 'none';
      if (currentUserId === targetUserId) return 'self';

      const rel = this.friendRequests.find(
        (r) =>
          (r.fromUserId === currentUserId && r.toUserId === targetUserId) ||
          (r.fromUserId === targetUserId && r.toUserId === currentUserId)
      );

      if (!rel) return 'none';
      if (rel.status === 'accepted') return 'friend';
      if (rel.status === 'pending') {
        return rel.fromUserId === currentUserId ? 'sent' : 'received';
      }
      return 'none';
    },

    // Open direct chat dialogue with friend
    openDirectChat(friend) {
      this.activeChatFriend = friend;
      this.activeTab = 'friends';
    },

    // Close direct chat dialogue and return to friends list
    closeDirectChat() {
      this.activeChatFriend = null;
      this.activeTab = 'friends';
    },

    // Send direct message to friend
    sendDirectMessage(senderId, receiverId, text) {
      if (!text || !text.trim()) return;

      const newMsg = {
        id: Date.now(),
        senderId,
        receiverId,
        text: text.trim(),
        timestamp: Date.now()
      };

      this.directMessages.push(newMsg);
      this.saveDirectMessages();

      // Automated polite peer reply if talking to seed users
      if (receiverId >= 100 && receiverId <= 110) {
        setTimeout(() => {
          const autoReplies = [
            'Привет! Рад знакомству. Тоже сейчас практикую разговорные фразы в тренажере!',
            'Сава̀тди: кхра́п! Как твои успехи с тайскими тонами?',
            'Отличная фраза! Завтра как раз пойду на ночной рынок практиковать её.',
            'Да, это полезно! Удачи в тренировке фраз!'
          ];
          const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
          this.directMessages.push({
            id: Date.now() + 1,
            senderId: receiverId,
            receiverId: senderId,
            text: randomReply,
            timestamp: Date.now()
          });
          this.saveDirectMessages();
        }, 1200);
      }
    },

    // Open conversation room
    openRoom(room) {
      this.activeRoom = room;
      this.activeTab = 'rooms';
    },

    // Close active room
    closeRoom() {
      this.activeRoom = null;
      this.activeTab = 'rooms';
    },

    // Request to join room or join directly
    requestJoinRoom(roomId, userId) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (!room || !userId) return { joined: false };

      if (!Array.isArray(room.memberIds)) room.memberIds = [];
      if (!Array.isArray(room.pendingMemberIds)) room.pendingMemberIds = [];

      if (room.memberIds.includes(userId)) {
        return { joined: true };
      }

      if (room.requireApproval) {
        if (!room.pendingMemberIds.includes(userId)) {
          room.pendingMemberIds.push(userId);
          this.saveRooms();
        }
        return { joined: false, pending: true };
      }

      room.memberIds.push(userId);
      this.saveRooms();
      return { joined: true };
    },

    // Create a new conversation room
    createRoom({
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

      const cId = creatorId || creator?.id || 1;
      const cName = creatorName || `${creator?.firstName || ''} ${creator?.lastName || ''}`.trim() || creator?.email || 'Пользователь';

      const memberIds = [cId, ...(invitedFriendIds || [])];

      const newRoom = {
        id: Date.now(),
        title: title.trim(),
        description: description.trim(),
        creatorId: cId,
        creatorName: cName,
        isPublic: !!isPublic,
        requireApproval: !!requireApproval,
        memberIds: Array.from(new Set(memberIds)),
        pendingMemberIds: [],
        createdAt: Date.now()
      };

      this.rooms.unshift(newRoom);
      this.saveRooms();
      this.showCreateRoomModal = false;
      this.activeRoom = newRoom;
      return newRoom;
    },

    // Join room or request permission to join
    joinRoom(room, currentUser) {
      if (!room || !currentUser) return;

      const target = this.rooms.find((r) => r.id === room.id);
      if (!target) return;

      // If already a member, simply open room
      if (target.memberIds.includes(currentUser.id)) {
        this.activeRoom = target;
        return { status: 'joined' };
      }

      // If room requires creator approval:
      if (target.requireApproval) {
        if (!target.pendingMemberIds.includes(currentUser.id)) {
          target.pendingMemberIds.push(currentUser.id);
          this.saveRooms();
        }
        return { status: 'pending_approval' };
      }

      // Public room without approval: join immediately
      target.memberIds.push(currentUser.id);
      this.saveRooms();
      this.activeRoom = target;
      return { status: 'joined' };
    },

    // Creator approves join request
    approveJoinRequest(roomId, userId) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (!room) return;

      room.pendingMemberIds = room.pendingMemberIds.filter((id) => id !== userId);
      if (!room.memberIds.includes(userId)) {
        room.memberIds.push(userId);
      }
      this.saveRooms();
    },

    // Creator rejects join request
    rejectJoinRequest(roomId, userId) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (!room) return;

      room.pendingMemberIds = room.pendingMemberIds.filter((id) => id !== userId);
      this.saveRooms();
    },

    // Invite friend to room
    inviteFriendToRoom(roomId, friendId) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (!room) return;

      if (!room.memberIds.includes(friendId)) {
        room.memberIds.push(friendId);
        this.saveRooms();
      }
    },

    // Send message inside conversation room
    sendRoomMessage(roomId, senderOrId, textOrName, maybeText = null, thaiPhrase = null) {
      let senderId, senderName, text, phrase;

      if (maybeText !== null) {
        // Called as (roomId, senderId, senderName, text, phrase)
        senderId = senderOrId;
        senderName = textOrName || 'Пользователь';
        text = maybeText;
        phrase = thaiPhrase;
      } else {
        // Called as (roomId, senderObj, text, phrase)
        const sender = senderOrId || {};
        senderId = sender.id || 1;
        senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email || 'Пользователь';
        text = textOrName;
        phrase = maybeText || thaiPhrase;
      }

      if (!text || !text.trim()) return;

      const newMsg = {
        id: Date.now(),
        roomId,
        senderId,
        senderName,
        senderAvatar: '',
        text: text.trim(),
        thaiPhrase: phrase || null,
        timestamp: Date.now()
      };

      this.roomMessages.push(newMsg);
      this.saveRoomMessages();
    },

    saveFriendRequests() {
      try {
        localStorage.setItem('thai_frazovik_friend_requests', JSON.stringify(this.friendRequests));
      } catch (e) {
        console.warn('Could not persist friend requests:', e);
      }
    },

    saveDirectMessages() {
      try {
        localStorage.setItem('thai_frazovik_direct_messages', JSON.stringify(this.directMessages));
      } catch (e) {
        console.warn('Could not persist direct messages:', e);
      }
    },

    saveRooms() {
      try {
        localStorage.setItem('thai_frazovik_rooms', JSON.stringify(this.rooms));
      } catch (e) {
        console.warn('Could not persist rooms:', e);
      }
    },

    saveRoomMessages() {
      try {
        localStorage.setItem('thai_frazovik_room_messages', JSON.stringify(this.roomMessages));
      } catch (e) {
        console.warn('Could not persist room messages:', e);
      }
    },

    openCommunity(tab = 'leaderboard') {
      this.activeTab = tab;
      this.isCommunityModalOpen = true;
    },

    closeCommunity() {
      this.isCommunityModalOpen = false;
      this.activeChatFriend = null;
    }
  }
});
