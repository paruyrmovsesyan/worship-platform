<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/runtime_config.php';

function out($arr, $code = 200){
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (empty($_SESSION['user_id'])) {
  out(["error" => "Unauthorized"], 401);
}

try {
  $pdo = wp_runtime_open_pdo();
  $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Exception $e) {
  out(["error" => "DB connection failed"], 500);
}

$uid = (int)$_SESSION['user_id'];

function readJson(){
  $raw = file_get_contents("php://input");
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

/* GET USER PROFILE & PLAN */
if ($action === 'get_profile' && $method === 'GET') {
    $st = $pdo->prepare("SELECT id, name, username, email, plan_type FROM users WHERE id=? LIMIT 1");
    $st->execute([$uid]);
    $user = $st->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        out(["error" => "User not found"], 404);
    }

    out([
        "ok" => true,
        "user" => [
            "id" => (int)$user['id'],
            "name" => $user['name'],
            "username" => $user['username'] ?? '',
            "email" => $user['email'],
            "plan_type" => $user['plan_type'] ?: 'free'
        ]
    ]);
}

/* GET OTHER USER PROFILE */
if (($action === 'get_user_profile' || $action === 'get_public_profile') && $method === 'GET') {
    $targetId = (int)($_GET['id'] ?? $_GET['user_id'] ?? 0);
    if ($targetId <= 0) {
        out(["error" => "Invalid user ID"], 400);
    }

    // Auto-create worship_role and avatar_gradient columns if not exist
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN worship_role VARCHAR(30) DEFAULT NULL");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN avatar_gradient VARCHAR(120) DEFAULT NULL");
    } catch (Throwable $e) {}

    $st = $pdo->prepare("
        SELECT id, name, username, email, worship_role, avatar_gradient, created_at, last_active_at,
               TIMESTAMPDIFF(SECOND, last_active_at, NOW()) as seconds_since_active
        FROM users
        WHERE id = ?
        LIMIT 1
    ");
    $st->execute([$targetId]);
    $targetUser = $st->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        out(["error" => "User not found"], 404);
    }

    // Determine online status
    $secActive = $targetUser['seconds_since_active'] !== null ? (int)$targetUser['seconds_since_active'] : null;
    $isOnline = false;
    if ($secActive !== null && $secActive < 120) {
        $isOnline = true;
    } else {
        try {
            $stAct = $pdo->prepare("
                SELECT MAX(last_seen) FROM web_activity
                WHERE user_id = ? AND last_seen >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)
            ");
            $stAct->execute([$targetId]);
            if ($stAct->fetchColumn()) {
                $isOnline = true;
            }
        } catch (Throwable $e) {}
    }

    // Check friendship status with current logged-in user
    $friendship = [
        "status" => "none",
        "is_requester" => false,
    ];
    if ($uid !== $targetId) {
        $stFriend = $pdo->prepare("
            SELECT user_id_1, user_id_2, status
            FROM friends
            WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
            LIMIT 1
        ");
        $stFriend->execute([$uid, $targetId, $targetId, $uid]);
        $fRow = $stFriend->fetch(PDO::FETCH_ASSOC);
        if ($fRow) {
            $friendship['status'] = $fRow['status'];
            $friendship['is_requester'] = ((int)$fRow['user_id_1'] === $uid);
        }
    } else {
        $friendship['status'] = 'self';
    }

    // Check direct chat ID
    $directChatId = 0;
    if ($uid !== $targetId) {
        try {
            $stChat = $pdo->prepare("
                SELECT c.id
                FROM chats c
                JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
                JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
                WHERE c.type = 'direct'
                ORDER BY c.id ASC
                LIMIT 1
            ");
            $stChat->execute([$uid, $targetId]);
            $directChatId = (int)($stChat->fetchColumn() ?: 0);
        } catch (Throwable $e) {}
    }

    // Get active setlists of this user
    $setlists = [];
    try {
        $stSets = $pdo->prepare("
            SELECT s.id, s.title, s.created_at,
                   (SELECT COUNT(*) FROM setlist_items i WHERE i.setlist_id = s.id) AS songs_count
            FROM setlists s
            WHERE s.user_id = ? AND (s.status = 'active' OR s.status IS NULL)
            ORDER BY s.id DESC
            LIMIT 10
        ");
        $stSets->execute([$targetId]);
        $setlists = $stSets->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {}

    out([
        "ok" => true,
        "user" => [
            "id" => (int)$targetUser['id'],
            "name" => $targetUser['name'] ?: 'User',
            "username" => $targetUser['username'] ?? '',
            "email" => $targetUser['email'] ?? '',
            "worship_role" => $targetUser['worship_role'] ?: null,
            "avatar_gradient" => $targetUser['avatar_gradient'] ?: null,
            "created_at" => $targetUser['created_at'] ?: null,
            "last_active_at" => $targetUser['last_active_at'] ?: null,
            "seconds_since_active" => $secActive,
            "is_online" => $isOnline,
        ],
        "friendship" => $friendship,
        "direct_chat_id" => $directChatId,
        "setlists" => $setlists,
    ]);
}

/* UPGRADE PLAN (DEMO) */
if ($action === 'upgrade_plan' && $method === 'POST') {
    $d = readJson();
    $plan = strtolower(trim($d['plan'] ?? ''));

    if (!in_array($plan, ['free', 'pro', 'church'], true)) {
        out(["error" => "Invalid plan"], 400);
    }

    $st = $pdo->prepare("UPDATE users SET plan_type=? WHERE id=?");
    $st->execute([$plan, $uid]);

    out([
        "ok" => true,
        "plan_type" => $plan
    ]);
}

/* UPDATE PROFILE */
if ($action === 'update_profile' && $method === 'POST') {
    $d = readJson();
    $name = trim($d['name'] ?? '');
    $username = trim($d['username'] ?? '');

    if ($name === '') {
        out(["error" => "Անունը պարտադիր է"], 400);
    }

    // Check if username is already taken by someone else
    if ($username !== '') {
        $st = $pdo->prepare("SELECT id FROM users WHERE username=? AND id!=?");
        $st->execute([$username, $uid]);
        if ($st->fetch()) {
            out(["error" => "Այդ մուտքանունը արդեն զբաղված է"], 400);
        }
    }

    $st = $pdo->prepare("UPDATE users SET name=?, username=? WHERE id=?");
    $st->execute([$name, $username, $uid]);

    out([
        "ok" => true,
        "message" => "Պրոֆիլը թարմացվել է",
        "user" => [
            "name" => $name,
            "username" => $username
        ]
    ]);
}

out(["error" => "Invalid action"], 400);
