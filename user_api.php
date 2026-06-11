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
    $st = $pdo->prepare("SELECT id, name, email, plan_type FROM users WHERE id=? LIMIT 1");
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
            "email" => $user['email'],
            "plan_type" => $user['plan_type'] ?: 'free'
        ]
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

out(["error" => "Invalid action"], 400);
