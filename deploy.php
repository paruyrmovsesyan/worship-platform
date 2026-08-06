<?php
declare(strict_types=1);

$secret = 'worship_deploy_9f82a17b3c';
$incomingSecret = $_GET['secret'] ?? $_POST['secret'] ?? '';

if (!is_string($incomingSecret) || !hash_equals($secret, $incomingSecret)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Forbidden']);
    exit;
}

header('Content-Type: text/plain; charset=UTF-8');
echo "Starting deployment...\n";

$output = [];
$returnVar = 0;
exec('git fetch origin main 2>&1 && git reset --hard origin/main 2>&1', $output, $returnVar);

echo implode("\n", $output);
echo "\nExit code: " . $returnVar . "\n";
