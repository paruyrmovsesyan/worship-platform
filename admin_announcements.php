<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/mobile_service.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_announcements.php');
$adminUser        = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail       = trim((string)($adminUser['email'] ?? ''));
$adminLang        = $_COOKIE['admin_lang'] ?? 'hy';

if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy', 'ru', 'en'], true)) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: ?tab=' . urlencode((string)($_GET['tab'] ?? 'banner')));
    exit;
}

$activeTab = (string)($_GET['tab'] ?? $_POST['active_tab'] ?? 'banner');
if (!in_array($activeTab, ['banner', 'restrictions', 'maintenance', 'history'], true)) {
    $activeTab = 'banner';
}

$flashMessage = '';
$flashTone = 'success';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $formAction = (string)($_POST['form_action'] ?? 'save_all');
    $mobileConfig = wp_mobile_get_config();
    $versionConfig = wp_version_load();

    $allowedTargets = ['all', 'web_pwa', 'web', 'pwa', 'native', 'ios', 'android'];
    $allowedPages = array_keys(wp_mobile_restrictable_pages());
    $allowedFeatures = array_keys(wp_mobile_restrictable_features());

    if ($formAction === 'master_maintenance_on' || $formAction === 'master_maintenance_off') {
        $turnOn = ($formAction === 'master_maintenance_on');
        $versionConfig['maintenance_enabled'] = $turnOn;
        $mobileConfig['ios']['status'] = $turnOn ? 'maintenance' : 'live';
        $mobileConfig['android']['status'] = $turnOn ? 'maintenance' : 'live';

        $okWeb = wp_version_save($versionConfig, ['action' => 'master_maintenance', 'actor' => $adminDisplayName]);
        $okMob = wp_mobile_save_config($mobileConfig, $adminDisplayName);
        if ($okWeb && $okMob) {
            $flashMessage = $turnOn
                ? '🔴 Ամբողջ համակարգի տեխնիկական դադարը (Կայք, PWA, iOS, Android) միացվեց։'
                : '🟢 Ամբողջ համակարգը (Կայք, PWA, iOS, Android) վերադարձվեց Live ռեժիմի։';
        } else {
            $flashTone = 'error';
            $flashMessage = 'Չհաջողվեց թարմացնել կարգավորումների ֆայլերը։';
        }
    } elseif ($formAction === 'deactivate_current') {
        // Record current state in history before turning off
        if (!empty($mobileConfig['announcement']['title']) || !empty($mobileConfig['announcement']['message'])) {
            wp_mobile_record_announcement_history($mobileConfig['announcement'], $adminDisplayName, false);
        }
        $mobileConfig['announcement']['enabled'] = false;
        if (wp_mobile_save_config($mobileConfig, $adminDisplayName)) {
            $flashMessage = '⏹️ Ընթացիկ հայտարարությունն անջատվեց (այն պահպանված է պատմության մեջ)։';
        } else {
            $flashTone = 'error';
            $flashMessage = 'Չհաջողվեց անջատել հայտարարությունը։';
        }
    } elseif ($formAction === 'activate_from_history') {
        $historyId = trim((string)($_POST['history_id'] ?? ''));
        $histItem = wp_mobile_find_announcement_history($historyId);
        if ($histItem === null) {
            $flashTone = 'error';
            $flashMessage = 'Պատմության գրառումը չգտնվեց։';
        } else {
            // Archive current announcement first if it had distinct content
            if (!empty($mobileConfig['announcement']['title']) || !empty($mobileConfig['announcement']['message'])) {
                wp_mobile_record_announcement_history($mobileConfig['announcement'], $adminDisplayName, false);
            }

            $startRaw = wp_version_normalize_datetime($histItem['schedule_start_at'] ?? '');
            $endRaw = wp_version_normalize_datetime($histItem['schedule_end_at'] ?? '');
            $expiredCleared = false;
            if ($endRaw !== '') {
                try {
                    $tz = wp_version_admin_timezone();
                    $nowTs = (new DateTimeImmutable('now', $tz))->getTimestamp();
                    $endTs = (new DateTimeImmutable($endRaw, $tz))->getTimestamp();
                    if ($endTs <= $nowTs) {
                        $startRaw = '';
                        $endRaw = '';
                        $expiredCleared = true;
                    }
                } catch (Throwable $_) {}
            }

            $mobileConfig['announcement'] = [
                'enabled'               => true,
                'target'                => in_array($histItem['target'] ?? '', $allowedTargets, true) ? $histItem['target'] : 'all',
                'type'                  => in_array($histItem['type'] ?? '', ['info', 'warning', 'success', 'critical'], true) ? $histItem['type'] : 'info',
                'title'                 => trim((string)($histItem['title'] ?? '')),
                'message'               => trim((string)($histItem['message'] ?? '')),
                'title_ru'              => trim((string)($histItem['title_ru'] ?? '')),
                'message_ru'            => trim((string)($histItem['message_ru'] ?? '')),
                'title_en'              => trim((string)($histItem['title_en'] ?? '')),
                'message_en'            => trim((string)($histItem['message_en'] ?? '')),
                'action_text'           => trim((string)($histItem['action_text'] ?? '')),
                'action_url'            => trim((string)($histItem['action_url'] ?? '')),
                'dismissible'           => !isset($histItem['dismissible']) || !empty($histItem['dismissible']),
                'show_countdown'        => !empty($histItem['show_countdown']),
                'sync_with_maintenance' => !empty($histItem['sync_with_maintenance']),
                'schedule_start_at'     => $startRaw,
                'schedule_end_at'       => $endRaw,
                'restricted_pages'      => array_values(array_intersect($allowedPages, array_map('strval', (array)($histItem['restricted_pages'] ?? [])))),
                'restricted_features'   => array_values(array_intersect($allowedFeatures, array_map('strval', (array)($histItem['restricted_features'] ?? [])))),
            ];

            if (wp_mobile_save_config($mobileConfig, $adminDisplayName, false)) {
                $flashMessage = '🚀 Հայտարարությունը պատմությունից հաջողությամբ ակտիվացվեց։'
                    . ($expiredCleared ? ' (Նախկին ավարտված ժամանակացույցը մաքրվեց անմիջապես ակտիվացնելու համար)' : '');
            } else {
                $flashTone = 'error';
                $flashMessage = 'Սխալ հայտարարության ակտիվացման ժամանակ։';
            }
        }
    } elseif ($formAction === 'delete_history_item') {
        $historyId = trim((string)($_POST['history_id'] ?? ''));
        if (wp_mobile_delete_announcement_history($historyId)) {
            $flashMessage = '🗑️ Պատմության գրառումը ջնջվեց։';
        } else {
            $flashTone = 'error';
            $flashMessage = 'Չհաջողվեց ջնջել պատմության գրառումը։';
        }
    } else {
        // Save announcement + restrictions + maintenance settings together
        $rawRestrictedPages = isset($_POST['restricted_pages']) && is_array($_POST['restricted_pages'])
            ? array_map('strval', $_POST['restricted_pages'])
            : [];
        $rawRestrictedFeatures = isset($_POST['restricted_features']) && is_array($_POST['restricted_features'])
            ? array_map('strval', $_POST['restricted_features'])
            : [];

        $editingHistoryId = trim((string)($_POST['editing_history_id'] ?? ''));
        $submittedTitle   = trim((string)($_POST['announcement_title'] ?? ''));
        $submittedMessage = trim((string)($_POST['announcement_message'] ?? ''));
        $submittedPages   = array_values(array_intersect($allowedPages, $rawRestrictedPages));
        $submittedFeats   = array_values(array_intersect($allowedFeatures, $rawRestrictedFeatures));
        $hasNewAnnouncementInput = ($submittedTitle !== '' || $submittedMessage !== '' || !empty($submittedPages) || !empty($submittedFeats));

        $recordHistoryOnSave = true;
        $forceNewHistory = false;
        $wasEditedInPlace = false;

        if ($hasNewAnnouncementInput) {
            $newAnn = [
                'enabled'               => !empty($_POST['announcement_enabled']),
                'target'                => in_array($_POST['announcement_target'] ?? '', $allowedTargets, true) ? $_POST['announcement_target'] : 'all',
                'type'                  => in_array($_POST['announcement_type'] ?? '', ['info', 'warning', 'success', 'critical'], true) ? $_POST['announcement_type'] : 'info',
                'title'                 => $submittedTitle,
                'message'               => $submittedMessage,
                'title_ru'              => trim((string)($_POST['announcement_title_ru'] ?? '')),
                'message_ru'            => trim((string)($_POST['announcement_message_ru'] ?? '')),
                'title_en'              => trim((string)($_POST['announcement_title_en'] ?? '')),
                'message_en'            => trim((string)($_POST['announcement_message_en'] ?? '')),
                'action_text'           => trim((string)($_POST['announcement_action_text'] ?? '')),
                'action_url'            => trim((string)($_POST['announcement_action_url'] ?? '')),
                'dismissible'           => !empty($_POST['announcement_dismissible']),
                'show_countdown'        => !empty($_POST['announcement_show_countdown']),
                'sync_with_maintenance' => !empty($_POST['announcement_sync_with_maintenance']),
                'schedule_start_at'     => wp_version_normalize_datetime($_POST['announcement_schedule_start_at'] ?? ''),
                'schedule_end_at'       => wp_version_normalize_datetime($_POST['announcement_schedule_end_at'] ?? ''),
                'restricted_pages'      => $submittedPages,
                'restricted_features'   => $submittedFeats,
            ];

            if ($editingHistoryId !== '') {
                $oldHistItem = wp_mobile_find_announcement_history($editingHistoryId);
                if ($oldHistItem !== null) {
                    $oldHash = (string)($oldHistItem['content_hash'] ?? wp_mobile_announcement_content_hash($oldHistItem));
                    $currHash = wp_mobile_announcement_content_hash($mobileConfig['announcement'] ?? []);
                    wp_mobile_update_announcement_history($editingHistoryId, $newAnn, $adminDisplayName);
                    $wasEditedInPlace = true;
                    $recordHistoryOnSave = false;
                    // Update active announcement if we were editing the currently loaded announcement or if enabled is checked
                    if ($oldHash === $currHash || !empty($newAnn['enabled'])) {
                        $mobileConfig['announcement'] = $newAnn;
                    }
                } else {
                    $mobileConfig['announcement'] = $newAnn;
                    $forceNewHistory = true;
                }
            } else {
                $mobileConfig['announcement'] = $newAnn;
                $forceNewHistory = true;
            }
        } else {
            $mobileConfig['announcement']['sync_with_maintenance'] = !empty($_POST['announcement_sync_with_maintenance']);
            $recordHistoryOnSave = false;
        }

        // Unified Maintenance settings (Web/PWA + Native iOS/Android)
        $versionConfig['maintenance_enabled']     = !empty($_POST['web_maintenance_enabled']);
        $webMaintMsg = trim((string)($_POST['web_maintenance_message'] ?? ''));
        if ($webMaintMsg !== '') {
            $versionConfig['maintenance_message'] = $webMaintMsg;
        }
        $versionConfig['maintenance_start_at']    = wp_version_normalize_datetime($_POST['web_maintenance_start_at'] ?? '');
        $versionConfig['maintenance_end_at']      = wp_version_normalize_datetime($_POST['web_maintenance_end_at'] ?? '');
        $versionConfig['maintenance_allowed_ips'] = trim((string)($_POST['web_maintenance_allowed_ips'] ?? ''));

        $mobileConfig['ios']['status']              = in_array($_POST['ios_status'] ?? '', ['live', 'review', 'maintenance'], true) ? $_POST['ios_status'] : ($mobileConfig['ios']['status'] ?? 'live');
        $mobileConfig['ios']['maintenance_title']   = trim((string)($_POST['ios_maintenance_title'] ?? ($mobileConfig['ios']['maintenance_title'] ?? '')));
        $mobileConfig['ios']['maintenance_message'] = trim((string)($_POST['ios_maintenance_message'] ?? ($mobileConfig['ios']['maintenance_message'] ?? '')));

        $mobileConfig['android']['status']              = in_array($_POST['android_status'] ?? '', ['live', 'review', 'maintenance'], true) ? $_POST['android_status'] : ($mobileConfig['android']['status'] ?? 'live');
        $mobileConfig['android']['maintenance_title']   = trim((string)($_POST['android_maintenance_title'] ?? ($mobileConfig['android']['maintenance_title'] ?? '')));
        $mobileConfig['android']['maintenance_message'] = trim((string)($_POST['android_maintenance_message'] ?? ($mobileConfig['android']['maintenance_message'] ?? '')));

        $okMob = wp_mobile_save_config($mobileConfig, $adminDisplayName, $forceNewHistory, $recordHistoryOnSave);
        $okWeb = wp_version_save($versionConfig, ['action' => 'save_announcements_command_center', 'actor' => $adminDisplayName]);
        if ($okMob && $okWeb) {
            if ($wasEditedInPlace) {
                $flashMessage = '✏️ Հայտարարությունը հաջողությամբ խմբագրվեց և թարմացվեց (մուտքագրման դաշտերը մաքրվեցին)։';
            } elseif ($hasNewAnnouncementInput) {
                $flashMessage = '✅ Հայտարարությունը պահպանվեց պատմության մեջ, իսկ մուտքագրման դաշտերը մաքրվեցին։';
            } else {
                $flashMessage = '✅ Կարգավորումները հաջողությամբ պահպանվեցին։';
            }
        } else {
            $flashTone = 'error';
            $flashMessage = 'Սխալ պահպանման ընթացքում։ Ստուգեք գրման իրավունքները։';
        }
    }
}

$mobileConfig = wp_mobile_get_config();
$versionConfig = wp_version_load();
$ann = $mobileConfig['announcement'] ?? [];
$annHistory = wp_mobile_get_announcement_history();
$currentAnnHash = wp_mobile_announcement_content_hash($ann);
$isAnnNowActive = wp_mobile_is_announcement_active($ann, $versionConfig);
$isWebMaintActive = wp_version_is_maintenance_active($versionConfig);
$iosStatus = (string)($mobileConfig['ios']['status'] ?? 'live');
$androidStatus = (string)($mobileConfig['android']['status'] ?? 'live');

$restrictablePages = wp_mobile_restrictable_pages();
$restrictableFeatures = wp_mobile_restrictable_features();
$activeRestrictedPages = $isAnnNowActive ? (array)($ann['restricted_pages'] ?? []) : [];
$activeRestrictedFeatures = $isAnnNowActive ? (array)($ann['restricted_features'] ?? []) : [];

// Form fields always start clean after saving so lines are cleared for new announcements
$formAnn = [
    'enabled' => true,
    'dismissible' => true,
    'show_countdown' => false,
    'sync_with_maintenance' => !empty($ann['sync_with_maintenance']),
    'target' => 'all',
    'type' => 'info',
    'title' => '',
    'message' => '',
    'title_ru' => '',
    'message_ru' => '',
    'title_en' => '',
    'message_en' => '',
    'action_text' => '',
    'action_url' => '',
    'schedule_start_at' => '',
    'schedule_end_at' => '',
];
$selectedPages = [];
$selectedFeatures = [];

$pageGroups = [
    'Հիմնական բաժիններ' => ['/songs', '/song', '/setlists', '/bible', '/church', '/media', '/news'],
    'Ստուդիա և Բեմ' => ['/studio', '/service-planner', '/transpose', '/projection'],
    'Համայնք և Գործողություններ' => ['/favorites', '/friends', '/chats', '/song-request'],
];

$featureGroups = [
    'Pro Studio և Բեմ' => ['pro_studio', 'live_stage_follower', 'rehearsal_stems', 'lyrics_projection', 'worship_ai_studio', 'service_planner', 'smart_metronome'],
    'Երգարան, Չաթ և Օֆլայն' => ['chord_chart_transpose_capo', 'audio_calls', 'setlists_sync', 'offline_mode', 'song_lyrics_copy', 'setlist_creation', 'chat_messaging', 'song_requests_submit'],
];

$targetLabels = [
    'all' => '🌐 Ամբողջ համակարգը',
    'web_pwa' => '🖥️ Կայք և PWA',
    'web' => '🌍 Միայն Կայք',
    'pwa' => '📲 Միայն PWA',
    'native' => '📱 iOS և Android',
    'ios' => '🍏 Միայն iOS',
    'android' => '🤖 Միայն Android',
];

$typeLabels = [
    'info' => ['label' => 'ℹ️ Տեղեկատվական', 'cls' => 'ac-badge--on'],
    'warning' => ['label' => '⚠️ Վերազինում', 'cls' => 'ac-badge--warn'],
    'success' => ['label' => '✅ Թարմացում', 'cls' => 'ac-badge--on'],
    'critical' => ['label' => '🚨 Հրատապ', 'cls' => 'ac-badge--danger'],
];

$renderHistoryCard = static function () use ($annHistory, $currentAnnHash, $isAnnNowActive, $ann, $targetLabels, $typeLabels, $restrictablePages, $restrictableFeatures): void {
    ?>
    <div class="ac-card">
      <div class="ac-card-head">
        <div>
          <div class="ac-card-title">📜 Հայտարարությունների Պատմություն (<?= count($annHistory) ?>)</div>
          <div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">Բոլոր պահպանված հայտարարությունները․ կարող եք ցանկացած հին հայտարարության հիման վրա ստեղծել նորը (բեռնել ձևի մեջ, խմբագրել) կամ մեկ սեղմումով նորից ակտիվացնել։</div>
        </div>
      </div>

      <?php if (empty($annHistory)): ?>
        <div style="padding:26px; text-align:center; color:var(--muted); font-size:0.9rem; background:var(--bg); border:1px dashed var(--line); border-radius:12px;">
          Պահպանված հայտարարությունների պատմություն դեռ չկա։ Երբ պահպանեք կամ ակտիվացնեք հայտարարություն, այն ավտոմատ կհայտնվի այստեղ։
        </div>
      <?php else: ?>
        <div class="ac-history-list">
          <?php foreach ($annHistory as $hItem):
            $hId = (string)($hItem['id'] ?? '');
            $hHash = (string)($hItem['content_hash'] ?? wp_mobile_announcement_content_hash($hItem));
            $isCurrentMatch = ($hHash === $currentAnnHash) && (trim((string)($ann['title'] ?? '')) !== '' || trim((string)($ann['message'] ?? '')) !== '');
            $isItemExpired = wp_mobile_is_announcement_expired($hItem);
            $hType = (string)($hItem['type'] ?? 'info');
            $hTypeMeta = $typeLabels[$hType] ?? $typeLabels['info'];
            $hTarget = (string)($hItem['target'] ?? 'all');
            $hTargetLabel = $targetLabels[$hTarget] ?? $targetLabels['all'];
            $hPages = array_values(array_filter((array)($hItem['restricted_pages'] ?? [])));
            $hFeatures = array_values(array_filter((array)($hItem['restricted_features'] ?? [])));
            $hHasRu = trim((string)($hItem['title_ru'] ?? '')) !== '' || trim((string)($hItem['message_ru'] ?? '')) !== '';
            $hHasEn = trim((string)($hItem['title_en'] ?? '')) !== '' || trim((string)($hItem['message_en'] ?? '')) !== '';
          ?>
            <div class="ac-history-item <?= ($isCurrentMatch && $isAnnNowActive) ? 'is-current' : '' ?>">
              <div style="flex:1; min-width:260px;">
                <div class="ac-history-meta">
                  <?php if ($isCurrentMatch && $isAnnNowActive): ?>
                    <span class="ac-badge ac-badge--on">● Այժմ Ակտիվ է</span>
                  <?php elseif ($isItemExpired): ?>
                    <span class="ac-badge ac-badge--off">⏹️ Ժամկետը լրացած (Ապաակտիվացված)</span>
                  <?php elseif ($isCurrentMatch && !empty($ann['enabled'])): ?>
                    <span class="ac-badge ac-badge--warn">⏳ Պլանավորված</span>
                  <?php else: ?>
                    <span class="ac-badge ac-badge--off">○ Ապաակտիվացված</span>
                  <?php endif; ?>
                  <span class="ac-badge <?= htmlspecialchars($hTypeMeta['cls']) ?>"><?= htmlspecialchars($hTypeMeta['label']) ?></span>
                  <span class="ac-badge ac-badge--off"><?= htmlspecialchars($hTargetLabel) ?></span>
                  <?php if (!empty($hPages) || !empty($hFeatures)): ?>
                    <span class="ac-badge ac-badge--warn">🔒 <?= count($hPages) ?> էջ · <?= count($hFeatures) ?> ֆունկցիա</span>
                  <?php endif; ?>
                  <?php if ($hHasRu): ?><span class="ac-badge ac-badge--off">🇷🇺 RU</span><?php endif; ?>
                  <?php if ($hHasEn): ?><span class="ac-badge ac-badge--off">🇺🇸 EN</span><?php endif; ?>
                </div>

                <h4 class="ac-history-title"><?= htmlspecialchars(($hItem['title'] ?? '') !== '' ? (string)$hItem['title'] : '— Առանց վերնագրի —') ?></h4>
                <p class="ac-history-msg"><?= htmlspecialchars((string)($hItem['message'] ?? '')) ?></p>

                <?php if (!empty($hPages) || !empty($hFeatures)): ?>
                  <div style="font-size:0.76rem; color:var(--muted); margin-bottom:8px;">
                    <?php if (!empty($hPages)): ?>
                      <div><strong>Փակ էջեր՝</strong> <?= htmlspecialchars(implode(', ', array_map(static fn($p) => $restrictablePages[$p] ?? $p, $hPages))) ?></div>
                    <?php endif; ?>
                    <?php if (!empty($hFeatures)): ?>
                      <div><strong>Փակ ֆունկցիաներ՝</strong> <?= htmlspecialchars(implode(', ', array_map(static fn($f) => $restrictableFeatures[$f] ?? $f, $hFeatures))) ?></div>
                    <?php endif; ?>
                  </div>
                <?php endif; ?>

                <div class="ac-history-foot">
                  <span>🕒 Պահպանվել է՝ <?= htmlspecialchars((string)($hItem['updated_at'] ?? $hItem['created_at'] ?? '')) ?></span>
                  <?php if (!empty($hItem['actor'])): ?>
                    <span>👤 <?= htmlspecialchars((string)$hItem['actor']) ?></span>
                  <?php endif; ?>
                  <?php if (!empty($hItem['action_text'])): ?>
                    <span>🔗 Կոճակ՝ <?= htmlspecialchars((string)$hItem['action_text']) ?> (<?= htmlspecialchars((string)($hItem['action_url'] ?? '')) ?>)</span>
                  <?php endif; ?>
                  <?php if (!empty($hItem['schedule_start_at']) || !empty($hItem['schedule_end_at'])): ?>
                    <span>📅 <?= htmlspecialchars((string)($hItem['schedule_start_at'] ?: '—')) ?> → <?= htmlspecialchars((string)($hItem['schedule_end_at'] ?: '—')) ?></span>
                  <?php endif; ?>
                </div>
              </div>

              <div class="ac-history-actions">
                <button type="button" class="ac-btn ac-btn--primary ac-btn--sm" onclick="wpEditFromHistory('<?= htmlspecialchars($hId, ENT_QUOTES) ?>')">✏️ Խմբագրել</button>
                <button type="button" class="ac-btn ac-btn--ghost ac-btn--sm" onclick="wpCloneFromHistory('<?= htmlspecialchars($hId, ENT_QUOTES) ?>')">📋 Նորը՝ սրա հիման վրա</button>
                <?php if ($isCurrentMatch && $isAnnNowActive): ?>
                  <button type="button" class="ac-btn ac-btn--danger ac-btn--sm" onclick="wpSubmitMasterAction('deactivate_current', 'Ապաակտիվացնե՞լ այս հայտարարությունը։')">⏹️ Ապաակտիվացնել</button>
                <?php else: ?>
                  <button type="button" class="ac-btn ac-btn--success ac-btn--sm" onclick="wpActivateHistoryItem('<?= htmlspecialchars($hId, ENT_QUOTES) ?>')">🚀 Ակտիվացնել հիմա</button>
                <?php endif; ?>
                <button type="button" class="ac-btn ac-btn--danger ac-btn--sm" onclick="wpDeleteHistoryItem('<?= htmlspecialchars($hId, ENT_QUOTES) ?>')" title="Ջնջել պատմությունից">🗑️</button>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
    <?php
};
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($adminLang) ?>">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Հայտարարություններ, Սահմանափակումներ և Դադար — Worship Admin</title>
  <link rel="icon" type="image/png" href="/favicon.png?v=2" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .ac-hero { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; margin-bottom:22px; }
    .ac-title { font-size:1.75rem; font-weight:800; color:var(--text); letter-spacing:-0.02em; margin:0 0 6px; }
    .ac-sub { color:var(--muted); font-size:0.9rem; margin:0; max-width:740px; }
    .ac-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-bottom:22px; }
    .ac-stat { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:16px 18px; }
    .ac-stat-label { font-size:0.78rem; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px; }
    .ac-stat-val { font-size:1.25rem; font-weight:800; color:var(--text); }
    .ac-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; font-size:0.76rem; font-weight:700; }
    .ac-badge--on { background:rgba(5,205,153,0.16); color:#05cd99; }
    .ac-badge--warn { background:rgba(247,181,0,0.16); color:#f7b500; }
    .ac-badge--off { background:rgba(148,163,184,0.16); color:var(--muted); }
    .ac-badge--danger { background:rgba(238,93,80,0.16); color:#ee5d50; }
    .ac-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; border-bottom:1px solid var(--line); padding-bottom:12px; }
    .ac-tab { padding:9px 16px; border-radius:10px; border:1px solid var(--line); background:var(--surface); color:var(--muted); font-weight:600; font-size:0.88rem; cursor:pointer; transition:all .16s ease; }
    .ac-tab.is-active { background:var(--primary); color:#fff; border-color:var(--primary); box-shadow:0 4px 14px rgba(67,24,255,0.28); }
    .ac-card { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:22px; margin-bottom:20px; }
    .ac-card-head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px; padding-bottom:14px; border-bottom:1px solid var(--line); }
    .ac-card-title { font-size:1.08rem; font-weight:800; color:var(--text); display:flex; align-items:center; gap:8px; }
    .ac-grid-2 { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; }
    .ac-grid-3 { display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:12px; }
    .ac-field { display:flex; flex-direction:column; gap:6px; }
    .ac-label { font-size:0.8rem; font-weight:700; color:var(--muted); }
    .ac-input, .ac-select, .ac-textarea { width:100%; background:var(--bg); border:1px solid var(--line); color:var(--text); border-radius:10px; padding:10px 13px; font-size:0.9rem; font-family:inherit; box-sizing:border-box; }
    .ac-input:focus, .ac-select:focus, .ac-textarea:focus { outline:none; border-color:var(--primary); }
    .ac-toggle { display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--bg); border:1px solid var(--line); border-radius:12px; }
    .ac-switch { position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; }
    .ac-switch input { opacity:0; width:0; height:0; }
    .ac-slider { position:absolute; inset:0; background:var(--muted); border-radius:999px; transition:.25s; cursor:pointer; }
    .ac-slider:before { content:""; position:absolute; width:18px; height:18px; left:3px; bottom:3px; border-radius:50%; background:#fff; transition:.25s; }
    .ac-switch input:checked + .ac-slider { background:var(--primary); }
    .ac-switch input:checked + .ac-slider:before { transform:translateX(20px); }
    .ac-check-card { display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--bg); border:1px solid var(--line); border-radius:11px; cursor:pointer; transition:border-color .15s; }
    .ac-check-card:hover { border-color:var(--primary); }
    .ac-check-card input { width:16px; height:16px; accent-color:var(--primary); flex-shrink:0; }
    .ac-btn { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:10px; font-weight:700; font-size:0.88rem; border:1px solid transparent; cursor:pointer; text-decoration:none; }
    .ac-btn--primary { background:var(--primary); color:#fff; }
    .ac-btn--ghost { background:var(--bg); color:var(--text); border-color:var(--line); }
    .ac-btn--danger { background:rgba(238,93,80,0.16); color:#ee5d50; border-color:rgba(238,93,80,0.35); }
    .ac-btn--success { background:rgba(5,205,153,0.16); color:#05cd99; border-color:rgba(5,205,153,0.35); }
    .ac-preview-box { background:linear-gradient(165deg, rgba(22,24,36,0.96) 0%, rgba(13,14,22,0.99) 100%); border:1px solid rgba(0,212,255,0.42); color:#fff; border-radius:18px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.14), 0 14px 30px rgba(0,0,0,0.35); }
    .ac-preview-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; background:#7ee8ff; box-shadow:0 0 10px #7ee8ff; }
    .ac-panel { display:none; }
    .ac-panel.is-visible { display:block; }
    .ac-flash { padding:14px 18px; border-radius:12px; margin-bottom:18px; font-weight:700; background:rgba(5,205,153,0.14); border:1px solid rgba(5,205,153,0.35); color:#05cd99; }
    .ac-flash.is-error { background:rgba(238,93,80,0.14); border-color:rgba(238,93,80,0.35); color:#ee5d50; }
    .ac-history-list { display:flex; flex-direction:column; gap:12px; }
    .ac-history-item { background:var(--bg); border:1px solid var(--line); border-radius:14px; padding:16px 18px; display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; transition:border-color .18s ease, box-shadow .18s ease; }
    .ac-history-item:hover { border-color:var(--primary); }
    .ac-history-item.is-current { border-color:rgba(5,205,153,0.55); box-shadow:0 0 0 1px rgba(5,205,153,0.25); }
    .ac-history-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
    .ac-history-title { font-size:1rem; font-weight:800; color:var(--text); margin:0 0 4px; }
    .ac-history-msg { font-size:0.86rem; color:var(--muted); margin:0 0 8px; line-height:1.48; white-space:pre-line; }
    .ac-history-foot { display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:0.76rem; color:var(--muted); }
    .ac-history-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex-shrink:0; }
    .ac-btn--sm { padding:7px 12px; font-size:0.8rem; border-radius:9px; }
    @keyframes acHighlightPulse {
      0% { box-shadow: 0 0 0 0 rgba(67, 24, 255, 0.55); border-color: var(--primary); }
      70% { box-shadow: 0 0 0 10px rgba(67, 24, 255, 0); border-color: var(--primary); }
      100% { box-shadow: 0 0 0 0 rgba(67, 24, 255, 0); }
    }
    .ac-card.is-cloned-highlight { animation: acHighlightPulse 1.4s ease; }
  </style>
</head>
<body class="wp-admin-app">
<div class="app-layout">
  <?php
    $activePage = 'announcements';
    include __DIR__ . '/admin_sidebar.php';
  ?>

  <main class="app-main">
    <?php
      $searchPlaceholder = 'Որոնել...';
      include __DIR__ . '/admin_topbar.php';
    ?>

    <div style="padding: 26px 34px 70px; max-width: 1380px; width: 100%; box-sizing: border-box;">
      <?php if ($flashMessage !== ''): ?>
        <div class="ac-flash <?= $flashTone === 'error' ? 'is-error' : '' ?>"><?= htmlspecialchars($flashMessage) ?></div>
      <?php endif; ?>

      <div class="ac-hero">
        <div>
          <h1 class="ac-title">📢 Հայտարարություններ, Սահմանափակումներ և Դադար</h1>
          <p class="ac-sub">Ամբողջական կառավարման կենտրոն՝ Կայքի, PWA-ի, iOS-ի և Android-ի համար․ հայտարարությունների պլանավորում, պատմության պահպանում, հնի հիման վրա նորի ստեղծում, ըստ էջերի ու ֆունկցիաների սահմանափակում և տեխնիկական դադարի միասնական կառավարում։</p>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <?php if ($isAnnNowActive || !empty($ann['enabled'])): ?>
            <button type="button" class="ac-btn ac-btn--danger" onclick="wpSubmitMasterAction('deactivate_current', 'Ապաակտիվացնե՞լ ընթացիկ հայտարարությունը (այն կմնա պատմության մեջ)։');">⏹️ Ապաակտիվացնել ընթացիկը</button>
          <?php endif; ?>
          <button type="button" class="ac-btn ac-btn--primary" onclick="document.getElementById('acFormAction').value='save_all'; document.getElementById('acMainForm').submit();">💾 Պահպանել</button>
        </div>
      </div>

      <!-- STATUS SUMMARY -->
      <div class="ac-stats">
        <div class="ac-stat">
          <div class="ac-stat-label">Հայտարարություն</div>
          <div class="ac-stat-val">
            <?php if ($isAnnNowActive): ?>
              <span class="ac-badge ac-badge--on">● Ակտիվ է</span>
            <?php elseif (!empty($ann['enabled'])): ?>
              <span class="ac-badge ac-badge--warn">⏳ Պլանավորված / Սպասման մեջ</span>
            <?php else: ?>
              <span class="ac-badge ac-badge--off">○ Անջատված է</span>
            <?php endif; ?>
          </div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat-label">Ակտիվ Սահմանափակումներ</div>
          <div class="ac-stat-val"><?= count($activeRestrictedPages) ?> էջ · <?= count($activeRestrictedFeatures) ?> ֆունկցիա</div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat-label">Կայք և PWA Դադար</div>
          <div class="ac-stat-val">
            <span class="ac-badge <?= $isWebMaintActive ? 'ac-badge--danger' : 'ac-badge--on' ?>">
              <?= $isWebMaintActive ? '🔴 Դադարի մեջ է' : '🟢 Աշխատում է' ?>
            </span>
          </div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat-label">Պահպանված Պատմություն</div>
          <div class="ac-stat-val"><?= count($annHistory) ?> հայտարարություն</div>
        </div>
      </div>

      <!-- SECTION TABS -->
      <div class="ac-tabs" role="tablist">
        <button type="button" id="acTabBtnBanner" class="ac-tab <?= $activeTab === 'banner' ? 'is-active' : '' ?>" onclick="wpSwitchAcTab('banner', this)">📢 1. Հայտարարություն, Բաններ և Պլանավորում</button>
        <button type="button" id="acTabBtnRestrictions" class="ac-tab <?= $activeTab === 'restrictions' ? 'is-active' : '' ?>" onclick="wpSwitchAcTab('restrictions', this)">🔒 2. Էջերի և Ֆունկցիաների Սահմանափակում</button>
        <button type="button" id="acTabBtnMaintenance" class="ac-tab <?= $activeTab === 'maintenance' ? 'is-active' : '' ?>" onclick="wpSwitchAcTab('maintenance', this)">🛠️ 3. Միասնական Տեխնիկական Աշխատանքներ</button>
        <button type="button" id="acTabBtnHistory" class="ac-tab <?= $activeTab === 'history' ? 'is-active' : '' ?>" onclick="wpSwitchAcTab('history', this)">📜 4. Հայտարարությունների Պատմություն (<?= count($annHistory) ?>)</button>
      </div>

      <form id="acMainForm" method="POST">
        <input type="hidden" name="form_action" id="acFormAction" value="save_all" />
        <input type="hidden" name="active_tab" id="acActiveTabInput" value="<?= htmlspecialchars($activeTab) ?>" />
        <input type="hidden" name="history_id" id="acHistoryIdInput" value="" />
        <input type="hidden" name="editing_history_id" id="acEditingHistoryIdInput" value="" />

        <!-- TAB 1: BANNER & SCHEDULING -->
        <section id="acPanelBanner" class="ac-panel <?= $activeTab === 'banner' ? 'is-visible' : '' ?>">
          <div class="ac-card">
            <div class="ac-card-head">
              <div class="ac-card-title">⚡ Արագ Ձևանմուշներ և Live Նախադիտում</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpApplyPreset('upgrade')">🛠️ Վերազինում</button>
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpApplyPreset('partial')">🔒 Մասնակի սահմանափակում</button>
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpApplyPreset('update')">🚀 Նոր թարմացում</button>
              </div>
            </div>

            <div class="ac-preview-box" id="acLivePreview">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                  <div class="ac-preview-dot" id="acPrevDot"></div>
                  <div id="acPrevTitle" style="font-weight:800; font-size:0.9rem; color:#7ee8ff; line-height:1.25;"><?= htmlspecialchars($formAnn['title'] ?: 'Հայտարարության վերնագիր') ?></div>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                  <span id="acPrevCountdown" style="display:<?= !empty($formAnn['show_countdown']) ? 'inline-flex' : 'none' ?>; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:rgba(0,212,255,0.16); border:1px solid rgba(0,212,255,0.38); color:#fff; font-size:0.74rem; font-weight:700; font-variant-numeric:tabular-nums;">⏳ 01:45:00</span>
                  <span id="acPrevClose" style="display:<?= (!isset($formAnn['dismissible']) || !empty($formAnn['dismissible'])) ? 'inline-flex' : 'none' ?>; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); color:rgba(255,255,255,0.85); font-size:0.76rem;">✕</span>
                </div>
              </div>
              <div id="acPrevMsg" style="font-size:0.84rem; color:rgba(235,240,248,0.92); line-height:1.48; white-space:pre-line;"><?= htmlspecialchars($formAnn['message'] ?: 'Այստեղ կցուցադրվի հայտարարության տեքստը օգտատերերի համար։') ?></div>
              <div>
                <span id="acPrevBtn" style="display:<?= !empty($formAnn['action_text']) ? 'inline-block' : 'none' ?>; padding:6px 13px; border-radius:999px; background:rgba(0,212,255,0.2); border:1px solid rgba(0,212,255,0.4); font-size:0.78rem; font-weight:700;"><?= htmlspecialchars($formAnn['action_text'] ?? '') ?> →</span>
              </div>
            </div>
          </div>

          <div class="ac-card" id="acEditorCard">
            <div class="ac-card-head">
              <div>
                <div class="ac-card-title" id="acEditorCardTitle">📢 Նոր Հայտարարության Ստեղծում և Պլանավորում</div>
                <div id="acCloneNotice" style="display:none; margin-top:6px; font-size:0.82rem; font-weight:700; color:#05cd99;"></div>
              </div>
              <button type="button" id="acCancelEditBtn" class="ac-btn ac-btn--ghost ac-btn--sm" style="display:none;" onclick="wpResetAnnouncementForm()">✖ Չեղարկել խմբագրումը</button>
            </div>

            <div class="ac-grid-3" style="margin-bottom:16px;">
              <div class="ac-toggle">
                <label class="ac-switch">
                  <input type="checkbox" name="announcement_enabled" value="1" <?= !empty($formAnn['enabled']) ? 'checked' : '' ?>>
                  <span class="ac-slider"></span>
                </label>
                <div>
                  <div style="font-weight:700; color:var(--text); font-size:0.88rem;">Միացնել Հայտարարությունը</div>
                  <div style="font-size:0.75rem; color:var(--muted);">Ցուցադրվում է և կիրառում է սահմանափակումները</div>
                </div>
              </div>

              <div class="ac-toggle">
                <label class="ac-switch">
                  <input type="checkbox" name="announcement_dismissible" value="1" <?= (!isset($formAnn['dismissible']) || !empty($formAnn['dismissible'])) ? 'checked' : '' ?>>
                  <span class="ac-slider"></span>
                </label>
                <div>
                  <div style="font-weight:700; color:var(--text); font-size:0.88rem;">Թույլ տալ փակել (✕)</div>
                  <div style="font-size:0.75rem; color:var(--muted);">Անջատելիս մշտապես երևում է էկրանին</div>
                </div>
              </div>

              <div class="ac-toggle">
                <label class="ac-switch">
                  <input type="checkbox" name="announcement_show_countdown" value="1" <?= !empty($formAnn['show_countdown']) ? 'checked' : '' ?>>
                  <span class="ac-slider"></span>
                </label>
                <div>
                  <div style="font-weight:700; color:var(--text); font-size:0.88rem;">Ցուցադրել հետհաշվարկ</div>
                  <div style="font-size:0.75rem; color:var(--muted);">Երբ նշված է ավարտի ժամ</div>
                </div>
              </div>
            </div>

            <div class="ac-grid-2" style="margin-bottom:14px;">
              <div class="ac-field">
                <label class="ac-label">Թիրախային Հարթակ</label>
                <select name="announcement_target" class="ac-select">
                  <option value="all" <?= ($formAnn['target'] ?? '') === 'all' ? 'selected' : '' ?>>🌐 Ամբողջ համակարգը (Կայք, PWA, iOS և Android)</option>
                  <option value="web_pwa" <?= ($formAnn['target'] ?? '') === 'web_pwa' ? 'selected' : '' ?>>🖥️ Կայք և PWA</option>
                  <option value="web" <?= ($formAnn['target'] ?? '') === 'web' ? 'selected' : '' ?>>🌍 Միայն Կայք (Web)</option>
                  <option value="pwa" <?= ($formAnn['target'] ?? '') === 'pwa' ? 'selected' : '' ?>>📲 Միայն PWA</option>
                  <option value="native" <?= ($formAnn['target'] ?? '') === 'native' ? 'selected' : '' ?>>📱 Միայն iOS և Android Native</option>
                  <option value="ios" <?= ($formAnn['target'] ?? '') === 'ios' ? 'selected' : '' ?>>🍏 Միայն iOS</option>
                  <option value="android" <?= ($formAnn['target'] ?? '') === 'android' ? 'selected' : '' ?>>🤖 Միայն Android</option>
                </select>
              </div>
              <div class="ac-field">
                <label class="ac-label">Բանների Տեսակ / Գունային շեշտադրում</label>
                <select id="acTypeSelect" name="announcement_type" class="ac-select" onchange="wpUpdatePreview()">
                  <option value="info" <?= ($formAnn['type'] ?? '') === 'info' ? 'selected' : '' ?>>ℹ️ Տեղեկատվական (Երկնագույն)</option>
                  <option value="warning" <?= ($formAnn['type'] ?? '') === 'warning' ? 'selected' : '' ?>>⚠️ Վերազինում / Զգուշացում (Ոսկեգույն)</option>
                  <option value="success" <?= ($formAnn['type'] ?? '') === 'success' ? 'selected' : '' ?>>✅ Թարմացում / Ավարտ (Կանաչ)</option>
                  <option value="critical" <?= ($formAnn['type'] ?? '') === 'critical' ? 'selected' : '' ?>>🚨 Հրատապ դադար (Կարմիր)</option>
                </select>
              </div>
            </div>

            <div class="ac-grid-2" style="margin-bottom:14px;">
              <div class="ac-field">
                <label class="ac-label">Պլանավորված մեկնարկ (ըստ Երևանի ժամի, կամընտիր)</label>
                <input type="datetime-local" name="announcement_schedule_start_at" class="ac-input" value="<?= htmlspecialchars(wp_version_format_datetime_local($formAnn['schedule_start_at'] ?? '')) ?>">
              </div>
              <div class="ac-field">
                <label class="ac-label">Պլանավորված ավարտ (ըստ Երևանի ժամի, կամընտիր)</label>
                <input type="datetime-local" name="announcement_schedule_end_at" class="ac-input" value="<?= htmlspecialchars(wp_version_format_datetime_local($formAnn['schedule_end_at'] ?? '')) ?>">
              </div>
            </div>

            <div class="ac-grid-2" style="margin-bottom:14px;">
              <div class="ac-field">
                <label class="ac-label">Հայերեն Վերնագիր (Հիմնական)</label>
                <input type="text" id="acTitleInput" name="announcement_title" class="ac-input" value="<?= htmlspecialchars($formAnn['title'] ?? '') ?>" oninput="wpUpdatePreview()" placeholder="Օրինակ՝ Վերազինման աշխատանքներ">
              </div>
              <div class="ac-field">
                <label class="ac-label">Գործողության Կոճակ և Հղում (Կամընտիր)</label>
                <div style="display:flex; gap:8px;">
                  <input type="text" id="acActionTextInput" name="announcement_action_text" class="ac-input" value="<?= htmlspecialchars($formAnn['action_text'] ?? '') ?>" oninput="wpUpdatePreview()" placeholder="Կոճակ (օր․ Մանրամասն)">
                  <input type="text" name="announcement_action_url" class="ac-input" value="<?= htmlspecialchars($formAnn['action_url'] ?? '') ?>" placeholder="/news կամ https://...">
                </div>
              </div>
            </div>

            <div class="ac-field" style="margin-bottom:16px;">
              <label class="ac-label">Հայերեն Հաղորդագրություն (Հիմնական)</label>
              <textarea id="acMsgInput" name="announcement_message" class="ac-textarea" rows="3" oninput="wpUpdatePreview()" placeholder="Գրեք հայտարարության ամբողջական տեքստը..."><?= htmlspecialchars($formAnn['message'] ?? '') ?></textarea>
            </div>

            <div class="ac-grid-2">
              <div class="ac-field">
                <label class="ac-label">🇷🇺 Русский (Կամընտիր վերնագիր և տեքստ)</label>
                <input type="text" id="acTitleRu" name="announcement_title_ru" class="ac-input" style="margin-bottom:8px;" value="<?= htmlspecialchars($formAnn['title_ru'] ?? '') ?>" placeholder="Заголовок на русском">
                <textarea id="acMsgRu" name="announcement_message_ru" class="ac-textarea" rows="2" placeholder="Текст объявления на русском..."><?= htmlspecialchars($formAnn['message_ru'] ?? '') ?></textarea>
              </div>
              <div class="ac-field">
                <label class="ac-label">🇺🇸 English (Optional Title & Message)</label>
                <input type="text" id="acTitleEn" name="announcement_title_en" class="ac-input" style="margin-bottom:8px;" value="<?= htmlspecialchars($formAnn['title_en'] ?? '') ?>" placeholder="English title">
                <textarea id="acMsgEn" name="announcement_message_en" class="ac-textarea" rows="2" placeholder="English announcement text..."><?= htmlspecialchars($formAnn['message_en'] ?? '') ?></textarea>
              </div>
            </div>
          </div>

          <?php $renderHistoryCard(); ?>
        </section>

        <!-- TAB 2: GRANULAR RESTRICTIONS -->
        <section id="acPanelRestrictions" class="ac-panel <?= $activeTab === 'restrictions' ? 'is-visible' : '' ?>">
          <div class="ac-card">
            <div class="ac-card-head">
              <div>
                <div class="ac-card-title">🔒 Սահմանափակվող Էջեր (Routes)</div>
                <div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">Նշված էջերը մուտք գործելիս օգտատերը կտեսնի «Ժամանակավոր սահմանափակում» քարտը՝ վերևի հայտարարությամբ։</div>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSetChecks('restricted_pages[]', true)">Նշել բոլորը</button>
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSetChecks('restricted_pages[]', false)">Մաքրել բոլորը</button>
              </div>
            </div>

            <?php foreach ($pageGroups as $groupLabel => $paths): ?>
              <div style="margin-bottom:18px;">
                <div style="font-weight:700; font-size:0.86rem; color:var(--text); margin-bottom:10px;"><?= htmlspecialchars($groupLabel) ?></div>
                <div class="ac-grid-3">
                  <?php foreach ($paths as $p): if (!isset($restrictablePages[$p])) continue; ?>
                    <label class="ac-check-card">
                      <input type="checkbox" name="restricted_pages[]" value="<?= htmlspecialchars($p) ?>" <?= in_array($p, $selectedPages, true) ? 'checked' : '' ?>>
                      <span style="font-size:0.84rem; font-weight:600; color:var(--text);"><?= htmlspecialchars($restrictablePages[$p]) ?></span>
                    </label>
                  <?php endforeach; ?>
                </div>
              </div>
            <?php endforeach; ?>
          </div>

          <div class="ac-card">
            <div class="ac-card-head">
              <div>
                <div class="ac-card-title">🧩 Սահմանափակվող Ֆունկցիաներ (Features)</div>
                <div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">Նշված գործիքներն ու հնարավորությունները ժամանակավորապես կանջատվեն՝ քանի դեռ հայտարարությունը ակտիվ է։</div>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSetChecks('restricted_features[]', true)">Նշել բոլորը</button>
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSetChecks('restricted_features[]', false)">Մաքրել բոլորը</button>
              </div>
            </div>

            <?php foreach ($featureGroups as $groupLabel => $keys): ?>
              <div style="margin-bottom:18px;">
                <div style="font-weight:700; font-size:0.86rem; color:var(--text); margin-bottom:10px;"><?= htmlspecialchars($groupLabel) ?></div>
                <div class="ac-grid-3">
                  <?php foreach ($keys as $fk): if (!isset($restrictableFeatures[$fk])) continue; ?>
                    <label class="ac-check-card">
                      <input type="checkbox" name="restricted_features[]" value="<?= htmlspecialchars($fk) ?>" <?= in_array($fk, $selectedFeatures, true) ? 'checked' : '' ?>>
                      <span style="font-size:0.84rem; font-weight:600; color:var(--text);"><?= htmlspecialchars($restrictableFeatures[$fk]) ?></span>
                    </label>
                  <?php endforeach; ?>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        </section>

        <!-- TAB 3: UNIFIED MAINTENANCE CONTROL -->
        <section id="acPanelMaintenance" class="ac-panel <?= $activeTab === 'maintenance' ? 'is-visible' : '' ?>">
          <div class="ac-card">
            <div class="ac-card-head">
              <div>
                <div class="ac-card-title">🚨 Մեկ սեղմումով ամբողջ համակարգի կառավարում</div>
                <div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">Անմիջապես փակում կամ բացում է Կայքը, PWA-ն, iOS-ը և Android-ը միաժամանակ։</div>
              </div>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSyncMaintFromAnnouncement()">📋 Պատճենել տեքստը հայտարարությունից</button>
                <button type="button" class="ac-btn ac-btn--danger" onclick="wpSubmitMasterAction('master_maintenance_on', 'Վստա՞հ եք, որ ուզում եք միացնել տեխնիկական դադարը ԱՄԲՈՂՋ համակարգում։')">🔴 Միացնել դադարը ամենուր</button>
                <button type="button" class="ac-btn ac-btn--success" onclick="wpSubmitMasterAction('master_maintenance_off', 'Վերականգնե՞լ ամբողջ համակարգը Live ռեժիմի։')">🟢 Բացել ամենուր (Live)</button>
              </div>
            </div>

            <div class="ac-toggle" style="margin-bottom:18px;">
              <label class="ac-switch">
                <input type="checkbox" name="announcement_sync_with_maintenance" value="1" <?= !empty($ann['sync_with_maintenance']) ? 'checked' : '' ?>>
                <span class="ac-slider"></span>
              </label>
              <div>
                <div style="font-weight:700; color:var(--text); font-size:0.9rem;">Կապել Հայտարարությունը Տեխնիկական Աշխատանքների հետ</div>
                <div style="font-size:0.78rem; color:var(--muted);">Երբ Կայքի/PWA դադարը միացված կամ պլանավորված է, հայտարարությունն ու սահմանափակումները նույնպես ավտոմատ կմիանան։</div>
              </div>
            </div>

            <div class="ac-grid-2">
              <!-- Web & PWA Maintenance -->
              <div style="background:var(--bg); border:1px solid var(--line); border-radius:14px; padding:18px;">
                <h3 style="margin:0 0 12px; font-size:1rem; color:var(--text);">🌐 Կայք և PWA (`maintenance.html`)</h3>
                <div class="ac-toggle" style="margin-bottom:12px; background:var(--surface);">
                  <label class="ac-switch">
                    <input type="checkbox" name="web_maintenance_enabled" value="1" <?= !empty($versionConfig['maintenance_enabled']) ? 'checked' : '' ?>>
                    <span class="ac-slider"></span>
                  </label>
                  <div style="font-weight:700; font-size:0.86rem; color:var(--text);">Միացնել Կայքի և PWA դադարը</div>
                </div>
                <div class="ac-field" style="margin-bottom:10px;">
                  <label class="ac-label">Հաղորդագրություն (Web/PWA)</label>
                  <textarea id="acWebMaintMsg" name="web_maintenance_message" class="ac-textarea" rows="3"><?= htmlspecialchars($versionConfig['maintenance_message'] ?? '') ?></textarea>
                </div>
                <div class="ac-grid-2" style="margin-bottom:10px;">
                  <div class="ac-field">
                    <label class="ac-label">Սկիզբ</label>
                    <input type="datetime-local" name="web_maintenance_start_at" class="ac-input" value="<?= htmlspecialchars(wp_version_format_datetime_local($versionConfig['maintenance_start_at'] ?? '')) ?>">
                  </div>
                  <div class="ac-field">
                    <label class="ac-label">Ավարտ (հաշվիչի համար)</label>
                    <input type="datetime-local" name="web_maintenance_end_at" class="ac-input" value="<?= htmlspecialchars(wp_version_format_datetime_local($versionConfig['maintenance_end_at'] ?? '')) ?>">
                  </div>
                </div>
                <div class="ac-field">
                  <label class="ac-label">Թույլատրված IP-ներ (բացառություն, ստորակետով)</label>
                  <input type="text" name="web_maintenance_allowed_ips" class="ac-input" value="<?= htmlspecialchars($versionConfig['maintenance_allowed_ips'] ?? '') ?>" placeholder="օր․ 1.2.3.4, 5.6.7.8">
                </div>
              </div>

              <!-- iOS & Android Maintenance -->
              <div style="background:var(--bg); border:1px solid var(--line); border-radius:14px; padding:18px;">
                <h3 style="margin:0 0 12px; font-size:1rem; color:var(--text);">📱 iOS և Android Native Հավելվածներ</h3>
                <div class="ac-grid-2" style="margin-bottom:10px;">
                  <div class="ac-field">
                    <label class="ac-label">🍏 iOS Կարգավիճակ</label>
                    <select name="ios_status" class="ac-select">
                      <option value="live" <?= $iosStatus === 'live' ? 'selected' : '' ?>>🟢 Live</option>
                      <option value="review" <?= $iosStatus === 'review' ? 'selected' : '' ?>>🟡 Review</option>
                      <option value="maintenance" <?= $iosStatus === 'maintenance' ? 'selected' : '' ?>>🔴 Maintenance</option>
                    </select>
                  </div>
                  <div class="ac-field">
                    <label class="ac-label">🤖 Android Կարգավիճակ</label>
                    <select name="android_status" class="ac-select">
                      <option value="live" <?= $androidStatus === 'live' ? 'selected' : '' ?>>🟢 Live</option>
                      <option value="review" <?= $androidStatus === 'review' ? 'selected' : '' ?>>🟡 Review</option>
                      <option value="maintenance" <?= $androidStatus === 'maintenance' ? 'selected' : '' ?>>🔴 Maintenance</option>
                    </select>
                  </div>
                </div>
                <div class="ac-field" style="margin-bottom:10px;">
                  <label class="ac-label">iOS Դադարի Վերնագիր և Տեքստ</label>
                  <input type="text" id="acIosMaintTitle" name="ios_maintenance_title" class="ac-input" style="margin-bottom:6px;" value="<?= htmlspecialchars($mobileConfig['ios']['maintenance_title'] ?? '') ?>">
                  <textarea id="acIosMaintMsg" name="ios_maintenance_message" class="ac-textarea" rows="2"><?= htmlspecialchars($mobileConfig['ios']['maintenance_message'] ?? '') ?></textarea>
                </div>
                <div class="ac-field">
                  <label class="ac-label">Android Դադարի Վերնագիր և Տեքստ</label>
                  <input type="text" id="acAndroidMaintTitle" name="android_maintenance_title" class="ac-input" style="margin-bottom:6px;" value="<?= htmlspecialchars($mobileConfig['android']['maintenance_title'] ?? '') ?>">
                  <textarea id="acAndroidMaintMsg" name="android_maintenance_message" class="ac-textarea" rows="2"><?= htmlspecialchars($mobileConfig['android']['maintenance_message'] ?? '') ?></textarea>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 4: ANNOUNCEMENTS HISTORY -->
        <section id="acPanelHistory" class="ac-panel <?= $activeTab === 'history' ? 'is-visible' : '' ?>">
          <?php $renderHistoryCard(); ?>
        </section>

        <div style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap; margin-top:16px;">
          <button type="submit" class="ac-btn ac-btn--primary" onclick="document.getElementById('acFormAction').value='save_all';">💾 Պահպանել</button>
        </div>
      </form>
    </div>
  </main>
</div>

<script>
  window.WP_ANN_HISTORY = <?= json_encode($annHistory, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;

  function wpSwitchAcTab(tab, btn) {
    document.getElementById('acActiveTabInput').value = tab;
    document.querySelectorAll('.ac-tab').forEach(function (el) { el.classList.remove('is-active'); });
    if (btn) {
      btn.classList.add('is-active');
    } else {
      var mapBtn = {
        banner: 'acTabBtnBanner',
        restrictions: 'acTabBtnRestrictions',
        maintenance: 'acTabBtnMaintenance',
        history: 'acTabBtnHistory'
      };
      var found = document.getElementById(mapBtn[tab] || 'acTabBtnBanner');
      if (found) found.classList.add('is-active');
    }
    document.getElementById('acPanelBanner').classList.toggle('is-visible', tab === 'banner');
    document.getElementById('acPanelRestrictions').classList.toggle('is-visible', tab === 'restrictions');
    document.getElementById('acPanelMaintenance').classList.toggle('is-visible', tab === 'maintenance');
    var histPanel = document.getElementById('acPanelHistory');
    if (histPanel) histPanel.classList.toggle('is-visible', tab === 'history');
  }

  function wpToDatetimeLocalValue(raw) {
    if (!raw || typeof raw !== 'string') return '';
    var clean = raw.trim().replace(' ', 'T');
    return clean.length >= 16 ? clean.slice(0, 16) : '';
  }

  function wpIsExpiredIso(raw) {
    if (!raw || typeof raw !== 'string') return false;
    var parsed = Date.parse(raw.trim().replace(' ', 'T'));
    if (isNaN(parsed)) return false;
    return parsed <= Date.now();
  }

  function wpFindHistoryItem(historyId) {
    var list = Array.isArray(window.WP_ANN_HISTORY) ? window.WP_ANN_HISTORY : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === String(historyId)) {
        return list[i];
      }
    }
    return null;
  }

  function wpPopulateFormFromHistoryItem(item, isEditMode) {
    if (!item) return;

    wpSwitchAcTab('banner');

    var editingInput = document.getElementById('acEditingHistoryIdInput');
    if (editingInput) editingInput.value = isEditMode ? String(item.id || '') : '';

    var cancelBtn = document.getElementById('acCancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = isEditMode ? 'inline-flex' : 'none';

    var cardTitle = document.getElementById('acEditorCardTitle');
    if (cardTitle) {
      cardTitle.textContent = isEditMode
        ? '✏️ Հայտարարության Խմբագրում'
        : '📢 Նոր Հայտարարության Ստեղծում և Պլանավորում';
    }

    var enabledInput = document.querySelector('input[name="announcement_enabled"]');
    if (enabledInput) enabledInput.checked = isEditMode ? !!item.enabled : true;

    var dismissInput = document.querySelector('input[name="announcement_dismissible"]');
    if (dismissInput) dismissInput.checked = item.dismissible !== false;

    var countdownInput = document.querySelector('input[name="announcement_show_countdown"]');
    if (countdownInput) countdownInput.checked = !!item.show_countdown;

    var syncMaintInput = document.querySelector('input[name="announcement_sync_with_maintenance"]');
    if (syncMaintInput) syncMaintInput.checked = !!item.sync_with_maintenance;

    var targetSelect = document.querySelector('select[name="announcement_target"]');
    if (targetSelect) targetSelect.value = item.target || 'all';

    var typeSelect = document.getElementById('acTypeSelect');
    if (typeSelect) typeSelect.value = item.type || 'info';

    var titleInput = document.getElementById('acTitleInput');
    if (titleInput) titleInput.value = item.title || '';

    var msgInput = document.getElementById('acMsgInput');
    if (msgInput) msgInput.value = item.message || '';

    var titleRu = document.getElementById('acTitleRu');
    if (titleRu) titleRu.value = item.title_ru || '';

    var msgRu = document.getElementById('acMsgRu');
    if (msgRu) msgRu.value = item.message_ru || '';

    var titleEn = document.getElementById('acTitleEn');
    if (titleEn) titleEn.value = item.title_en || '';

    var msgEn = document.getElementById('acMsgEn');
    if (msgEn) msgEn.value = item.message_en || '';

    var actText = document.getElementById('acActionTextInput');
    if (actText) actText.value = item.action_text || '';

    var actUrl = document.querySelector('input[name="announcement_action_url"]');
    if (actUrl) actUrl.value = item.action_url || '';

    var startInput = document.querySelector('input[name="announcement_schedule_start_at"]');
    var endInput = document.querySelector('input[name="announcement_schedule_end_at"]');
    var expired = !isEditMode && wpIsExpiredIso(item.schedule_end_at);
    if (startInput) startInput.value = expired ? '' : wpToDatetimeLocalValue(item.schedule_start_at);
    if (endInput) endInput.value = expired ? '' : wpToDatetimeLocalValue(item.schedule_end_at);

    var pagesSet = {};
    (Array.isArray(item.restricted_pages) ? item.restricted_pages : []).forEach(function (p) { pagesSet[String(p)] = true; });
    document.querySelectorAll('input[name="restricted_pages[]"]').forEach(function (chk) {
      chk.checked = !!pagesSet[chk.value];
    });

    var featSet = {};
    (Array.isArray(item.restricted_features) ? item.restricted_features : []).forEach(function (f) { featSet[String(f)] = true; });
    document.querySelectorAll('input[name="restricted_features[]"]').forEach(function (chk) {
      chk.checked = !!featSet[chk.value];
    });

    wpUpdatePreview();

    var notice = document.getElementById('acCloneNotice');
    if (notice) {
      notice.style.display = 'block';
      notice.textContent = isEditMode
        ? '✏️ Խմբագրման ռեժիմ՝ փոփոխեք տվյալները և սեղմեք «💾 Պահպանել»՝ այս հայտարարությունը թարմացնելու համար։'
        : '📋 Հին հայտարարության տվյալները բեռնվեցին որպես նմուշ․ փոփոխեք և սեղմեք «💾 Պահպանել»՝ նորը ստեղծելու համար։';
    }

    var editorCard = document.getElementById('acEditorCard');
    if (editorCard) {
      editorCard.classList.remove('is-cloned-highlight');
      void editorCard.offsetWidth;
      editorCard.classList.add('is-cloned-highlight');
      editorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function wpEditFromHistory(historyId) {
    var item = wpFindHistoryItem(historyId);
    if (!item) return;
    wpPopulateFormFromHistoryItem(item, true);
  }

  function wpCloneFromHistory(historyId) {
    var item = wpFindHistoryItem(historyId);
    if (!item) return;
    wpPopulateFormFromHistoryItem(item, false);
  }

  function wpResetAnnouncementForm() {
    wpSwitchAcTab('banner');

    var editingInput = document.getElementById('acEditingHistoryIdInput');
    if (editingInput) editingInput.value = '';

    var cancelBtn = document.getElementById('acCancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';

    var cardTitle = document.getElementById('acEditorCardTitle');
    if (cardTitle) cardTitle.textContent = '📢 Նոր Հայտարարության Ստեղծում և Պլանավորում';

    var enabledInput = document.querySelector('input[name="announcement_enabled"]');
    if (enabledInput) enabledInput.checked = true;

    var dismissInput = document.querySelector('input[name="announcement_dismissible"]');
    if (dismissInput) dismissInput.checked = true;

    var countdownInput = document.querySelector('input[name="announcement_show_countdown"]');
    if (countdownInput) countdownInput.checked = false;

    var targetSelect = document.querySelector('select[name="announcement_target"]');
    if (targetSelect) targetSelect.value = 'all';

    var typeSelect = document.getElementById('acTypeSelect');
    if (typeSelect) typeSelect.value = 'info';

    ['acTitleInput', 'acMsgInput', 'acTitleRu', 'acMsgRu', 'acTitleEn', 'acMsgEn', 'acActionTextInput'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });

    var actUrl = document.querySelector('input[name="announcement_action_url"]');
    if (actUrl) actUrl.value = '';

    var startInput = document.querySelector('input[name="announcement_schedule_start_at"]');
    if (startInput) startInput.value = '';

    var endInput = document.querySelector('input[name="announcement_schedule_end_at"]');
    if (endInput) endInput.value = '';

    wpSetChecks('restricted_pages[]', false);
    wpSetChecks('restricted_features[]', false);
    wpUpdatePreview();

    var notice = document.getElementById('acCloneNotice');
    if (notice) {
      notice.style.display = 'none';
      notice.textContent = '';
    }

    var editorCard = document.getElementById('acEditorCard');
    if (editorCard) {
      editorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    var titleEl = document.getElementById('acTitleInput');
    if (titleEl) titleEl.focus();
  }

  function wpActivateHistoryItem(historyId) {
    document.getElementById('acHistoryIdInput').value = historyId;
    document.getElementById('acFormAction').value = 'activate_from_history';
    document.getElementById('acMainForm').submit();
  }

  function wpDeleteHistoryItem(historyId) {
    if (!window.confirm('Ջնջե՞լ այս հայտարարությունը պատմությունից։')) return;
    document.getElementById('acHistoryIdInput').value = historyId;
    document.getElementById('acFormAction').value = 'delete_history_item';
    document.getElementById('acMainForm').submit();
  }

  function wpSetChecks(name, checked) {
    document.querySelectorAll('input[name="' + name + '"]').forEach(function (el) { el.checked = checked; });
  }

  function wpUpdatePreview() {
    var type = document.getElementById('acTypeSelect').value;
    var title = document.getElementById('acTitleInput').value.trim();
    var msg = document.getElementById('acMsgInput').value.trim();
    var btnTxt = document.getElementById('acActionTextInput').value.trim();
    var dismissChk = document.querySelector('input[name="announcement_dismissible"]');
    var countChk = document.querySelector('input[name="announcement_show_countdown"]');
    var map = {
      info: { color: '#7ee8ff', border: 'rgba(0,212,255,0.45)', bg: 'rgba(0,212,255,0.18)', defaultTitle: 'Հայտարարություն' },
      warning: { color: '#f7b500', border: 'rgba(247,181,0,0.5)', bg: 'rgba(247,181,0,0.2)', defaultTitle: 'Ուշադրություն' },
      success: { color: '#34d399', border: 'rgba(16,185,129,0.5)', bg: 'rgba(16,185,129,0.2)', defaultTitle: 'Թարմացում' },
      critical: { color: '#ff6961', border: 'rgba(255,69,58,0.5)', bg: 'rgba(255,69,58,0.2)', defaultTitle: 'Տեխնիկական հայտարարություն' }
    };
    var pal = map[type] || map.info;
    var resolvedTitle = title;
    var resolvedMsg = msg;
    if (!resolvedTitle && resolvedMsg.indexOf('\n') !== -1) {
      var lines = resolvedMsg.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean);
      if (lines.length >= 2 && lines[0].length <= 80) {
        resolvedTitle = lines[0];
        resolvedMsg = lines.slice(1).join('\n');
      }
    }
    document.getElementById('acLivePreview').style.borderColor = pal.border;
    document.getElementById('acPrevDot').style.background = pal.color;
    document.getElementById('acPrevDot').style.boxShadow = '0 0 10px ' + pal.color;
    document.getElementById('acPrevTitle').style.color = pal.color;
    document.getElementById('acPrevTitle').textContent = resolvedTitle || pal.defaultTitle;
    document.getElementById('acPrevMsg').textContent = resolvedMsg || 'Այստեղ կցուցադրվի հայտարարության տեքստը օգտատերերի համար։';
    var prevCountdown = document.getElementById('acPrevCountdown');
    if (prevCountdown) {
      prevCountdown.style.display = (countChk && countChk.checked) ? 'inline-flex' : 'none';
      prevCountdown.style.background = pal.bg;
      prevCountdown.style.borderColor = pal.border;
    }
    var prevClose = document.getElementById('acPrevClose');
    if (prevClose) {
      prevClose.style.display = (!dismissChk || dismissChk.checked) ? 'inline-flex' : 'none';
    }
    var prevBtn = document.getElementById('acPrevBtn');
    if (btnTxt) {
      prevBtn.style.display = 'inline-block';
      prevBtn.style.background = pal.bg;
      prevBtn.style.borderColor = pal.border;
      prevBtn.textContent = btnTxt + ' →';
    } else {
      prevBtn.style.display = 'none';
    }
  }
  document.addEventListener('DOMContentLoaded', function() {
    wpUpdatePreview();
    document.querySelectorAll('input[name="announcement_dismissible"], input[name="announcement_show_countdown"]').forEach(function(el) {
      el.addEventListener('change', wpUpdatePreview);
    });
  });

  function wpApplyPreset(kind) {
    var presets = {
      upgrade: {
        type: 'warning',
        title: 'Վերազինման աշխատանքներ',
        msg: 'Worship Platform կայքը և բջջային հավելվածը ժամանակավորապես անհասանելի կլինեն տեխնիկական վերազինման նպատակներով։ Շուտով կվերադառնանք։',
        title_ru: 'Технические работы и обновление',
        msg_ru: 'Сайт и приложение Worship Platform временно обновляются для улучшения сервиса. Скоро вернёмся!',
        title_en: 'Scheduled Maintenance & Upgrade',
        msg_en: 'Worship Platform is currently undergoing scheduled upgrades and will be back shortly.'
      },
      partial: {
        type: 'warning',
        title: 'Որոշ բաժիններ ժամանակավորապես փակ են',
        msg: 'Համակարգի արդիականացման ընթացքում ընտրված բաժինները ժամանակավորապես սահմանափակված են։ Մյուս բաժինները շարունակում են աշխատել սովորական ռեժիմով։',
        title_ru: 'Некоторые разделы временно ограничены',
        msg_ru: 'Во время обновления системы выбранные разделы временно недоступны. Остальные функции работают в обычном режиме.',
        title_en: 'Partial Service Maintenance',
        msg_en: 'Selected features are temporarily restricted during system upgrades. Other sections remain available.'
      },
      update: {
        type: 'success',
        title: 'Հասանելի է նոր տարբերակ',
        msg: 'Ավելացվել է Աստվածաշնչի Նոր Արարատ թարգմանությունը և բարելավված է հավելվածի ինտերֆեյսը։',
        title_ru: 'Доступно новое обновление',
        msg_ru: 'Добавлен полный перевод Библии и обновлён интерфейс приложения.',
        title_en: 'New Update Available',
        msg_en: 'New Bible translations and refreshed mobile interface improvements are now live.'
      }
    };
    var p = presets[kind];
    if (!p) return;
    document.getElementById('acTypeSelect').value = p.type;
    document.getElementById('acTitleInput').value = p.title;
    document.getElementById('acMsgInput').value = p.msg;
    document.getElementById('acTitleRu').value = p.title_ru;
    document.getElementById('acMsgRu').value = p.msg_ru;
    document.getElementById('acTitleEn').value = p.title_en;
    document.getElementById('acMsgEn').value = p.msg_en;
    wpUpdatePreview();
  }

  function wpSyncMaintFromAnnouncement() {
    var title = document.getElementById('acTitleInput').value.trim() || 'Վերազինման աշխատանքներ';
    var msg = document.getElementById('acMsgInput').value.trim();
    if (!msg) return;
    document.getElementById('acWebMaintMsg').value = msg;
    document.getElementById('acIosMaintTitle').value = title;
    document.getElementById('acIosMaintMsg').value = msg;
    document.getElementById('acAndroidMaintTitle').value = title;
    document.getElementById('acAndroidMaintMsg').value = msg;
  }

  function wpSubmitMasterAction(actionName, confirmText) {
    if (!window.confirm(confirmText)) return;
    document.getElementById('acFormAction').value = actionName;
    document.getElementById('acMainForm').submit();
  }
</script>
</body>
</html>
