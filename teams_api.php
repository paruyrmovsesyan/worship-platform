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

function findUserByEmail(PDO $pdo, string $email): ?array {
    $st = $pdo->prepare("SELECT id, name, email FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1");
    $st->execute([$email]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/* GET TEAMS */
if ($action === 'get_teams' && $method === 'GET') {
    // Return teams the user owns or is a member of
    $st = $pdo->prepare("
        SELECT t.id, t.name, t.owner_user_id, t.created_at,
               (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id) as members_count,
               IF(t.owner_user_id = ?, 'owner', m.role) as user_role
        FROM teams t
        LEFT JOIN team_members m ON m.team_id = t.id AND m.user_id = ?
        WHERE t.owner_user_id = ? OR m.user_id = ?
        GROUP BY t.id
        ORDER BY t.created_at DESC
    ");
    $st->execute([$uid, $uid, $uid, $uid]);
    $teams = $st->fetchAll(PDO::FETCH_ASSOC);

    foreach($teams as &$t) {
        $t['id'] = (int)$t['id'];
        $t['owner_user_id'] = (int)$t['owner_user_id'];
        $t['members_count'] = (int)$t['members_count'];
    }
    unset($t);
    
    out(["ok" => true, "teams" => $teams]);
}

/* CREATE TEAM */
if ($action === 'create_team' && $method === 'POST') {
    $d = readJson();
    $name = trim($d['name'] ?? '');

    if ($name === '') {
        out(["error" => "Team name is required"], 400);
    }

    $st = $pdo->prepare("INSERT INTO teams (owner_user_id, name) VALUES (?, ?)");
    $st->execute([$uid, $name]);

    out([
        "ok" => true,
        "id" => (int)$pdo->lastInsertId()
    ]);
}

/* DELETE TEAM */
if ($action === 'delete_team' && $method === 'POST') {
    $d = readJson();
    $team_id = (int)($d['team_id'] ?? 0);

    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare("DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE id=? AND owner_user_id=?)");
        $st->execute([$team_id, $uid]);

        $st = $pdo->prepare("DELETE FROM teams WHERE id=? AND owner_user_id=?");
        $st->execute([$team_id, $uid]);

        $pdo->commit();
        out(["ok" => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        out(["error" => "Server error"], 500);
    }
}

/* GET TEAM MEMBERS */
if ($action === 'get_members' && $method === 'GET') {
    $team_id = (int)($_GET['team_id'] ?? 0);
    
    // Check access
    $st = $pdo->prepare("SELECT id FROM teams WHERE id=? AND owner_user_id=? LIMIT 1");
    $st->execute([$team_id, $uid]);
    if (!$st->fetch()) {
        out(["error" => "Team not found or unauthorized"], 404);
    }

    $st = $pdo->prepare("
        SELECT m.id, m.user_id, m.role, m.created_at, u.name, u.email
        FROM team_members m
        JOIN users u ON u.id = m.user_id
        WHERE m.team_id = ?
        ORDER BY m.created_at ASC
    ");
    $st->execute([$team_id]);
    $members = $st->fetchAll(PDO::FETCH_ASSOC);

    foreach($members as &$m) {
        $m['id'] = (int)$m['id'];
        $m['user_id'] = (int)$m['user_id'];
    }
    unset($m);

    out(["ok" => true, "members" => $members]);
}

/* ADD TEAM MEMBER */
if ($action === 'add_member' && $method === 'POST') {
    $d = readJson();
    $team_id = (int)($d['team_id'] ?? 0);
    $email = trim($d['email'] ?? '');
    
    if ($team_id <= 0 || $email === '') {
        out(["error" => "Invalid input"], 400);
    }

    // Enforce limits
    $stPlan = $pdo->prepare("SELECT plan_type FROM users WHERE id=? LIMIT 1");
    $stPlan->execute([$uid]);
    $plan = $stPlan->fetchColumn() ?: 'free';

    $stCount = $pdo->prepare("SELECT COUNT(*) FROM team_members m JOIN teams t ON t.id = m.team_id WHERE t.owner_user_id=?");
    $stCount->execute([$uid]);
    $currentMembers = (int)$stCount->fetchColumn();

    $limits = ['free' => 1, 'pro' => 10, 'church' => 99999];
    $maxMembers = $limits[$plan] ?? 1;

    if ($currentMembers >= $maxMembers) {
        out(["error" => "limit_reached", "message" => "Team member limit reached for your current plan. Please upgrade."], 403);
    }

    $user = findUserByEmail($pdo, $email);
    if (!$user) {
        out(["error" => "User not found with this email"], 404);
    }

    $granteeId = (int)$user['id'];
    if ($granteeId === $uid) {
        out(["error" => "Cannot add yourself to the team"], 400);
    }

    $st = $pdo->prepare("INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, 'member')");
    $st->execute([$team_id, $granteeId]);

    // Send invitation email
    $stTeam = $pdo->prepare("SELECT name FROM teams WHERE id=?");
    $stTeam->execute([$team_id]);
    $teamName = (string)$stTeam->fetchColumn() ?: 'Team';

    $stUser = $pdo->prepare("SELECT name FROM users WHERE id=?");
    $stUser->execute([$uid]);
    $inviterName = (string)$stUser->fetchColumn() ?: 'User';

    require_once __DIR__ . '/lib/PHPMailer/inc/mailer.php';
    if (function_exists('send_team_invite_email')) {
        send_team_invite_email((string)$user['email'], (string)($user['name'] ?? ''), $teamName, $inviterName);
    }

    out(["ok" => true]);
}

/* REMOVE TEAM MEMBER */
if ($action === 'remove_member' && $method === 'POST') {
    $d = readJson();
    $team_id = (int)($d['team_id'] ?? 0);
    $user_id = (int)($d['user_id'] ?? 0);
    
    // Ensure ownership
    $st = $pdo->prepare("SELECT id FROM teams WHERE id=? AND owner_user_id=? LIMIT 1");
    $st->execute([$team_id, $uid]);
    if (!$st->fetch()) {
        out(["error" => "Team not found or unauthorized"], 404);
    }

    $st = $pdo->prepare("DELETE FROM team_members WHERE team_id=? AND user_id=?");
    $st->execute([$team_id, $user_id]);

    out(["ok" => true]);
}

out(["error" => "Invalid action"], 400);
