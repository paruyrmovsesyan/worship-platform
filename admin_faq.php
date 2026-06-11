<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';

$access = wp_admin_require_access('/admin_faq.php');
$adminUser = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'])) {
    setcookie('admin_lang', $_GET['lang'], time()+86400*30, '/');
    header('Location: ?'); exit;
}

// ── FAQ DATA FILE ──────────────────────────────────────────
$faqFile = __DIR__ . '/data/admin_faq.json';
$faqDir  = __DIR__ . '/data';
if (!is_dir($faqDir)) { mkdir($faqDir, 0755, true); }

// Load existing FAQs
$faqs = [];
if (file_exists($faqFile)) {
    $raw = file_get_contents($faqFile);
    $faqs = json_decode($raw, true) ?: [];
}

// ── HANDLE ACTIONS ────────────────────────────────────────
$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $question = trim($_POST['question'] ?? '');
        $answer   = trim($_POST['answer']   ?? '');
        if ($question && $answer) {
            $faqs[] = [
                'id'         => time() . rand(100, 999),
                'question'   => $question,
                'answer'     => $answer,
                'created_at' => date('Y-m-d H:i:s'),
            ];
            file_put_contents($faqFile, json_encode($faqs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            $message = 'FAQ item added successfully.';
            $messageType = 'success';
        } else {
            $message = 'Both question and answer are required.';
            $messageType = 'error';
        }
    }

    if ($action === 'delete') {
        $delId = (string)($_POST['id'] ?? '');
        $faqs  = array_values(array_filter($faqs, fn($f) => (string)($f['id'] ?? '') !== $delId));
        file_put_contents($faqFile, json_encode($faqs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $message = 'FAQ item deleted.';
        $messageType = 'success';
    }

    if ($action === 'edit') {
        $editId = (string)($_POST['id'] ?? '');
        $question = trim($_POST['question'] ?? '');
        $answer   = trim($_POST['answer']   ?? '');
        foreach ($faqs as &$f) {
            if ((string)($f['id'] ?? '') === $editId) {
                $f['question'] = $question;
                $f['answer']   = $answer;
                break;
            }
        }
        unset($f);
        file_put_contents($faqFile, json_encode($faqs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $message = 'FAQ item updated.';
        $messageType = 'success';
    }

    // Reload
    header('Location: /admin_faq.php' . ($message ? '?msg=' . urlencode($message) . '&type=' . $messageType : ''));
    exit;
}

// Show message from redirect
if (isset($_GET['msg'])) {
    $message = $_GET['msg'];
    $messageType = $_GET['type'] ?? 'success';
}

$editItem = null;
if (isset($_GET['edit'])) {
    $editId = (string)$_GET['edit'];
    foreach ($faqs as $f) {
        if ((string)($f['id'] ?? '') === $editId) { $editItem = $f; break; }
    }
}

$activePage = 'faq';
$searchPlaceholder = 'Search FAQ...';
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FAQ — Worship Admin</title>
  <link rel="icon" href="/wolarm_developers.png" type="image/png">
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .faq-form { background: var(--surface); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm); margin-bottom: 32px; }
    .field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .field label { font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .field input, .field textarea {
      padding: 12px 16px; border: 2px solid var(--line); border-radius: 12px;
      font-family: inherit; font-size: 15px; color: var(--text);
      outline: none; transition: border-color .15s; background: var(--bg);
    }
    .field input:focus, .field textarea:focus { border-color: var(--primary); background: white; }
    .field textarea { resize: vertical; min-height: 100px; }
    .faq-item {
      background: var(--surface); border-radius: var(--radius); padding: 20px 24px;
      margin-bottom: 12px; box-shadow: var(--shadow-sm);
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
    }
    .faq-q { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
    .faq-a { font-size: 14px; color: var(--muted); line-height: 1.6; }
  </style>
</head>
<body>
<div class="app-layout">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div class="app-content">
      <div class="page-heading page-heading-row">
        <div>
          <h1>FAQ ❓</h1>
          <p><?= count($faqs) ?> FAQ items</p>
        </div>
      </div>

      <?php if ($message): ?>
        <div style="background:<?= $messageType==='success' ? 'var(--success-bg)' : 'var(--danger-bg)' ?>; color:<?= $messageType==='success' ? 'var(--success)' : 'var(--danger)' ?>; padding:14px 20px; border-radius:12px; margin-bottom:24px; font-weight:600;">
          <?= htmlspecialchars($message) ?>
        </div>
      <?php endif; ?>

      <!-- ADD / EDIT FORM -->
      <div class="faq-form">
        <h3 style="font-size:18px; font-weight:700; margin-bottom:20px;"><?= $editItem ? 'Edit FAQ Item' : 'Add New FAQ Item' ?></h3>
        <form method="post">
          <input type="hidden" name="action" value="<?= $editItem ? 'edit' : 'add' ?>">
          <?php if ($editItem): ?>
            <input type="hidden" name="id" value="<?= htmlspecialchars((string)$editItem['id']) ?>">
          <?php endif; ?>
          <div class="field">
            <label>Question</label>
            <input type="text" name="question" required placeholder="Enter the question..." value="<?= htmlspecialchars((string)($editItem['question'] ?? '')) ?>">
          </div>
          <div class="field">
            <label>Answer</label>
            <textarea name="answer" required placeholder="Enter the answer..."><?= htmlspecialchars((string)($editItem['answer'] ?? '')) ?></textarea>
          </div>
          <div style="display:flex; gap:12px;">
            <button type="submit" class="btn btn-primary"><?= $editItem ? 'Update FAQ' : 'Add FAQ' ?></button>
            <?php if ($editItem): ?><a href="/admin_faq.php" class="btn">Cancel</a><?php endif; ?>
          </div>
        </form>
      </div>

      <!-- FAQ LIST -->
      <?php if (empty($faqs)): ?>
        <div class="card" style="text-align:center; padding:48px; color:var(--muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px; opacity:0.4;"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <p>No FAQ items yet. Add your first one above.</p>
        </div>
      <?php else: ?>
        <?php foreach ($faqs as $faq): ?>
        <div class="faq-item">
          <div style="flex:1;">
            <div class="faq-q">Q: <?= htmlspecialchars((string)($faq['question'] ?? '')) ?></div>
            <div class="faq-a">A: <?= htmlspecialchars((string)($faq['answer'] ?? '')) ?></div>
            <div style="margin-top:8px; font-size:12px; color:var(--muted);"><?= htmlspecialchars((string)($faq['created_at'] ?? '')) ?></div>
          </div>
          <div style="display:flex; gap:8px; flex-shrink:0;">
            <a href="?edit=<?= urlencode((string)($faq['id'] ?? '')) ?>" class="btn" style="padding:8px 14px; font-size:13px;">Edit</a>
            <form method="post" onsubmit="return confirm('Delete this FAQ item?')">
              <input type="hidden" name="action" value="delete">
              <input type="hidden" name="id" value="<?= htmlspecialchars((string)($faq['id'] ?? '')) ?>">
              <button type="submit" class="btn btn-danger" style="padding:8px 14px; font-size:13px;">Delete</button>
            </form>
          </div>
        </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
  </main>
</div>
</body>
</html>
