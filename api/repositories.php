<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function map_phrase_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'category' => $row['category'],
        'tags' => parse_json_field($row['tags'], []),
        'russian' => $row['russian'],
        'isQuestion' => (bool) $row['is_question'],
        'male' => [
            'thai' => $row['male_thai'],
            'transcription_ru' => $row['male_transcription_ru'],
            'particle' => $row['male_particle'],
        ],
        'female' => [
            'thai' => $row['female_thai'],
            'transcription_ru' => $row['female_transcription_ru'],
            'particle' => $row['female_particle'],
        ],
        'thai_hidden' => $row['thai_hidden'],
        'transcription_ru' => $row['transcription_ru'],
        'translation_ru' => $row['translation_ru'],
        'stage_srs' => (int) ($row['stage_srs'] ?? 0),
        'review_count' => (int) ($row['review_count'] ?? 0),
        'next_review' => (int) ($row['next_review'] ?? 0),
        'is_deconstructed' => (int) ($row['is_deconstructed'] ?? 0),
        'words_breakdown' => parse_json_field($row['words_breakdown'], []),
    ];
}

function map_user_row(array $row): array
{
    return [
        'id' => $row['id'],
        'email' => $row['email'] ?? '',
        'username' => $row['username'] ?? 'User',
        'firstName' => $row['first_name'] ?? '',
        'lastName' => $row['last_name'] ?? '',
        'avatar' => $row['avatar'] ?? '👨',
        'gender' => $row['gender'] ?? 'male',
        'cityInThailand' => $row['city_in_thailand'] ?? 'Бангкок',
        'stayDuration' => $row['stay_duration'] ?? 'Турист / Отпуск',
        'dailyGoal' => (int) ($row['daily_goal'] ?? 10),
        'xp' => (int) ($row['xp'] ?? 0),
        'level' => (int) ($row['level'] ?? 1),
        'streak' => (int) ($row['streak'] ?? 1),
        'registeredAt' => $row['registered_at'],
        'isPrivate' => (bool) ($row['is_private'] ?? 0),
        'lastActiveAt' => $row['last_active_at'],
    ];
}

function map_progress_row(array $row): array
{
    return [
        'userId' => $row['user_id'],
        'phraseId' => (int) $row['phrase_id'],
        'stage_srs' => (int) ($row['stage_srs'] ?? 0),
        'review_count' => (int) ($row['review_count'] ?? 0),
        'next_review' => (int) ($row['next_review'] ?? 0),
        'is_deconstructed' => (int) ($row['is_deconstructed'] ?? 0),
        'tags' => parse_json_field($row['tags'], []),
        'updatedAt' => $row['updated_at'],
    ];
}

function map_history_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'userId' => $row['user_id'],
        'phraseId' => (int) $row['phrase_id'],
        'result' => $row['result'],
        'stageBefore' => (int) ($row['stage_before'] ?? 0),
        'stageAfter' => (int) ($row['stage_after'] ?? 0),
        'reviewCount' => (int) ($row['review_count'] ?? 0),
        'createdAt' => $row['created_at'],
    ];
}

function get_phrases_count(): int
{
    return (int) db()->query('SELECT COUNT(*) FROM phrases')->fetchColumn();
}

function get_words_count(): int
{
    return (int) db()->query('SELECT COUNT(*) FROM words')->fetchColumn();
}

function get_all_phrases(): array
{
    $rows = db()->query('SELECT * FROM phrases ORDER BY id ASC')->fetchAll();
    return array_map('map_phrase_row', $rows);
}

function get_all_words(): array
{
    $stmt = db()->query('SELECT thai, transcription_ru, translation_ru FROM words ORDER BY id ASC');
    return $stmt->fetchAll();
}

function get_all_users(): array
{
    $rows = db()->query('SELECT * FROM users ORDER BY xp DESC, registered_at ASC')->fetchAll();
    return array_map('map_user_row', $rows);
}

function find_user_by_id_or_email(?string $id, ?string $email): ?array
{
    $pdo = db();
    if ($id) {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            return map_user_row($row);
        }
    }
    if ($email) {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        if ($row) {
            return map_user_row($row);
        }
    }
    return null;
}

function upsert_user(array $user): array
{
    $existing = find_user_by_id_or_email($user['id'] ?? null, $user['email'] ?? null);
    $pdo = db();

    if ($existing) {
        $merged = array_merge($existing, $user);
        $merged['xp'] = max((int) ($existing['xp'] ?? 0), (int) ($user['xp'] ?? 0));
        $merged['level'] = max((int) ($existing['level'] ?? 1), (int) ($user['level'] ?? 1));
        $merged['streak'] = max((int) ($existing['streak'] ?? 1), (int) ($user['streak'] ?? 1));
        $merged['lastActiveAt'] = $user['lastActiveAt'] ?? now_iso();

        $stmt = $pdo->prepare(
            'UPDATE users SET
                email = :email,
                username = :username,
                first_name = :firstName,
                last_name = :lastName,
                avatar = :avatar,
                gender = :gender,
                city_in_thailand = :cityInThailand,
                stay_duration = :stayDuration,
                daily_goal = :dailyGoal,
                xp = :xp,
                level = :level,
                streak = :streak,
                registered_at = :registeredAt,
                is_private = :isPrivate,
                last_active_at = :lastActiveAt
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $merged['id'],
            'email' => $merged['email'],
            'username' => $merged['username'],
            'firstName' => $merged['firstName'],
            'lastName' => $merged['lastName'],
            'avatar' => $merged['avatar'],
            'gender' => $merged['gender'],
            'cityInThailand' => $merged['cityInThailand'],
            'stayDuration' => $merged['stayDuration'],
            'dailyGoal' => (int) $merged['dailyGoal'],
            'xp' => (int) $merged['xp'],
            'level' => (int) $merged['level'],
            'streak' => (int) $merged['streak'],
            'registeredAt' => $merged['registeredAt'],
            'isPrivate' => !empty($merged['isPrivate']) ? 1 : 0,
            'lastActiveAt' => $merged['lastActiveAt'],
        ]);

        return $merged;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO users (
            id, email, username, first_name, last_name, avatar, gender,
            city_in_thailand, stay_duration, daily_goal, xp, level, streak,
            registered_at, is_private, last_active_at
        ) VALUES (
            :id, :email, :username, :firstName, :lastName, :avatar, :gender,
            :cityInThailand, :stayDuration, :dailyGoal, :xp, :level, :streak,
            :registeredAt, :isPrivate, :lastActiveAt
        )'
    );
    $stmt->execute([
        'id' => $user['id'],
        'email' => $user['email'] ?? '',
        'username' => $user['username'] ?? 'User',
        'firstName' => $user['firstName'] ?? '',
        'lastName' => $user['lastName'] ?? '',
        'avatar' => $user['avatar'] ?? '👨',
        'gender' => $user['gender'] ?? 'male',
        'cityInThailand' => $user['cityInThailand'] ?? 'Бангкок',
        'stayDuration' => $user['stayDuration'] ?? 'Турист / Отпуск',
        'dailyGoal' => (int) ($user['dailyGoal'] ?? 10),
        'xp' => (int) ($user['xp'] ?? 0),
        'level' => (int) ($user['level'] ?? 1),
        'streak' => (int) ($user['streak'] ?? 1),
        'registeredAt' => $user['registeredAt'] ?? now_iso(),
        'isPrivate' => !empty($user['isPrivate']) ? 1 : 0,
        'lastActiveAt' => $user['lastActiveAt'] ?? now_iso(),
    ]);

    return $user;
}

function sync_user_progress(array $patch): ?array
{
    $existing = find_user_by_id_or_email($patch['id'] ?? null, $patch['email'] ?? null);
    if (!$existing) {
        return null;
    }

    $updated = $existing;
    foreach (['xp', 'level', 'streak', 'gender', 'avatar', 'username', 'cityInThailand'] as $key) {
        if (array_key_exists($key, $patch) && $patch[$key] !== null) {
            $updated[$key] = $patch[$key];
        }
    }
    $updated['lastActiveAt'] = now_iso();

    $stmt = db()->prepare(
        'UPDATE users SET
            xp = :xp,
            level = :level,
            streak = :streak,
            gender = :gender,
            avatar = :avatar,
            username = :username,
            city_in_thailand = :cityInThailand,
            last_active_at = :lastActiveAt
         WHERE id = :id'
    );
    $stmt->execute([
        'id' => $updated['id'],
        'xp' => (int) $updated['xp'],
        'level' => (int) $updated['level'],
        'streak' => (int) $updated['streak'],
        'gender' => $updated['gender'],
        'avatar' => $updated['avatar'],
        'username' => $updated['username'],
        'cityInThailand' => $updated['cityInThailand'],
        'lastActiveAt' => $updated['lastActiveAt'],
    ]);

    return $updated;
}

function get_user_phrase_progress(string $userId): array
{
    $stmt = db()->prepare(
        'SELECT * FROM user_phrase_progress WHERE user_id = ? ORDER BY phrase_id ASC'
    );
    $stmt->execute([$userId]);
    return array_map('map_progress_row', $stmt->fetchAll());
}

function get_user_review_history(string $userId, int $limit = 200): array
{
    $limit = max(1, min($limit, 1000));
    $stmt = db()->prepare(
        'SELECT * FROM user_review_history
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?'
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_STR);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return array_map('map_history_row', $stmt->fetchAll());
}

function get_srs_stats(?string $userId = null): array
{
    $pdo = db();
    if ($userId) {
        $p = $pdo->prepare('SELECT COUNT(*) FROM user_phrase_progress WHERE user_id = ?');
        $p->execute([$userId]);
        $h = $pdo->prepare('SELECT COUNT(*) FROM user_review_history WHERE user_id = ?');
        $h->execute([$userId]);
        return [
            'progressCount' => (int) $p->fetchColumn(),
            'historyCount' => (int) $h->fetchColumn(),
        ];
    }

    return [
        'progressCount' => (int) $pdo->query('SELECT COUNT(*) FROM user_phrase_progress')->fetchColumn(),
        'historyCount' => (int) $pdo->query('SELECT COUNT(*) FROM user_review_history')->fetchColumn(),
    ];
}

function upsert_user_phrase_progress(string $userId, array $progress, ?array $event = null): array
{
    $pdo = db();
    $now = now_iso();
    $phraseId = (int) $progress['phraseId'];

    $stmt = $pdo->prepare(
        'SELECT * FROM user_phrase_progress WHERE user_id = ? AND phrase_id = ? LIMIT 1'
    );
    $stmt->execute([$userId, $phraseId]);
    $existing = $stmt->fetch() ?: null;

    $tags = array_key_exists('tags', $progress)
        ? ($progress['tags'] ?? [])
        : parse_json_field($existing['tags'] ?? null, []);

    $merged = [
        'user_id' => $userId,
        'phrase_id' => $phraseId,
        'stage_srs' => (int) ($progress['stage_srs'] ?? $existing['stage_srs'] ?? 0),
        'review_count' => (int) ($progress['review_count'] ?? $existing['review_count'] ?? 0),
        'next_review' => (int) ($progress['next_review'] ?? $existing['next_review'] ?? 0),
        'is_deconstructed' => (int) ($progress['is_deconstructed'] ?? $existing['is_deconstructed'] ?? 0),
        'tags' => encode_json_field($tags),
        'updated_at' => $now,
    ];

    $upsert = $pdo->prepare(
        'INSERT INTO user_phrase_progress (
            user_id, phrase_id, stage_srs, review_count, next_review, is_deconstructed, tags, updated_at
        ) VALUES (
            :user_id, :phrase_id, :stage_srs, :review_count, :next_review, :is_deconstructed, :tags, :updated_at
        )
        ON DUPLICATE KEY UPDATE
            stage_srs = VALUES(stage_srs),
            review_count = VALUES(review_count),
            next_review = VALUES(next_review),
            is_deconstructed = VALUES(is_deconstructed),
            tags = VALUES(tags),
            updated_at = VALUES(updated_at)'
    );
    $upsert->execute($merged);

    if (!empty($event['result'])) {
        $hist = $pdo->prepare(
            'INSERT INTO user_review_history (
                user_id, phrase_id, result, stage_before, stage_after, review_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $hist->execute([
            $userId,
            $phraseId,
            $event['result'],
            (int) ($event['stageBefore'] ?? $existing['stage_srs'] ?? 0),
            (int) ($event['stageAfter'] ?? $merged['stage_srs']),
            (int) ($event['reviewCount'] ?? $merged['review_count']),
            $event['createdAt'] ?? $now,
        ]);
    }

    $touch = $pdo->prepare('UPDATE users SET last_active_at = ? WHERE id = ?');
    $touch->execute([$now, $userId]);

    return map_progress_row($merged);
}

function bulk_upsert_user_phrase_progress(string $userId, array $items): int
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $count = 0;
        foreach ($items as $item) {
            if (empty($item['phraseId'])) {
                continue;
            }
            upsert_user_phrase_progress($userId, $item);
            $count++;
        }
        $pdo->commit();
        return $count;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function replace_phrases(array $phrases): int
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        // Dependent rows first (FK)
        $pdo->exec('DELETE FROM user_review_history');
        $pdo->exec('DELETE FROM user_phrase_progress');
        $pdo->exec('DELETE FROM phrases');
        $stmt = $pdo->prepare(
            'INSERT INTO phrases (
                id, category, tags, russian, is_question,
                male_thai, male_transcription_ru, male_particle,
                female_thai, female_transcription_ru, female_particle,
                thai_hidden, transcription_ru, translation_ru,
                stage_srs, review_count, next_review, is_deconstructed, words_breakdown
            ) VALUES (
                :id, :category, :tags, :russian, :is_question,
                :male_thai, :male_transcription_ru, :male_particle,
                :female_thai, :female_transcription_ru, :female_particle,
                :thai_hidden, :transcription_ru, :translation_ru,
                :stage_srs, :review_count, :next_review, :is_deconstructed, :words_breakdown
            )'
        );

        foreach ($phrases as $phrase) {
            $stmt->execute([
                'id' => (int) $phrase['id'],
                'category' => $phrase['category'] ?? '',
                'tags' => encode_json_field($phrase['tags'] ?? []),
                'russian' => $phrase['russian'] ?? ($phrase['translation_ru'] ?? ''),
                'is_question' => !empty($phrase['isQuestion']) ? 1 : 0,
                'male_thai' => $phrase['male']['thai'] ?? '',
                'male_transcription_ru' => $phrase['male']['transcription_ru'] ?? '',
                'male_particle' => $phrase['male']['particle'] ?? ($phrase['male']['polite_particle'] ?? ''),
                'female_thai' => $phrase['female']['thai'] ?? '',
                'female_transcription_ru' => $phrase['female']['transcription_ru'] ?? '',
                'female_particle' => $phrase['female']['particle'] ?? ($phrase['female']['polite_particle'] ?? ''),
                'thai_hidden' => $phrase['thai_hidden'] ?? ($phrase['male']['thai'] ?? ''),
                'transcription_ru' => $phrase['transcription_ru'] ?? ($phrase['male']['transcription_ru'] ?? ''),
                'translation_ru' => $phrase['translation_ru'] ?? ($phrase['russian'] ?? ''),
                'stage_srs' => (int) ($phrase['stage_srs'] ?? 0),
                'review_count' => (int) ($phrase['review_count'] ?? 0),
                'next_review' => (int) ($phrase['next_review'] ?? 0),
                'is_deconstructed' => (int) ($phrase['is_deconstructed'] ?? 0),
                'words_breakdown' => encode_json_field($phrase['words_breakdown'] ?? ($phrase['words'] ?? [])),
            ]);
        }

        $pdo->commit();
        return count($phrases);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function replace_words(array $words): int
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM words');
        $stmt = $pdo->prepare(
            'INSERT INTO words (thai, transcription_ru, translation_ru)
             VALUES (:thai, :transcription_ru, :translation_ru)'
        );
        foreach ($words as $word) {
            $stmt->execute([
                'thai' => $word['thai'] ?? '',
                'transcription_ru' => $word['transcription_ru'] ?? '',
                'translation_ru' => $word['translation_ru'] ?? '',
            ]);
        }
        $pdo->commit();
        return count($words);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
