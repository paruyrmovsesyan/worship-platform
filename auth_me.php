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
    if (!$pdo) {
      // DB unavailable — trust the existing session and return user data from session
      respond([
        "loggedIn" => true,
        "session_type" => !empty($_SESSION['auth_via_remember']) ? "remember" : "session",
        "user" => [
          "id"           => (int)$_SESSION['user_id'],
          "name"         => (string)($_SESSION['name'] ?? 'User'),
          "username"     => (string)($_SESSION['username'] ?? 'User'),
          "email"        => (string)($_SESSION['email'] ?? ''),
          "birth_date"   => '',
          "gender"       => '',
          "phone_number" => '',
        ]
      ]);
    }
    if (!wp_auth_current_session_backed($pdo)) {
      wp_auth_force_local_logout(false);
      if (wp_auth_restore_from_remember_cookie($pdo) && !empty($_SESSION['user_id'])) {
        // restored below
      } else {
        respond([
          "loggedIn" => false,
          "session_type" => null
        ]);
      }
    }
  } catch (Throwable $e) {
    // DB error — trust existing session, do NOT force logout
    respond([
      "loggedIn" => true,
      "session_type" => !empty($_SESSION['auth_via_remember']) ? "remember" : "session",
      "user" => [
        "id"           => (int)$_SESSION['user_id'],
        "name"         => (string)($_SESSION['name'] ?? 'User'),
        "username"     => (string)($_SESSION['username'] ?? 'User'),
        "email"        => (string)($_SESSION['email'] ?? ''),
        "birth_date"   => '',
        "gender"       => '',
        "phone_number" => '',
      ]
    ]);
  }

    try {
      $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND COALESCE(is_blocked, 0) = 0");
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
      $userData["name"] = (string)($u["name"] ?? $userData["name"]);
      $userData["username"] = (string)($u["username"] ?? $userData["username"]);
      $userData["email"] = (string)($u["email"] ?? $userData["email"]);
      $userData["birth_date"] = !empty($u["birth_date"]) && $u["birth_date"] !== '0000-00-00' ? (string)$u["birth_date"] : '';
      $userData["gender"] = !empty($u["gender"]) ? (string)$u["gender"] : '';
      $userData["phone_number"] = !empty($u["phone_number"]) ? (string)$u["phone_number"] : '';
    } else {
      wp_auth_force_local_logout(true);
      respond([
        "loggedIn" => false,
        "session_type" => null
      ]);
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
