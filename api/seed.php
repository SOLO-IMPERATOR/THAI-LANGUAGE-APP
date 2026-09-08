<?php
declare(strict_types=1);

require_once __DIR__ . '/seed_runner.php';

$force = in_array('--force', $argv ?? [], true);
$token = '';
foreach ($argv ?? [] as $arg) {
    if (str_starts_with($arg, '--token=')) {
        $token = substr($arg, 8);
    }
}
if ($token === '') {
    $token = (string) (app_config()['seed_token'] ?? '');
}

$result = run_seed($token, $force);
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
exit(!empty($result['ok']) ? 0 : 1);
