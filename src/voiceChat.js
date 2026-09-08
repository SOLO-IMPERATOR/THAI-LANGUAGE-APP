/**
 * Mesh WebRTC voice chat for conversation rooms.
 * Signaling goes through PHP API with short AJAX polling (no WebSockets).
 */
export function createRoomVoiceChat({ roomId, userId, displayName, onPeers, onError, onStatus }) {
  const peers = new Map(); // userId -> { pc, audioEl }
  let localStream = null;
  let pollTimer = null;
  let lastSignalId = 0;
  let stopped = false;
  const polite = String(userId) < String(''); // unused; we'll use id comparison for glare

  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

  function setStatus(s) {
    onStatus?.(s);
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  async function ensureLocalStream() {
    if (localStream) return localStream;
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    return localStream;
  }

  function removePeer(peerId) {
    const entry = peers.get(String(peerId));
    if (!entry) return;
    try {
      entry.pc.close();
    } catch (_) {}
    if (entry.audioEl) {
      entry.audioEl.srcObject = null;
      entry.audioEl.remove();
    }
    peers.delete(String(peerId));
    emitPeers();
  }

  function emitPeers() {
    onPeers?.(
      [...peers.entries()].map(([id, p]) => ({
        userId: id,
        displayName: p.displayName || id,
      }))
    );
  }

  async function postSignal(toUserId, type, payload) {
    await api(`/api/rooms/${encodeURIComponent(roomId)}/voice/signal`, {
      method: 'POST',
      body: JSON.stringify({
        fromUserId: userId,
        toUserId,
        type,
        payload,
      }),
    });
  }

  async function createPeerConnection(peerId, display = '') {
    const key = String(peerId);
    if (peers.has(key)) return peers.get(key);

    const pc = new RTCPeerConnection({ iceServers });
    const stream = await ensureLocalStream();
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }

    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    audioEl.setAttribute('data-voice-peer', key);
    document.body.appendChild(audioEl);

    pc.ontrack = (ev) => {
      audioEl.srcObject = ev.streams[0] || new MediaStream([ev.track]);
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        postSignal(key, 'ice', { candidate: ev.candidate }).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionstate)) {
        // keep briefly; presence poll will clean
      }
    };

    const entry = { pc, audioEl, displayName: display };
    peers.set(key, entry);
    emitPeers();
    return entry;
  }

  async function callPeer(peerId, displayName = '') {
    if (String(peerId) === String(userId)) return;
    const entry = await createPeerConnection(peerId, displayName);
    if (entry.makingOffer) return;
    entry.makingOffer = true;
    try {
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      await postSignal(peerId, 'offer', { sdp: entry.pc.localDescription });
    } finally {
      entry.makingOffer = false;
    }
  }

  async function handleSignal(sig) {
    const from = String(sig.fromUserId);
    if (from === String(userId)) return;

    if (sig.type === 'leave' || sig.type === 'join') {
      if (sig.type === 'leave') {
        removePeer(from);
      }
      return;
    }

    const entry = await createPeerConnection(from);
    const pc = entry.pc;

    if (sig.type === 'offer' && sig.payload?.sdp) {
      await pc.setRemoteDescription(sig.payload.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postSignal(from, 'answer', { sdp: pc.localDescription });
    } else if (sig.type === 'answer' && sig.payload?.sdp) {
      if (!pc.currentRemoteDescription) {
        await pc.setRemoteDescription(sig.payload.sdp);
      }
    } else if (sig.type === 'ice' && sig.payload?.candidate) {
      try {
        await pc.addIceCandidate(sig.payload.candidate);
      } catch (_) {}
    }
  }

  async function pollOnce() {
    if (stopped) return;
    const q = new URLSearchParams({
      userId: String(userId),
      displayName: displayName || '',
      after: String(lastSignalId),
    });
    const data = await api(
      `/api/rooms/${encodeURIComponent(roomId)}/voice/poll?${q.toString()}`
    );
    for (const sig of data.signals || []) {
      if (sig.id > lastSignalId) lastSignalId = sig.id;
      await handleSignal(sig);
    }
    // Connect to peers that are present but not yet connected
    for (const peer of data.peers || []) {
      const pid = String(peer.userId);
      if (pid === String(userId)) continue;
      if (!peers.has(pid)) {
        // Only the lexicographically smaller id initiates to reduce glare
        if (String(userId) < pid) {
          await callPeer(pid, peer.displayName || '');
        } else {
          await createPeerConnection(pid, peer.displayName || '');
        }
      } else if (peer.displayName) {
        peers.get(pid).displayName = peer.displayName;
      }
    }
    // Remove peers that left presence
    const live = new Set((data.peers || []).map((p) => String(p.userId)));
    for (const pid of [...peers.keys()]) {
      if (!live.has(pid)) removePeer(pid);
    }
    emitPeers();
  }

  async function start() {
    setStatus('connecting');
    await ensureLocalStream();
    await api(`/api/rooms/${encodeURIComponent(roomId)}/voice/join`, {
      method: 'POST',
      body: JSON.stringify({ userId, displayName }),
    });
    setStatus('live');
    await pollOnce();
    pollTimer = setInterval(() => {
      pollOnce().catch((err) => onError?.(err));
    }, 1500);
  }

  async function stop() {
    stopped = true;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    for (const pid of [...peers.keys()]) removePeer(pid);
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    try {
      await api(`/api/rooms/${encodeURIComponent(roomId)}/voice/leave`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    } catch (_) {}
    setStatus('off');
  }

  function setMuted(muted) {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  return { start, stop, setMuted, pollOnce };
}
