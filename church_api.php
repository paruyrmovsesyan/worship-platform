<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/runtime_config.php';

function wp_church_out(array $payload, int $code = 200): never {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function wp_church_json_input(): array {
    $raw = file_get_contents('php://input');
    $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
    if (is_array($decoded)) {
        return $decoded;
    }
    return $_POST;
}

function wp_church_current_user(): array {
    return [
        'id' => !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0,
        'name' => trim((string)($_SESSION['name'] ?? $_SESSION['username'] ?? $_SESSION['email'] ?? 'Օգտատեր')),
        'role' => strtolower(trim((string)($_SESSION['role'] ?? 'user'))),
    ];
}

function wp_church_open_pdo(): ?PDO {
    static $checked = false;
    static $pdo = null;
    if ($checked) {
        return $pdo;
    }
    $checked = true;
    try {
        $conn = wp_runtime_open_pdo();
        $conn->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        $conn->exec("
            CREATE TABLE IF NOT EXISTS churches (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(160) NOT NULL,
                city VARCHAR(120) NOT NULL DEFAULT '',
                description TEXT NULL,
                service_time VARCHAR(120) NOT NULL DEFAULT '',
                invite_code VARCHAR(32) NOT NULL DEFAULT '',
                church_type VARCHAR(32) NOT NULL DEFAULT 'church',
                is_open TINYINT(1) NOT NULL DEFAULT 1,
                owner_user_id INT UNSIGNED NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_owner (owner_user_id),
                KEY idx_invite (invite_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $conn->exec("
            CREATE TABLE IF NOT EXISTS church_members (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                church_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED NOT NULL,
                user_name VARCHAR(160) NOT NULL DEFAULT '',
                role VARCHAR(40) NOT NULL DEFAULT 'member',
                ministry VARCHAR(40) NOT NULL DEFAULT '',
                status VARCHAR(20) NOT NULL DEFAULT 'approved',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uniq_church_user (church_id, user_id),
                KEY idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $conn->exec("
            CREATE TABLE IF NOT EXISTS church_posts (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                church_id INT UNSIGNED NOT NULL DEFAULT 0,
                user_id INT UNSIGNED NOT NULL,
                author_name VARCHAR(160) NOT NULL DEFAULT '',
                type VARCHAR(30) NOT NULL DEFAULT 'announcement',
                title VARCHAR(200) NOT NULL DEFAULT '',
                body TEXT NOT NULL,
                event_date VARCHAR(64) NOT NULL DEFAULT '',
                location VARCHAR(160) NOT NULL DEFAULT '',
                is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
                pray_count INT UNSIGNED NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_church_type (church_id, type),
                KEY idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $conn->exec("
            CREATE TABLE IF NOT EXISTS church_post_prayers (
                post_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (post_id, user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $conn->exec("
            CREATE TABLE IF NOT EXISTS church_rehearsals (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                church_id INT UNSIGNED NOT NULL DEFAULT 0,
                title VARCHAR(200) NOT NULL,
                rehearsal_date VARCHAR(32) NOT NULL,
                rehearsal_time VARCHAR(16) NOT NULL DEFAULT '',
                location VARCHAR(160) NOT NULL DEFAULT '',
                repeat_weekly TINYINT(1) NOT NULL DEFAULT 0,
                setlist_id INT UNSIGNED NOT NULL DEFAULT 0,
                setlist_title VARCHAR(200) NOT NULL DEFAULT '',
                notes TEXT NULL,
                created_by INT UNSIGNED NOT NULL,
                created_by_name VARCHAR(160) NOT NULL DEFAULT '',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_church_date (church_id, rehearsal_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $conn->exec("
            CREATE TABLE IF NOT EXISTS church_rsvps (
                target_type VARCHAR(24) NOT NULL,
                target_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED NOT NULL,
                user_name VARCHAR(160) NOT NULL DEFAULT '',
                status VARCHAR(16) NOT NULL DEFAULT 'going',
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (target_type, target_id, user_id),
                KEY idx_target (target_type, target_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        try {
            $conn->exec("ALTER TABLE churches ADD COLUMN church_type VARCHAR(32) NOT NULL DEFAULT 'church'");
        } catch (Throwable $ignore) {}
        try {
            $conn->exec("ALTER TABLE church_members ADD COLUMN ministry VARCHAR(40) NOT NULL DEFAULT ''");
        } catch (Throwable $ignore) {}
        $pdo = $conn;
    } catch (Throwable $e) {
        $pdo = null;
    }
    return $pdo;
}

function wp_church_file_store_load(): array {
    $file = __DIR__ . '/data/church_store.json';
    $defaults = [
        'next_church_id' => 1,
        'next_post_id' => 1,
        'next_rehearsal_id' => 1,
        'churches' => [],
        'members' => [],
        'posts' => [],
        'prayers' => [],
        'rehearsals' => [],
        'rsvps' => [],
        'feedback' => [],
    ];
    if (!is_file($file)) {
        return $defaults;
    }
    $data = json_decode((string)@file_get_contents($file), true);
    if (!is_array($data)) {
        return $defaults;
    }
    return array_merge($defaults, $data);
}

function wp_church_file_store_save(array $store): bool {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return (bool)@file_put_contents(
        $dir . '/church_store.json',
        json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function wp_church_generate_invite(): string {
    return strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
}

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'get_feed'));
$user = wp_church_current_user();
$uid = $user['id'];
$pdo = wp_church_open_pdo();

// =========================================================================
// LIST CHURCHES
// =========================================================================
if ($action === 'list_churches') {
    $q = trim((string)($_GET['q'] ?? ''));

    if ($pdo) {
        try {
            $sql = "
                SELECT c.*,
                    (SELECT COUNT(*) FROM church_members cm WHERE cm.church_id = c.id AND cm.status = 'approved') AS member_count,
                    COALESCE((SELECT cm2.status FROM church_members cm2 WHERE cm2.church_id = c.id AND cm2.user_id = ? LIMIT 1), 'none') AS my_status,
                    COALESCE((SELECT cm3.role FROM church_members cm3 WHERE cm3.church_id = c.id AND cm3.user_id = ? LIMIT 1), '') AS my_role
                FROM churches c
            ";
            $params = [$uid, $uid];
            if ($q !== '') {
                $sql .= " WHERE c.name LIKE ? OR c.city LIKE ? OR c.description LIKE ?";
                $like = '%' . $q . '%';
                $params[] = $like;
                $params[] = $like;
                $params[] = $like;
            }
            $sql .= " ORDER BY member_count DESC, c.id DESC LIMIT 60";
            $st = $pdo->prepare($sql);
            $st->execute($params);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC);
            wp_church_out(['ok' => true, 'churches' => $rows]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to load churches'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $churches = [];
    foreach ($store['churches'] as $c) {
        if ($q !== '' && mb_stripos($c['name'] . ' ' . $c['city'] . ' ' . ($c['description'] ?? ''), $q) === false) {
            continue;
        }
        $cid = (int)$c['id'];
        $count = 0;
        $myStatus = 'none';
        $myRole = '';
        foreach ($store['members'] as $m) {
            if ((int)$m['church_id'] === $cid) {
                if ($m['status'] === 'approved') $count++;
                if ((int)$m['user_id'] === $uid) {
                    $myStatus = $m['status'];
                    $myRole = $m['role'];
                }
            }
        }
        $churches[] = array_merge($c, ['member_count' => $count, 'my_status' => $myStatus, 'my_role' => $myRole]);
    }
    wp_church_out(['ok' => true, 'churches' => $churches]);
}

// =========================================================================
// CREATE CHURCH
// =========================================================================
if ($action === 'create_church') {
    if ($uid <= 0) wp_church_out(['ok' => false, 'error' => 'Please log in first'], 401);
    $in = wp_church_json_input();
    $name = trim((string)($in['name'] ?? ''));
    $city = trim((string)($in['city'] ?? ''));
    $desc = trim((string)($in['description'] ?? ''));
    $serviceTime = trim((string)($in['service_time'] ?? ''));
    $churchType = trim((string)($in['church_type'] ?? 'church'));
    if (!in_array($churchType, ['church', 'worship_group'], true)) {
        $churchType = 'church';
    }
    $isOpen = isset($in['is_open']) ? ((int)(bool)$in['is_open']) : 1;

    if (mb_strlen($name) < 2) {
        wp_church_out(['ok' => false, 'error' => 'Church name is too short'], 400);
    }
    $invite = wp_church_generate_invite();

    if ($pdo) {
        try {
            $st = $pdo->prepare("INSERT INTO churches (name, city, description, service_time, invite_code, church_type, is_open, owner_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $st->execute([$name, $city, $desc, $serviceTime, $invite, $churchType, $isOpen, $uid]);
            $churchId = (int)$pdo->lastInsertId();
            $stM = $pdo->prepare("INSERT INTO church_members (church_id, user_id, user_name, role, ministry, status) VALUES (?, ?, ?, 'pastor', ?, 'approved')");
            $stM->execute([$churchId, $uid, $user['name'], $churchType === 'worship_group' ? 'worship' : '']);
            wp_church_out(['ok' => true, 'church_id' => $churchId, 'invite_code' => $invite, 'church_type' => $churchType]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to create church'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $churchId = (int)$store['next_church_id']++;
    $store['churches'][] = [
        'id' => $churchId,
        'name' => $name,
        'city' => $city,
        'description' => $desc,
        'service_time' => $serviceTime,
        'invite_code' => $invite,
        'church_type' => $churchType,
        'is_open' => $isOpen,
        'owner_user_id' => $uid,
        'created_at' => date('Y-m-d H:i:s'),
    ];
    $store['members'][] = [
        'church_id' => $churchId,
        'user_id' => $uid,
        'user_name' => $user['name'],
        'role' => 'pastor',
        'ministry' => $churchType === 'worship_group' ? 'worship' : '',
        'status' => 'approved',
        'created_at' => date('Y-m-d H:i:s'),
    ];
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true, 'church_id' => $churchId, 'invite_code' => $invite, 'church_type' => $churchType]);
}

// =========================================================================
// JOIN CHURCH
// =========================================================================
if ($action === 'join_church') {
    if ($uid <= 0) wp_church_out(['ok' => false, 'error' => 'Please log in first'], 401);
    $in = wp_church_json_input();
    $churchId = (int)($in['church_id'] ?? 0);
    $inviteCode = strtoupper(trim((string)($in['invite_code'] ?? '')));

    if ($pdo) {
        try {
            if ($inviteCode !== '' && $churchId <= 0) {
                $stFind = $pdo->prepare("SELECT * FROM churches WHERE invite_code = ? LIMIT 1");
                $stFind->execute([$inviteCode]);
                $church = $stFind->fetch(PDO::FETCH_ASSOC);
            } else {
                $stFind = $pdo->prepare("SELECT * FROM churches WHERE id = ? LIMIT 1");
                $stFind->execute([$churchId]);
                $church = $stFind->fetch(PDO::FETCH_ASSOC);
            }
            if (!$church) wp_church_out(['ok' => false, 'error' => 'Church not found'], 404);
            $cid = (int)$church['id'];
            $status = (!empty($church['is_open']) || ($inviteCode !== '' && strtoupper((string)$church['invite_code']) === $inviteCode)) ? 'approved' : 'pending';
            $st = $pdo->prepare("
                INSERT INTO church_members (church_id, user_id, user_name, role, status)
                VALUES (?, ?, ?, 'member', ?)
                ON DUPLICATE KEY UPDATE user_name = VALUES(user_name), status = IF(status = 'approved', 'approved', VALUES(status))
            ");
            $st->execute([$cid, $uid, $user['name'], $status]);
            wp_church_out(['ok' => true, 'church_id' => $cid, 'status' => $status]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to join church'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $target = null;
    foreach ($store['churches'] as $c) {
        if (($churchId > 0 && (int)$c['id'] === $churchId) || ($inviteCode !== '' && strtoupper((string)$c['invite_code']) === $inviteCode)) {
            $target = $c;
            break;
        }
    }
    if (!$target) wp_church_out(['ok' => false, 'error' => 'Church not found'], 404);
    $cid = (int)$target['id'];
    $status = (!empty($target['is_open']) || ($inviteCode !== '' && strtoupper((string)$target['invite_code']) === $inviteCode)) ? 'approved' : 'pending';
    $found = false;
    foreach ($store['members'] as &$m) {
        if ((int)$m['church_id'] === $cid && (int)$m['user_id'] === $uid) {
            $found = true;
            if ($m['status'] !== 'approved') $m['status'] = $status;
        }
    }
    unset($m);
    if (!$found) {
        $store['members'][] = [
            'church_id' => $cid,
            'user_id' => $uid,
            'user_name' => $user['name'],
            'role' => 'member',
            'status' => $status,
            'created_at' => date('Y-m-d H:i:s'),
        ];
    }
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true, 'church_id' => $cid, 'status' => $status]);
}

// =========================================================================
// MY CHURCHES & MEMBERSHIP PULSE
// =========================================================================
if ($action === 'my_church') {
    if ($uid <= 0) {
        wp_church_out(['ok' => true, 'memberships' => [], 'members' => [], 'pending' => []]);
    }

    if ($pdo) {
        try {
            $st = $pdo->prepare("
                SELECT c.*, cm.role AS my_role, cm.status AS my_status,
                    (SELECT COUNT(*) FROM church_members cm2 WHERE cm2.church_id = c.id AND cm2.status = 'approved') AS member_count
                FROM church_members cm
                INNER JOIN churches c ON c.id = cm.church_id
                WHERE cm.user_id = ?
                ORDER BY cm.status = 'approved' DESC, cm.id ASC
            ");
            $st->execute([$uid]);
            $memberships = $st->fetchAll(PDO::FETCH_ASSOC);

            $activeChurchId = (int)($_GET['church_id'] ?? ($memberships[0]['id'] ?? 0));
            $members = [];
            $pending = [];
            if ($activeChurchId > 0) {
                $stM = $pdo->prepare("SELECT user_id, user_name, role, COALESCE(ministry, '') AS ministry, status, created_at FROM church_members WHERE church_id = ? ORDER BY status = 'pending' DESC, role = 'pastor' DESC, user_name ASC");
                $stM->execute([$activeChurchId]);
                foreach ($stM->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    if ($row['status'] === 'pending') $pending[] = $row;
                    else $members[] = $row;
                }
            }
            wp_church_out(['ok' => true, 'memberships' => $memberships, 'members' => $members, 'pending' => $pending]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to load membership'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $memberships = [];
    foreach ($store['members'] as $m) {
        if ((int)$m['user_id'] === $uid) {
            foreach ($store['churches'] as $c) {
                if ((int)$c['id'] === (int)$m['church_id']) {
                    $memberships[] = array_merge($c, ['my_role' => $m['role'], 'my_status' => $m['status']]);
                }
            }
        }
    }
    $activeChurchId = (int)($_GET['church_id'] ?? ($memberships[0]['id'] ?? 0));
    $members = [];
    $pending = [];
    foreach ($store['members'] as $m) {
        if ((int)$m['church_id'] === $activeChurchId) {
            if ($m['status'] === 'pending') $pending[] = $m;
            else $members[] = $m;
        }
    }
    wp_church_out(['ok' => true, 'memberships' => $memberships, 'members' => $members, 'pending' => $pending]);
}

// =========================================================================
// MANAGE MEMBER (APPROVE / REJECT / ROLE)
// =========================================================================
if ($action === 'manage_member') {
    if ($uid <= 0) wp_church_out(['ok' => false, 'error' => 'Unauthorized'], 401);
    $in = wp_church_json_input();
    $churchId = (int)($in['church_id'] ?? 0);
    $targetUserId = (int)($in['target_user_id'] ?? 0);
    $decision = trim((string)($in['decision'] ?? '')); // approve | reject | role | ministry
    $newRole = trim((string)($in['role'] ?? 'member'));
    if (!in_array($newRole, ['member', 'worship_leader', 'leader', 'pastor'], true)) {
        $newRole = 'member';
    }
    $newMinistry = trim((string)($in['ministry'] ?? ''));
    if (!in_array($newMinistry, ['', 'worship', 'kids', 'prayer', 'media', 'hospitality'], true)) {
        $newMinistry = '';
    }

    if ($pdo) {
        try {
            $stCheck = $pdo->prepare("SELECT role, status FROM church_members WHERE church_id = ? AND user_id = ? LIMIT 1");
            $stCheck->execute([$churchId, $uid]);
            $me = $stCheck->fetch(PDO::FETCH_ASSOC);
            if (!$me || $me['status'] !== 'approved' || !in_array($me['role'], ['pastor', 'leader'], true)) {
                wp_church_out(['ok' => false, 'error' => 'Leader access required'], 403);
            }
            if ($decision === 'approve') {
                $st = $pdo->prepare("UPDATE church_members SET status = 'approved' WHERE church_id = ? AND user_id = ?");
                $st->execute([$churchId, $targetUserId]);
            } elseif ($decision === 'reject') {
                $st = $pdo->prepare("DELETE FROM church_members WHERE church_id = ? AND user_id = ?");
                $st->execute([$churchId, $targetUserId]);
            } elseif ($decision === 'role') {
                $st = $pdo->prepare("UPDATE church_members SET role = ? WHERE church_id = ? AND user_id = ?");
                $st->execute([$newRole, $churchId, $targetUserId]);
            } elseif ($decision === 'ministry') {
                $st = $pdo->prepare("UPDATE church_members SET ministry = ? WHERE church_id = ? AND user_id = ?");
                $st->execute([$newMinistry, $churchId, $targetUserId]);
            }
            wp_church_out(['ok' => true]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to update member'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $isLeader = false;
    foreach ($store['members'] as $m) {
        if ((int)$m['church_id'] === $churchId && (int)$m['user_id'] === $uid && $m['status'] === 'approved' && in_array($m['role'], ['pastor', 'leader'], true)) {
            $isLeader = true;
            break;
        }
    }
    if (!$isLeader) wp_church_out(['ok' => false, 'error' => 'Leader access required'], 403);
    $nextMembers = [];
    foreach ($store['members'] as $m) {
        if ((int)$m['church_id'] === $churchId && (int)$m['user_id'] === $targetUserId) {
            if ($decision === 'reject') continue;
            if ($decision === 'approve') $m['status'] = 'approved';
            if ($decision === 'role') $m['role'] = $newRole;
            if ($decision === 'ministry') $m['ministry'] = $newMinistry;
        }
        $nextMembers[] = $m;
    }
    $store['members'] = $nextMembers;
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true]);
}

// =========================================================================
// GET FEED (ANNOUNCEMENTS / EVENTS / PRAYER REQUESTS)
// =========================================================================
if ($action === 'get_feed') {
    $churchId = (int)($_GET['church_id'] ?? 0);
    $type = trim((string)($_GET['type'] ?? 'all'));

    if ($pdo) {
        try {
            $sql = "
                SELECT p.*,
                    COALESCE(c.name, '') AS church_name,
                    EXISTS(SELECT 1 FROM church_post_prayers pp WHERE pp.post_id = p.id AND pp.user_id = ?) AS has_prayed,
                    (SELECT COUNT(*) FROM church_rsvps r1 WHERE r1.target_type = 'event' AND r1.target_id = p.id AND r1.status = 'going') AS rsvp_going_count,
                    (SELECT COUNT(*) FROM church_rsvps r2 WHERE r2.target_type = 'event' AND r2.target_id = p.id AND r2.status = 'cant') AS rsvp_cant_count,
                    COALESCE((SELECT r3.status FROM church_rsvps r3 WHERE r3.target_type = 'event' AND r3.target_id = p.id AND r3.user_id = ? LIMIT 1), '') AS my_rsvp
                FROM church_posts p
                LEFT JOIN churches c ON c.id = p.church_id
                WHERE p.church_id = ?
            ";
            $params = [$uid, $uid, $churchId];
            if (in_array($type, ['announcement', 'event', 'prayer'], true)) {
                $sql .= " AND p.type = ?";
                $params[] = $type;
            }
            $sql .= " ORDER BY p.created_at DESC, p.id DESC LIMIT 60";
            $st = $pdo->prepare($sql);
            $st->execute($params);
            $posts = array_map(static function (array $row): array {
                $isAnon = !empty($row['is_anonymous']);
                return [
                    'id' => (int)$row['id'],
                    'church_id' => (int)$row['church_id'],
                    'church_name' => (string)$row['church_name'],
                    'user_id' => (int)$row['user_id'],
                    'author_name' => $isAnon ? 'Անանուն' : (string)$row['author_name'],
                    'type' => (string)$row['type'],
                    'title' => (string)$row['title'],
                    'body' => (string)$row['body'],
                    'event_date' => (string)$row['event_date'],
                    'location' => (string)$row['location'],
                    'is_anonymous' => $isAnon,
                    'pray_count' => (int)$row['pray_count'],
                    'has_prayed' => !empty($row['has_prayed']),
                    'rsvp_going_count' => (int)($row['rsvp_going_count'] ?? 0),
                    'rsvp_cant_count' => (int)($row['rsvp_cant_count'] ?? 0),
                    'my_rsvp' => (string)($row['my_rsvp'] ?? ''),
                    'created_at' => (string)$row['created_at'],
                ];
            }, $st->fetchAll(PDO::FETCH_ASSOC));
            wp_church_out(['ok' => true, 'posts' => $posts]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to load feed'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $posts = [];
    foreach (array_reverse($store['posts']) as $p) {
        if ((int)$p['church_id'] !== $churchId) continue;
        if (in_array($type, ['announcement', 'event', 'prayer'], true) && $p['type'] !== $type) continue;
        $pid = (int)$p['id'];
        $hasPrayed = !empty($store['prayers']["{$pid}_{$uid}"]);
        $isAnon = !empty($p['is_anonymous']);
        $going = 0;
        $cant = 0;
        $myRsvp = '';
        foreach ($store['rsvps'] as $rk => $rv) {
            if (strpos($rk, "event_{$pid}_") === 0) {
                if (($rv['status'] ?? '') === 'going') $going++;
                if (($rv['status'] ?? '') === 'cant') $cant++;
                if ((int)($rv['user_id'] ?? 0) === $uid) $myRsvp = (string)$rv['status'];
            }
        }
        $posts[] = array_merge($p, [
            'author_name' => $isAnon ? 'Անանուն' : $p['author_name'],
            'has_prayed' => $hasPrayed,
            'rsvp_going_count' => $going,
            'rsvp_cant_count' => $cant,
            'my_rsvp' => $myRsvp,
        ]);
    }
    wp_church_out(['ok' => true, 'posts' => $posts]);
}

// =========================================================================
// CREATE POST
// =========================================================================
if ($action === 'create_post') {
    if ($uid <= 0) wp_church_out(['ok' => false, 'error' => 'Please log in first'], 401);
    $in = wp_church_json_input();
    $churchId = max(0, (int)($in['church_id'] ?? 0));
    $type = trim((string)($in['type'] ?? 'announcement'));
    if (!in_array($type, ['announcement', 'event', 'prayer'], true)) $type = 'announcement';
    $title = trim((string)($in['title'] ?? ''));
    $body = trim((string)($in['body'] ?? ''));
    $eventDate = trim((string)($in['event_date'] ?? ''));
    $location = trim((string)($in['location'] ?? ''));
    $isAnonymous = !empty($in['is_anonymous']) ? 1 : 0;

    if (mb_strlen($body) < 3) {
        wp_church_out(['ok' => false, 'error' => 'Message is too short'], 400);
    }

    if ($pdo) {
        try {
            $st = $pdo->prepare("
                INSERT INTO church_posts (church_id, user_id, author_name, type, title, body, event_date, location, is_anonymous)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $st->execute([$churchId, $uid, $user['name'], $type, $title, $body, $eventDate, $location, $isAnonymous]);
            wp_church_out(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to create post'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $pid = (int)$store['next_post_id']++;
    $store['posts'][] = [
        'id' => $pid,
        'church_id' => $churchId,
        'user_id' => $uid,
        'author_name' => $user['name'],
        'type' => $type,
        'title' => $title,
        'body' => $body,
        'event_date' => $eventDate,
        'location' => $location,
        'is_anonymous' => (bool)$isAnonymous,
        'pray_count' => 0,
        'created_at' => date('Y-m-d H:i:s'),
    ];
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true, 'id' => $pid]);
}

// =========================================================================
// TOGGLE PRAY / AMEN
// =========================================================================
if ($action === 'toggle_pray') {
    if ($uid <= 0) wp_church_out(['ok' => false, 'error' => 'Please log in first'], 401);
    $in = wp_church_json_input();
    $postId = (int)($in['post_id'] ?? 0);
    if ($postId <= 0) wp_church_out(['ok' => false, 'error' => 'Invalid post'], 400);

    if ($pdo) {
        try {
            $stCheck = $pdo->prepare("SELECT 1 FROM church_post_prayers WHERE post_id = ? AND user_id = ? LIMIT 1");
            $stCheck->execute([$postId, $uid]);
            $exists = (bool)$stCheck->fetchColumn();
            if ($exists) {
                $pdo->prepare("DELETE FROM church_post_prayers WHERE post_id = ? AND user_id = ?")->execute([$postId, $uid]);
                $pdo->prepare("UPDATE church_posts SET pray_count = GREATEST(0, pray_count - 1) WHERE id = ?")->execute([$postId]);
                $hasPrayed = false;
            } else {
                $pdo->prepare("INSERT INTO church_post_prayers (post_id, user_id) VALUES (?, ?)")->execute([$postId, $uid]);
                $pdo->prepare("UPDATE church_posts SET pray_count = pray_count + 1 WHERE id = ?")->execute([$postId]);
                $hasPrayed = true;
            }
            $stCount = $pdo->prepare("SELECT pray_count FROM church_posts WHERE id = ? LIMIT 1");
            $stCount->execute([$postId]);
            wp_church_out(['ok' => true, 'has_prayed' => $hasPrayed, 'pray_count' => (int)$stCount->fetchColumn()]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to toggle reaction'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $key = "{$postId}_{$uid}";
    $hasPrayed = empty($store['prayers'][$key]);
    if ($hasPrayed) $store['prayers'][$key] = true;
    else unset($store['prayers'][$key]);
    $count = 0;
    foreach ($store['posts'] as &$p) {
        if ((int)$p['id'] === $postId) {
            $p['pray_count'] = max(0, (int)$p['pray_count'] + ($hasPrayed ? 1 : -1));
            $count = (int)$p['pray_count'];
        }
    }
    unset($p);
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true, 'has_prayed' => $hasPrayed, 'pray_count' => $count]);
}

// =========================================================================
// DELETE POST
// =========================================================================
if ($action === 'delete_post') {
    if ($uid <= 0) wp_church_out(['ok' => false, 'error' => 'Unauthorized'], 401);
    $in = wp_church_json_input();
    $postId = (int)($in['post_id'] ?? 0);

    if ($pdo) {
        try {
            $st = $pdo->prepare("SELECT user_id FROM church_posts WHERE id = ? LIMIT 1");
            $st->execute([$postId]);
            $owner = (int)$st->fetchColumn();
            if ($owner !== $uid && !in_array($user['role'], ['admin', 'owner'], true)) {
                wp_church_out(['ok' => false, 'error' => 'Forbidden'], 403);
            }
            $pdo->prepare("DELETE FROM church_posts WHERE id = ?")->execute([$postId]);
            $pdo->prepare("DELETE FROM church_post_prayers WHERE post_id = ?")->execute([$postId]);
            wp_church_out(['ok' => true]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to delete post'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $store['posts'] = array_values(array_filter($store['posts'], static function ($p) use ($postId, $uid, $user) {
        if ((int)$p['id'] !== $postId) return true;
        return (int)$p['user_id'] !== $uid && !in_array($user['role'], ['admin', 'owner'], true);
    }));
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true]);
}

// =========================================================================
// REHEARSALS (CREATE / LIST / DELETE)
// =========================================================================
if ($action === 'list_rehearsals') {
    $churchId = (int)($_GET['church_id'] ?? 0);
    if ($pdo) {
        try {
            $st = $pdo->prepare("
                SELECT r.*,
                    COALESCE(c.name, '') AS church_name,
                    (SELECT COUNT(*) FROM church_rsvps r1 WHERE r1.target_type = 'rehearsal' AND r1.target_id = r.id AND r1.status = 'going') AS rsvp_going_count,
                    (SELECT COUNT(*) FROM church_rsvps r2 WHERE r2.target_type = 'rehearsal' AND r2.target_id = r.id AND r2.status = 'cant') AS rsvp_cant_count,
                    COALESCE((SELECT r3.status FROM church_rsvps r3 WHERE r3.target_type = 'rehearsal' AND r3.target_id = r.id AND r3.user_id = ? LIMIT 1), '') AS my_rsvp
                FROM church_rehearsals r
                LEFT JOIN churches c ON c.id = r.church_id
                WHERE r.church_id = ?
                ORDER BY r.rehearsal_date ASC, r.rehearsal_time ASC, r.id DESC
                LIMIT 60
            ");
            $st->execute([$uid, $churchId]);
            $rows = array_map(static function (array $row): array {
                return [
                    'id' => (int)$row['id'],
                    'church_id' => (int)$row['church_id'],
                    'church_name' => (string)$row['church_name'],
                    'title' => (string)$row['title'],
                    'rehearsal_date' => (string)$row['rehearsal_date'],
                    'rehearsal_time' => (string)$row['rehearsal_time'],
                    'location' => (string)$row['location'],
                    'repeat_weekly' => !empty($row['repeat_weekly']),
                    'setlist_id' => (int)$row['setlist_id'],
                    'setlist_title' => (string)$row['setlist_title'],
                    'notes' => (string)($row['notes'] ?? ''),
                    'created_by' => (int)$row['created_by'],
                    'created_by_name' => (string)$row['created_by_name'],
                    'rsvp_going_count' => (int)($row['rsvp_going_count'] ?? 0),
                    'rsvp_cant_count' => (int)($row['rsvp_cant_count'] ?? 0),
                    'my_rsvp' => (string)($row['my_rsvp'] ?? ''),
                ];
            }, $st->fetchAll(PDO::FETCH_ASSOC));
            wp_church_out(['ok' => true, 'rehearsals' => $rows]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to load rehearsals'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $list = [];
    foreach ($store['rehearsals'] as $r) {
        if ((int)$r['church_id'] !== $churchId) continue;
        $rid = (int)$r['id'];
        $going = 0;
        $cant = 0;
        $myRsvp = '';
        foreach ($store['rsvps'] as $rk => $rv) {
            if (strpos($rk, "rehearsal_{$rid}_") === 0) {
                if (($rv['status'] ?? '') === 'going') $going++;
                if (($rv['status'] ?? '') === 'cant') $cant++;
                if ((int)($rv['user_id'] ?? 0) === $uid) $myRsvp = (string)$rv['status'];
            }
        }
        $list[] = array_merge($r, [
            'rsvp_going_count' => $going,
            'rsvp_cant_count' => $cant,
            'my_rsvp' => $myRsvp,
        ]);
    }
    usort($list, static fn($a, $b) => strcmp(($a['rehearsal_date'] ?? '') . ($a['rehearsal_time'] ?? ''), ($b['rehearsal_date'] ?? '') . ($b['rehearsal_time'] ?? '')));
    wp_church_out(['ok' => true, 'rehearsals' => $list]);
}

if ($action === 'create_rehearsal') {
    if ($uid <= 0) wp_church_out(['ok' => false, 'error' => 'Please log in first'], 401);
    $in = wp_church_json_input();
    $churchId = max(0, (int)($in['church_id'] ?? 0));
    $title = trim((string)($in['title'] ?? ''));
    $date = trim((string)($in['rehearsal_date'] ?? ''));
    $time = trim((string)($in['rehearsal_time'] ?? '18:00'));
    $location = trim((string)($in['location'] ?? ''));
    $repeatWeekly = !empty($in['repeat_weekly']) ? 1 : 0;
    $setlistId = max(0, (int)($in['setlist_id'] ?? 0));
    $setlistTitle = trim((string)($in['setlist_title'] ?? ''));
    $notes = trim((string)($in['notes'] ?? ''));

    if ($title === '' || $date === '') {
        wp_church_out(['ok' => false, 'error' => 'Title and date are required'], 400);
    }

    if ($pdo) {
        try {
            $st = $pdo->prepare("
                INSERT INTO church_rehearsals (church_id, title, rehearsal_date, rehearsal_time, location, repeat_weekly, setlist_id, setlist_title, notes, created_by, created_by_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $st->execute([$churchId, $title, $date, $time, $location, $repeatWeekly, $setlistId, $setlistTitle, $notes, $uid, $user['name']]);
            wp_church_out(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to create rehearsal'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $rid = (int)$store['next_rehearsal_id']++;
    $store['rehearsals'][] = [
        'id' => $rid,
        'church_id' => $churchId,
        'title' => $title,
        'rehearsal_date' => $date,
        'rehearsal_time' => $time,
        'location' => $location,
        'repeat_weekly' => (bool)$repeatWeekly,
        'setlist_id' => $setlistId,
        'setlist_title' => $setlistTitle,
        'notes' => $notes,
        'created_by' => $uid,
        'created_by_name' => $user['name'],
        'created_at' => date('Y-m-d H:i:s'),
    ];
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true, 'id' => $rid]);
}

if ($action === 'delete_rehearsal') {
    if ($uid <= 0) wp_church_out(['ok' => false, 'error' => 'Unauthorized'], 401);
    $in = wp_church_json_input();
    $rid = (int)($in['id'] ?? 0);
    if ($rid <= 0) wp_church_out(['ok' => false, 'error' => 'Invalid id'], 400);

    if ($pdo) {
        try {
            $st = $pdo->prepare("SELECT created_by FROM church_rehearsals WHERE id = ? LIMIT 1");
            $st->execute([$rid]);
            $owner = (int)$st->fetchColumn();
            if ($owner !== $uid && !in_array($user['role'], ['admin', 'owner'], true)) {
                wp_church_out(['ok' => false, 'error' => 'Forbidden'], 403);
            }
            $pdo->prepare("DELETE FROM church_rehearsals WHERE id = ?")->execute([$rid]);
            $pdo->prepare("DELETE FROM church_rsvps WHERE target_type = 'rehearsal' AND target_id = ?")->execute([$rid]);
            wp_church_out(['ok' => true]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to delete rehearsal'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $store['rehearsals'] = array_values(array_filter($store['rehearsals'], static function ($r) use ($rid, $uid, $user) {
        if ((int)$r['id'] !== $rid) return true;
        return (int)$r['created_by'] !== $uid && !in_array($user['role'], ['admin', 'owner'], true);
    }));
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true]);
}

// =========================================================================
// RSVP (EVENT OR REHEARSAL: going | cant | '')
// =========================================================================
if ($action === 'rsvp') {
    if ($uid <= 0) wp_church_out(['ok' => false, 'error' => 'Please log in first'], 401);
    $in = wp_church_json_input();
    $targetType = trim((string)($in['target_type'] ?? 'event'));
    if (!in_array($targetType, ['event', 'rehearsal'], true)) $targetType = 'event';
    $targetId = (int)($in['target_id'] ?? 0);
    $status = trim((string)($in['status'] ?? 'going'));
    if (!in_array($status, ['going', 'cant', 'clear'], true)) $status = 'going';
    if ($targetId <= 0) wp_church_out(['ok' => false, 'error' => 'Invalid target'], 400);

    if ($pdo) {
        try {
            $stCurr = $pdo->prepare("SELECT status FROM church_rsvps WHERE target_type = ? AND target_id = ? AND user_id = ? LIMIT 1");
            $stCurr->execute([$targetType, $targetId, $uid]);
            $current = (string)($stCurr->fetchColumn() ?: '');
            $nextStatus = ($status === 'clear' || $current === $status) ? '' : $status;
            if ($nextStatus === '') {
                $pdo->prepare("DELETE FROM church_rsvps WHERE target_type = ? AND target_id = ? AND user_id = ?")->execute([$targetType, $targetId, $uid]);
            } else {
                $pdo->prepare("
                    INSERT INTO church_rsvps (target_type, target_id, user_id, user_name, status)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE user_name = VALUES(user_name), status = VALUES(status)
                ")->execute([$targetType, $targetId, $uid, $user['name'], $nextStatus]);
            }
            $stG = $pdo->prepare("SELECT COUNT(*) FROM church_rsvps WHERE target_type = ? AND target_id = ? AND status = 'going'");
            $stG->execute([$targetType, $targetId]);
            $going = (int)$stG->fetchColumn();
            $stC = $pdo->prepare("SELECT COUNT(*) FROM church_rsvps WHERE target_type = ? AND target_id = ? AND status = 'cant'");
            $stC->execute([$targetType, $targetId]);
            $cant = (int)$stC->fetchColumn();
            wp_church_out(['ok' => true, 'my_rsvp' => $nextStatus, 'rsvp_going_count' => $going, 'rsvp_cant_count' => $cant]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to save RSVP'], 500);
        }
    }

    $store = wp_church_file_store_load();
    $rk = "{$targetType}_{$targetId}_{$uid}";
    $current = (string)($store['rsvps'][$rk]['status'] ?? '');
    $nextStatus = ($status === 'clear' || $current === $status) ? '' : $status;
    if ($nextStatus === '') {
        unset($store['rsvps'][$rk]);
    } else {
        $store['rsvps'][$rk] = ['user_id' => $uid, 'user_name' => $user['name'], 'status' => $nextStatus];
    }
    $going = 0;
    $cant = 0;
    $prefix = "{$targetType}_{$targetId}_";
    foreach ($store['rsvps'] as $k => $rv) {
        if (strpos($k, $prefix) === 0) {
            if (($rv['status'] ?? '') === 'going') $going++;
            if (($rv['status'] ?? '') === 'cant') $cant++;
        }
    }
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true, 'my_rsvp' => $nextStatus, 'rsvp_going_count' => $going, 'rsvp_cant_count' => $cant]);
}

// =========================================================================
// UNIFIED CHURCH CALENDAR (EVENTS + REHEARSALS)
// =========================================================================
if ($action === 'get_calendar') {
    $churchId = (int)($_GET['church_id'] ?? 0);
    $items = [];

    if ($pdo) {
        try {
            $stE = $pdo->prepare("
                SELECT p.id, p.church_id, COALESCE(c.name, '') AS church_name, p.title, p.body, p.event_date, p.location,
                    (SELECT COUNT(*) FROM church_rsvps r1 WHERE r1.target_type = 'event' AND r1.target_id = p.id AND r1.status = 'going') AS rsvp_going_count,
                    (SELECT COUNT(*) FROM church_rsvps r2 WHERE r2.target_type = 'event' AND r2.target_id = p.id AND r2.status = 'cant') AS rsvp_cant_count,
                    COALESCE((SELECT r3.status FROM church_rsvps r3 WHERE r3.target_type = 'event' AND r3.target_id = p.id AND r3.user_id = ? LIMIT 1), '') AS my_rsvp
                FROM church_posts p
                LEFT JOIN churches c ON c.id = p.church_id
                WHERE p.type = 'event' AND p.church_id = ?
                ORDER BY p.event_date ASC, p.id DESC LIMIT 60
            ");
            $stE->execute([$uid, $churchId]);
            foreach ($stE->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $rawDate = trim((string)$row['event_date']);
                $isoDate = preg_match('/^(\d{4}-\d{2}-\d{2})/', $rawDate, $m) ? $m[1] : date('Y-m-d');
                $items[] = [
                    'kind' => 'event',
                    'id' => (int)$row['id'],
                    'church_id' => (int)$row['church_id'],
                    'church_name' => (string)$row['church_name'],
                    'title' => (string)($row['title'] ?: mb_substr((string)$row['body'], 0, 56)),
                    'subtitle' => (string)$row['body'],
                    'date' => $isoDate,
                    'date_label' => $rawDate,
                    'time' => '',
                    'location' => (string)$row['location'],
                    'rsvp_going_count' => (int)$row['rsvp_going_count'],
                    'rsvp_cant_count' => (int)$row['rsvp_cant_count'],
                    'my_rsvp' => (string)$row['my_rsvp'],
                ];
            }

            $stR = $pdo->prepare("
                SELECT r.*, COALESCE(c.name, '') AS church_name,
                    (SELECT COUNT(*) FROM church_rsvps r1 WHERE r1.target_type = 'rehearsal' AND r1.target_id = r.id AND r1.status = 'going') AS rsvp_going_count,
                    (SELECT COUNT(*) FROM church_rsvps r2 WHERE r2.target_type = 'rehearsal' AND r2.target_id = r.id AND r2.status = 'cant') AS rsvp_cant_count,
                    COALESCE((SELECT r3.status FROM church_rsvps r3 WHERE r3.target_type = 'rehearsal' AND r3.target_id = r.id AND r3.user_id = ? LIMIT 1), '') AS my_rsvp
                FROM church_rehearsals r
                LEFT JOIN churches c ON c.id = r.church_id
                WHERE r.church_id = ?
                ORDER BY r.rehearsal_date ASC, r.rehearsal_time ASC LIMIT 60
            ");
            $stR->execute([$uid, $churchId]);
            foreach ($stR->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $items[] = [
                    'kind' => 'rehearsal',
                    'id' => (int)$row['id'],
                    'church_id' => (int)$row['church_id'],
                    'church_name' => (string)$row['church_name'],
                    'title' => (string)$row['title'],
                    'subtitle' => (string)$row['setlist_title'],
                    'date' => (string)$row['rehearsal_date'],
                    'date_label' => trim((string)$row['rehearsal_date'] . ' ' . (string)$row['rehearsal_time']),
                    'time' => (string)$row['rehearsal_time'],
                    'location' => (string)$row['location'],
                    'repeat_weekly' => !empty($row['repeat_weekly']),
                    'setlist_id' => (int)$row['setlist_id'],
                    'setlist_title' => (string)$row['setlist_title'],
                    'rsvp_going_count' => (int)$row['rsvp_going_count'],
                    'rsvp_cant_count' => (int)$row['rsvp_cant_count'],
                    'my_rsvp' => (string)$row['my_rsvp'],
                ];
            }
            usort($items, static fn($a, $b) => strcmp(($a['date'] ?? '') . ($a['time'] ?? ''), ($b['date'] ?? '') . ($b['time'] ?? '')));
            wp_church_out(['ok' => true, 'items' => $items]);
        } catch (Throwable $e) {
            wp_church_out(['ok' => false, 'error' => 'Failed to load calendar'], 500);
        }
    }

    $store = wp_church_file_store_load();
    foreach ($store['posts'] as $p) {
        if ((int)$p['church_id'] !== $churchId || ($p['type'] ?? '') !== 'event') continue;
        $pid = (int)$p['id'];
        $rawDate = trim((string)($p['event_date'] ?? ''));
        $isoDate = preg_match('/^(\d{4}-\d{2}-\d{2})/', $rawDate, $m) ? $m[1] : date('Y-m-d');
        $items[] = [
            'kind' => 'event',
            'id' => $pid,
            'church_id' => $churchId,
            'title' => (string)($p['title'] ?: mb_substr((string)$p['body'], 0, 56)),
            'subtitle' => (string)$p['body'],
            'date' => $isoDate,
            'date_label' => $rawDate,
            'time' => '',
            'location' => (string)($p['location'] ?? ''),
            'rsvp_going_count' => 0,
            'rsvp_cant_count' => 0,
            'my_rsvp' => (string)($store['rsvps']["event_{$pid}_{$uid}"]['status'] ?? ''),
        ];
    }
    foreach ($store['rehearsals'] as $r) {
        if ((int)$r['church_id'] !== $churchId) continue;
        $rid = (int)$r['id'];
        $items[] = [
            'kind' => 'rehearsal',
            'id' => $rid,
            'church_id' => $churchId,
            'title' => (string)$r['title'],
            'subtitle' => (string)($r['setlist_title'] ?? ''),
            'date' => (string)$r['rehearsal_date'],
            'date_label' => trim((string)$r['rehearsal_date'] . ' ' . (string)($r['rehearsal_time'] ?? '')),
            'time' => (string)($r['rehearsal_time'] ?? ''),
            'location' => (string)($r['location'] ?? ''),
            'repeat_weekly' => !empty($r['repeat_weekly']),
            'setlist_id' => (int)($r['setlist_id'] ?? 0),
            'setlist_title' => (string)($r['setlist_title'] ?? ''),
            'rsvp_going_count' => 0,
            'rsvp_cant_count' => 0,
            'my_rsvp' => (string)($store['rsvps']["rehearsal_{$rid}_{$uid}"]['status'] ?? ''),
        ];
    }
    usort($items, static fn($a, $b) => strcmp(($a['date'] ?? '') . ($a['time'] ?? ''), ($b['date'] ?? '') . ($b['time'] ?? '')));
    wp_church_out(['ok' => true, 'items' => $items]);
}

// =========================================================================
// FEEDBACK / REPORT CONTENT
// =========================================================================
if ($action === 'submit_feedback') {
    $in = wp_church_json_input();
    $category = trim((string)($in['category'] ?? 'feedback'));
    $targetId = (int)($in['target_id'] ?? 0);
    $message = trim((string)($in['message'] ?? ''));
    if (mb_strlen($message) < 3) {
        wp_church_out(['ok' => false, 'error' => 'Message too short'], 400);
    }
    $store = wp_church_file_store_load();
    $store['feedback'][] = [
        'id' => count($store['feedback']) + 1,
        'user_id' => $uid,
        'user_name' => $user['name'],
        'category' => $category,
        'target_id' => $targetId,
        'message' => $message,
        'created_at' => date('Y-m-d H:i:s'),
    ];
    wp_church_file_store_save($store);
    wp_church_out(['ok' => true]);
}

wp_church_out(['ok' => false, 'error' => 'Unknown action'], 400);
