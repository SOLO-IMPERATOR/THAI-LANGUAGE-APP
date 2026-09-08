<?php
declare(strict_types=1);

/**
 * Seed phrases/words from JSON into MySQL.
 * CLI:  php api/seed.php [--force]
 * HTTP: POST /api/seed {"token":"...","force":false}
 */

require_once __DIR__ . '/repositories.php';

function run_seed(string $token, bool $force = false): array
{
    $expected = (string) (app_config()['seed_token'] ?? '');
    if ($expected === '' || $expected === 'change-me-to-a-long-random-string') {
        return [
            'ok' => false,
            'status' => 403,
            'error' => 'Set a real seed_token in api/config.php before seeding.',
        ];
    }
    if (!hash_equals($expected, $token) && php_sapi_name() !== 'cli') {
        return ['ok' => false, 'status' => 403, 'error' => 'Invalid seed token'];
    }

    // CLI may omit token if config is set (local only)
    if (php_sapi_name() === 'cli' && $token !== '' && !hash_equals($expected, $token)) {
        return ['ok' => false, 'status' => 403, 'error' => 'Invalid seed token'];
    }

    $phrasesPath = app_config()['phrases_json'] ?? (__DIR__ . '/../data/thai_phrases_database.json');
    $wordsPath = app_config()['words_json'] ?? (__DIR__ . '/../data/words_dictionary.json');

    $phrasesCount = get_phrases_count();
    $wordsCount = get_words_count();

    if (!$force && $phrasesCount > 0 && $wordsCount > 0) {
        return [
            'ok' => true,
            'skipped' => true,
            'phrasesCount' => $phrasesCount,
            'wordsCount' => $wordsCount,
            'message' => 'Already seeded (pass force=true to reload)',
        ];
    }

    $out = ['ok' => true, 'forced' => $force];

    if ($force || $phrasesCount === 0) {
        if (!is_file($phrasesPath)) {
            return ['ok' => false, 'status' => 500, 'error' => 'Missing phrases JSON: ' . $phrasesPath];
        }
        $phrases = json_decode((string) file_get_contents($phrasesPath), true);
        if (!is_array($phrases)) {
            return ['ok' => false, 'status' => 500, 'error' => 'Invalid phrases JSON'];
        }
        $out['phrasesImported'] = replace_phrases($phrases);
    }

    if ($force || $wordsCount === 0) {
        if (!is_file($wordsPath)) {
            return ['ok' => false, 'status' => 500, 'error' => 'Missing words JSON: ' . $wordsPath];
        }
        $words = json_decode((string) file_get_contents($wordsPath), true);
        if (!is_array($words)) {
            return ['ok' => false, 'status' => 500, 'error' => 'Invalid words JSON'];
        }
        $out['wordsImported'] = replace_words($words);
    }

    $out['phrasesCount'] = get_phrases_count();
    $out['wordsCount'] = get_words_count();
    return $out;
}
