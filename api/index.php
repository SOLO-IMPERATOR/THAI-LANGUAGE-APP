<?php
declare(strict_types=1);

require_once __DIR__ . '/repositories.php';
require_once __DIR__ . '/tts.php';

try {
    $method = request_method();
    $path = request_path();
    if ($path !== '/' && str_ends_with($path, '/')) {
        $path = rtrim($path, '/');
    }

    if ($method === 'OPTIONS') {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        http_response_code(204);
        exit;
    }

    if ($path === '/tts' && ($method === 'GET' || $method === 'POST')) {
        $body = $method === 'POST' ? read_json_body() : [];
        $text = trim((string) ($body['text'] ?? $_GET['text'] ?? ''));
        $gender = (($body['gender'] ?? $_GET['gender'] ?? '') === 'male') ? 'male' : 'female';
        if ($text === '') {
            json_response(['error' => 'text required'], 400);
        }
        $result = synthesize_thai_mp3($text, $gender);
        send_mp3_file($result['filePath'], $result['provider'], $result['cacheHit']);
    }

    if ($path === '/health' && $method === 'GET') {
        json_response(['status' => 'ok', 'time' => now_iso(), 'backend' => 'php-mysql']);
    }

    if ($path === '/phrases' && $method === 'GET') {
        json_response(get_all_phrases());
    }
    if ($path === '/words' && $method === 'GET') {
        json_response(get_all_words());
    }

    if ($path === '/users' && $method === 'GET') {
        json_response(get_all_users());
    }

    if ($path === '/register' && $method === 'POST') {
        $userData = read_json_body();
        if (empty($userData['email']) && empty($userData['id'])) {
            json_response(['error' => 'Email or ID required'], 400);
        }
        $now = now_iso();
        $newUser = [
            'id' => $userData['id'] ?? ('user-' . (string) (int) (microtime(true) * 1000)),
            'email' => $userData['email'] ?? '',
            'username' => $userData['username']
                ?? (isset($userData['email']) ? explode('@', (string) $userData['email'])[0] : 'User'),
            'firstName' => $userData['firstName'] ?? '',
            'lastName' => $userData['lastName'] ?? '',
            'avatar' => $userData['avatar']
                ?? (($userData['gender'] ?? '') === 'female' ? '👩' : '👨'),
            'gender' => $userData['gender'] ?? 'male',
            'cityInThailand' => $userData['cityInThailand'] ?? 'Бангкок',
            'stayDuration' => $userData['stayDuration'] ?? 'Турист / Отпуск',
            'dailyGoal' => (int) ($userData['dailyGoal'] ?? 10),
            'xp' => (int) ($userData['xp'] ?? 0),
            'level' => (int) ($userData['level'] ?? 1),
            'streak' => (int) ($userData['streak'] ?? 1),
            'registeredAt' => $userData['registeredAt'] ?? $now,
            'isPrivate' => ($userData['isPrivate'] ?? false) === true,
            'lastActiveAt' => $now,
        ];
        $saved = upsert_user($newUser);
        json_response(['success' => true, 'user' => $saved]);
    }

    if ($path === '/users/sync' && $method === 'POST') {
        $body = read_json_body();
        if (empty($body['id']) && empty($body['email'])) {
            json_response(['error' => 'ID or email required'], 400);
        }
        $updated = sync_user_progress([
            'id' => $body['id'] ?? null,
            'email' => $body['email'] ?? null,
            'xp' => $body['xp'] ?? null,
            'level' => $body['level'] ?? null,
            'streak' => $body['streak'] ?? null,
            'gender' => $body['gender'] ?? null,
            'avatar' => $body['avatar'] ?? null,
            'username' => $body['username'] ?? null,
            'cityInThailand' => $body['cityInThailand'] ?? null,
        ]);
        if (!$updated) {
            json_response(['error' => 'User not found to sync'], 404);
        }
        json_response(['success' => true, 'user' => $updated]);
    }

    if (preg_match('#^/users/([^/]+)/srs$#', $path, $m)) {
        $userId = rawurldecode($m[1]);
        if ($method === 'GET') {
            $historyLimit = (int) ($_GET['historyLimit'] ?? 100);
            json_response([
                'progress' => get_user_phrase_progress($userId),
                'history' => get_user_review_history($userId, $historyLimit),
                'stats' => get_srs_stats($userId),
            ]);
        }
        if ($method === 'POST') {
            $body = read_json_body();
            if (empty($body['phraseId'])) {
                json_response(['error' => 'phraseId required'], 400);
            }
            $saved = upsert_user_phrase_progress(
                $userId,
                [
                    'phraseId' => (int) $body['phraseId'],
                    'stage_srs' => $body['stage_srs'] ?? null,
                    'review_count' => $body['review_count'] ?? null,
                    'next_review' => $body['next_review'] ?? null,
                    'is_deconstructed' => $body['is_deconstructed'] ?? null,
                    'tags' => array_key_exists('tags', $body) ? $body['tags'] : null,
                ],
                isset($body['event']) && is_array($body['event']) ? $body['event'] : null
            );
            json_response(['success' => true, 'progress' => $saved]);
        }
    }

    if (preg_match('#^/users/([^/]+)/srs/history$#', $path, $m) && $method === 'GET') {
        $userId = rawurldecode($m[1]);
        $limit = (int) ($_GET['limit'] ?? 200);
        json_response(get_user_review_history($userId, $limit));
    }

    if (preg_match('#^/users/([^/]+)/srs/bulk$#', $path, $m) && $method === 'POST') {
        $userId = rawurldecode($m[1]);
        $body = read_json_body();
        $items = is_array($body['progress'] ?? null) ? $body['progress'] : [];
        if (count($items) === 0) {
            json_response(['error' => 'progress array required'], 400);
        }
        $count = bulk_upsert_user_phrase_progress($userId, $items);
        json_response([
            'success' => true,
            'upserted' => $count,
            'progress' => get_user_phrase_progress($userId),
        ]);
    }

    if ($path === '/git-status' && $method === 'GET') {
        $srs = get_srs_stats();
        json_response([
            'database' => [
                'type' => 'MySQL + Dexie IndexedDB',
                'phrasesCount' => get_phrases_count(),
                'wordsCount' => get_words_count(),
                'srsProgressCount' => $srs['progressCount'],
                'srsHistoryCount' => $srs['historyCount'],
                'backend' => 'php',
            ],
            'features' => [
                'genderSeparation' => 'Male (ครับ / ผม) & Female (ค่ะ/คะ / ฉัน)',
                'zeroDuplicates' => true,
                'nativePwaPrompt' => true,
                'multiDeviceSync' => true,
                'userSrsInMysql' => true,
            ],
        ]);
    }

    if ($path === '/seed' && $method === 'POST') {
        require_once __DIR__ . '/seed_runner.php';
        $body = read_json_body();
        $token = (string) ($body['token'] ?? $_GET['token'] ?? '');
        $result = run_seed($token, !empty($body['force']));
        json_response($result, !empty($result['ok']) ? 200 : (int) ($result['status'] ?? 403));
    }

    // --- Social (friends, rooms, DMs, voice) ---
    require_once __DIR__ . '/social.php';

    if ($path === '/social/sync' && $method === 'GET') {
        $userId = sid($_GET['userId'] ?? '');
        if ($userId === '') {
            json_response(['error' => 'userId required'], 400);
        }
        json_response(social_sync(
            $userId,
            isset($_GET['roomId']) ? sid($_GET['roomId']) : null,
            (int) ($_GET['dmAfter'] ?? 0),
            isset($_GET['dmPeerId']) ? sid($_GET['dmPeerId']) : null,
            (int) ($_GET['roomMsgAfter'] ?? 0)
        ));
    }

    if ($path === '/friends' && $method === 'GET') {
        $userId = sid($_GET['userId'] ?? '');
        if ($userId === '') {
            json_response(['error' => 'userId required'], 400);
        }
        json_response(get_friend_requests_for_user($userId));
    }

    if ($path === '/friends/request' && $method === 'POST') {
        $body = read_json_body();
        $res = create_friend_request(sid($body['fromUserId'] ?? ''), sid($body['toUserId'] ?? ''));
        json_response($res, !empty($res['ok']) ? 200 : 400);
    }

    if ($path === '/friends/respond' && $method === 'POST') {
        $body = read_json_body();
        $res = respond_friend_request((int) ($body['requestId'] ?? 0), sid($body['userId'] ?? ''), (string) ($body['status'] ?? ''));
        json_response($res, !empty($res['ok']) ? 200 : 400);
    }

    if ($path === '/friends/cancel' && $method === 'POST') {
        $body = read_json_body();
        $res = cancel_friend_request(
            sid($body['fromUserId'] ?? ''),
            isset($body['targetUserId']) ? sid($body['targetUserId']) : null,
            $body['requestId'] ?? null
        );
        json_response($res, !empty($res['ok']) ? 200 : 400);
    }

    if ($path === '/dm' && $method === 'GET') {
        $userId = sid($_GET['userId'] ?? '');
        $peerId = sid($_GET['peerId'] ?? '');
        if ($userId === '' || $peerId === '') {
            json_response(['error' => 'userId and peerId required'], 400);
        }
        json_response(list_direct_messages($userId, $peerId, (int) ($_GET['after'] ?? 0)));
    }

    if ($path === '/dm' && $method === 'POST') {
        $body = read_json_body();
        $res = send_direct_message(sid($body['senderId'] ?? ''), sid($body['receiverId'] ?? ''), (string) ($body['text'] ?? ''));
        json_response($res, !empty($res['ok']) ? 200 : 400);
    }

    if ($path === '/rooms' && $method === 'GET') {
        $userId = sid($_GET['userId'] ?? '');
        if ($userId === '') {
            json_response(['error' => 'userId required'], 400);
        }
        json_response(list_rooms_for_user($userId));
    }

    if ($path === '/rooms' && $method === 'POST') {
        $body = read_json_body();
        $res = create_room($body);
        json_response($res, !empty($res['ok']) ? 200 : 400);
    }

    if (preg_match('#^/rooms/([^/]+)/join$#', $path, $m) && $method === 'POST') {
        $body = read_json_body();
        $res = join_room(sid($m[1]), sid($body['userId'] ?? ''));
        json_response($res, !empty($res['ok']) ? 200 : 400);
    }

    if (preg_match('#^/rooms/([^/]+)/approve$#', $path, $m) && $method === 'POST') {
        $body = read_json_body();
        $res = approve_room_member(sid($m[1]), sid($body['creatorId'] ?? ''), sid($body['userId'] ?? ''), true);
        json_response($res, !empty($res['ok']) ? 200 : 400);
    }

    if (preg_match('#^/rooms/([^/]+)/reject$#', $path, $m) && $method === 'POST') {
        $body = read_json_body();
        $res = approve_room_member(sid($m[1]), sid($body['creatorId'] ?? ''), sid($body['userId'] ?? ''), false);
        json_response($res, !empty($res['ok']) ? 200 : 400);
    }

    if (preg_match('#^/rooms/([^/]+)/messages$#', $path, $m) && $method === 'GET') {
        json_response(list_room_messages(sid($m[1]), (int) ($_GET['after'] ?? 0)));
    }

    if (preg_match('#^/rooms/([^/]+)/messages$#', $path, $m) && $method === 'POST') {
        $body = read_json_body();
        $res = send_room_message(
            sid($m[1]),
            sid($body['senderId'] ?? ''),
            (string) ($body['senderName'] ?? 'Пользователь'),
            (string) ($body['text'] ?? ''),
            isset($body['thaiPhrase']) ? (string) $body['thaiPhrase'] : null
        );
        json_response($res, !empty($res['ok']) ? 200 : 400);
    }

    if (preg_match('#^/rooms/([^/]+)/voice/join$#', $path, $m) && $method === 'POST') {
        $body = read_json_body();
        $res = voice_heartbeat(sid($m[1]), sid($body['userId'] ?? ''), (string) ($body['displayName'] ?? ''));
        // Announce join for peers
        voice_post_signal(sid($m[1]), sid($body['userId'] ?? ''), null, 'join', [
            'displayName' => (string) ($body['displayName'] ?? ''),
        ]);
        json_response($res);
    }

    if (preg_match('#^/rooms/([^/]+)/voice/leave$#', $path, $m) && $method === 'POST') {
        $body = read_json_body();
        json_response(voice_leave(sid($m[1]), sid($body['userId'] ?? '')));
    }

    if (preg_match('#^/rooms/([^/]+)/voice/signal$#', $path, $m) && $method === 'POST') {
        $body = read_json_body();
        $res = voice_post_signal(
            sid($m[1]),
            sid($body['fromUserId'] ?? ''),
            isset($body['toUserId']) ? sid($body['toUserId']) : null,
            (string) ($body['type'] ?? 'signal'),
            $body['payload'] ?? []
        );
        json_response($res);
    }

    if (preg_match('#^/rooms/([^/]+)/voice/poll$#', $path, $m) && $method === 'GET') {
        $userId = sid($_GET['userId'] ?? '');
        if ($userId === '') {
            json_response(['error' => 'userId required'], 400);
        }
        // Keep presence alive while polling
        $name = (string) ($_GET['displayName'] ?? '');
        if ($name !== '') {
            voice_heartbeat(sid($m[1]), $userId, $name);
        }
        json_response(voice_poll_signals(sid($m[1]), $userId, (int) ($_GET['after'] ?? 0)));
    }

    json_response(['error' => 'Not found', 'path' => $path, 'method' => $method], 404);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
