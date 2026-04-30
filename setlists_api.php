<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

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

$publicActions = ['get_public_setlist'];
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

/* CREATE SETLIST */
if ($action === 'create_setlist' && $method === 'POST') {
    try {
        $d = readJson();
        $name = trim($d['name'] ?? '');

        if ($name === '') {
            out(["error" => "Name required"], 400);
        }

        $st = $pdo->prepare("INSERT INTO setlists (user_id, name) VALUES (?, ?)");
        $st->execute([$uid, $name]);

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
        (SELECT COUNT(*) FROM setlist_items i WHERE i.setlist_id = s.id) AS items_count
      FROM setlists s
      WHERE s.user_id = ? AND s.status = ?
      ORDER BY s.updated_at DESC, s.id DESC
    ");
    $st->execute([$uid, $status]);
  } else {
    $st = $pdo->prepare("
      SELECT s.*,
        (SELECT COUNT(*) FROM setlist_items i WHERE i.setlist_id = s.id) AS items_count
      FROM setlists s
      WHERE s.user_id = ?
      ORDER BY s.updated_at DESC, s.id DESC
    ");
    $st->execute([$uid]);
  }

  $rows = $st->fetchAll(PDO::FETCH_ASSOC);

  foreach ($rows as &$r) {
    $r['id'] = (int)$r['id'];
    $r['user_id'] = (int)$r['user_id'];
    $r['items_count'] = (int)$r['items_count'];
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

  $setlist = requireSetlistOwner($pdo, $setlist_id, $uid);
  $setlist['id'] = (int)$setlist['id'];
  $setlist['user_id'] = (int)$setlist['user_id'];
  $setlist = wp_translation_translate_row($setlist, [
    'name' => 'setlists.single.name',
    'description' => 'setlists.single.description',
    'service_type' => 'setlists.single.service_type',
  ], $lang);

  out($setlist);
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

  $setlist = requireSetlistOwner($pdo, $setlist_id, $uid);

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
    "name" => $setlist['name'],
    "description" => $setlist['description'],
    "service_date" => $setlist['service_date'],
    "service_type" => $setlist['service_type'],
    "status" => $setlist['status']
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
    SELECT id, title, artist, song_key, tags
    FROM songs
    WHERE title LIKE ?
       OR artist LIKE ?
       OR tags LIKE ?
    ORDER BY title ASC
    LIMIT 30
  ");
  $st->execute([$like, $like, $like]);

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

  if ($setlist_id <= 0 || $song_id <= 0) {
    out(["error" => "Invalid data"], 400);
  }

  $setlist = requireSetlistOwner($pdo, $setlist_id, $uid);

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

  foreach ($rows as $k => $row) {
    if ((int)$row['song_id'] === $song_id) {
      $index = $k;
      break;
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
    "next" => $normalize($next)
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
