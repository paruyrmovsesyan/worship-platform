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

    try {
      $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
      $stmt->execute([$_SESSION['user_id']]);
      $u = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
      respond([
        "loggedIn" => false,
        "session_type" => null,
        "error" => "Query failed: " . $e->getMessage()
      ]);
    }

    $userData = [
      "id" => (int)$_SESSION['user_id'],
      "name" => (string)($_SESSION['name'] ?? 'User'),
      "username" => (string)($_SESSION['username'] ?? 'User'),
      "email" => (string)($_SESSION['email'] ?? ''),
      "birth_date" => null,
      "gender" => null,
      "phone_number" => null
    ];

    if ($u) {
      $userData["name"] = $u["name"] ?? $userData["name"];
      $userData["username"] = $u["username"] ?? $userData["username"];
      $userData["email"] = $u["email"] ?? $userData["email"];
      $userData["birth_date"] = $u["birth_date"] ?? null;
      $userData["gender"] = $u["gender"] ?? null;
      $userData["phone_number"] = $u["phone_number"] ?? null;
    }

    respond([
      "loggedIn" => true,
      "session_type" => !empty($_SESSION['auth_via_remember']) ? "remember" : "session",
      "user" => $userData
    ]);
}

respond([
  "loggedIn" => false,
  "session_type" => null
]);
