<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

require_once __DIR__ . '/auth_bootstrap.php';

function respond(array $arr): void {
  if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
  }
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

if (empty($_SESSION['user_id']) && !empty($_COOKIE['remember_me'])) {
  try {
    $pdo = wp_auth_open_pdo();
    if (!$pdo) {
      respond([
        "loggedIn" => false,
        "dbUnavailable" => true,
        "session_type" => "remember"
      ]);
    }
    wp_auth_restore_from_remember_cookie($pdo);
  } catch (Throwable $e) {
    respond([
      "loggedIn" => false,
      "dbUnavailable" => true,
      "session_type" => "remember"
    ]);
  }
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
      wp_auth_clear_session_user(false);
      if (wp_auth_restore_from_remember_cookie($pdo) && !empty($_SESSION['user_id'])) {
        // restored into active session
      } else {
        wp_auth_force_local_logout(false);
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

  $sessionUserId = (int)$_SESSION['user_id'];
  $sessionName = (string)($_SESSION['name'] ?? 'User');
  $sessionUsername = (string)($_SESSION['username'] ?? 'User');
  $sessionEmail = (string)($_SESSION['email'] ?? '');
  $sessionType = !empty($_SESSION['auth_via_remember']) ? "remember" : "session";

  // Release session lock before querying user details and push subscriptions
  if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
  }

  try {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND COALESCE(is_blocked, 0) = 0");
    $stmt->execute([$sessionUserId]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
  } catch (Throwable $e) {
    respond([
      "loggedIn" => true,
      "session_type" => $sessionType,
      "user" => [
        "id"           => $sessionUserId,
        "name"         => $sessionName,
        "username"     => $sessionUsername,
        "email"        => $sessionEmail,
        "birth_date"   => '',
        "gender"       => '',
        "phone_number" => '',
      ]
    ]);
  }

  $userData = [
    "id" => $sessionUserId,
    "name" => $sessionName,
    "username" => $sessionUsername,
    "email" => $sessionEmail,
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

    $hasActivePush = false;
    try {
      $stPush = $pdo->prepare("SELECT COUNT(*) FROM push_subscriptions WHERE user_id = ? AND is_active = 1 AND permission_state = 'granted'");
      $stPush->execute([$u['id']]);
      $hasActivePush = ((int)$stPush->fetchColumn()) > 0;
    } catch (Throwable $e) {}

    $notifCol = isset($u["notifications_enabled"]) ? (int)$u["notifications_enabled"] : 1;
    $userData["notifications_enabled"] = ($notifCol === 1) || $hasActivePush;
  } else {
    if (session_status() !== PHP_SESSION_ACTIVE) {
      @session_start();
    }
    wp_auth_force_local_logout(true);
    respond([
      "loggedIn" => false,
      "session_type" => null
    ]);
  }

  respond([
    "loggedIn" => true,
    "session_type" => $sessionType,
    "user" => $userData
  ]);
}

if (!empty($_COOKIE['remember_me']) && !empty($GLOBALS['WP_AUTH_DB_UNAVAILABLE'])) {
  respond([
    "loggedIn" => false,
    "dbUnavailable" => true,
    "session_type" => "remember"
  ]);
}

respond([
  "loggedIn" => false,
  "session_type" => null
]);
