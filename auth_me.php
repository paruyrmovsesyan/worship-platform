<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

require_once __DIR__ . '/auth_bootstrap.php';

function respond(array $arr): void {
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

if (!empty($_SESSION['user_id'])) {
  try {
    $pdo = wp_auth_open_pdo();
    if (!wp_auth_current_session_backed($pdo)) {
      wp_auth_force_local_logout(false);
      respond([
        "loggedIn" => false,
        "session_type" => null
      ]);
    }
  } catch (Throwable $e) {
    respond([
      "loggedIn" => false,
      "session_type" => null,
      "error" => "Database connection error: " . $e->getMessage()
    ]);
  }

  respond([
    "loggedIn" => true,
    "session_type" => !empty($_SESSION['auth_via_remember']) ? "remember" : "session",
    "user" => [
      "id" => (int)$_SESSION['user_id'],
      "name" => (string)($_SESSION['name'] ?? 'User'),
      "username" => (string)($_SESSION['username'] ?? ($_SESSION['name'] ?? 'User')),
      "email" => (string)($_SESSION['email'] ?? '')
    ]
  ]);
}

respond([
  "loggedIn" => false,
  "session_type" => null
]);
