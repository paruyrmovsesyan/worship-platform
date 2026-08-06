<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_faq.php');
$adminUser = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail = trim((string)($adminUser['email'] ?? ''));
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'])) {
    setcookie('admin_lang', $_GET['lang'], time()+86400*30, '/');
    header('Location: ?'); exit;
}

// ── FAQ DATA FILE ──────────────────────────────────────────
$faqFile = __DIR__ . '/data/admin_faq.json';
$faqDir  = __DIR__ . '/data';
if (!is_dir($faqDir)) { mkdir($faqDir, 0755, true); }

// Categories map
$categoriesMap = [
    'songs'    => '🎵 Երգեր & Ակորդներ',
    'setlists' => '📋 Երգացանկեր & Live Mode',
    'offline'  => '📱 Օֆլայն Ռեժիմ & Ծրագիր',
    'account'  => '🔐 Անձնական Հաշիվ & Կարգավորումներ',
    'other'    => '💬 Այլ'
];

// Default initial FAQs (if file missing or empty)
$defaultInitialFaqs = [
  ["id" => "s1", "category" => "songs", "question" => "Ինչպե՞ս փոխել երգի տոնայնությունը (տրանսպոզիցիա անել):", "answer" => "Երգի էջում սեղմեք Տոնայնության (Key) կոճակը կամ օգտագործեք + / - կոճակները: Ակորդներն ակնթարթորեն կփոխվեն Ձեր ընտրած տոնայնությանը:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "s2", "category" => "songs", "question" => "Ինչպե՞ս ավելացնել երգը «Նախընտրածներ» ցանկում:", "answer" => "Երգի էջում սեղմեք սրտիկի (♥) կոճակը: Պահպանված երգերը հասանելի կլինեն Ձեր անձնական գրադարանում նաև օֆլայն ռեժիմում:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "s3", "category" => "songs", "question" => "Ինչպե՞ս արտահանել կամ տպել երգի ակորդները:", "answer" => "Երգի էջի վերևի աջ անկյունում սեղմեք «Տպել» կամ «PDF / TXT» կոճակը` երաժիշտների համար թղթային տարբերակ ունենալու համար:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "s4", "category" => "songs", "question" => "Ի՞նչ անել, եթե երգում նկատել եմ սխալ ակորդ կամ տեքստ:", "answer" => "Սեղմեք երգի էջում գտնվող «Առաջարկել խմբագրում» կոճակը, լրացրեք ճշգրտումը և մեր ադմինները կվերանայեն այն:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "l1", "category" => "setlists", "question" => "Ինչպե՞ս ստեղծել նոր երգացանկ:", "answer" => "«Երգացանկեր» բաժնում սեղմեք «Ստեղծել Երգացանկ»: Ավելացրեք երգեր որոնման միջոցով, դասավորեք հերթականությունը և պահպանեք:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "l2", "category" => "setlists", "question" => "Ի՞նչ է Live Mode-ը և ինչպես օգտվել դրանից:", "answer" => "Live Mode-ը նախատեսված է կիրակնօրյա ծառայությունների և փորձերի համար: Այն ցույց է տալիս ակորդները մեծ տառաչափով և թույլ է տալիս արագ անցումներ կատարել երգից երգ:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "l3", "category" => "setlists", "question" => "Ինչպե՞ս կիսվել երգացանկով թիմի հետ:", "answer" => "Երգացանկի էջում սեղմեք «Կիսվել» կոճակը: Դուք կստանաք ուղիղ հղում կամ QR կոդ, որը կարող եք ուղարկել Ձեր երաժիշտներին:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "o1", "category" => "offline", "question" => "Ինչպե՞ս է աշխատում օֆլայն ռեժիմը առանց ինտերնետի:", "answer" => "Worship Platform-ն ավտոմատ պահպանում է Ձեր դիտած երգերն ու երգացանկերը սարքում: Ինտերնետ կապն անջատվելիս ծրագիրը շարունակում է աշխատել անխափան:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "o2", "category" => "offline", "question" => "Ինչպե՞ս տեղադրել ծրագիրը հեռախոսի կամ համակարգչի վրա (PWA):", "answer" => "Բրաուզերի մենյուից ընտրեք «Ավելացնել գլխավոր էկրանին» (Add to Home Screen / Install App): Ծրագիրը կտեղադրվի որպես իսկական App:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "a1", "category" => "account", "question" => "Ինչպե՞ս փոխել գաղտնաբառը կամ անձնական տվյալները:", "answer" => "Մտեք «Կարգավորումներ» բաժին: Այնտեղ կարող եք թարմացնել Ձեր անունը, էլ. հասցեն, փոխել գաղտնաբառը և կառավարել ակտիվ սեսիաները:", "created_at" => "2026-08-03 18:30:00"],
  ["id" => "a2", "category" => "account", "question" => "Ինչպե՞ս փոխել ակորդների գույնը կամ ոճը:", "answer" => "«Կարգավորումներ» -> «Ծրագրի կարգավորումներ» բաժնում կարող եք ընտրել ակորդների գույնը (Ոսկեգույն, Կապույտ, Կանաչ և այլն) և միացնել OLED Dark mode-ը:", "created_at" => "2026-08-03 18:30:00"]
];

// Load existing FAQs
$faqs = [];
if (file_exists($faqFile)) {
    $raw = file_get_contents($faqFile);
    $faqs = json_decode($raw, true) ?: [];
}

if (empty($faqs)) {
    $faqs = $defaultInitialFaqs;
    file_put_contents($faqFile, json_encode($faqs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

// ── HANDLE ACTIONS ────────────────────────────────────────
$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $question = trim($_POST['question'] ?? '');
        $answer   = trim($_POST['answer']   ?? '');
        $category = trim($_POST['category'] ?? 'songs');
        if ($question && $answer) {
            $faqs[] = [
                'id'         => time() . rand(100, 999),
                'category'   => $category,
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
        $editId   = (string)($_POST['id'] ?? '');
        $question = trim($_POST['question'] ?? '');
        $answer   = trim($_POST['answer']   ?? '');
        $category = trim($_POST['category'] ?? 'songs');
        foreach ($faqs as &$f) {
            if ((string)($f['id'] ?? '') === $editId) {
                $f['question'] = $question;
                $f['answer']   = $answer;
                $f['category'] = $category;
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
  <?php wp_admin_render_pwa_head('FAQ Management — Worship Platform Admin'); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .faq-form { background: var(--surface); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm); margin-bottom: 32px; border: 1px solid var(--line); }
    .field-grid { display: grid; grid-template-columns: 1fr 200px; gap: 16px; }
    @media (max-width: 600px) { .field-grid { grid-template-columns: 1fr; } }
    .field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .field label { font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .field input, .field select, .field textarea {
      padding: 12px 16px; border: 1.5px solid var(--line); border-radius: 12px;
      font-family: inherit; font-size: 15px; color: var(--text);
      outline: none; transition: border-color .15s; background: var(--bg);
    }
    .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--primary); background: #ffffff; }
    .field textarea { resize: vertical; min-height: 100px; }
    .faq-item {
      background: var(--surface); border-radius: var(--radius); padding: 20px 24px;
      margin-bottom: 14px; box-shadow: var(--shadow-sm); border: 1px solid var(--line);
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
    }
    .faq-cat-badge {
      display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700;
      background: rgba(0, 212, 255, 0.12); color: #00b8d4; margin-bottom: 8px;
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
          <h1>❓ FAQ & Help Center Management</h1>
          <p><?= count($faqs) ?> FAQs available in database</p>
        </div>
      </div>

      <?php if ($message): ?>
        <div style="background:<?= $messageType==='success' ? 'var(--success-bg)' : 'var(--danger-bg)' ?>; color:<?= $messageType==='success' ? 'var(--success)' : 'var(--danger)' ?>; padding:14px 20px; border-radius:12px; margin-bottom:24px; font-weight:600;">
          <?= htmlspecialchars($message) ?>
        </div>
      <?php endif; ?>

      <!-- ADD / EDIT FORM -->
      <div class="faq-form">
        <h3 style="font-size:18px; font-weight:700; margin-bottom:20px;"><?= $editItem ? '✏️ Edit FAQ Item' : '➕ Add New FAQ Item' ?></h3>
        <form method="post">
          <input type="hidden" name="action" value="<?= $editItem ? 'edit' : 'add' ?>">
          <?php if ($editItem): ?>
            <input type="hidden" name="id" value="<?= htmlspecialchars((string)$editItem['id']) ?>">
          <?php endif; ?>

          <div class="field-grid">
            <div class="field">
              <label>Question (Հարց)</label>
              <input type="text" name="question" required placeholder="Մուտքագրեք հարցը..." value="<?= htmlspecialchars((string)($editItem['question'] ?? '')) ?>">
            </div>

            <div class="field">
              <label>Category (Բաժին)</label>
              <select name="category" required>
                <?php foreach ($categoriesMap as $catKey => $catLabel): ?>
                  <option value="<?= $catKey ?>" <?= (($editItem['category'] ?? 'songs') === $catKey) ? 'selected' : '' ?>>
                    <?= htmlspecialchars($catLabel) ?>
                  </option>
                <?php endforeach; ?>
              </select>
            </div>
          </div>

          <div class="field">
            <label>Answer (Պատասխան)</label>
            <textarea name="answer" required placeholder="Մուտքագրեք պատասխանը..."><?= htmlspecialchars((string)($editItem['answer'] ?? '')) ?></textarea>
          </div>

          <div style="display:flex; gap:12px; margin-top:8px;">
            <button type="submit" class="btn btn-primary"><?= $editItem ? 'Update FAQ' : 'Add FAQ Item' ?></button>
            <?php if ($editItem): ?><a href="/admin_faq.php" class="btn"><?= __('Cancel') ?></a><?php endif; ?>
          </div>
        </form>
      </div>

      <!-- FAQ LIST -->
      <h3 style="font-size:18px; font-weight:700; margin-bottom:16px;">📋 Current FAQ Items (<?= count($faqs) ?>)</h3>
      <?php if (empty($faqs)): ?>
        <div class="card" style="text-align:center; padding:48px; color:var(--muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px; opacity:0.4;"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <p>No FAQ items yet. Add your first one above.</p>
        </div>
      <?php else: ?>
        <?php foreach ($faqs as $faq): ?>
        <div class="faq-item">
          <div style="flex:1;">
            <span class="faq-cat-badge">
              <?= htmlspecialchars($categoriesMap[$faq['category'] ?? 'songs'] ?? '🎵 Երգեր & Ակորդներ') ?>
            </span>
            <div class="faq-q">Q: <?= htmlspecialchars((string)($faq['question'] ?? '')) ?></div>
            <div class="faq-a">A: <?= htmlspecialchars((string)($faq['answer'] ?? '')) ?></div>
            <div style="margin-top:8px; font-size:12px; color:var(--muted);"><?= htmlspecialchars((string)($faq['created_at'] ?? '')) ?></div>
          </div>
          <div style="display:flex; gap:8px; flex-shrink:0;">
            <a href="?edit=<?= urlencode((string)($faq['id'] ?? '')) ?>" class="btn" style="padding:8px 14px; font-size:13px;"><?= __('Edit') ?></a>
            <form method="post" onsubmit="return confirm('Delete this FAQ item?')">
              <input type="hidden" name="action" value="delete">
              <input type="hidden" name="id" value="<?= htmlspecialchars((string)($faq['id'] ?? '')) ?>">
              <button type="submit" class="btn btn-danger" style="padding:8px 14px; font-size:13px;"><?= __('Delete') ?></button>
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
