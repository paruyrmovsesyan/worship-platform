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
require_once __DIR__ . '/translation_runtime.php';

function out($arr, $code = 200){
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$publicActions = ['get_public_setlist', 'get_setlist_song_nav'];
$lang = wp_translation_requested_lang();

if (empty($_SESSION['user_id']) && !in_array($action, $publicActions, true)) {
  out(["error" => "Unauthorized"], 401);
}

try {
  $pdo = wp_runtime_open_pdo();
  $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Exception $e) {
  out(["error" => "DB connection failed"], 500);
}

$uid = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

function readJson(){
  $raw = file_get_contents("php://input");
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

function normalizeNullable($value){
  $v = trim((string)$value);
  return $v === '' ? null : $v;
}

function requireSetlistOwner(PDO $pdo, int $setlistId, int $uid){
  $st = $pdo->prepare("SELECT * FROM setlists WHERE id=? AND user_id=? LIMIT 1");
  $st->execute([$setlistId, $uid]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    out(["error" => "Setlist not found"], 404);
  }
  return $row;
}

function ensureSetlistAccessTable(PDO $pdo): void {
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS setlist_user_access (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      setlist_id INT UNSIGNED NOT NULL,
      owner_user_id INT UNSIGNED NOT NULL,
      grantee_user_id INT UNSIGNED NOT NULL,
      grantee_email VARCHAR(190) NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_setlist_grantee (setlist_id, grantee_user_id),
      KEY idx_grantee_active (grantee_user_id, revoked_at, expires_at),
      KEY idx_owner (owner_user_id),
      KEY idx_setlist (setlist_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  ");
}

function decorateSetlistAccess(array $row, string $role, bool $canEdit, ?array $access = null): array {
  $row['access_role'] = $role;
  $row['can_edit'] = $canEdit ? 1 : 0;
  $row['access_expires_at'] = $access['expires_at'] ?? ($row['access_expires_at'] ?? null);
  $row['access_id'] = isset($access['id']) ? (int)$access['id'] : (isset($row['access_id']) ? (int)$row['access_id'] : null);
  return $row;
}

function requireSetlistReadable(PDO $pdo, int $setlistId, int $uid): array {
  $st = $pdo->prepare("
    SELECT s.*, NULL AS owner_name, NULL AS owner_email
    FROM setlists s
    WHERE s.id=? AND s.user_id=?
    LIMIT 1
  ");
  $st->execute([$setlistId, $uid]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if ($row) {
    return decorateSetlistAccess($row, 'owner', true);
  }

  $st = $pdo->prepare("
    SELECT s.*, a.id AS access_id, a.expires_at AS access_expires_at,
           u.name AS owner_name, u.email AS owner_email
    FROM setlist_user_access a
    JOIN setlists s ON s.id = a.setlist_id
    LEFT JOIN users u ON u.id = s.user_id
    WHERE a.setlist_id = ?
      AND a.grantee_user_id = ?
      AND a.revoked_at IS NULL
      AND a.expires_at > NOW()
      AND s.status = 'active'
    LIMIT 1
  ");
  $st->execute([$setlistId, $uid]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if ($row) {
    return decorateSetlistAccess($row, 'shared', false, [
      'id' => $row['access_id'] ?? null,
      'expires_at' => $row['access_expires_at'] ?? null,
    ]);
  }

  // Check Team Access
  $st = $pdo->prepare("
    SELECT s.*, u.name AS owner_name, u.email AS owner_email, m.role AS team_role
    FROM setlists s
    JOIN team_members m ON m.team_id = s.team_id
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND m.user_id = ? AND s.status = 'active'
    LIMIT 1
  ");
  $st->execute([$setlistId, $uid]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if ($row) {
    $canEdit = ($row['team_role'] === 'owner' || $row['team_role'] === 'admin');
    $decorated = decorateSetlistAccess($row, 'team', $canEdit);
    $decorated['team_role'] = $row['team_role'];
    return $decorated;
  }

  out(["error" => "Setlist not found"], 404);
}

function findUserByEmail(PDO $pdo, string $email): ?array {
  $st = $pdo->prepare("SELECT id, name, email FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1");
  $st->execute([$email]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}

ensureSetlistAccessTable($pdo);

function ensureTeamArchitectureUpdates(PDO $pdo): void {
  // Add team_id to setlists
  try {
      $pdo->exec("ALTER TABLE setlists ADD COLUMN team_id INT UNSIGNED NULL DEFAULT NULL AFTER user_id");
  } catch (Exception $e) {}
  
  // Add team_id to songs
  try {
      $pdo->exec("ALTER TABLE songs ADD COLUMN team_id INT UNSIGNED NULL DEFAULT NULL AFTER id");
  } catch (Exception $e) {}
}
ensureTeamArchitectureUpdates($pdo);

/* CREATE SETLIST */
if ($action === 'create_setlist' && $method === 'POST') {
    try {
        $d = readJson();
        $name = trim($d['name'] ?? '');
        $team_id = !empty($d['team_id']) ? (int)$d['team_id'] : null;

        if ($name === '') {
            out(["error" => "Name required"], 400);
        }

        // --- ENFORCE PRICING LIMITS ---
        $stPlan = $pdo->prepare("SELECT plan_type FROM users WHERE id=? LIMIT 1");
        $stPlan->execute([$uid]);
        $plan = $stPlan->fetchColumn() ?: 'free';

        if ($plan === 'free') {
            $stCount = $pdo->prepare("SELECT COUNT(*) FROM setlists WHERE user_id=? AND status='active'");
            $stCount->execute([$uid]);
            $count = (int)$stCount->fetchColumn();
            if ($count >= 3) {
                out(["error" => "limit_reached", "message" => "Free plan allows up to 3 active setlists. Please upgrade to Pro to create more."], 403);
            }
        }
        // ------------------------------

        $st = $pdo->prepare("INSERT INTO setlists (user_id, team_id, name) VALUES (?, ?, ?)");
        $st->execute([$uid, $team_id, $name]);

        out([
            "ok" => true,
            "id" => (int)$pdo->lastInsertId()
        ]);
    } catch (Throwable $e) {
        out([
            "error" => $e->getMessage()
        ], 500);
    }
}

/* GET SETLISTS */
if ($action === 'get_setlists' && $method === 'GET') {
  $status = trim((string)($_GET['status'] ?? ''));

  if ($status !== '' && !in_array($status, ['active', 'archived'], true)) {
    out(["error" => "Invalid status"], 400);
  }

  if ($status !== '') {
    $st = $pdo->prepare("
      SELECT s.*,
        NULL AS access_id,
        NULL AS access_expires_at,
        NULL AS owner_name,
        NULL AS owner_email,
        'owner' AS access_role,
        1 AS can_edit,
        (SELECT COUNT(*) FROM setlist_items i WHERE i.setlist_id = s.id) AS items_count
      FROM setlists s
      WHERE s.user_id = ? AND s.status = ?
      ORDER BY s.updated_at DESC, s.id DESC
    ");
    $st->execute([$uid, $status]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
  } else {
    $st = $pdo->prepare("
      SELECT s.*,
        NULL AS access_id,
        NULL AS access_expires_at,
        NULL AS owner_name,
        NULL AS owner_email,
        'owner' AS access_role,
        1 AS can_edit,
        (SELECT COUNT(*) FROM setlist_items i WHERE i.setlist_id = s.id) AS items_count
      FROM setlists s
      WHERE s.user_id = ?
    ");
    $st->execute([$uid]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    $sharedSt = $pdo->prepare("
      SELECT s.*,
        a.id AS access_id,
        a.expires_at AS access_expires_at,
        u.name AS owner_name,
        u.email AS owner_email,
        'shared' AS access_role,
        0 AS can_edit,
        (SELECT COUNT(*) FROM setlist_items i WHERE i.setlist_id = s.id) AS items_count
      FROM setlist_user_access a
      JOIN setlists s ON s.id = a.setlist_id
      LEFT JOIN users u ON u.id = s.user_id
      WHERE a.grantee_user_id = ?
        AND a.revoked_at IS NULL
        AND a.expires_at > NOW()
        AND s.status = 'active'
    ");
    $sharedSt->execute([$uid]);
    $rows = array_merge($rows, $sharedSt->fetchAll(PDO::FETCH_ASSOC));

    $teamSt = $pdo->prepare("
      SELECT s.*,
        NULL AS access_id,
        NULL AS access_expires_at,
        u.name AS owner_name,
        u.email AS owner_email,
        'team' AS access_role,
        IF(m.role IN ('owner','admin'), 1, 0) AS can_edit,
        (SELECT COUNT(*) FROM setlist_items i WHERE i.setlist_id = s.id) AS items_count,
        t.name AS team_name
      FROM setlists s
      JOIN team_members m ON m.team_id = s.team_id
      LEFT JOIN teams t ON t.id = s.team_id
      LEFT JOIN users u ON u.id = s.user_id
      WHERE m.user_id = ? AND s.user_id != ? AND s.status = 'active'
    ");
    $teamSt->execute([$uid, $uid]);
    $rows = array_merge($rows, $teamSt->fetchAll(PDO::FETCH_ASSOC));
  }

  usort($rows, static function($a, $b) {
    $aRole = $a['access_role'] ?? 'owner';
    $bRole = $b['access_role'] ?? 'owner';
    $roleOrder = ['owner' => 0, 'team' => 1, 'shared' => 2];
    $aVal = $roleOrder[$aRole] ?? 9;
    $bVal = $roleOrder[$bRole] ?? 9;
    if ($aVal !== $bVal) return $aVal <=> $bVal;
    $aTime = strtotime((string)($a['updated_at'] ?? $a['created_at'] ?? '')) ?: 0;
    $bTime = strtotime((string)($b['updated_at'] ?? $b['created_at'] ?? '')) ?: 0;
    return $bTime <=> $aTime;
  });

  foreach ($rows as &$r) {
    $r['id'] = (int)$r['id'];
    $r['user_id'] = (int)$r['user_id'];
    $r['items_count'] = (int)$r['items_count'];
    $r['access_id'] = $r['access_id'] !== null ? (int)$r['access_id'] : null;
    $r['can_edit'] = (int)($r['can_edit'] ?? 0);
  }
  unset($r);

  $rows = wp_translation_translate_rows($rows, [
    'name' => 'setlists.list.name',
    'description' => 'setlists.list.description',
    'service_type' => 'setlists.list.service_type',
  ], $lang);

  out($rows);
}

/* GET SINGLE SETLIST */
if ($action === 'get_setlist' && $method === 'GET') {
  $setlist_id = (int)($_GET['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  $setlist = requireSetlistReadable($pdo, $setlist_id, $uid);
  $setlist['id'] = (int)$setlist['id'];
  $setlist['user_id'] = (int)$setlist['user_id'];
  $setlist['can_edit'] = (int)($setlist['can_edit'] ?? 0);
  $setlist = wp_translation_translate_row($setlist, [
    'name' => 'setlists.single.name',
    'description' => 'setlists.single.description',
    'service_type' => 'setlists.single.service_type',
  ], $lang);

  out($setlist);
}

/* LIST USER ACCESS FOR SETLIST */
if ($action === 'list_setlist_access' && $method === 'GET') {
  $setlist_id = (int)($_GET['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $st = $pdo->prepare("
    SELECT a.id, a.setlist_id, a.grantee_user_id, a.grantee_email, a.expires_at,
           a.revoked_at, a.created_at, a.updated_at,
           u.name AS grantee_name, u.email AS user_email
    FROM setlist_user_access a
    LEFT JOIN users u ON u.id = a.grantee_user_id
    WHERE a.setlist_id = ? AND a.owner_user_id = ?
    ORDER BY
      CASE
        WHEN a.revoked_at IS NULL AND a.expires_at > NOW() THEN 0
        WHEN a.revoked_at IS NULL THEN 1
        ELSE 2
      END,
      a.expires_at ASC,
      a.created_at DESC
  ");
  $st->execute([$setlist_id, $uid]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC);

  $now = time();
  foreach ($rows as &$r) {
    $r['id'] = (int)$r['id'];
    $r['setlist_id'] = (int)$r['setlist_id'];
    $r['grantee_user_id'] = (int)$r['grantee_user_id'];
    $expiresTs = strtotime((string)$r['expires_at']) ?: 0;
    $r['status'] = $r['revoked_at'] ? 'revoked' : ($expiresTs > $now ? 'active' : 'expired');
    $r['email'] = $r['user_email'] ?: $r['grantee_email'];
  }
  unset($r);

  out($rows);
}

/* GRANT USER ACCESS TO SETLIST */
if ($action === 'grant_setlist_access' && $method === 'POST') {
  $d = readJson();
  $setlist_id = (int)($d['setlist_id'] ?? 0);
  $email = trim((string)($d['email'] ?? ''));
  $expiresRaw = trim((string)($d['expires_at'] ?? ''));

  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);
  if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) out(["error" => "Invalid email"], 400);
  if ($expiresRaw === '') out(["error" => "Expiration required"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);
  $user = findUserByEmail($pdo, $email);
  if (!$user) out(["error" => "User not found"], 404);

  $granteeId = (int)$user['id'];
  if ($granteeId === $uid) out(["error" => "Cannot grant access to yourself"], 400);

  try {
    $expires = new DateTimeImmutable($expiresRaw);
  } catch (Throwable $e) {
    out(["error" => "Invalid expiration"], 400);
  }

  if ($expires->getTimestamp() <= time()) {
    out(["error" => "Expiration must be in the future"], 400);
  }

  $expiresSql = $expires->format('Y-m-d H:i:s');
  $st = $pdo->prepare("
    INSERT INTO setlist_user_access
      (setlist_id, owner_user_id, grantee_user_id, grantee_email, expires_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, NULL)
    ON DUPLICATE KEY UPDATE
      owner_user_id = VALUES(owner_user_id),
      grantee_email = VALUES(grantee_email),
      expires_at = VALUES(expires_at),
      revoked_at = NULL,
      updated_at = NOW()
  ");
  $st->execute([$setlist_id, $uid, $granteeId, $user['email'] ?: $email, $expiresSql]);

  out([
    "ok" => true,
    "user" => [
      "id" => $granteeId,
      "name" => $user['name'] ?? '',
      "email" => $user['email'] ?? $email,
    ],
    "expires_at" => $expiresSql
  ]);
}

/* REVOKE USER ACCESS TO SETLIST */
if ($action === 'revoke_setlist_access' && $method === 'POST') {
  $d = readJson();
  $setlist_id = (int)($d['setlist_id'] ?? 0);
  $access_id = (int)($d['access_id'] ?? 0);

  if ($setlist_id <= 0 || $access_id <= 0) out(["error" => "Invalid data"], 400);
  requireSetlistOwner($pdo, $setlist_id, $uid);

  $st = $pdo->prepare("
    UPDATE setlist_user_access
    SET revoked_at = NOW(), updated_at = NOW()
    WHERE id = ? AND setlist_id = ? AND owner_user_id = ?
  ");
  $st->execute([$access_id, $setlist_id, $uid]);

  out(["ok" => true]);
}

/* RENAME / UPDATE SETLIST */
if ($action === 'update_setlist' && $method === 'POST') {
  $d = readJson();

  $setlist_id = (int)($d['setlist_id'] ?? 0);
  $name = trim((string)($d['name'] ?? ''));
  $description = normalizeNullable($d['description'] ?? '');
  $service_date = normalizeNullable($d['service_date'] ?? '');
  $service_type = normalizeNullable($d['service_type'] ?? '');

  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);
  if ($name === '') out(["error" => "Name required"], 400);
  if (mb_strlen($name) > 150) out(["error" => "Name too long"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $st = $pdo->prepare("
    UPDATE setlists
    SET name=?, description=?, service_date=?, service_type=?
    WHERE id=? AND user_id=?
  ");
  $st->execute([$name, $description, $service_date, $service_type, $setlist_id, $uid]);

  out(["ok" => true]);
}

/* DELETE SETLIST */
if ($action === 'delete_setlist' && $method === 'POST') {
  $d = readJson();
  $setlist_id = (int)($d['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $pdo->beginTransaction();
  try {
    $st = $pdo->prepare("DELETE FROM setlist_items WHERE setlist_id=?");
    $st->execute([$setlist_id]);

    $st = $pdo->prepare("DELETE FROM setlists WHERE id=? AND user_id=?");
    $st->execute([$setlist_id, $uid]);

    $pdo->commit();
    out(["ok" => true]);
  } catch (Exception $e) {
    $pdo->rollBack();
    out(["error" => "Server error"], 500);
  }
}

/* ARCHIVE SETLIST */
if ($action === 'archive_setlist' && $method === 'POST') {
  $d = readJson();
  $setlist_id = (int)($d['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $st = $pdo->prepare("UPDATE setlists SET status='archived' WHERE id=? AND user_id=?");
  $st->execute([$setlist_id, $uid]);

  out(["ok" => true]);
}

/* UNARCHIVE SETLIST */
if ($action === 'unarchive_setlist' && $method === 'POST') {
  $d = readJson();
  $setlist_id = (int)($d['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $st = $pdo->prepare("UPDATE setlists SET status='active' WHERE id=? AND user_id=?");
  $st->execute([$setlist_id, $uid]);

  out(["ok" => true]);
}

/* DUPLICATE SETLIST */
if ($action === 'duplicate_setlist' && $method === 'POST') {
  $d = readJson();
  $setlist_id = (int)($d['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  $pdo->beginTransaction();
  try {
    $src = requireSetlistOwner($pdo, $setlist_id, $uid);

    $newName = $src['name'] . ' (copy)';

    $ins = $pdo->prepare("
      INSERT INTO setlists (user_id, name, description, service_date, service_type, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    ");
    $ins->execute([
      $uid,
      $newName,
      $src['description'],
      $src['service_date'],
      $src['service_type']
    ]);

    $newSetlistId = (int)$pdo->lastInsertId();

    $items = $pdo->prepare("SELECT * FROM setlist_items WHERE setlist_id=? ORDER BY position ASC, id ASC");
    $items->execute([$setlist_id]);

    $insItem = $pdo->prepare("
      INSERT INTO setlist_items
      (setlist_id, item_type, song_id, title, position, target_key, notes, capo, is_required)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    while ($row = $items->fetch(PDO::FETCH_ASSOC)) {
      $insItem->execute([
        $newSetlistId,
        $row['item_type'],
        $row['song_id'],
        $row['title'],
        $row['position'],
        $row['target_key'],
        $row['notes'],
        $row['capo'],
        $row['is_required']
      ]);
    }

    $pdo->commit();
    out(["ok" => true, "id" => $newSetlistId]);
  } catch (Exception $e) {
    $pdo->rollBack();
    out(["error" => "Server error"], 500);
  }
}

/* GET SETLIST ITEMS */
if ($action === 'get_setlist_items' && $method === 'GET') {
  $setlist_id = (int)($_GET['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  $setlist = requireSetlistReadable($pdo, $setlist_id, $uid);

  $st = $pdo->prepare("
    SELECT i.*,
           s.title AS song_title,
           s.artist AS song_artist,
           s.song_key AS original_key,
           s.tags AS song_tags
    FROM setlist_items i
    LEFT JOIN songs s ON s.id = i.song_id
    WHERE i.setlist_id = ?
    ORDER BY i.position ASC, i.id ASC
  ");
  $st->execute([$setlist_id]);
  $items = $st->fetchAll(PDO::FETCH_ASSOC);

  foreach ($items as &$it) {
    $it['id'] = (int)$it['id'];
    $it['setlist_id'] = (int)$it['setlist_id'];
    $it['song_id'] = $it['song_id'] !== null ? (int)$it['song_id'] : null;
    $it['position'] = (int)$it['position'];
    $it['capo'] = $it['capo'] !== null ? (int)$it['capo'] : null;
    $it['is_required'] = (int)$it['is_required'];
  }
  unset($it);

  $setlist = wp_translation_translate_row([
    "id" => (int)$setlist['id'],
    "user_id" => (int)$setlist['user_id'],
    "name" => $setlist['name'],
    "description" => $setlist['description'],
    "service_date" => $setlist['service_date'],
    "service_type" => $setlist['service_type'],
    "status" => $setlist['status'],
    "created_at" => $setlist['created_at'] ?? null,
    "updated_at" => $setlist['updated_at'] ?? null,
    "share_token" => $setlist['share_token'] ?? null,
    "access_role" => $setlist['access_role'] ?? 'owner',
    "can_edit" => (int)($setlist['can_edit'] ?? 0),
    "access_id" => isset($setlist['access_id']) ? (int)$setlist['access_id'] : null,
    "access_expires_at" => $setlist['access_expires_at'] ?? null,
    "owner_name" => $setlist['owner_name'] ?? null,
    "owner_email" => $setlist['owner_email'] ?? null,
    "team_role" => $setlist['team_role'] ?? null
  ], [
    'name' => 'setlists.items.setlist_name',
    'description' => 'setlists.items.setlist_description',
    'service_type' => 'setlists.items.setlist_service_type',
  ], $lang);

  $items = wp_translation_translate_rows($items, [
    'title' => 'setlists.items.title',
    'notes' => 'setlists.items.notes',
    'song_title' => 'setlists.items.song_title',
    'song_artist' => 'setlists.items.song_artist',
    'song_tags' => 'setlists.items.song_tags',
  ], $lang);
  $items = wp_translation_localize_row_fields($items, [
    'song_title' => 'setlists.items.song_title',
  ], $lang);

  out([
    "setlist" => $setlist,
    "items" => $items
  ]);
}

/* ADD SONG TO SETLIST */
if ($action === 'add_song_to_setlist' && $method === 'POST') {
  $d = readJson();

  $setlist_id = (int)($d['setlist_id'] ?? 0);
  $song_id = (int)($d['song_id'] ?? 0);
  $target_key = normalizeNullable($d['target_key'] ?? '');
  $notes = normalizeNullable($d['notes'] ?? '');
  $capo = isset($d['capo']) && $d['capo'] !== '' ? (int)$d['capo'] : null;
  $is_required = !empty($d['is_required']) ? 1 : 0;

  if ($setlist_id <= 0 || $song_id <= 0) out(["error" => "Invalid data"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $songSt = $pdo->prepare("SELECT id FROM songs WHERE id=? LIMIT 1");
  $songSt->execute([$song_id]);
  if (!$songSt->fetchColumn()) out(["error" => "Song not found"], 404);

  $posSt = $pdo->prepare("SELECT COALESCE(MAX(position), 0) + 1 FROM setlist_items WHERE setlist_id=?");
  $posSt->execute([$setlist_id]);
  $nextPos = (int)$posSt->fetchColumn();

  $st = $pdo->prepare("
    INSERT INTO setlist_items
    (setlist_id, item_type, song_id, position, target_key, notes, capo, is_required)
    VALUES (?, 'song', ?, ?, ?, ?, ?, ?)
  ");
  $st->execute([
    $setlist_id,
    $song_id,
    $nextPos,
    $target_key,
    $notes,
    $capo,
    $is_required
  ]);

  out(["ok" => true, "id" => (int)$pdo->lastInsertId()]);
}

/* ADD SECTION TO SETLIST */
if ($action === 'add_section_to_setlist' && $method === 'POST') {
  $d = readJson();

  $setlist_id = (int)($d['setlist_id'] ?? 0);
  $title = trim((string)($d['title'] ?? ''));

  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);
  if ($title === '') out(["error" => "Title required"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $posSt = $pdo->prepare("SELECT COALESCE(MAX(position), 0) + 1 FROM setlist_items WHERE setlist_id=?");
  $posSt->execute([$setlist_id]);
  $nextPos = (int)$posSt->fetchColumn();

  $st = $pdo->prepare("
    INSERT INTO setlist_items
    (setlist_id, item_type, title, position)
    VALUES (?, 'section', ?, ?)
  ");
  $st->execute([$setlist_id, $title, $nextPos]);

  out(["ok" => true, "id" => (int)$pdo->lastInsertId()]);
}

/* UPDATE SETLIST ITEM */
if ($action === 'update_setlist_item' && $method === 'POST') {
  $d = readJson();

  $item_id = (int)($d['item_id'] ?? 0);
  if ($item_id <= 0) out(["error" => "Invalid item_id"], 400);

  $target_key = normalizeNullable($d['target_key'] ?? '');
  $notes = normalizeNullable($d['notes'] ?? '');
  $capo = isset($d['capo']) && $d['capo'] !== '' ? (int)$d['capo'] : null;
  $is_required = !empty($d['is_required']) ? 1 : 0;
  $title = array_key_exists('title', $d) ? normalizeNullable($d['title']) : null;

  $st = $pdo->prepare("
    SELECT i.*, s.user_id
    FROM setlist_items i
    INNER JOIN setlists s ON s.id = i.setlist_id
    WHERE i.id=? AND s.user_id=?
    LIMIT 1
  ");
  $st->execute([$item_id, $uid]);
  $item = $st->fetch(PDO::FETCH_ASSOC);

  if (!$item) out(["error" => "Item not found"], 404);

  if ($item['item_type'] === 'section') {
    $upd = $pdo->prepare("
      UPDATE setlist_items
      SET title=?, notes=?
      WHERE id=?
    ");
    $upd->execute([
      $title,
      $notes,
      $item_id
    ]);
  } else {
    $upd = $pdo->prepare("
      UPDATE setlist_items
      SET target_key=?, notes=?, capo=?, is_required=?
      WHERE id=?
    ");
    $upd->execute([
      $target_key,
      $notes,
      $capo,
      $is_required,
      $item_id
    ]);
  }

  out(["ok" => true]);
}

/* REMOVE SETLIST ITEM */
if ($action === 'remove_setlist_item' && $method === 'POST') {
  $d = readJson();
  $item_id = (int)($d['item_id'] ?? 0);
  if ($item_id <= 0) out(["error" => "Invalid item_id"], 400);

  $st = $pdo->prepare("
    DELETE i FROM setlist_items i
    INNER JOIN setlists s ON s.id = i.setlist_id
    WHERE i.id=? AND s.user_id=?
  ");
  $st->execute([$item_id, $uid]);

  out(["ok" => true]);
}

/* REORDER SETLIST ITEMS */
if ($action === 'reorder_setlist_items' && $method === 'POST') {
  $d = readJson();
  $setlist_id = (int)($d['setlist_id'] ?? 0);
  $items = $d['items'] ?? [];

  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);
  if (!is_array($items)) out(["error" => "Invalid items"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $pdo->beginTransaction();
  try {
    $st = $pdo->prepare("
      UPDATE setlist_items
      SET position=?
      WHERE id=? AND setlist_id=?
    ");

    foreach ($items as $row) {
      $item_id = (int)($row['id'] ?? 0);
      $position = (int)($row['position'] ?? 0);

      if ($item_id > 0 && $position > 0) {
        $st->execute([$position, $item_id, $setlist_id]);
      }
    }

    $pdo->commit();
    out(["ok" => true]);
  } catch (Exception $e) {
    $pdo->rollBack();
    out(["error" => "Server error"], 500);
  }
}


/* SEARCH SONGS */
if ($action === 'search_songs' && $method === 'GET') {
  $q = trim((string)($_GET['q'] ?? ''));

  if ($q === '') {
    out([]);
  }

  $like = '%' . $q . '%';

  $st = $pdo->prepare("
    SELECT s.id, s.title, s.artist, s.song_key, s.tags,
           s.title_hy, s.title_lat, s.title_en, s.title_ru
    FROM songs s
    WHERE (
         s.title LIKE ?
      OR COALESCE(s.title_hy, '') LIKE ?
      OR COALESCE(s.title_lat, '') LIKE ?
      OR COALESCE(s.title_en, '') LIKE ?
      OR COALESCE(s.title_ru, '') LIKE ?
      OR s.artist LIKE ?
      OR s.tags LIKE ?
      )
    ORDER BY COALESCE(NULLIF(s.title_hy, ''), NULLIF(s.title, ''), s.id) ASC
    LIMIT 30
  ");
  $st->execute([$like, $like, $like, $like, $like, $like, $like]);

  $rows = $st->fetchAll(PDO::FETCH_ASSOC);

  foreach ($rows as &$r) {
    $r['id'] = (int)$r['id'];
  }
  unset($r);

  $rows = wp_translation_translate_rows($rows, [
    'title' => 'setlists.search.title',
    'artist' => 'setlists.search.artist',
    'tags' => 'setlists.search.tags',
  ], $lang);
  $rows = wp_translation_localize_row_fields($rows, [
    'title' => 'setlists.search.title',
  ], $lang);

  out($rows);
}


/* GET SETLIST SONG NAVIGATION */
if ($action === 'get_setlist_song_nav' && $method === 'GET') {
  $setlist_id = (int)($_GET['setlist_id'] ?? 0);
  $song_id = (int)($_GET['song_id'] ?? 0);
  $item_id = (int)($_GET['item_id'] ?? 0);
  $token = trim((string)($_GET['token'] ?? ''));

  if ($song_id <= 0 || ($setlist_id <= 0 && $token === '')) {
    out(["error" => "Invalid data"], 400);
  }

  if ($token !== '') {
    $st = $pdo->prepare("
      SELECT *
      FROM setlists
      WHERE share_token = ?
      LIMIT 1
    ");
    $st->execute([$token]);
    $setlist = $st->fetch(PDO::FETCH_ASSOC);
    if (!$setlist) {
      out(["error" => "Setlist not found"], 404);
    }
    $setlist_id = (int)$setlist['id'];
  } else {
    $setlist = requireSetlistReadable($pdo, $setlist_id, $uid);
  }

  $st = $pdo->prepare("
  SELECT
    i.id,
    i.song_id,
    i.target_key,
    i.capo,
    i.position,
    s.title AS song_title
  FROM setlist_items i
  LEFT JOIN songs s ON s.id = i.song_id
  WHERE i.setlist_id = ?
    AND i.item_type = 'song'
    AND i.song_id IS NOT NULL
  ORDER BY i.position ASC, i.id ASC
");
  $st->execute([$setlist_id]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC);
  $rows = wp_translation_translate_rows($rows, [
    'song_title' => 'setlists.nav.song_title',
  ], $lang);
  $rows = wp_translation_localize_row_fields($rows, [
    'song_title' => 'setlists.nav.song_title',
  ], $lang);
  $setlist = wp_translation_translate_row([
    "id" => (int)$setlist['id'],
    "name" => $setlist['name'],
  ], [
    'name' => 'setlists.nav.setlist_name',
  ], $lang);

  if (!$rows) {
    out([
      "setlist" => $setlist,
      "index" => -1,
      "total" => 0,
      "prev" => null,
      "current" => null,
      "next" => null
    ]);
  }

  $index = -1;

  if ($item_id > 0) {
    foreach ($rows as $k => $row) {
      if ((int)$row['id'] === $item_id) {
        $index = $k;
        break;
      }
    }
  }

  if ($index < 0) {
    foreach ($rows as $k => $row) {
      if ((int)$row['song_id'] === $song_id) {
        $index = $k;
        break;
      }
    }
  }

  if ($index < 0) {
    out([
      "setlist" => $setlist,
      "index" => -1,
      "total" => count($rows),
      "prev" => null,
      "current" => null,
      "next" => null
    ]);
  }

  $normalize = function($row){
  if (!$row) return null;

  return [
    "item_id" => (int)$row["id"],
    "id" => (int)$row["song_id"],
    "title" => (string)($row["song_title"] ?? ''),
    "target_key" => $row["target_key"] !== null ? (string)$row["target_key"] : null,
    "capo" => $row["capo"] !== null ? (int)$row["capo"] : null,
    "position" => (int)$row["position"]
  ];
};

  $prev = $index > 0 ? $rows[$index - 1] : null;
  $current = $rows[$index];
  $next = $index < count($rows) - 1 ? $rows[$index + 1] : null;

  out([
    "setlist" => $setlist,
    "index" => $index + 1,
    "total" => count($rows),
    "prev" => $normalize($prev),
    "current" => $normalize($current),
    "next" => $normalize($next),
    "token" => $token !== '' ? $token : null
  ]);
}

/* GENERATE SHARE LINK */
if ($action === 'generate_share_link' && $method === 'POST') {
  $d = readJson();
  $setlist_id = (int)($d['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $token = bin2hex(random_bytes(16));

  $st = $pdo->prepare("UPDATE setlists SET share_token=? WHERE id=? AND user_id=?");
  $st->execute([$token, $setlist_id, $uid]);

  out([
    "ok" => true,
    "share_token" => $token,
    "share_url" => "/setlist_public.html?token=" . $token
  ]);
}

/* DISABLE SHARE LINK */
if ($action === 'disable_share_link' && $method === 'POST') {
  $d = readJson();
  $setlist_id = (int)($d['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  requireSetlistOwner($pdo, $setlist_id, $uid);

  $st = $pdo->prepare("UPDATE setlists SET share_token=NULL WHERE id=? AND user_id=?");
  $st->execute([$setlist_id, $uid]);

  out(["ok" => true]);
}

/* GET SHARE STATUS */
if ($action === 'get_share_status' && $method === 'GET') {
  $setlist_id = (int)($_GET['setlist_id'] ?? 0);
  if ($setlist_id <= 0) out(["error" => "Invalid setlist_id"], 400);

  $row = requireSetlistOwner($pdo, $setlist_id, $uid);

  out([
    "ok" => true,
    "enabled" => !empty($row['share_token']),
    "share_token" => $row['share_token'] ?: null,
    "share_url" => !empty($row['share_token'])
      ? "/setlist_public.html?token=" . $row['share_token']
      : null
  ]);
}

/* GET PUBLIC SETLIST */
if ($action === 'get_public_setlist' && $method === 'GET') {
  $token = trim((string)($_GET['token'] ?? ''));
  if ($token === '') out(["error" => "Token required"], 400);

  $st = $pdo->prepare("
    SELECT *
    FROM setlists
    WHERE share_token = ?
    LIMIT 1
  ");
  $st->execute([$token]);
  $setlist = $st->fetch(PDO::FETCH_ASSOC);

  if (!$setlist) {
    out(["error" => "Setlist not found"], 404);
  }

  $itemsSt = $pdo->prepare("
    SELECT i.*,
           s.title AS song_title,
           s.artist AS song_artist,
           s.song_key AS original_key,
           s.tags AS song_tags
    FROM setlist_items i
    LEFT JOIN songs s ON s.id = i.song_id
    WHERE i.setlist_id = ?
    ORDER BY i.position ASC, i.id ASC
  ");
  $itemsSt->execute([$setlist['id']]);
  $items = $itemsSt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($items as &$it) {
    $it['id'] = (int)$it['id'];
    $it['setlist_id'] = (int)$it['setlist_id'];
    $it['song_id'] = $it['song_id'] !== null ? (int)$it['song_id'] : null;
    $it['position'] = (int)$it['position'];
    $it['capo'] = $it['capo'] !== null ? (int)$it['capo'] : null;
    $it['is_required'] = (int)$it['is_required'];
  }
  unset($it);

  $setlist = wp_translation_translate_row([
    "id" => (int)$setlist['id'],
    "name" => $setlist['name'],
    "description" => $setlist['description'],
    "service_date" => $setlist['service_date'],
    "service_type" => $setlist['service_type'],
    "status" => $setlist['status']
  ], [
    'name' => 'setlists.public.name',
    'description' => 'setlists.public.description',
    'service_type' => 'setlists.public.service_type',
  ], $lang);

  $items = wp_translation_translate_rows($items, [
    'title' => 'setlists.public.item_title',
    'notes' => 'setlists.public.notes',
    'song_title' => 'setlists.public.song_title',
    'song_artist' => 'setlists.public.song_artist',
    'song_tags' => 'setlists.public.song_tags',
  ], $lang);
  $items = wp_translation_localize_row_fields($items, [
    'song_title' => 'setlists.public.song_title',
  ], $lang);

  out([
    "setlist" => $setlist,
    "items" => $items
  ]);
}

out(["error" => "Unknown action"], 404);
