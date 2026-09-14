<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/runtime_config.php';

function teams_api_out(array $payload, int $code = 200): never {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'get_teams'));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$uid = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

try {
    $pdo = wp_runtime_open_pdo();
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Throwable $e) {
    teams_api_out(['ok' => false, 'error' => 'Database connection failed', 'teams' => []], 500);
}

if ($action === 'get_teams') {
    if ($uid <= 0) {
        teams_api_out(['ok' => true, 'teams' => []]);
    }

    try {
        $st = $pdo->prepare("
            SELECT DISTINCT
                t.id,
                t.name,
                t.owner_user_id,
                t.created_at,
                CASE 
                    WHEN t.owner_user_id = ? THEN 'owner'
                    ELSE COALESCE(m.role, 'member')
                END AS role,
                (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
            FROM teams t
            LEFT JOIN team_members m ON m.team_id = t.id AND m.user_id = ?
            WHERE t.owner_user_id = ? OR m.user_id = ?
            ORDER BY t.name ASC
        ");
        $st->execute([$uid, $uid, $uid, $uid]);
        $teams = $st->fetchAll(PDO::FETCH_ASSOC);

        $normalized = array_map(static function(array $row): array {
            return [
                'id' => (int)$row['id'],
                'name' => (string)$row['name'],
                'owner_user_id' => (int)$row['owner_user_id'],
                'role' => (string)($row['role'] ?? 'member'),
                'member_count' => (int)($row['member_count'] ?? 1),
                'created_at' => (string)($row['created_at'] ?? ''),
            ];
        }, $teams);

        teams_api_out(['ok' => true, 'teams' => $normalized]);
    } catch (Throwable $e) {
        teams_api_out(['ok' => false, 'error' => 'Failed to load teams', 'teams' => []], 500);
    }
}

if ($action === 'get_team') {
    $teamId = (int)($_GET['team_id'] ?? $_POST['team_id'] ?? 0);
    if ($teamId <= 0 || $uid <= 0) {
        teams_api_out(['ok' => false, 'error' => 'Invalid team or unauthorized'], 400);
    }

    try {
        $st = $pdo->prepare("
            SELECT t.*, 
                   CASE WHEN t.owner_user_id = ? THEN 'owner' ELSE COALESCE(m.role, 'member') END AS role
            FROM teams t
            LEFT JOIN team_members m ON m.team_id = t.id AND m.user_id = ?
            WHERE t.id = ? AND (t.owner_user_id = ? OR m.user_id = ?)
            LIMIT 1
        ");
        $st->execute([$uid, $uid, $teamId, $uid, $uid]);
        $team = $st->fetch(PDO::FETCH_ASSOC);

        if (!$team) {
            teams_api_out(['ok' => false, 'error' => 'Team not found or access denied'], 404);
        }

        teams_api_out(['ok' => true, 'team' => $team]);
    } catch (Throwable $e) {
        teams_api_out(['ok' => false, 'error' => 'Failed to query team'], 500);
    }
}

teams_api_out(['ok' => false, 'error' => 'Action not recognized', 'teams' => []], 400);
