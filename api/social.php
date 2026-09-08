<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function sid($v): string
{
    return (string) $v;
}

function ms_now(): int
{
    return (int) round(microtime(true) * 1000);
}

function map_friend_row(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'fromUserId' => sid($r['from_user_id']),
        'toUserId' => sid($r['to_user_id']),
        'status' => $r['status'],
        'createdAt' => (int) $r['created_at'],
    ];
}

function map_room_row(array $r, array $members = [], array $pending = []): array
{
    return [
        'id' => sid($r['id']),
        'title' => $r['title'],
        'description' => $r['description'] ?? '',
        'creatorId' => sid($r['creator_id']),
        'creatorName' => $r['creator_name'] ?? '',
        'isPublic' => !empty($r['is_public']),
        'requireApproval' => !empty($r['require_approval']),
        'memberIds' => array_map('sid', $members),
        'pendingMemberIds' => array_map('sid', $pending),
        'createdAt' => (int) $r['created_at'],
    ];
}

function get_friend_requests_for_user(string $userId): array
{
    $stmt = db()->prepare(
        'SELECT * FROM friend_requests
         WHERE from_user_id = ? OR to_user_id = ?
         ORDER BY created_at DESC'
    );
    $stmt->execute([$userId, $userId]);
    return array_map('map_friend_row', $stmt->fetchAll());
}

function create_friend_request(string $fromId, string $toId): array
{
    if ($fromId === '' || $toId === '' || $fromId === $toId) {
        return ['ok' => false, 'error' => 'Некорректный запрос'];
    }

    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT * FROM friend_requests
         WHERE (from_user_id = ? AND to_user_id = ?)
            OR (from_user_id = ? AND to_user_id = ?)
         LIMIT 1'
    );
    $stmt->execute([$fromId, $toId, $toId, $fromId]);
    $existing = $stmt->fetch();

    $now = ms_now();
    if ($existing) {
        if ($existing['status'] === 'accepted') {
            return ['ok' => false, 'error' => 'Вы уже друзья'];
        }
        if ($existing['status'] === 'pending') {
            return ['ok' => false, 'error' => 'Заявка уже отправлена', 'request' => map_friend_row($existing)];
        }
        $upd = $pdo->prepare(
            'UPDATE friend_requests SET from_user_id = ?, to_user_id = ?, status = ?, updated_at = ? WHERE id = ?'
        );
        $upd->execute([$fromId, $toId, 'pending', $now, $existing['id']]);
        $existing['from_user_id'] = $fromId;
        $existing['to_user_id'] = $toId;
        $existing['status'] = 'pending';
        $existing['updated_at'] = $now;
        return ['ok' => true, 'request' => map_friend_row($existing)];
    }

    $ins = $pdo->prepare(
        'INSERT INTO friend_requests (from_user_id, to_user_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)'
    );
    $ins->execute([$fromId, $toId, 'pending', $now, $now]);
    $id = (int) $pdo->lastInsertId();
    return [
        'ok' => true,
        'request' => [
            'id' => $id,
            'fromUserId' => $fromId,
            'toUserId' => $toId,
            'status' => 'pending',
            'createdAt' => $now,
        ],
    ];
}

function respond_friend_request(int $requestId, string $userId, string $status): array
{
    if (!in_array($status, ['accepted', 'rejected'], true)) {
        return ['ok' => false, 'error' => 'Invalid status'];
    }
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM friend_requests WHERE id = ? LIMIT 1');
    $stmt->execute([$requestId]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['ok' => false, 'error' => 'Заявка не найдена'];
    }
    if (sid($row['to_user_id']) !== $userId) {
        return ['ok' => false, 'error' => 'Нет доступа'];
    }
    $upd = $pdo->prepare('UPDATE friend_requests SET status = ?, updated_at = ? WHERE id = ?');
    $upd->execute([$status, ms_now(), $requestId]);
    $row['status'] = $status;
    return ['ok' => true, 'request' => map_friend_row($row)];
}

function cancel_friend_request(string $fromId, ?string $targetUserId = null, $requestId = null): array
{
    $pdo = db();
    if ($requestId !== null && $requestId !== '' && (int) $requestId > 0) {
        $stmt = $pdo->prepare(
            'DELETE FROM friend_requests WHERE id = ? AND from_user_id = ? AND status = ?'
        );
        $stmt->execute([(int) $requestId, $fromId, 'pending']);
    } else {
        $stmt = $pdo->prepare(
            'DELETE FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = ?'
        );
        $stmt->execute([$fromId, sid($targetUserId), 'pending']);
    }
    return ['ok' => $stmt->rowCount() > 0];
}

function list_direct_messages(string $userId, string $peerId, int $afterId = 0): array
{
    $stmt = db()->prepare(
        'SELECT * FROM direct_messages
         WHERE id > ?
           AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         ORDER BY id ASC
         LIMIT 500'
    );
    $stmt->execute([$afterId, $userId, $peerId, $peerId, $userId]);
    return array_map(static function ($r) {
        return [
            'id' => (int) $r['id'],
            'senderId' => sid($r['sender_id']),
            'receiverId' => sid($r['receiver_id']),
            'text' => $r['body'],
            'timestamp' => (int) $r['created_at'],
        ];
    }, $stmt->fetchAll());
}

function send_direct_message(string $senderId, string $receiverId, string $text): array
{
    $text = trim($text);
    if ($text === '') {
        return ['ok' => false, 'error' => 'Пустое сообщение'];
    }
    $now = ms_now();
    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO direct_messages (sender_id, receiver_id, body, created_at) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$senderId, $receiverId, $text, $now]);
    return [
        'ok' => true,
        'message' => [
            'id' => (int) $pdo->lastInsertId(),
            'senderId' => $senderId,
            'receiverId' => $receiverId,
            'text' => $text,
            'timestamp' => $now,
        ],
    ];
}

function load_room_member_ids(string $roomId): array
{
    $stmt = db()->prepare('SELECT user_id, status FROM room_members WHERE room_id = ?');
    $stmt->execute([$roomId]);
    $members = [];
    $pending = [];
    foreach ($stmt->fetchAll() as $row) {
        if ($row['status'] === 'pending') {
            $pending[] = sid($row['user_id']);
        } else {
            $members[] = sid($row['user_id']);
        }
    }
    return [$members, $pending];
}

function list_rooms_for_user(string $userId): array
{
    $pdo = db();
    // Public rooms + rooms where user is member/pending/creator
    $stmt = $pdo->prepare(
        'SELECT DISTINCT r.*
         FROM rooms r
         LEFT JOIN room_members m ON m.room_id = r.id AND m.user_id = ?
         WHERE r.is_public = 1 OR r.creator_id = ? OR m.user_id IS NOT NULL
         ORDER BY r.created_at DESC
         LIMIT 200'
    );
    $stmt->execute([$userId, $userId]);
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        [$members, $pending] = load_room_member_ids(sid($row['id']));
        $out[] = map_room_row($row, $members, $pending);
    }
    return $out;
}

function create_room(array $data): array
{
    $title = trim((string) ($data['title'] ?? ''));
    if ($title === '') {
        return ['ok' => false, 'error' => 'Укажите название комнаты'];
    }
    $creatorId = sid($data['creatorId'] ?? '');
    if ($creatorId === '') {
        return ['ok' => false, 'error' => 'Нужен creatorId'];
    }
    $now = ms_now();
    $id = 'room-' . $now . '-' . bin2hex(random_bytes(3));
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare(
            'INSERT INTO rooms (id, title, description, creator_id, creator_name, is_public, require_approval, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $id,
            $title,
            trim((string) ($data['description'] ?? '')),
            $creatorId,
            trim((string) ($data['creatorName'] ?? 'Пользователь')),
            !empty($data['isPublic']) ? 1 : 0,
            !empty($data['requireApproval']) ? 1 : 0,
            $now,
        ]);
        $mem = $pdo->prepare(
            'INSERT INTO room_members (room_id, user_id, status, joined_at) VALUES (?, ?, ?, ?)'
        );
        $mem->execute([$id, $creatorId, 'member', $now]);
        $invited = is_array($data['invitedFriendIds'] ?? null) ? $data['invitedFriendIds'] : [];
        foreach ($invited as $fid) {
            $fid = sid($fid);
            if ($fid === '' || $fid === $creatorId) {
                continue;
            }
            $mem->execute([$id, $fid, 'member', $now]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    [$members, $pending] = load_room_member_ids($id);
    $row = [
        'id' => $id,
        'title' => $title,
        'description' => trim((string) ($data['description'] ?? '')),
        'creator_id' => $creatorId,
        'creator_name' => trim((string) ($data['creatorName'] ?? '')),
        'is_public' => !empty($data['isPublic']) ? 1 : 0,
        'require_approval' => !empty($data['requireApproval']) ? 1 : 0,
        'created_at' => $now,
    ];
    return ['ok' => true, 'room' => map_room_row($row, $members, $pending)];
}

function join_room(string $roomId, string $userId): array
{
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM rooms WHERE id = ? LIMIT 1');
    $stmt->execute([$roomId]);
    $room = $stmt->fetch();
    if (!$room) {
        return ['ok' => false, 'error' => 'Комната не найдена'];
    }
    $chk = $pdo->prepare('SELECT status FROM room_members WHERE room_id = ? AND user_id = ?');
    $chk->execute([$roomId, $userId]);
    $existing = $chk->fetch();
    if ($existing && $existing['status'] === 'member') {
        [$members, $pending] = load_room_member_ids($roomId);
        return ['ok' => true, 'status' => 'joined', 'room' => map_room_row($room, $members, $pending)];
    }
    $now = ms_now();
    if (!empty($room['require_approval'])) {
        if ($existing) {
            return ['ok' => true, 'status' => 'pending_approval'];
        }
        $ins = $pdo->prepare(
            'INSERT INTO room_members (room_id, user_id, status, joined_at) VALUES (?, ?, ?, ?)'
        );
        $ins->execute([$roomId, $userId, 'pending', $now]);
        return ['ok' => true, 'status' => 'pending_approval'];
    }
    if ($existing) {
        $upd = $pdo->prepare('UPDATE room_members SET status = ? WHERE room_id = ? AND user_id = ?');
        $upd->execute(['member', $roomId, $userId]);
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO room_members (room_id, user_id, status, joined_at) VALUES (?, ?, ?, ?)'
        );
        $ins->execute([$roomId, $userId, 'member', $now]);
    }
    [$members, $pending] = load_room_member_ids($roomId);
    return ['ok' => true, 'status' => 'joined', 'room' => map_room_row($room, $members, $pending)];
}

function delete_room(string $roomId, string $userId): array
{
    if ($roomId === '' || $userId === '') {
        return ['ok' => false, 'error' => 'Нужны roomId и userId'];
    }
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM rooms WHERE id = ? LIMIT 1');
    $stmt->execute([$roomId]);
    $room = $stmt->fetch();
    if (!$room) {
        return ['ok' => false, 'error' => 'Комната не найдена'];
    }
    if (sid($room['creator_id']) !== $userId) {
        return ['ok' => false, 'error' => 'Удалить может только создатель'];
    }
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM voice_signals WHERE room_id = ?')->execute([$roomId]);
        $pdo->prepare('DELETE FROM voice_presence WHERE room_id = ?')->execute([$roomId]);
        $pdo->prepare('DELETE FROM rooms WHERE id = ?')->execute([$roomId]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    return ['ok' => true, 'deletedId' => $roomId];
}

function approve_room_member(string $roomId, string $creatorId, string $userId, bool $approve): array
{
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM rooms WHERE id = ? LIMIT 1');
    $stmt->execute([$roomId]);
    $room = $stmt->fetch();
    if (!$room || sid($room['creator_id']) !== $creatorId) {
        return ['ok' => false, 'error' => 'Нет доступа'];
    }
    if ($approve) {
        $upd = $pdo->prepare(
            'UPDATE room_members SET status = ? WHERE room_id = ? AND user_id = ?'
        );
        $upd->execute(['member', $roomId, $userId]);
    } else {
        $del = $pdo->prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ? AND status = ?');
        $del->execute([$roomId, $userId, 'pending']);
    }
    [$members, $pending] = load_room_member_ids($roomId);
    return ['ok' => true, 'room' => map_room_row($room, $members, $pending)];
}

function list_room_messages(string $roomId, int $afterId = 0): array
{
    $stmt = db()->prepare(
        'SELECT * FROM room_messages WHERE room_id = ? AND id > ? ORDER BY id ASC LIMIT 500'
    );
    $stmt->execute([$roomId, $afterId]);
    return array_map(static function ($r) {
        return [
            'id' => (int) $r['id'],
            'roomId' => sid($r['room_id']),
            'senderId' => sid($r['sender_id']),
            'senderName' => $r['sender_name'],
            'senderAvatar' => '',
            'text' => $r['body'],
            'thaiPhrase' => $r['thai_phrase'],
            'timestamp' => (int) $r['created_at'],
        ];
    }, $stmt->fetchAll());
}

function send_room_message(string $roomId, string $senderId, string $senderName, string $text, ?string $thaiPhrase = null): array
{
    $text = trim($text);
    if ($text === '') {
        return ['ok' => false, 'error' => 'Пустое сообщение'];
    }
    $now = ms_now();
    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO room_messages (room_id, sender_id, sender_name, body, thai_phrase, created_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$roomId, $senderId, $senderName, $text, $thaiPhrase, $now]);
    return [
        'ok' => true,
        'message' => [
            'id' => (int) $pdo->lastInsertId(),
            'roomId' => $roomId,
            'senderId' => $senderId,
            'senderName' => $senderName,
            'senderAvatar' => '',
            'text' => $text,
            'thaiPhrase' => $thaiPhrase,
            'timestamp' => $now,
        ],
    ];
}

function voice_heartbeat(string $roomId, string $userId, string $displayName): array
{
    $now = ms_now();
    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO voice_presence (room_id, user_id, display_name, last_seen)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), last_seen = VALUES(last_seen)'
    );
    $stmt->execute([$roomId, $userId, $displayName, $now]);
    // Cleanup stale (>20s)
    $pdo->prepare('DELETE FROM voice_presence WHERE room_id = ? AND last_seen < ?')->execute([$roomId, $now - 20000]);
    $peers = $pdo->prepare('SELECT user_id, display_name, last_seen FROM voice_presence WHERE room_id = ?');
    $peers->execute([$roomId]);
    return [
        'ok' => true,
        'peers' => array_map(static function ($r) {
            return [
                'userId' => sid($r['user_id']),
                'displayName' => $r['display_name'],
                'lastSeen' => (int) $r['last_seen'],
            ];
        }, $peers->fetchAll()),
    ];
}

function voice_leave(string $roomId, string $userId): array
{
    db()->prepare('DELETE FROM voice_presence WHERE room_id = ? AND user_id = ?')->execute([$roomId, $userId]);
    // Announce leave
    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO voice_signals (room_id, from_user_id, to_user_id, signal_type, payload, created_at)
         VALUES (?, ?, NULL, ?, ?, ?)'
    );
    $stmt->execute([$roomId, $userId, 'leave', '{}', ms_now()]);
    return ['ok' => true];
}

function voice_post_signal(string $roomId, string $fromId, ?string $toId, string $type, $payload): array
{
    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO voice_signals (room_id, from_user_id, to_user_id, signal_type, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $json = is_string($payload) ? $payload : json_encode($payload, JSON_UNESCAPED_UNICODE);
    $stmt->execute([$roomId, $fromId, $toId, $type, $json, ms_now()]);
    return ['ok' => true, 'id' => (int) $pdo->lastInsertId()];
}

function voice_poll_signals(string $roomId, string $userId, int $afterId = 0): array
{
    $stmt = db()->prepare(
        'SELECT * FROM voice_signals
         WHERE room_id = ? AND id > ?
           AND from_user_id <> ?
           AND (to_user_id IS NULL OR to_user_id = ?)
         ORDER BY id ASC
         LIMIT 200'
    );
    $stmt->execute([$roomId, $afterId, $userId, $userId]);
    // Also refresh peers
    $presence = voice_heartbeat($roomId, $userId, '');
    return [
        'ok' => true,
        'signals' => array_map(static function ($r) {
            return [
                'id' => (int) $r['id'],
                'fromUserId' => sid($r['from_user_id']),
                'toUserId' => $r['to_user_id'] !== null ? sid($r['to_user_id']) : null,
                'type' => $r['signal_type'],
                'payload' => json_decode($r['payload'], true),
                'createdAt' => (int) $r['created_at'],
            ];
        }, $stmt->fetchAll()),
        'peers' => $presence['peers'] ?? [],
    ];
}

function social_sync(string $userId, ?string $activeRoomId = null, int $dmPeerAfter = 0, ?string $dmPeerId = null, int $roomMsgAfter = 0): array
{
    $out = [
        'friendRequests' => get_friend_requests_for_user($userId),
        'rooms' => list_rooms_for_user($userId),
        'serverTime' => ms_now(),
    ];
    if ($dmPeerId) {
        $out['directMessages'] = list_direct_messages($userId, $dmPeerId, $dmPeerAfter);
    }
    if ($activeRoomId) {
        $out['roomMessages'] = list_room_messages($activeRoomId, $roomMsgAfter);
    }
    return $out;
}
