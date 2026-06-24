<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/lib/PHPMailer/inc/mailer.php';

$access = wp_admin_require_access('/admin_messages.php');
$adminUser = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$db = wp_runtime_open_mysqli();

// Auto-create table if it doesn't exist on the live server
$db->query("CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_replied TINYINT(1) DEFAULT 0,
    reply_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    replied_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'reply') {
        $msgId = (int)($_POST['id'] ?? 0);
        $replyText = trim((string)($_POST['reply_text'] ?? ''));

        if ($msgId > 0 && $replyText !== '') {
            $stmt = $db->prepare("SELECT user_name, user_email, message, is_replied FROM contact_messages WHERE id = ?");
            $stmt->bind_param('i', $msgId);
            $stmt->execute();
            $msgRow = $stmt->get_result()->fetch_assoc();

            if ($msgRow) {
                if ($msgRow['is_replied']) {
                    $message = 'This message has already been replied to.';
                    $messageType = 'error';
                } else {
                    $res = send_contact_reply_email($msgRow['user_email'], $msgRow['user_name'], $replyText, $msgRow['message']);
                    if ($res['ok']) {
                        $upStmt = $db->prepare("UPDATE contact_messages SET is_replied = 1, reply_text = ?, replied_at = NOW() WHERE id = ?");
                        $upStmt->bind_param('si', $replyText, $msgId);
                        $upStmt->execute();
                        $message = 'Reply sent successfully via email.';
                        $messageType = 'success';
                    } else {
                        $message = 'Failed to send email: ' . $res['error'];
                        $messageType = 'error';
                    }
                }
            } else {
                $message = 'Message not found.';
                $messageType = 'error';
            }
        } else {
            $message = 'Reply text cannot be empty.';
            $messageType = 'error';
        }
    }
    
    if ($action === 'delete') {
        $msgId = (int)($_POST['id'] ?? 0);
        if ($msgId > 0) {
            $delStmt = $db->prepare("DELETE FROM contact_messages WHERE id = ?");
            $delStmt->bind_param('i', $msgId);
            $delStmt->execute();
            $message = 'Message deleted successfully.';
            $messageType = 'success';
        }
    }

    header('Location: /admin_messages.php' . ($message ? '?msg=' . urlencode($message) . '&type=' . $messageType : ''));
    exit;
}

if (isset($_GET['msg'])) {
    $message = $_GET['msg'];
    $messageType = $_GET['type'] ?? 'success';
}

$messages = [];
$res = $db->query("SELECT * FROM contact_messages ORDER BY created_at DESC");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $messages[] = $row;
    }
} else {
    $message = "Database Error: " . $db->error;
    $messageType = "error";
}

$activePage = 'messages';
$searchPlaceholder = 'Search messages...';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Messages - Admin Panel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .msg-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .msg-card.unread { border-left: 4px solid var(--primary); }
    .msg-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .msg-author { font-weight: 600; font-size: 15px; color: var(--text-primary); }
    .msg-email { font-size: 13px; color: var(--muted); margin-left: 8px; }
    .msg-date { font-size: 12px; color: var(--muted); }
    .msg-body { font-size: 14px; color: var(--text-secondary); white-space: pre-wrap; margin-bottom: 16px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; }
    .msg-reply { background: rgba(0, 240, 255, 0.05); padding: 12px; border-radius: 8px; border-left: 3px solid var(--secondary); margin-bottom: 16px; }
    .msg-reply-title { font-size: 12px; font-weight: 700; color: var(--secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .msg-reply-text { font-size: 14px; color: var(--text-primary); white-space: pre-wrap; }
    
    .reply-form { margin-top: 16px; display: none; }
    .reply-form.active { display: block; }
    .reply-form textarea { width: 100%; min-height: 100px; margin-bottom: 12px; }
    .actions { display: flex; gap: 12px; }
  </style>
</head>
<body>
<div class="app-layout">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div class="app-content">
      <div class="page-heading">
        <div>
          <h1>Նամակներ 💬</h1>
          <p style="color:var(--muted); margin-top:4px;">Messages from the Contact page</p>
        </div>
      </div>

      <?php if ($message): ?>
        <div class="alert alert-<?= htmlspecialchars($messageType) ?>" style="margin-bottom: 24px;">
          <?= htmlspecialchars($message) ?>
        </div>
      <?php endif; ?>

      <?php if (count($messages) === 0): ?>
        <div style="text-align:center; padding:60px 20px; color:var(--muted); background:var(--surface); border-radius:12px; border:1px solid var(--border);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom:16px; opacity:0.5;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          <p>No messages yet.</p>
        </div>
      <?php else: ?>
        <div class="messages-list">
          <?php foreach ($messages as $msg): ?>
            <?php $isUnread = !$msg['is_replied']; ?>
            <div class="msg-card <?= $isUnread ? 'unread' : '' ?>">
              <div class="msg-header">
                <div>
                  <span class="msg-author"><?= htmlspecialchars($msg['user_name']) ?></span>
                  <span class="msg-email">(<?= htmlspecialchars($msg['user_email']) ?>)</span>
                </div>
                <div class="msg-date"><?= htmlspecialchars($msg['created_at']) ?></div>
              </div>
              
              <div class="msg-body"><?= htmlspecialchars($msg['message']) ?></div>
              
              <?php if ($msg['is_replied']): ?>
                <div class="msg-reply">
                  <div class="msg-reply-title">Պատասխանված է (<?= htmlspecialchars($msg['replied_at'] ?? '') ?>)</div>
                  <div class="msg-reply-text"><?= htmlspecialchars($msg['reply_text'] ?? '') ?></div>
                </div>
              <?php endif; ?>

              <div class="actions">
                <?php if ($isUnread): ?>
                  <button class="btn btn-primary" onclick="toggleReplyForm(<?= $msg['id'] ?>)">Պատասխանել (Reply)</button>
                <?php endif; ?>
                <form method="POST" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete this message?');">
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="id" value="<?= $msg['id'] ?>">
                  <button type="submit" class="btn btn-danger-outline">Ջնջել (Delete)</button>
                </form>
              </div>

              <?php if ($isUnread): ?>
                <form method="POST" class="reply-form" id="reply-form-<?= $msg['id'] ?>">
                  <input type="hidden" name="action" value="reply">
                  <input type="hidden" name="id" value="<?= $msg['id'] ?>">
                  <textarea name="reply_text" class="form-control" placeholder="Գրեք ձեր պատասխանը այստեղ։ Նամակը կուղարկվի օգտատիրոջ էլ. հասցեին..." required></textarea>
                  <div style="display:flex; gap:8px;">
                    <button type="submit" class="btn btn-primary">Ուղարկել նամակ</button>
                    <button type="button" class="btn" onclick="toggleReplyForm(<?= $msg['id'] ?>)">Չեղարկել</button>
                  </div>
                </form>
              <?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>

    </div>
  </main>

  <script>
    function toggleReplyForm(id) {
      const form = document.getElementById('reply-form-' + id);
      if (form) {
        form.classList.toggle('active');
        if (form.classList.contains('active')) {
          form.querySelector('textarea').focus();
        }
      }
    }
  </script>
</div>
</body>
</html>
