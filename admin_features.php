<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/features_api.php';

$access = wp_admin_require_access('/admin_features.php');
$adminUser        = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminLang        = $_COOKIE['admin_lang'] ?? 'hy';
$activePage       = 'features';

if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy', 'ru', 'en'], true)) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: ?');
    exit;
}

$catalog = wp_features_load();

$totalCount = count($catalog);
$publishedCount = 0;
$betaCount = 0;
$offCount = 0;

foreach ($catalog as $item) {
    $st = $item['status'] ?? 'published';
    if ($st === 'published') $publishedCount++;
    elseif ($st === 'beta') $betaCount++;
    else $offCount++;
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($adminLang) ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Ֆունկցիաների Լաբորատորիա — Worship Platform Admin</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .features-hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
    }
    .features-hero-title h1 {
      font-size: 1.8rem;
      font-weight: 800;
      margin: 0 0 6px 0;
      background: linear-gradient(135deg, #38bdf8, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .features-hero-title p {
      margin: 0;
      color: var(--text-muted, #94a3b8);
      font-size: 0.95rem;
    }
    .features-stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .f-stat-card {
      background: var(--card-bg, #161b2e);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .f-stat-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    .f-stat-info div {
      font-size: 0.8rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .f-stat-info strong {
      font-size: 1.6rem;
      font-weight: 800;
      color: #fff;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 18px;
    }
    .feature-card {
      background: var(--card-bg, #161b2e);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.15s ease, border-color 0.15s ease;
      position: relative;
      overflow: hidden;
    }
    .feature-card:hover {
      border-color: rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
    }
    .feature-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .feature-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 6px 0;
    }
    .feature-cat-tag {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #94a3b8;
    }
    .feature-desc {
      font-size: 0.88rem;
      color: #cbd5e1;
      line-height: 1.5;
      margin-bottom: 20px;
      flex: 1;
    }
    .feature-controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .feature-segmented-switch {
      display: flex;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      padding: 3px;
      gap: 2px;
    }
    .switch-opt {
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      background: transparent;
      color: #94a3b8;
      transition: all 0.15s ease;
    }
    .switch-opt.active-published {
      background: #10b981;
      color: #fff;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
    }
    .switch-opt.active-beta {
      background: #f59e0b;
      color: #000;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    }
    .switch-opt.active-off {
      background: #ef4444;
      color: #fff;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
    }
    .feature-test-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .feature-test-btn:hover {
      background: #38bdf8;
      color: #000;
    }
    .btn-publish-all {
      background: linear-gradient(135deg, #10b981, #059669);
      border: none;
      color: #fff;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
      transition: transform 0.15s ease;
    }
    .btn-publish-all:hover {
      transform: scale(1.02);
    }
    .live-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      margin-right: 6px;
    }
  </style>
</head>
<body class="admin-app">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <div class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <main class="app-content">
      <div class="features-hero">
        <div class="features-hero-title">
          <h1>🔬 Ֆունկցիաների Լաբորատորիա (Feature Flags & Labs)</h1>
          <p>Կառավարեք նորարարությունները, փորձարկեք դրանք և հրապարակեք մեկ սեղմումով:</p>
        </div>

        <div style="display:flex; gap:10px;">
          <button type="button" class="btn-publish-all" onclick="publishAllFeatures()">
            🚀 Վերջնական Հրապարակել Բոլորը (Live)
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="features-stats-row">
        <div class="f-stat-card">
          <div class="f-stat-icon" style="background:rgba(99,102,241,0.15); color:#818cf8;">✨</div>
          <div class="f-stat-info">
            <div>Ընդհանուր Ֆունկցիաներ</div>
            <strong><?= $totalCount ?></strong>
          </div>
        </div>

        <div class="f-stat-card">
          <div class="f-stat-icon" style="background:rgba(16,185,129,0.15); color:#10b981;">🟢</div>
          <div class="f-stat-info">
            <div>Հրապարակված (Live)</div>
            <strong id="statPublished"><?= $publishedCount ?></strong>
          </div>
        </div>

        <div class="f-stat-card">
          <div class="f-stat-icon" style="background:rgba(245,158,11,0.15); color:#f59e0b;">🧪</div>
          <div class="f-stat-info">
            <div>Beta / Փորձարկում</div>
            <strong id="statBeta"><?= $betaCount ?></strong>
          </div>
        </div>

        <div class="f-stat-card">
          <div class="f-stat-icon" style="background:rgba(239,68,68,0.15); color:#ef4444;">🔴</div>
          <div class="f-stat-info">
            <div>Անջատված (Off)</div>
            <strong id="statOff"><?= $offCount ?></strong>
          </div>
        </div>
      </div>

      <!-- Features Cards Grid -->
      <div class="features-grid">
        <?php foreach ($catalog as $id => $item): 
          $status = $item['status'] ?? 'published';
          $testUrl = $item['test_url'] ?? '/';
        ?>
        <div class="feature-card" id="card-<?= htmlspecialchars($id) ?>">
          <div>
            <div class="feature-card-top">
              <div>
                <h3 class="feature-name">
                  <?php if ($status === 'published'): ?>
                    <span class="live-indicator"></span>
                  <?php endif; ?>
                  <?= htmlspecialchars($item['title']) ?>
                </h3>
                <span class="feature-cat-tag"><?= htmlspecialchars($item['category'] ?? 'General') ?></span>
              </div>
            </div>

            <p class="feature-desc"><?= htmlspecialchars($item['description']) ?></p>
          </div>

          <div class="feature-controls-row">
            <!-- Tri-state Switch -->
            <div class="feature-segmented-switch" data-feature="<?= htmlspecialchars($id) ?>">
              <button 
                type="button" 
                class="switch-opt <?= $status === 'off' ? 'active-off' : '' ?>" 
                onclick="updateFeatureStatus('<?= htmlspecialchars($id) ?>', 'off')"
                title="Անջատել բոլորի համար"
              >
                Off
              </button>
              <button 
                type="button" 
                class="switch-opt <?= $status === 'beta' ? 'active-beta' : '' ?>" 
                onclick="updateFeatureStatus('<?= htmlspecialchars($id) ?>', 'beta')"
                title="Միայն ադմինների և թեստավորողների համար"
              >
                Beta
              </button>
              <button 
                type="button" 
                class="switch-opt <?= $status === 'published' ? 'active-published' : '' ?>" 
                onclick="updateFeatureStatus('<?= htmlspecialchars($id) ?>', 'published')"
                title="Հրապարակել բոլոր օգտատերերի համար"
              >
                Live
              </button>
            </div>

            <!-- Test Link -->
            <a href="<?= htmlspecialchars($testUrl) ?>" target="_blank" rel="noreferrer" class="feature-test-btn">
              🧪 Փորձարկել
            </a>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </main>
  </div>

  <script>
    async function updateFeatureStatus(featureId, newStatus) {
      const switchBox = document.querySelector(`.feature-segmented-switch[data-feature="${featureId}"]`);
      if (!switchBox) return;

      const buttons = switchBox.querySelectorAll('.switch-opt');
      buttons.forEach(btn => {
        btn.classList.remove('active-published', 'active-beta', 'active-off');
      });

      if (newStatus === 'published') buttons[2].classList.add('active-published');
      else if (newStatus === 'beta') buttons[1].classList.add('active-beta');
      else buttons[0].classList.add('active-off');

      try {
        const res = await fetch('/features_api.php?action=update_flag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature_id: featureId, status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          alert('Սխալ՝ ' + (data.error || 'Չհաջողվեց պահպանել'));
        }
      } catch (err) {
        console.error('Update failed:', err);
      }
    }

    async function publishAllFeatures() {
      if (!confirm('Հաստատու՞մ եք բոլոր նոր ֆունկցիաների վերջնական հրապարակումը բոլոր օգտատերերի համար:')) return;
      try {
        const res = await fetch('/features_api.php?action=publish_all', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          window.location.reload();
        } else {
          alert('Սխալ՝ ' + (data.error || 'Չհաջողվեց հրապարակել'));
        }
      } catch (err) {
        alert('Ցանցային սխալ');
      }
    }
  </script>
</body>
</html>
