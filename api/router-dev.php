<?php
declare(strict_types=1);

/**
 * Dev router for: php -S 127.0.0.1:8080 -t . api/router-dev.php
 * Serves /api/* via api/index.php and static files otherwise.
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (preg_match('#^/api(?:/|$)#', $uri)) {
    require __DIR__ . '/index.php';
    return true;
}

$file = dirname(__DIR__) . $uri;
if ($uri !== '/' && is_file($file)) {
    return false; // let built-in server serve the file
}

// SPA fallback when using dist/
$distIndex = dirname(__DIR__) . '/dist/index.html';
if (is_file($distIndex)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($distIndex);
    return true;
}

http_response_code(404);
echo "Not found. For Vite HMR use npm run dev with proxy to :8080.\n";
return true;
