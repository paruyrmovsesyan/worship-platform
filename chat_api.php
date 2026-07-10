<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

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

function wp_chat_current_user_is_admin(): bool {
  require_once __DIR__ . '/admin_access.php';
  $config = wp_version_load();
  $user = wp_admin_get_current_user();

  if (!$user && !wp_admin_has_logout_lock(null)) {
    $restoredUser = wp_admin_restore_user_from_access_cookie();
    if ($restoredUser && wp_admin_is_authorized($restoredUser, $config)) {
      $user = $restoredUser;
    }
  }

  return $user && !wp_admin_has_logout_lock($user) && wp_admin_is_authorized($user, $config);
}

function wp_chat_user_can_read_setlist(PDO $pdo, int $setlistId, int $userId): bool {
  if ($setlistId <= 0 || $userId <= 0) return false;

  $st = $pdo->prepare("SELECT 1 FROM setlists WHERE id = ? AND user_id = ? LIMIT 1");
  $st->execute([$setlistId, $userId]);
  if ($st->fetchColumn()) return true;

  try {
    $st = $pdo->prepare("
      SELECT 1
      FROM setlist_user_access
      WHERE setlist_id = ?
        AND grantee_user_id = ?
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    ");
    $st->execute([$setlistId, $userId]);
    if ($st->fetchColumn()) return true;
  } catch (Throwable $e) {
    // Older installs may not have shared access tables yet.
  }

  try {
    $st = $pdo->prepare("
      SELECT 1
      FROM team_setlists ts
      JOIN team_members tm ON tm.team_id = ts.team_id
      WHERE ts.setlist_id = ?
        AND tm.user_id = ?
        AND tm.status = 'active'
      LIMIT 1
    ");
    $st->execute([$setlistId, $userId]);
    if ($st->fetchColumn()) return true;
  } catch (Throwable $e) {
    // Older installs may not have team setlist tables yet.
  }

  return false;
}

function wp_chat_ensure_participant_read_column(PDO $pdo): void {
  static $ensured = false;
  if ($ensured) {
    return;
  }

  try {
    $st = $pdo->query("SHOW COLUMNS FROM chat_participants LIKE 'last_read_message_id'");
    $hasColumn = $st && $st->fetch(PDO::FETCH_ASSOC);
    if (!$hasColumn) {
      $pdo->exec("ALTER TABLE chat_participants ADD COLUMN last_read_message_id BIGINT NULL DEFAULT NULL AFTER cleared_at");
    }
  } catch (Throwable $e) {
    // Older installs may already be partially migrated or lack cleared_at ordering support.
  }

  $ensured = true;
}

wp_chat_ensure_participant_read_column($pdo);

function wp_chat_compact_push_title(string $senderName): string {
    $senderName = trim(preg_replace('/\s+/u', ' ', $senderName));
    if ($senderName === '') {
        return 'New message';
    }

    return mb_substr($senderName, 0, 60);
}

function wp_chat_compact_push_body(string $message, bool $isSetlistShare = false): string {
    if ($isSetlistShare) {
        return 'Shared a setlist';
    }

    $message = trim(preg_replace('/\s+/u', ' ', $message));
    if ($message === '') {
        return 'Sent a message';
    }

    return mb_substr($message, 0, 90);
}

if ($action === 'badge_summary' && $method === 'GET') {
    $st = $pdo->prepare("
        SELECT COUNT(*)
        FROM chat_messages m
        JOIN chat_participants cp ON cp.chat_id = m.chat_id
        WHERE cp.user_id = ?
          AND m.user_id != ?
          AND (cp.cleared_at IS NULL OR m.created_at > cp.cleared_at)
          AND m.id > COALESCE(cp.last_read_message_id, 0)
    ");
    $st->execute([$uid, $uid]);
    $unreadMessages = (int)$st->fetchColumn();

    $st = $pdo->prepare("
        SELECT COUNT(*)
        FROM friends
        WHERE user_id_2 = ?
          AND status = 'pending'
    ");
    $st->execute([$uid]);
    $pendingRequests = (int)$st->fetchColumn();

    out([
      "ok" => true,
      "unread_messages" => $unreadMessages,
      "pending_requests" => $pendingRequests,
      "total" => $unreadMessages + $pendingRequests,
    ]);
}

// 1. List chats the user is in
if ($action === 'list_chats' && $method === 'GET') {
    $st = $pdo->prepare("
        SELECT c.id, c.type, c.name,
               (SELECT message FROM chat_messages m WHERE m.chat_id = c.id AND (cp.cleared_at IS NULL OR m.created_at > cp.cleared_at) ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM chat_messages m WHERE m.chat_id = c.id AND (cp.cleared_at IS NULL OR m.created_at > cp.cleared_at) ORDER BY created_at DESC LIMIT 1) as last_message_at,
               c.created_at as chat_created_at,
               (SELECT COUNT(*) FROM chat_messages m WHERE m.chat_id = c.id AND m.user_id != ? AND (cp.cleared_at IS NULL OR m.created_at > cp.cleared_at) AND m.id > COALESCE(cp.last_read_message_id, 0)) as unread_count,
               (SELECT GROUP_CONCAT(COALESCE(NULLIF(u.name, ''), SUBSTRING_INDEX(u.email, '@', 1)) SEPARATOR ', ') FROM chat_participants cp2 JOIN users u ON cp2.user_id = u.id WHERE cp2.chat_id = c.id AND u.id != ?) as participant_names
        FROM chats c
        JOIN chat_participants cp ON cp.chat_id = c.id
        WHERE cp.user_id = ?
        ORDER BY COALESCE(last_message_at, c.created_at) DESC
    ");
    $st->execute([$uid, $uid, $uid]);
    out(["ok" => true, "chats" => $st->fetchAll(PDO::FETCH_ASSOC)]);
}

// 2. Get or create direct chat with a friend
if ($action === 'get_direct_chat' && $method === 'POST') {
    $d = readJson();
    $friend_id = (int)($d['user_id'] ?? 0);
    
    // Check if they are friends
    $st = $pdo->prepare("SELECT status FROM friends WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)) AND status = 'accepted'");
    $st->execute([$uid, $friend_id, $friend_id, $uid]);
    if (!$st->fetch()) {
        out(["error" => "Not friends"], 403);
    }
    
    // Check if direct chat exists
    $st = $pdo->prepare("
        SELECT c.id FROM chats c
        JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
        JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
        WHERE c.type = 'direct'
        LIMIT 1
    ");
    $st->execute([$uid, $friend_id]);
    $chat_id = $st->fetchColumn();
    
    if (!$chat_id) {
        $pdo->beginTransaction();
        $st = $pdo->prepare("INSERT INTO chats (type, created_by) VALUES ('direct', ?)");
        $st->execute([$uid]);
        $chat_id = $pdo->lastInsertId();
        
        $st = $pdo->prepare("INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?), (?, ?)");
        $st->execute([$chat_id, $uid, $chat_id, $friend_id]);
        $pdo->commit();
    }
    
    out(["ok" => true, "chat_id" => (int)$chat_id]);
}

// 3. Delete/Clear a chat
if ($action === 'delete_chat' && $method === 'POST') {
    $d = readJson();
    $chat_id = (int)($d['chat_id'] ?? 0);
    $for_everyone = !empty($d['for_everyone']);
    
    // Verify participation
    $st = $pdo->prepare("SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?");
    $st->execute([$chat_id, $uid]);
    if (!$st->fetch()) out(["error" => "Access denied"], 403);
    
    if ($for_everyone) {
        $st = $pdo->prepare("SELECT created_by FROM chats WHERE id = ? LIMIT 1");
        $st->execute([$chat_id]);
        $creatorId = (int)($st->fetchColumn() ?: 0);
        if ($creatorId !== $uid && !wp_chat_current_user_is_admin()) {
            out(["error" => "Only the chat creator can delete this chat for everyone"], 403);
        }

        $pdo->prepare("DELETE FROM chat_messages WHERE chat_id = ?")->execute([$chat_id]);
        $pdo->prepare("DELETE FROM chat_participants WHERE chat_id = ?")->execute([$chat_id]);
        $pdo->prepare("DELETE FROM chats WHERE id = ?")->execute([$chat_id]);
    } else {
        $pdo->prepare("UPDATE chat_participants SET cleared_at = NOW() WHERE chat_id = ? AND user_id = ?")->execute([$chat_id, $uid]);
    }
    
    out(["ok" => true]);
}

// 4. Get messages for a chat
if ($action === 'get_messages' && $method === 'GET') {
    $chat_id = (int)($_GET['chat_id'] ?? 0);
    
    // Check access
    $st = $pdo->prepare("SELECT cleared_at FROM chat_participants WHERE chat_id = ? AND user_id = ?");
    $st->execute([$chat_id, $uid]);
    $cleared_at = $st->fetchColumn();
    if ($cleared_at === false) out(["error" => "Access denied"], 403);

    try {
        $stActive = $pdo->prepare("
            UPDATE users
            SET last_active_at = NOW()
            WHERE id = ?
              AND (last_active_at IS NULL OR last_active_at < DATE_SUB(NOW(), INTERVAL 15 SECOND))
        ");
        $stActive->execute([$uid]);
    } catch (Throwable $e) {
        // Presence should not block chat loading on older or partially migrated installs.
    }
    
    // Get chat info for header
    $st = $pdo->prepare("SELECT type, name, created_by FROM chats WHERE id = ?");
    $st->execute([$chat_id]);
    $chat_info = $st->fetch(PDO::FETCH_ASSOC);

    // Determine if it's a 1-on-1 chat by counting participants
    $stCount = $pdo->prepare("SELECT COUNT(*) FROM chat_participants WHERE chat_id = ?");
    $stCount->execute([$chat_id]);
    $pCount = (int)$stCount->fetchColumn();

    if ($chat_info && ($chat_info['type'] === 'direct' || $pCount <= 2)) {
        $st = $pdo->prepare("SELECT u.name, u.email, u.last_active_at, TIMESTAMPDIFF(SECOND, u.last_active_at, NOW()) as seconds_since_active FROM chat_participants cp JOIN users u ON cp.user_id = u.id WHERE cp.chat_id = ? AND u.id != ?");
        $st->execute([$chat_id, $uid]);
        $other = $st->fetch(PDO::FETCH_ASSOC);
        if ($other) {
            $chat_info['display_name'] = !empty($other['name']) ? $other['name'] : explode('@', $other['email'])[0];
            $chat_info['last_active_at'] = $other['last_active_at'];
            $chat_info['seconds_since_active'] = $other['seconds_since_active'];
        } else {
            $chat_info['display_name'] = 'Ընկեր';
        }

        try {
            $stReadState = $pdo->prepare("
                SELECT COALESCE(MAX(COALESCE(cp.last_read_message_id, 0)), 0)
                FROM chat_participants cp
                WHERE cp.chat_id = ?
                  AND cp.user_id != ?
            ");
            $stReadState->execute([$chat_id, $uid]);
            $chat_info['other_last_read_message_id'] = (int)($stReadState->fetchColumn() ?: 0);
        } catch (Throwable $e) {
            $chat_info['other_last_read_message_id'] = 0;
        }
    } else if ($chat_info) {
        $chat_info['display_name'] = !empty($chat_info['name']) ? $chat_info['name'] : 'Խումբ';
    }
    
    $before_id = (int)($_GET['before_id'] ?? 0);
    $after_id = (int)($_GET['after_id'] ?? 0);

    $sql = "
        SELECT * FROM (
            SELECT m.id, m.user_id, u.name as user_name, m.message, m.setlist_id, m.created_at
            FROM chat_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.chat_id = :chat_id 
              AND (:cleared_at1 IS NULL OR m.created_at > :cleared_at2)
              " . ($before_id > 0 ? " AND m.id < :before_id " : "") . "
              " . ($after_id > 0 ? " AND m.id > :after_id " : "") . "
            ORDER BY m.created_at DESC
            LIMIT 50
        ) sub
        ORDER BY created_at ASC
    ";
    
    $st = $pdo->prepare($sql);
    $st->bindValue(':chat_id', $chat_id, PDO::PARAM_INT);
    $st->bindValue(':cleared_at1', $cleared_at);
    $st->bindValue(':cleared_at2', $cleared_at);
    if ($before_id > 0) {
        $st->bindValue(':before_id', $before_id, PDO::PARAM_INT);
    }
    if ($after_id > 0) {
        $st->bindValue(':after_id', $after_id, PDO::PARAM_INT);
    }
    $st->execute();
    $messages = $st->fetchAll(PDO::FETCH_ASSOC);

    try {
        $stRead = $pdo->prepare("
            SELECT MAX(m.id)
            FROM chat_messages m
            WHERE m.chat_id = ?
              AND ( ? IS NULL OR m.created_at > ? )
        ");
        $stRead->execute([$chat_id, $cleared_at, $cleared_at]);
        $lastVisibleMessageId = (int)($stRead->fetchColumn() ?: 0);
        if ($lastVisibleMessageId > 0) {
            $stMark = $pdo->prepare("
                UPDATE chat_participants
                SET last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), ?)
                WHERE chat_id = ? AND user_id = ?
            ");
            $stMark->execute([$lastVisibleMessageId, $chat_id, $uid]);
        }
    } catch (Throwable $e) {
        // Read tracking should not break message loading.
    }

    out(["ok" => true, "chat_info" => $chat_info ?: ["display_name" => "Չաթ"], "messages" => $messages]);
}

// 5. Send a message
if ($action === 'send_message' && $method === 'POST') {
    $d = readJson();
    $chat_id = (int)($d['chat_id'] ?? 0);
    $message = trim($d['message'] ?? '');
    $setlist_id = (int)($d['setlist_id'] ?? 0);
    
    // Check access
    $st = $pdo->prepare("SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?");
    $st->execute([$chat_id, $uid]);
    if (!$st->fetch()) out(["error" => "Access denied"], 403);
    
    if ($message === '' && $setlist_id === 0) out(["error" => "Empty message"], 400);
    if ($setlist_id > 0 && !wp_chat_user_can_read_setlist($pdo, $setlist_id, $uid)) {
        out(["error" => "Setlist access denied"], 403);
    }
    
    $st = $pdo->prepare("INSERT INTO chat_messages (chat_id, user_id, message, setlist_id) VALUES (?, ?, ?, ?)");
    $st->execute([$chat_id, $uid, $message, $setlist_id > 0 ? $setlist_id : null]);
    $msg_id = $pdo->lastInsertId();
    
    $st = $pdo->prepare("SELECT user_id FROM chat_participants WHERE chat_id = ? AND user_id != ?");
    $st->execute([$chat_id, $uid]);
    $others = $st->fetchAll(PDO::FETCH_COLUMN);

    if ($setlist_id > 0) {
        // Copy setlist for each other participant
        $st_set = $pdo->prepare("SELECT * FROM setlists WHERE id = ?");
        $st_set->execute([$setlist_id]);
        $setlist = $st_set->fetch(PDO::FETCH_ASSOC);
        
        if ($setlist) {
            foreach ($others as $oid) {
                $st_ins = $pdo->prepare("INSERT INTO setlists (user_id, name, description, service_date, service_type, status) VALUES (?, ?, ?, ?, ?, ?)");
                $st_ins->execute([$oid, $setlist['name'] . " (Shared)", $setlist['description'], $setlist['service_date'], $setlist['service_type'], $setlist['status']]);
                $new_setlist_id = $pdo->lastInsertId();
                
                // Copy items
                $st_items = $pdo->prepare("SELECT * FROM setlist_items WHERE setlist_id = ?");
                $st_items->execute([$setlist_id]);
                $items = $st_items->fetchAll(PDO::FETCH_ASSOC);
                foreach ($items as $item) {
                    $st_item_ins = $pdo->prepare("INSERT INTO setlist_items (setlist_id, song_id, item_order, song_key, notes, custom_title, is_divider, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                    $st_item_ins->execute([$new_setlist_id, $item['song_id'], $item['item_order'], $item['song_key'], $item['notes'], $item['custom_title'], $item['is_divider'], $item['duration_seconds']]);
                }
            }
        }
    }
    
    // Send pushes
    require_once __DIR__ . '/push_service.php';
    $senderName = $_SESSION['name'] ?? $_SESSION['username'] ?? 'Someone';
    foreach ($others as $oid) {
        // Re-enable their chat if they cleared it
        $pdo->prepare("UPDATE chat_participants SET cleared_at = NULL WHERE chat_id = ? AND user_id = ?")->execute([$chat_id, $oid]);
        
        $push_title = wp_chat_compact_push_title((string)$senderName);
        $push_msg = wp_chat_compact_push_body((string)$message, $setlist_id > 0);
        wp_push_send_to_user($pdo, (int)$oid, $push_title, $push_msg, "/chat/$chat_id");
    }
    
    $st = $pdo->prepare("SELECT u.name as user_name, m.created_at FROM chat_messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?");
    $st->execute([$msg_id]);
    $res = $st->fetch(PDO::FETCH_ASSOC);
    
    out(["ok" => true, "id" => $msg_id, "user_name" => $res['user_name'], "created_at" => $res['created_at']]);
}

// 6. Create Group
if ($action === 'create_group' && $method === 'POST') {
    $d = readJson();
    $name = trim($d['name'] ?? 'Group Chat');
    $friend_ids = $d['friend_ids'] ?? []; // array of IDs
    
    if (empty($friend_ids) || !is_array($friend_ids)) out(["error" => "No friends selected"], 400);
    
    $pdo->beginTransaction();
    $st = $pdo->prepare("INSERT INTO chats (type, name, created_by) VALUES ('group', ?, ?)");
    $st->execute([$name, $uid]);
    $chat_id = $pdo->lastInsertId();
    
    $st = $pdo->prepare("INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)");
    $st->execute([$chat_id, $uid]); // add creator
    
    foreach ($friend_ids as $fid) {
        // verify friendship
        $st2 = $pdo->prepare("SELECT status FROM friends WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)) AND status = 'accepted'");
        $st2->execute([$uid, $fid, $fid, $uid]);
        if ($st2->fetch()) {
            $st->execute([$chat_id, $fid]);
        }
    }
    $pdo->commit();
    out(["ok" => true, "chat_id" => (int)$chat_id]);
}

// Get group members
if ($action === 'get_group_members' && $method === 'GET') {
    $chat_id = (int)($_GET['chat_id'] ?? 0);
    // verify participant
    $st = $pdo->prepare("SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?");
    $st->execute([$chat_id, $uid]);
    if (!$st->fetch()) out(["error" => "Access denied"], 403);

    // get type
    $st = $pdo->prepare("SELECT type, created_by FROM chats WHERE id = ?");
    $st->execute([$chat_id]);
    $chat = $st->fetch(PDO::FETCH_ASSOC);
    if (!$chat || $chat['type'] !== 'group') out(["error" => "Not a group"], 400);

    $st = $pdo->prepare("
        SELECT u.id, COALESCE(NULLIF(u.name,''), SUBSTRING_INDEX(u.email,'@',1)) as name, u.email,
               IF(u.id = ?, 1, 0) as is_creator
        FROM chat_participants cp
        JOIN users u ON u.id = cp.user_id
        WHERE cp.chat_id = ?
        ORDER BY is_creator DESC, u.name ASC
    ");
    $st->execute([(int)$chat['created_by'], $chat_id]);
    out(["ok" => true, "members" => $st->fetchAll(PDO::FETCH_ASSOC)]);
}

// Add member to group
if ($action === 'add_group_member' && $method === 'POST') {
    $d = readJson();
    $chat_id = (int)($d['chat_id'] ?? 0);
    $new_user_id = (int)($d['user_id'] ?? 0);

    // Verify requester is creator
    $st = $pdo->prepare("SELECT created_by, type FROM chats WHERE id = ?");
    $st->execute([$chat_id]);
    $chat = $st->fetch(PDO::FETCH_ASSOC);
    if (!$chat || $chat['type'] !== 'group') out(["error" => "Not a group"], 400);
    if ((int)$chat['created_by'] !== $uid) out(["error" => "Only group creator can add members"], 403);

    // Verify friendship
    $st = $pdo->prepare("SELECT 1 FROM friends WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)) AND status = 'accepted'");
    $st->execute([$uid, $new_user_id, $new_user_id, $uid]);
    if (!$st->fetch()) out(["error" => "Not friends"], 403);

    // Already in group?
    $st = $pdo->prepare("SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?");
    $st->execute([$chat_id, $new_user_id]);
    if ($st->fetch()) out(["ok" => true, "already_member" => true]);

    $pdo->prepare("INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)")->execute([$chat_id, $new_user_id]);
    out(["ok" => true]);
}

// Remove member from group
if ($action === 'remove_group_member' && $method === 'POST') {
    $d = readJson();
    $chat_id = (int)($d['chat_id'] ?? 0);
    $remove_user_id = (int)($d['user_id'] ?? 0);

    // Verify requester is creator
    $st = $pdo->prepare("SELECT created_by, type FROM chats WHERE id = ?");
    $st->execute([$chat_id]);
    $chat = $st->fetch(PDO::FETCH_ASSOC);
    if (!$chat || $chat['type'] !== 'group') out(["error" => "Not a group"], 400);
    if ((int)$chat['created_by'] !== $uid) out(["error" => "Only group creator can remove members"], 403);
    if ($remove_user_id === $uid) out(["error" => "Cannot remove yourself"], 400);

    $pdo->prepare("DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?")->execute([$chat_id, $remove_user_id]);
    out(["ok" => true]);
}

// Leave group (non-creator)
if ($action === 'leave_group' && $method === 'POST') {
    $d = readJson();
    $chat_id = (int)($d['chat_id'] ?? 0);

    $st = $pdo->prepare("SELECT created_by, type FROM chats WHERE id = ?");
    $st->execute([$chat_id]);
    $chat = $st->fetch(PDO::FETCH_ASSOC);
    if (!$chat || $chat['type'] !== 'group') out(["error" => "Not a group"], 400);
    if ((int)$chat['created_by'] === $uid) out(["error" => "Creator cannot leave. Transfer ownership or delete the group."], 403);

    // Verify participant
    $st = $pdo->prepare("SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?");
    $st->execute([$chat_id, $uid]);
    if (!$st->fetch()) out(["error" => "Not a member"], 403);

    $pdo->prepare("DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?")->execute([$chat_id, $uid]);
    out(["ok" => true]);
}

// Rename group (creator only)
if ($action === 'rename_group' && $method === 'POST') {
    $d = readJson();
    $chat_id = (int)($d['chat_id'] ?? 0);
    $new_name = trim($d['name'] ?? '');

    if (empty($new_name)) out(["error" => "Name required"], 400);

    $st = $pdo->prepare("SELECT created_by, type FROM chats WHERE id = ?");
    $st->execute([$chat_id]);
    $chat = $st->fetch(PDO::FETCH_ASSOC);
    if (!$chat || $chat['type'] !== 'group') out(["error" => "Not a group"], 400);
    if ((int)$chat['created_by'] !== $uid) out(["error" => "Only group creator can rename"], 403);

    $pdo->prepare("UPDATE chats SET name = ? WHERE id = ?")->execute([$new_name, $chat_id]);
    out(["ok" => true]);
}

out(["error" => "Invalid action"], 400);
