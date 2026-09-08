<?php
declare(strict_types=1);

/**
 * Server TTS for PHP hosting: Google Translate TTS + disk cache.
 * Client still applies playbackRate (0.5 / 0.7 / 1.0 / 1.2).
 */
function tts_cache_dir(): string
{
    $dir = app_config()['tts_cache_dir'] ?? (__DIR__ . '/../data/tts-cache');
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function tts_cache_key(string $text, string $gender): string
{
    return sha1('v2|' . $gender . '|base|' . $text);
}

function synthesize_google_tts(string $text, string $outPath): void
{
    $chunk = mb_substr($text, 0, 180, 'UTF-8');
    $url = 'https://translate.google.com/translate_tts?' . http_build_query([
        'ie' => 'UTF-8',
        'q' => $chunk,
        'tl' => 'th',
        'client' => 'tw-ob',
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_HTTPHEADER => [
            'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept: audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
            'Referer: https://translate.google.com/',
        ],
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($body === false || $status >= 400) {
        throw new RuntimeException('Google TTS HTTP ' . $status . ($err ? (': ' . $err) : ''));
    }
    if (strlen($body) < 100) {
        throw new RuntimeException('Google TTS returned empty audio');
    }

    if (file_put_contents($outPath, $body) === false) {
        throw new RuntimeException('Failed to write TTS cache file');
    }
}

/**
 * @return array{filePath:string,cacheHit:bool,provider:string}
 */
function synthesize_thai_mp3(string $text, string $gender = 'female'): array
{
    $clean = trim($text);
    if ($clean === '') {
        throw new InvalidArgumentException('text required');
    }
    if (!preg_match('/[\x{0E00}-\x{0E7F}]/u', $clean)) {
        throw new InvalidArgumentException('Thai text required');
    }

    $gender = $gender === 'male' ? 'male' : 'female';
    $dir = tts_cache_dir();
    $key = tts_cache_key($clean, $gender);
    $filePath = $dir . DIRECTORY_SEPARATOR . $key . '.mp3';

    if (is_file($filePath) && filesize($filePath) > 100) {
        return ['filePath' => $filePath, 'cacheHit' => true, 'provider' => 'cache'];
    }

    $tmp = $filePath . '.tmp';
    synthesize_google_tts($clean, $tmp);
    rename($tmp, $filePath);

    return ['filePath' => $filePath, 'cacheHit' => false, 'provider' => 'google-translate'];
}

function send_mp3_file(string $filePath, string $provider, bool $cacheHit): void
{
    header('Content-Type: audio/mpeg');
    header('Cache-Control: public, max-age=31536000, immutable');
    header('X-TTS-Provider: ' . $provider);
    header('X-TTS-Cache: ' . ($cacheHit ? 'hit' : 'miss'));
    header('Content-Length: ' . (string) filesize($filePath));
    readfile($filePath);
    exit;
}
