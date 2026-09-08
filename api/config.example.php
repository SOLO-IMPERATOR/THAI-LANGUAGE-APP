<?php
/**
 * Copy to config.php and fill SpaceWeb MySQL credentials from the hosting panel.
 * config.php is gitignored — never commit secrets.
 *
 * SpaceWeb MySQL:
 * - MySQL 5.7 → host localhost, port 3306
 * - MySQL 8   → host 127.0.0.1, port 3308
 */
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3308,
        'name' => 'YOUR_DB_NAME',
        'user' => 'YOUR_DB_USER',
        'pass' => 'YOUR_DB_PASSWORD',
        'charset' => 'utf8mb4',
    ],
    // Random string; required to run /api/seed (or php api/seed.php)
    'seed_token' => 'change-me-to-a-long-random-string',
    // Absolute or relative to api/ directory
    'tts_cache_dir' => __DIR__ . '/../data/tts-cache',
    'phrases_json' => __DIR__ . '/../data/thai_phrases_database.json',
    'words_json' => __DIR__ . '/../data/words_dictionary.json',
];
