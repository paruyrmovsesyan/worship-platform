<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/release_manager.php';
require_once __DIR__ . '/push_service.php';
require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/song_request_service.php';
require_once __DIR__ . '/translation_runtime.php';

$access = wp_admin_require_access('/admin_updates.php');
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy', 'ru', 'en'])) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: ?');
    exit;
}
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
$_GET['lang'] = $adminLang;

if (!function_exists('__')) {
    function __($text) {
        global $adminLang;
        $translated = wp_translation_translate_texts([$text], $adminLang, 'admin_panel');
        return htmlspecialchars((string)($translated[0] ?? $text), ENT_QUOTES);
    }
}

$adminUser = $access['user'];
$config = $access['config'];
$adminSectionRegistry = wp_version_admin_section_registry();
$pageAppRegistry = wp_version_page_app_registry();
$pageWebRegistry = wp_version_page_web_registry();
$adminSectionPermissions = $access['permissions'] ?? wp_version_default_admin_permissions();
$releaseTypes = wp_version_release_types();
$packageModes = wp_version_package_modes();
$pageAppRegistry = wp_version_page_app_registry();
$pushConfig = wp_push_bootstrap_config();
$pushStats = wp_push_stats();
$installStats = wp_install_stats();
$activeMainInstallDevices = wp_install_list_devices('main', true, 100);
$activeAdminInstallDevices = wp_install_list_devices('admin', true, 100);
$deviceFilterOptions = wp_admin_updates_device_filter_options($activeMainInstallDevices, $activeAdminInstallDevices);
$deviceFilters = [
    'scope' => in_array((string)($_GET['device_scope'] ?? 'all'), ['all', 'main', 'admin'], true) ? (string)($_GET['device_scope'] ?? 'all') : 'all',
    'search' => trim((string)($_GET['device_search'] ?? '')),
    'link' => in_array((string)($_GET['device_link'] ?? 'all'), ['all', 'linked', 'guest'], true) ? (string)($_GET['device_link'] ?? 'all') : 'all',
    'platform' => (string)($_GET['device_platform'] ?? 'all'),
    'browser' => (string)($_GET['device_browser'] ?? 'all'),
    'sort' => in_array((string)($_GET['device_sort'] ?? 'last_seen_newest'), ['last_seen_newest', 'last_seen_oldest', 'installed_newest', 'installed_oldest', 'identity_asc', 'identity_desc', 'platform_asc'], true) ? (string)($_GET['device_sort'] ?? 'last_seen_newest') : 'last_seen_newest',
];

if ($deviceFilters['platform'] !== 'all' && !in_array($deviceFilters['platform'], $deviceFilterOptions['platforms'], true)) {
    $deviceFilters['platform'] = 'all';
}
if ($deviceFilters['browser'] !== 'all' && !in_array($deviceFilters['browser'], $deviceFilterOptions['browsers'], true)) {
    $deviceFilters['browser'] = 'all';
}

$filteredMainInstallDevices = wp_admin_updates_sort_devices(
    wp_admin_updates_filter_devices($activeMainInstallDevices, $deviceFilters),
    $deviceFilters['sort']
);
$filteredAdminInstallDevices = wp_admin_updates_sort_devices(
    wp_admin_updates_filter_devices($activeAdminInstallDevices, $deviceFilters),
    $deviceFilters['sort']
);
$translationFilters = [
    'lang' => in_array((string)($_GET['translation_lang'] ?? 'all'), ['all', 'ru', 'en'], true) ? (string)($_GET['translation_lang'] ?? 'all') : 'all',
    'search' => trim((string)($_GET['translation_search'] ?? '')),
];
$translationSettings = wp_translation_settings();
$translationCacheStats = wp_translation_cache_counts();
$translationEntries = wp_translation_cache_list_entries($translationFilters['lang'], $translationFilters['search'], 80);
$moderationFilters = [
    'status' => in_array((string)($_GET['moderation_status'] ?? 'pending'), ['all', 'pending', 'approved', 'rejected'], true)
        ? (string)($_GET['moderation_status'] ?? 'pending')
        : 'pending',
    'search' => trim((string)($_GET['moderation_search'] ?? '')),
];
$moderationCounts = wp_song_request_counts();
$moderationRequests = wp_song_request_list($moderationFilters['status'], 80, $moderationFilters['search']);
$translationSongOptions = [];
$showMainDeviceSection = $deviceFilters['scope'] !== 'admin';
$showAdminDeviceSection = $deviceFilters['scope'] !== 'main';
$pushSubscriptions = wp_push_load_subscriptions();
$accessMode = (string)($adminUser['access_mode'] ?? 'modern');
$visibleAdminSections = array_values(array_keys(array_filter(
    $adminSectionPermissions,
    static fn($enabled): bool => !empty($enabled)
)));
$hasAnyAdminSectionAccess = !empty($visibleAdminSections);
$defaultAdminSection = $visibleAdminSections[0] ?? 'release';
$message = '';
$messageType = 'success';

if (!empty($_SESSION['admin_updates_flash']) && is_array($_SESSION['admin_updates_flash'])) {
    $message = (string)($_SESSION['admin_updates_flash']['message'] ?? '');
    $messageType = (string)($_SESSION['admin_updates_flash']['type'] ?? 'success');
    unset($_SESSION['admin_updates_flash']);
}

function wp_admin_updates_preserve_actor_access(array $payload, array $adminUser): array {
    $email = strtolower(trim((string)($adminUser['email'] ?? '')));
    if ($email === '') {
        return $payload;
    }

    $hasDirectAdminRole = false;
    if (!empty($adminUser['is_admin'])) {
        $hasDirectAdminRole = true;
    }

    $role = strtolower(trim((string)($adminUser['role'] ?? '')));
    if (in_array($role, ['admin', 'superadmin', 'super_admin', 'owner'], true)) {
        $hasDirectAdminRole = true;
    }

    if ($hasDirectAdminRole) {
        return $payload;
    }

    $admins = wp_version_sanitize_email_list($payload['admin_emails'] ?? []);
    if (!in_array($email, $admins, true)) {
        $admins[] = $email;
    }
    $payload['admin_emails'] = $admins;

    return $payload;
}

function wp_admin_updates_actor_label(array $adminUser): string {
    return (string)($adminUser['email'] ?? $adminUser['name'] ?? 'admin');
}

function wp_admin_updates_has_section_access(array $permissions, string $section): bool {
    return !empty($permissions[$section]);
}

function wp_admin_updates_action_section(string $action): ?string {
    return match ($action) {
        'apply_release', 'save_general', 'save', 'rollback', 'save_release_draft' => 'release',
        'save_maintenance', 'save_page_modes' => 'maintenance',
        'save_push_settings', 'send_push', 'remove_push_subscription', 'clear_push_history' => 'push',
        'remove_install_device' => 'devices',
        'clear_history' => 'history',
        'save_access', 'save_access_permissions', 'save_access_draft' => 'access',
        'approve_song_request', 'reject_song_request' => 'moderation',
        'update_translation_cache_entry', 'delete_translation_cache_entry', 'clear_translation_cache', 'save_song_title_translations' => 'translations',
        default => null,
    };
}

function wp_admin_updates_is_async_request(): bool {
    $requestedWith = strtolower(trim((string)($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')));
    if ($requestedWith === 'xmlhttprequest') {
        return true;
    }

    $accept = strtolower(trim((string)($_SERVER['HTTP_ACCEPT'] ?? '')));
    return str_contains($accept, 'application/json');
}

function wp_admin_updates_section_label(string $section): string {
    $registry = wp_version_admin_section_registry();
    return (string)($registry[$section]['label'] ?? $section);
}

function wp_admin_updates_permission_rows(array $config, array $adminUser): array {
    $rows = [];
    $defaults = wp_version_default_admin_permissions();
    $saved = is_array($config['admin_user_permissions'] ?? null) ? $config['admin_user_permissions'] : [];

    foreach ((array)($config['admin_emails'] ?? []) as $email) {
        $email = strtolower(trim((string)$email));
        if ($email !== '') {
            $rows[$email] = $saved[$email] ?? $defaults;
        }
    }

    foreach ($saved as $email => $permissions) {
        $email = strtolower(trim((string)$email));
        if ($email !== '') {
            $rows[$email] = is_array($permissions) ? array_merge($defaults, $permissions) : $defaults;
        }
    }

    $currentEmail = strtolower(trim((string)($adminUser['email'] ?? '')));
    if ($currentEmail !== '') {
        $rows[$currentEmail] = $saved[$currentEmail] ?? $defaults;
    }

    ksort($rows, SORT_NATURAL | SORT_FLAG_CASE);

    $normalized = [];
    foreach ($rows as $email => $permissions) {
        $normalized[] = [
            'email' => $email,
            'permissions' => array_merge($defaults, is_array($permissions) ? $permissions : []),
        ];
    }

    return $normalized;
}

function wp_admin_updates_social_secret_value(string $name): string {
    return function_exists('wp_runtime_peek_secret') ? trim((string)wp_runtime_peek_secret($name)) : '';
}

function wp_admin_updates_social_secret_status(string $value): string {
    return $value !== '' ? 'Լրացված է' : 'Լրացված չէ';
}

function wp_admin_updates_store_social_secrets_from_post(): array {
    $googleSecret = trim((string)($_POST['social_auth_google_client_secret'] ?? ''));
    $clearGoogleSecret = !empty($_POST['social_auth_google_client_secret_clear']);
    $messages = [];
    $errors = [];

    if ($clearGoogleSecret) {
        if (!wp_runtime_delete_secret('social_auth_google_client_secret')) {
            $errors[] = 'Google գաղտնի բանալին չհաջողվեց մաքրել։';
        } else {
            $messages[] = 'Google գաղտնի բանալին մաքրվեց։';
        }
    } elseif ($googleSecret !== '') {
        if (!wp_runtime_set_secret('social_auth_google_client_secret', $googleSecret)) {
            $errors[] = 'Google գաղտնի բանալին չհաջողվեց պահպանել։';
        } else {
            $messages[] = 'Google գաղտնի բանալին պահպանվեց։';
        }
    }

    return [
        'ok' => empty($errors),
        'messages' => $messages,
        'errors' => $errors,
    ];
}

function wp_admin_updates_translation_lang_label(string $lang): string {
    return match ($lang) {
        'ru' => 'Ռուսերեն',
        'en' => 'Անգլերեն',
        default => 'Բոլորը',
    };
}

function wp_admin_updates_parse_song_title_variants(string $title): array {
    $parts = preg_split('/\s*\/\s*/u', trim($title)) ?: [];
    $parts = array_values(array_filter(array_map(static function ($part) {
        return trim((string)$part);
    }, $parts), static function ($part) {
        return $part !== '';
    }));

    $hy = '';
    $lat = '';
    $en = '';
    $ru = '';

    $latinParts = array_values(array_filter($parts, static function ($part) {
        return preg_match('/[A-Za-z]/', $part) === 1
            && preg_match('/[\x{0531}-\x{058F}]/u', $part) !== 1
            && preg_match('/[\x{0400}-\x{04FF}]/u', $part) !== 1;
    }));
    $cyrillicParts = array_values(array_filter($parts, static function ($part) {
        return preg_match('/[\x{0400}-\x{04FF}]/u', $part) === 1
            && preg_match('/[\x{0531}-\x{058F}]/u', $part) !== 1;
    }));

    if (!empty($parts[0]) && preg_match('/[\x{0531}-\x{058F}]/u', $parts[0]) === 1) {
        $hy = $parts[0];
        if (count($latinParts) >= 2) {
            $lat = $latinParts[0] ?? '';
            $en = $latinParts[count($latinParts) - 1] ?? '';
        } elseif (count($latinParts) === 1) {
            $en = $latinParts[0] ?? '';
        }
        $ru = $cyrillicParts[0] ?? '';
        return ['hy' => $hy, 'lat' => $lat, 'en' => $en, 'ru' => $ru];
    }

    foreach ($parts as $part) {
        if ($hy === '' && preg_match('/[\x{0531}-\x{058F}]/u', $part) === 1) {
            $hy = $part;
            continue;
        }
        if ($ru === '' && preg_match('/[\x{0400}-\x{04FF}]/u', $part) === 1 && preg_match('/[\x{0531}-\x{058F}]/u', $part) !== 1) {
            $ru = $part;
            continue;
        }
        if ($lat === '' && preg_match('/[A-Za-z]/', $part) === 1 && preg_match('/[\x{0531}-\x{058F}]/u', $part) !== 1 && preg_match('/[\x{0400}-\x{04FF}]/u', $part) !== 1) {
            $lat = $part;
            continue;
        }
        if ($en === '' && preg_match('/[A-Za-z]/', $part) === 1 && preg_match('/[\x{0531}-\x{058F}]/u', $part) !== 1 && preg_match('/[\x{0400}-\x{04FF}]/u', $part) !== 1) {
            $en = $part;
        }
    }

    if ($hy === '' && !empty($parts[0])) {
        $hy = $parts[0];
    }
    if ($en === '' && $ru === '' && $lat !== '' && count($parts) === 2 && $hy !== '') {
        $en = $lat;
        $lat = '';
    }

    return ['hy' => $hy, 'lat' => $lat, 'en' => $en, 'ru' => $ru];
}

function wp_admin_updates_translation_song_options(): array {
    try {
        $conn = wp_runtime_open_mysqli();
        wp_runtime_ensure_song_title_columns_mysqli($conn);
    } catch (Throwable $e) {
        return [];
    }

    $songs = [];
    $sql = "SELECT id, title, title_hy, title_lat, title_en, title_ru FROM songs WHERE title IS NOT NULL AND TRIM(title) <> '' ORDER BY title ASC";
    $res = $conn->query($sql);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $title = trim((string)($row['title'] ?? ''));
            $id = (int)($row['id'] ?? 0);
            if ($id <= 0 || $title === '') {
                continue;
            }

            $variants = [
                'hy' => trim((string)($row['title_hy'] ?? '')),
                'lat' => trim((string)($row['title_lat'] ?? '')),
                'en' => trim((string)($row['title_en'] ?? '')),
                'ru' => trim((string)($row['title_ru'] ?? '')),
            ];
            if ($variants['hy'] === '' && $title !== '') {
                $variants = array_merge($variants, wp_admin_updates_parse_song_title_variants($title));
            }

            $songs[] = [
                'id' => $id,
                'title' => $title,
                'hy' => $variants['hy'] ?? $title,
                'lat' => $variants['lat'] ?? '',
                'ru' => ($variants['ru'] ?? '') ?: (wp_translation_cache_get('ru', 'api.song.title', $title) ?? ''),
                'en' => ($variants['en'] ?? '') ?: (wp_translation_cache_get('en', 'api.song.title', $title) ?? ''),
            ];
        }
        $res->free();
    }

    $conn->close();
    return $songs;
}

function wp_admin_updates_push_identity(array $subscription): string {
    $name = trim((string)($subscription['user_name'] ?? ''));
    $email = trim((string)($subscription['user_email'] ?? ''));

    if ($name !== '' && $email !== '') {
        return $name . ' · ' . $email;
    }

    if ($email !== '') {
        return $email;
    }

    if ($name !== '') {
        return $name;
    }

    return 'Չճանաչված սարք';
}

$translationSongOptions = wp_admin_updates_translation_song_options();

function wp_admin_updates_push_endpoint_host(string $endpoint): string {
    $host = (string)(parse_url($endpoint, PHP_URL_HOST) ?? '');
    return $host !== '' ? $host : '—';
}

function wp_admin_updates_push_ip(array $subscription): string {
    $ip = trim((string)($subscription['ip_address'] ?? ''));
    return $ip !== '' ? $ip : '—';
}

function wp_admin_updates_push_search_haystack(array $subscription): string {
    $parts = [
        (string)($subscription['user_name'] ?? ''),
        (string)($subscription['user_email'] ?? ''),
        (string)($subscription['endpoint'] ?? ''),
        wp_admin_updates_push_endpoint_host((string)($subscription['endpoint'] ?? '')),
        wp_admin_updates_push_ip($subscription),
        (string)($subscription['user_agent'] ?? ''),
        (string)($subscription['id'] ?? ''),
    ];

    return mb_strtolower(trim(implode(' ', $parts)));
}

function wp_admin_updates_install_ip(array $device): string {
    $ip = trim((string)($device['ip_address'] ?? ''));
    return $ip !== '' ? $ip : '—';
}

function wp_admin_updates_install_identity(array $device): string {
    $name = trim((string)($device['user_name'] ?? ''));
    $username = trim((string)($device['user_username'] ?? ''));
    $email = trim((string)($device['user_email'] ?? ''));

    if ($name !== '' && $email !== '') {
        return $name . ' · ' . $email;
    }

    if ($email !== '') {
        return $email;
    }

    if ($name !== '') {
        return $name;
    }

    if ($username !== '') {
        return '@' . $username;
    }

    return 'Սարք ' . wp_install_mask_device_id((string)($device['device_id'] ?? ''));
}

function wp_admin_updates_install_link_status(array $device): string {
    $userId = (int)($device['user_id'] ?? 0);
    $name = trim((string)($device['user_name'] ?? ''));
    $username = trim((string)($device['user_username'] ?? ''));
    $email = trim((string)($device['user_email'] ?? ''));

    if ($userId > 0 || $name !== '' || $username !== '' || $email !== '') {
        return 'Կապված է օգտահաշվին';
    }

    return 'User կապ չկա';
}

function wp_admin_updates_install_secondary(array $device): string {
    $name = trim((string)($device['user_name'] ?? ''));
    $username = trim((string)($device['user_username'] ?? ''));
    $email = trim((string)($device['user_email'] ?? ''));

    $parts = [];
    if ($username !== '') {
        $parts[] = '@' . $username;
    }
    if ($email !== '') {
        $parts[] = $email;
    }
    if ($name !== '' && $email === '') {
        $parts[] = $name;
    }

    if ($parts) {
        return implode(' • ', $parts);
    }

    return 'Օգտահաշվի տվյալ չի կապվել';
}

function wp_admin_updates_install_has_link(array $device): bool {
    return !empty($device['user_id'])
        || trim((string)($device['user_name'] ?? '')) !== ''
        || trim((string)($device['user_username'] ?? '')) !== ''
        || trim((string)($device['user_email'] ?? '')) !== '';
}

function wp_admin_updates_install_platform(string $userAgent): string {
    $ua = strtolower($userAgent);
    if ($ua === '') {
        return 'Անհայտ սարք';
    }
    if (str_contains($ua, 'iphone')) return 'iPhone';
    if (str_contains($ua, 'ipad')) return 'iPad';
    if (str_contains($ua, 'android')) return 'Android';
    if (str_contains($ua, 'mac os x') || str_contains($ua, 'macintosh')) return 'macOS';
    if (str_contains($ua, 'windows')) return 'Windows';
    if (str_contains($ua, 'linux')) return 'Linux';
    return 'Այլ սարք';
}

function wp_admin_updates_install_browser(string $userAgent): string {
    $ua = strtolower($userAgent);
    if ($ua === '') {
        return 'Անհայտ';
    }
    if (str_contains($ua, 'edg/')) return 'Edge';
    if (str_contains($ua, 'opr/') || str_contains($ua, 'opera')) return 'Opera';
    if (str_contains($ua, 'chrome/') && !str_contains($ua, 'edg/')) return 'Chrome';
    if (str_contains($ua, 'firefox/')) return 'Firefox';
    if (str_contains($ua, 'safari/') && !str_contains($ua, 'chrome/')) return 'Safari';
    return 'Այլ browser';
}

function wp_admin_updates_device_search_haystack(array $device): string {
    $parts = [
        wp_admin_updates_install_identity($device),
        wp_admin_updates_install_secondary($device),
        (string)($device['device_id'] ?? ''),
        (string)($device['device_signature'] ?? ''),
        (string)($device['ip_address'] ?? ''),
        (string)($device['source'] ?? ''),
        wp_admin_updates_install_platform((string)($device['user_agent'] ?? '')),
        wp_admin_updates_install_browser((string)($device['user_agent'] ?? '')),
        (string)($device['user_agent'] ?? ''),
    ];

    return mb_strtolower(trim(implode(' ', $parts)));
}

function wp_admin_updates_filter_devices(array $devices, array $filters): array {
    $search = trim((string)($filters['search'] ?? ''));
    $link = (string)($filters['link'] ?? 'all');
    $platform = (string)($filters['platform'] ?? 'all');
    $browser = (string)($filters['browser'] ?? 'all');

    $searchNeedle = $search !== '' ? mb_strtolower($search) : '';

    $filtered = array_filter($devices, function(array $device) use ($searchNeedle, $link, $platform, $browser): bool {
        $devicePlatform = wp_admin_updates_install_platform((string)($device['user_agent'] ?? ''));
        $deviceBrowser = wp_admin_updates_install_browser((string)($device['user_agent'] ?? ''));
        $hasLink = wp_admin_updates_install_has_link($device);

        if ($searchNeedle !== '' && !str_contains(wp_admin_updates_device_search_haystack($device), $searchNeedle)) {
            return false;
        }

        if ($link === 'linked' && !$hasLink) {
            return false;
        }

        if ($link === 'guest' && $hasLink) {
            return false;
        }

        if ($platform !== 'all' && $devicePlatform !== $platform) {
            return false;
        }

        if ($browser !== 'all' && $deviceBrowser !== $browser) {
            return false;
        }

        return true;
    });

    return array_values($filtered);
}

function wp_admin_updates_sort_devices(array $devices, string $sort): array {
    usort($devices, function(array $a, array $b) use ($sort): int {
        $aIdentity = mb_strtolower(wp_admin_updates_install_identity($a));
        $bIdentity = mb_strtolower(wp_admin_updates_install_identity($b));
        $aInstalled = strtotime((string)($a['installed_at'] ?? '')) ?: 0;
        $bInstalled = strtotime((string)($b['installed_at'] ?? '')) ?: 0;
        $aLastSeen = strtotime((string)($a['last_seen_at'] ?? '')) ?: 0;
        $bLastSeen = strtotime((string)($b['last_seen_at'] ?? '')) ?: 0;
        $aPlatform = wp_admin_updates_install_platform((string)($a['user_agent'] ?? ''));
        $bPlatform = wp_admin_updates_install_platform((string)($b['user_agent'] ?? ''));

        return match ($sort) {
            'last_seen_oldest' => $aLastSeen <=> $bLastSeen,
            'installed_newest' => $bInstalled <=> $aInstalled,
            'installed_oldest' => $aInstalled <=> $bInstalled,
            'identity_asc' => $aIdentity <=> $bIdentity,
            'identity_desc' => $bIdentity <=> $aIdentity,
            'platform_asc' => [$aPlatform, $aIdentity] <=> [$bPlatform, $bIdentity],
            default => $bLastSeen <=> $aLastSeen,
        };
    });

    return $devices;
}

function wp_admin_updates_device_filter_options(array $mainDevices, array $adminDevices): array {
    $platforms = [];
    $browsers = [];

    foreach (array_merge($mainDevices, $adminDevices) as $device) {
        $platforms[wp_admin_updates_install_platform((string)($device['user_agent'] ?? ''))] = true;
        $browsers[wp_admin_updates_install_browser((string)($device['user_agent'] ?? ''))] = true;
    }

    $platformValues = array_keys($platforms);
    sort($platformValues, SORT_NATURAL | SORT_FLAG_CASE);

    $browserValues = array_keys($browsers);
    sort($browserValues, SORT_NATURAL | SORT_FLAG_CASE);

    return [
        'platforms' => $platformValues,
        'browsers' => $browserValues,
    ];
}

function wp_admin_updates_history_action_label(string $action): string {
    $action = trim($action);
    return match ($action) {
        'publish_release' => 'Հրապարակել և տեղադրել',
        'save_release' => 'Պահպանել թարմացումը',
        'save_maintenance' => 'Պահպանել տեխնիկական աշխատանքները',
        'save_page_modes' => 'Պահպանել ծրագրային էջերը',
        'save_access' => 'Պահպանել մուտքերն ու նշումները',
        'approve_song_request' => 'Հաստատել մոդերացիայի հարցումը',
        'reject_song_request' => 'Մերժել մոդերացիայի հարցումը',
        'update_translation_cache_entry' => 'Թարմացնել թարգմանված տողը',
        'delete_translation_cache_entry' => 'Ջնջել թարգմանված տողը',
        'clear_translation_cache' => 'Մաքրել թարգմանությունների cache-ը',
        'save_song_title_translations' => 'Պահպանել երգի վերնագրի թարգմանությունները',
        'rollback' => 'Վերականգնել տարբերակը',
        'bootstrap_admin' => 'Սկզբնական ադմին մուտք',
        'save_general', 'save' => 'Պահպանել',
        default => $action !== '' ? $action : 'Պահպանել',
    };
}

function wp_admin_updates_history_search_haystack(array $item): string {
    $snapshot = !empty($item['snapshot']) && is_array($item['snapshot']) ? $item['snapshot'] : [];
    $changedFields = !empty($item['changed_fields']) && is_array($item['changed_fields'])
        ? implode(' ', array_map('strval', $item['changed_fields']))
        : '';

    $parts = [
        (string)($item['actor'] ?? ''),
        wp_admin_updates_history_action_label((string)($item['action'] ?? 'save')),
        (string)($snapshot['app_version'] ?? ''),
        (string)($snapshot['web_version'] ?? ''),
        (string)($snapshot['app_release_summary'] ?? ''),
        (string)($snapshot['web_release_summary'] ?? ''),
        (string)($snapshot['moderation_title'] ?? ''),
        (string)($snapshot['moderation_submitted_by'] ?? ''),
        (string)($snapshot['moderation_submitted_email'] ?? ''),
        (string)($snapshot['moderation_review_note'] ?? ''),
        (string)($item['note'] ?? ''),
        $changedFields,
    ];

    return mb_strtolower(trim(implode(' ', $parts)));
}

function wp_admin_updates_push_history_search_haystack(array $item): string {
    $parts = [
        (string)($item['title'] ?? ''),
        (string)($item['body'] ?? ''),
        (string)($item['actor'] ?? ''),
        (string)($item['tag'] ?? ''),
        (string)($item['url'] ?? ''),
    ];

    return mb_strtolower(trim(implode(' ', $parts)));
}

function wp_admin_updates_csrf_token(): string {
    if (empty($_SESSION['admin_updates_csrf']) || !is_string($_SESSION['admin_updates_csrf'])) {
        $_SESSION['admin_updates_csrf'] = bin2hex(random_bytes(32));
    }
    return (string)$_SESSION['admin_updates_csrf'];
}

function wp_admin_updates_verify_csrf(?string $token): bool {
    $sessionToken = (string)($_SESSION['admin_updates_csrf'] ?? '');
    $token = (string)($token ?? '');
    return $sessionToken !== '' && $token !== '' && hash_equals($sessionToken, $token);
}

function wp_admin_updates_build_release_push_payload(array $previousConfig, array $nextConfig, string $actorLabel): array {
    $appVersion = trim((string)($nextConfig['app_version'] ?? $previousConfig['app_version'] ?? ''));
    $webVersion = trim((string)($nextConfig['web_version'] ?? $previousConfig['web_version'] ?? ''));
    $appChanged = $appVersion !== '' && $appVersion !== trim((string)($previousConfig['app_version'] ?? ''));
    $webChanged = $webVersion !== '' && $webVersion !== trim((string)($previousConfig['web_version'] ?? ''));

    $title = trim((string)($nextConfig['app_title'] ?? ''));
    if (!$appChanged && $webChanged) {
        $title = trim((string)($nextConfig['web_title'] ?? $title));
    }
    if ($title === '') {
        $title = 'Առկա է թարմացում';
    }

    $versionParts = [];
    if ($appChanged) {
        $versionParts[] = 'Ծրագիր ' . $appVersion;
    }
    if ($webChanged) {
        $versionParts[] = 'Կայք ' . $webVersion;
    }
    if (!$versionParts) {
        if ($appVersion !== '') {
            $versionParts[] = 'Ծրագիր ' . $appVersion;
        }
        if ($webVersion !== '') {
            $versionParts[] = 'Կայք ' . $webVersion;
        }
    }

    $summary = trim((string)($nextConfig['app_release_summary'] ?? ''));
    if ($summary === '') {
        $summary = trim((string)($nextConfig['web_release_summary'] ?? ''));
    }

    $body = 'Worship Platform-ում առկա է նոր թարմացում։';
    if ($versionParts) {
        $body .= ' ' . implode(' • ', $versionParts) . '։';
    }
    if ($summary !== '') {
        $body .= ' ' . $summary;
    }

    return [
        'title' => mb_substr($title, 0, 160),
        'body' => mb_substr($body, 0, 600),
        'url' => '/main.html',
        'icon' => '/wolarm_youth.png',
        'tag' => 'worship-release-update',
        'actor' => $actorLabel,
    ];
}

function wp_admin_updates_release_compare_fields(): array {
    return [
        'app_version',
        'web_version',
        'app_release_type',
        'web_release_type',
        'app_release_summary',
        'web_release_summary',
        'app_title',
        'web_title',
        'app_message',
        'web_message',
        'app_release_stamp',
        'web_release_stamp',
    ];
}

function wp_admin_updates_release_diff_fields(array $before, array $after): array {
    $changed = [];
    foreach (wp_admin_updates_release_compare_fields() as $field) {
        if ((string)($before[$field] ?? '') !== (string)($after[$field] ?? '')) {
            $changed[] = $field;
        }
    }
    return $changed;
}

function wp_admin_updates_last_committed_release_snapshot(): ?array {
    foreach (wp_version_history_load(200) as $item) {
        $action = trim((string)($item['action'] ?? ''));
        if (!in_array($action, ['save_release', 'publish_release', 'rollback', 'save_general'], true)) {
            continue;
        }

        $snapshot = $item['snapshot'] ?? null;
        if (is_array($snapshot) && $snapshot) {
            return $snapshot;
        }
    }

    return null;
}

function wp_admin_updates_append_release_history(array $snapshot, array $changedFields, string $actorLabel, string $actorIp, string $action = 'save_release'): string {
    $historyId = bin2hex(random_bytes(8));
    $historyAt = wp_version_now_iso();
    $historySnapshot = $snapshot;
    $historySnapshot['updated_at'] = $historyAt;

    wp_version_history_append([
        'id' => $historyId,
        'at' => $historyAt,
        'actor' => $actorLabel,
        'ip' => $actorIp,
        'action' => $action,
        'changed_fields' => array_values($changedFields),
        'snapshot' => $historySnapshot,
        'note' => (string)($historySnapshot['meta_note'] ?? ''),
    ]);

    return $historyId;
}

function wp_admin_updates_prepare_release_stamps(array $currentConfig, array $nextConfig, bool $withPackage): array {
    $stamp = wp_version_now_iso();

    $appFields = ['app_version', 'app_release_type', 'app_release_summary', 'app_title', 'app_message'];
    $webFields = ['web_version', 'web_release_type', 'web_release_summary', 'web_title', 'web_message'];

    $appChanged = $withPackage;
    foreach ($appFields as $field) {
        if ((string)($nextConfig[$field] ?? $currentConfig[$field] ?? '') !== (string)($currentConfig[$field] ?? '')) {
            $appChanged = true;
            break;
        }
    }

    $webChanged = $withPackage;
    foreach ($webFields as $field) {
        if ((string)($nextConfig[$field] ?? $currentConfig[$field] ?? '') !== (string)($currentConfig[$field] ?? '')) {
            $webChanged = true;
            break;
        }
    }

    if ($appChanged) {
        $nextConfig['app_release_stamp'] = $stamp;
    }

    if ($webChanged) {
        $nextConfig['web_release_stamp'] = $stamp;
    }

    return $nextConfig;
}

function wp_admin_updates_collect_input(array $config): array {
    return [
        'app_version' => array_key_exists('app_version', $_POST) ? $_POST['app_version'] : ($config['app_version'] ?? ''),
        'web_version' => array_key_exists('web_version', $_POST) ? $_POST['web_version'] : ($config['web_version'] ?? ''),
        'app_release_type' => array_key_exists('app_release_type', $_POST) ? $_POST['app_release_type'] : ($config['app_release_type'] ?? ''),
        'web_release_type' => array_key_exists('web_release_type', $_POST) ? $_POST['web_release_type'] : ($config['web_release_type'] ?? ''),
        'app_release_summary' => array_key_exists('app_release_summary', $_POST) ? $_POST['app_release_summary'] : ($config['app_release_summary'] ?? ''),
        'web_release_summary' => array_key_exists('web_release_summary', $_POST) ? $_POST['web_release_summary'] : ($config['web_release_summary'] ?? ''),
        'app_title' => array_key_exists('app_title', $_POST) ? $_POST['app_title'] : ($config['app_title'] ?? ''),
        'app_message' => array_key_exists('app_message', $_POST) ? $_POST['app_message'] : ($config['app_message'] ?? ''),
        'web_title' => array_key_exists('web_title', $_POST) ? $_POST['web_title'] : ($config['web_title'] ?? ''),
        'web_message' => array_key_exists('web_message', $_POST) ? $_POST['web_message'] : ($config['web_message'] ?? ''),
        'maintenance_enabled' => array_key_exists('maintenance_enabled', $_POST) ? !empty($_POST['maintenance_enabled']) : !empty($config['maintenance_enabled']),
        'maintenance_message' => array_key_exists('maintenance_message', $_POST) ? $_POST['maintenance_message'] : ($config['maintenance_message'] ?? ''),
        'maintenance_start_at' => array_key_exists('maintenance_start_at', $_POST) ? $_POST['maintenance_start_at'] : ($config['maintenance_start_at'] ?? ''),
        'maintenance_end_at' => array_key_exists('maintenance_end_at', $_POST) ? $_POST['maintenance_end_at'] : ($config['maintenance_end_at'] ?? ''),
        'maintenance_allowed_ips' => array_key_exists('maintenance_allowed_ips', $_POST) ? $_POST['maintenance_allowed_ips'] : ($config['maintenance_allowed_ips'] ?? ''),
        'admin_emails' => array_key_exists('admin_emails', $_POST) ? $_POST['admin_emails'] : ($config['admin_emails'] ?? ''),
        'admin_user_permissions' => array_key_exists('admin_permission_rows', $_POST) ? $_POST['admin_permission_rows'] : ($config['admin_user_permissions'] ?? []),
        'social_auth_google_client_id' => array_key_exists('social_auth_google_client_id', $_POST) ? $_POST['social_auth_google_client_id'] : ($config['social_auth_google_client_id'] ?? ''),
        'social_auth_google_redirect_uri' => array_key_exists('social_auth_google_redirect_uri', $_POST) ? $_POST['social_auth_google_redirect_uri'] : ($config['social_auth_google_redirect_uri'] ?? ''),
        'page_app_modes' => array_key_exists('page_app_modes_present', $_POST) ? ($_POST['page_app_modes'] ?? []) : ($config['page_app_modes'] ?? []),
        'page_web_modes' => array_key_exists('page_web_modes_present', $_POST) ? ($_POST['page_web_modes'] ?? []) : ($config['page_web_modes'] ?? []),
        'meta_note' => array_key_exists('meta_note', $_POST) ? $_POST['meta_note'] : ($config['meta_note'] ?? ''),
        'release_apply_mode' => array_key_exists('release_apply_mode', $_POST) ? $_POST['release_apply_mode'] : 'without_file',
        'server_package_mode' => array_key_exists('server_package_mode', $_POST) ? $_POST['server_package_mode'] : ($config['server_package_mode'] ?? 'partial'),
    ];
}

function wp_admin_updates_has_package_upload(array $file): bool {
    if (empty($file) || !isset($file['error'])) {
        return false;
    }

    if ((int)$file['error'] === UPLOAD_ERR_NO_FILE) {
        return false;
    }

    return trim((string)($file['name'] ?? '')) !== '';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!wp_admin_updates_verify_csrf($_POST['csrf_token'] ?? '')) {
        if (wp_admin_updates_is_async_request()) {
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode([
                'ok' => false,
                'message' => 'Անվտանգության ստուգումը չանցավ։ Խնդրում ենք էջը թարմացնել և կրկնել գործողությունը։',
                'type' => 'error',
                'csrf_failed' => true,
                'new_csrf_token' => wp_admin_updates_csrf_token(),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
        $_SESSION['admin_updates_flash'] = [
            'message' => 'Անվտանգության ստուգումը չանցավ։ Խնդրում ենք էջը թարմացնել և կրկնել գործողությունը։',
            'type' => 'error',
        ];
        header('Location: /admin_updates.php');
        exit;
    }

    $action = (string)($_POST['form_action'] ?? 'apply_release');
    $removeSubscriptionId = '';
    if (strpos($action, 'remove_push_subscription:') === 0) {
        $removeSubscriptionId = trim((string)substr($action, strlen('remove_push_subscription:')));
        $action = 'remove_push_subscription';
    }
    $requiredSection = wp_admin_updates_action_section($action);
    if ($requiredSection !== null && !wp_admin_updates_has_section_access($adminSectionPermissions, $requiredSection)) {
        if (wp_admin_updates_is_async_request()) {
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode([
                'ok' => false,
                'message' => 'Այս գործողությունը հասանելի չէ ձեր օգտահաշվի համար։ Անհրաժեշտ է `' . wp_admin_updates_section_label($requiredSection) . '` բաժնի թույլտվություն։',
                'type' => 'error',
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
        $_SESSION['admin_updates_flash'] = [
            'message' => 'Այս գործողությունը հասանելի չէ ձեր օգտահաշվի համար։ Անհրաժեշտ է `' . wp_admin_updates_section_label($requiredSection) . '` բաժնի թույլտվություն։',
            'type' => 'error',
        ];
        header('Location: /admin_updates.php');
        exit;
    }
    $actorLabel = wp_admin_updates_actor_label($adminUser);
    $actorIp = (string)($_SERVER['REMOTE_ADDR'] ?? '');

    if ($action === 'save_push_settings') {
        $ok = wp_push_save_config([
            'enabled' => !empty($_POST['push_enabled']),
            'vapid_subject' => $_POST['push_subject'] ?? ($pushConfig['vapid_subject'] ?? ''),
        ]);

        if ($ok) {
            $message = 'Push ծանուցումների կարգավորումները պահպանվեցին։';
        } else {
            $message = 'Չհաջողվեց պահպանել push ծանուցումների կարգավորումները։';
            $messageType = 'error';
        }
    } elseif ($action === 'send_push') {
        $payload = [
            'title' => trim((string)($_POST['push_title'] ?? '')),
            'body' => trim((string)($_POST['push_body'] ?? '')),
            'url' => trim((string)($_POST['push_url'] ?? '/main.html')) ?: '/main.html',
            'icon' => trim((string)($_POST['push_icon'] ?? '/wolarm_youth.png')) ?: '/wolarm_youth.png',
            'tag' => trim((string)($_POST['push_tag'] ?? 'worship-admin')) ?: 'worship-admin',
            'actor' => $actorLabel,
        ];

        if ($payload['title'] === '' || $payload['body'] === '') {
            $message = 'Push ծանուցման վերնագիրն ու բովանդակությունը պարտադիր են։';
            $messageType = 'error';
        } else {
            $result = wp_push_send_notification($payload);
            $message = (string)($result['message'] ?? 'Push ուղարկման գործողությունն ավարտվեց։');
            $messageType = !empty($result['ok']) ? 'success' : 'error';
        }
    } elseif ($action === 'remove_push_subscription') {
        $subscriptionId = $removeSubscriptionId !== '' ? $removeSubscriptionId : trim((string)($_POST['push_subscription_id'] ?? ''));
        $subscription = wp_push_find_subscription_by_id($subscriptionId);

        if (!$subscription) {
            $message = 'Ընտրված push սարքը չգտնվեց։';
            $messageType = 'error';
        } else {
            wp_push_block_endpoint(
                (string)($subscription['endpoint'] ?? ''),
                $actorLabel,
                'removed_by_admin'
            );
            $removed = wp_push_remove_subscription_by_id($subscriptionId);
            if ($removed) {
                $message = 'Push սարքը հեռացվեց և տվյալ սարքի համար push-ը անջատվեց admin-ի կողմից։';
            } else {
                $message = 'Չհաջողվեց հեռացնել push սարքը։';
                $messageType = 'error';
            }
        }
    } elseif ($action === 'remove_install_device') {
        $scope = wp_install_normalize_scope((string)($_POST['install_scope'] ?? 'main'));
        $deviceId = wp_install_sanitize_device_id((string)($_POST['install_device_id'] ?? ''));
        $deviceSignature = wp_install_sanitize_signature((string)($_POST['install_device_signature'] ?? ''));

        if ($deviceId === '' && $deviceSignature === '') {
            $message = 'Սարքի տվյալը չգտնվեց։';
            $messageType = 'error';
        } else {
            $removed = wp_install_remove_device($scope, $deviceId, $deviceSignature);
            if ($removed) {
                $message = $scope === 'admin'
                    ? 'Ադմին ծրագրի սարքի տվյալը մաքրվեց։'
                    : 'Հիմնական ծրագրի սարքի տվյալը մաքրվեց։';
            } else {
                $message = 'Չհաջողվեց մաքրել սարքի տվյալը։';
                $messageType = 'error';
            }
        }
    } elseif ($action === 'approve_song_request' || $action === 'reject_song_request') {
        $requestId = (int)($_POST['song_request_id'] ?? 0);
        $reviewNote = trim((string)($_POST['song_request_review_note'] ?? ''));
        $decision = $action === 'approve_song_request' ? 'approved' : 'rejected';
        $result = wp_song_request_apply_decision($requestId, $decision, $adminUser, $reviewNote);
        $message = (string)($result['message'] ?? 'Մոդերացիայի հարցումը մշակվեց։');
        $messageType = !empty($result['ok']) ? 'success' : 'error';
    } elseif ($action === 'clear_translation_cache') {
        $clearLang = in_array((string)($_POST['translation_cache_lang'] ?? 'all'), ['all', 'ru', 'en'], true)
            ? (string)($_POST['translation_cache_lang'] ?? 'all')
            : 'all';
        $removedCount = wp_translation_cache_clear($clearLang);
        $message = $clearLang === 'all'
            ? 'Թարգմանությունների ամբողջ cache-ը մաքրվեց։ Ջնջված գրառումներ՝ ' . $removedCount . '։'
            : wp_admin_updates_translation_lang_label($clearLang) . ' թարգմանությունների cache-ը մաքրվեց։ Ջնջված գրառումներ՝ ' . $removedCount . '։';
    } elseif ($action === 'delete_translation_cache_entry') {
        $entryLang = (string)($_POST['translation_entry_lang'] ?? '');
        $entryContext = trim((string)($_POST['translation_entry_context'] ?? ''));
        $entrySource = trim((string)($_POST['translation_entry_source'] ?? ''));

        if (!in_array($entryLang, ['ru', 'en'], true) || $entryContext === '' || $entrySource === '') {
            $message = 'Թարգմանության գրառման տվյալները թերի են։';
            $messageType = 'error';
        } else {
            $removed = wp_translation_cache_delete($entryLang, $entryContext, $entrySource);
            if ($removed) {
                $message = 'Թարգմանության ընտրված գրառումը ջնջվեց cache-ից։';
            } else {
                $message = 'Չհաջողվեց ջնջել թարգմանության գրառումը։';
                $messageType = 'error';
            }
        }
    } elseif ($action === 'update_translation_cache_entry') {
        $entryLang = (string)($_POST['translation_entry_lang'] ?? '');
        $entryContext = trim((string)($_POST['translation_entry_context'] ?? ''));
        $entrySource = trim((string)($_POST['translation_entry_source'] ?? ''));
        $entryText = trim((string)($_POST['translation_entry_text'] ?? ''));

        if (!in_array($entryLang, ['ru', 'en'], true) || $entryContext === '' || $entrySource === '' || $entryText === '') {
            $message = 'Թարգմանության թարմացման համար լրացրու բոլոր պարտադիր դաշտերը։';
            $messageType = 'error';
        } else {
            $saved = wp_translation_cache_set($entryLang, $entryContext, $entrySource, $entryText);
            if ($saved) {
                $message = 'Թարգմանության գրառումը պահպանվեց։';
            } else {
                $message = 'Չհաջողվեց պահպանել թարգմանության գրառումը։';
                $messageType = 'error';
            }
        }
    } elseif ($action === 'save_song_title_translations') {
        $songId = (int)($_POST['translation_song_id'] ?? 0);
        $latText = trim((string)($_POST['translation_song_lat'] ?? ''));
        $ruText = trim((string)($_POST['translation_song_ru'] ?? ''));
        $enText = trim((string)($_POST['translation_song_en'] ?? ''));

        if ($songId <= 0) {
            $message = 'Նախ ընտրիր երգը ցանկից։';
            $messageType = 'error';
        } elseif ($latText === '' && $ruText === '' && $enText === '') {
            $message = 'Լրացրու գոնե մեկ տարբերակը։';
            $messageType = 'error';
        } else {
            try {
                $conn = wp_runtime_open_mysqli();
                wp_runtime_ensure_song_title_columns_mysqli($conn);
                $stmt = $conn->prepare("SELECT title FROM songs WHERE id = ? LIMIT 1");
                $stmt->bind_param("i", $songId);
                $stmt->execute();
                $res = $stmt->get_result();
                $row = $res ? $res->fetch_assoc() : null;
                if ($res) {
                    $res->free();
                }
                $stmt->close();
                $conn->close();
            } catch (Throwable $e) {
                $row = null;
            }

            $sourceTitle = trim((string)($row['title'] ?? ''));
            if ($sourceTitle === '') {
                $message = 'Ընտրված երգը չգտնվեց։';
                $messageType = 'error';
            } else {
                $variants = wp_admin_updates_parse_song_title_variants($sourceTitle);
                $hyTitle = trim((string)($variants['hy'] ?? $sourceTitle));
                $combinedTitle = implode(' / ', array_values(array_filter([
                    $hyTitle,
                    $latText,
                    $enText,
                    $ruText,
                ], static fn($value): bool => trim((string)$value) !== '')));

                $savedLangs = [];
                $failedLangs = [];
                $dbUpdated = false;

                try {
                    $conn = wp_runtime_open_mysqli();
                    wp_runtime_ensure_song_title_columns_mysqli($conn);
                    $stmt = $conn->prepare("UPDATE songs SET title = ?, title_hy = ?, title_lat = ?, title_en = ?, title_ru = ? WHERE id = ?");
                    $stmt->bind_param("sssssi", $combinedTitle, $hyTitle, $latText, $enText, $ruText, $songId);
                    $dbUpdated = $stmt->execute();
                    $stmt->close();
                    $conn->close();
                } catch (Throwable $e) {
                    $dbUpdated = false;
                }

                if ($latText !== '' && !$dbUpdated) {
                    $failedLangs[] = 'լատինատառ հայերեն';
                } elseif ($latText !== '') {
                    $savedLangs[] = 'լատինատառ հայերեն';
                }

                if ($ruText !== '') {
                    if (wp_translation_cache_set('ru', 'api.song.title', $combinedTitle, $ruText) || wp_translation_cache_set('ru', 'api.song.title', $sourceTitle, $ruText)) {
                        $savedLangs[] = 'ռուսերեն';
                    } else {
                        $failedLangs[] = 'ռուսերեն';
                    }
                }

                if ($enText !== '') {
                    if (wp_translation_cache_set('en', 'api.song.title', $combinedTitle, $enText) || wp_translation_cache_set('en', 'api.song.title', $sourceTitle, $enText)) {
                        $savedLangs[] = 'անգլերեն';
                    } else {
                        $failedLangs[] = 'անգլերեն';
                    }
                }

                if ($savedLangs && !$failedLangs) {
                    $message = 'Երգի վերնագրի թարգմանությունը պահպանվեց՝ ' . implode(', ', $savedLangs) . '։';
                } elseif ($savedLangs) {
                    $message = 'Մասամբ պահպանվեց՝ ' . implode(', ', $savedLangs) . '։ Չհաջողվեց՝ ' . implode(', ', $failedLangs) . '։';
                    $messageType = 'error';
                } else {
                    $message = 'Չհաջողվեց պահպանել երգի վերնագրի թարգմանությունը։';
                    $messageType = 'error';
                }
            }
        }
    } elseif ($action === 'apply_release') {
        $input = wp_admin_updates_collect_input($config);
        $input = wp_admin_updates_preserve_actor_access($input, $adminUser);
        $releaseApplyMode = trim((string)($input['release_apply_mode'] ?? 'without_file'));
        unset($input['release_apply_mode']);
        $withPackage = $releaseApplyMode === 'with_file';
        $input = wp_admin_updates_prepare_release_stamps($config, $input, $withPackage);

        if (!$withPackage) {
            $releaseBaseline = wp_admin_updates_last_committed_release_snapshot() ?: $config;
            $ok = wp_version_save($input, [
                'actor' => $actorLabel,
                'ip' => $actorIp,
                'action' => 'save_release',
            ]);

            if ($ok) {
                $saveResult = wp_version_last_save_result();
                $releaseSnapshot = !empty($saveResult['config']) && is_array($saveResult['config']) ? $saveResult['config'] : $config;
                $releaseDiffFields = wp_admin_updates_release_diff_fields($releaseBaseline, $releaseSnapshot);
                $shouldAnnounceRelease = !empty($saveResult['changed']) || !empty($releaseDiffFields);

                if ($shouldAnnounceRelease) {
                    if (empty($saveResult['changed']) && $releaseDiffFields) {
                        wp_admin_updates_append_release_history($releaseSnapshot, $releaseDiffFields, $actorLabel, $actorIp, 'save_release');
                    }

                    $message = 'Թարմացման տվյալները պահպանվեցին առանց ֆայլի տեղադրման։';

                    $pushResult = wp_push_send_notification(
                        wp_admin_updates_build_release_push_payload($releaseBaseline, $releaseSnapshot, $actorLabel)
                    );

                    if (!empty($pushResult['ok'])) {
                        $message .= ' Թարմացման push ծանուցումը նույնպես ուղարկվեց։ ' . (string)($pushResult['message'] ?? '');
                    } else {
                        $message .= ' Բայց ավտոմատ push ծանուցումը չուղարկվեց։ ' . (string)($pushResult['message'] ?? '');
                    }
                } else {
                    $message = 'Թարմացման բաժնում նոր փոփոխություն չկար, դրա համար պատմություն ու push նույնպես չավելացվեցին։';
                }
            } else {
                $message = 'Չհաջողվեց պահպանել թարմացման տվյալները։';
                $messageType = 'error';
            }
        } else {
            $packageFile = trim((string)($config['server_package_file'] ?? ''));

            if (wp_admin_updates_has_package_upload($_FILES['server_package_file'] ?? [])) {
                $upload = wp_release_store_uploaded_package($_FILES['server_package_file'] ?? []);
                if (!$upload['ok']) {
                    $message = (string)($upload['message'] ?? 'Չհաջողվեց upload անել server package-ը։');
                    $messageType = 'error';
                } else {
                    $packageFile = (string)$upload['file'];
                    $input['server_package_file'] = $packageFile;
                    $input['server_package_uploaded_at'] = wp_version_now_iso();
                    $input['server_package_uploaded_by'] = $actorLabel;
                }
            }

            if ($messageType !== 'error') {
                $packagePath = wp_release_resolve_package_path($packageFile);

                if (!$packagePath) {
                    $message = 'Ֆայլով թարմացման համար package չգտնվեց։ Ընտրեք ZIP package կամ օգտագործեք արդեն առկա փաթեթը։';
                    $messageType = 'error';
                } else {
                    $apply = wp_release_apply_package($packagePath);
                    if (empty($apply['ok'])) {
                        $message = (string)($apply['message'] ?? 'Չհաջողվեց կիրառել package-ը սերվերի վրա։');
                        $messageType = 'error';
                    } else {
                        $input['server_package_file'] = basename($packagePath);
                        $input['server_package_applied_at'] = wp_version_now_iso();
                        $input['server_package_applied_by'] = $actorLabel;
                        $input['server_package_last_backup'] = (string)($apply['backup_id'] ?? '');
                        $input['server_package_linked_app_version'] = (string)($input['app_version'] ?? $config['app_version'] ?? '');
                        $input['server_package_linked_web_version'] = (string)($input['web_version'] ?? $config['web_version'] ?? '');
                        $input['server_package_release_synced_at'] = wp_version_now_iso();

                        $ok = wp_version_save($input, [
                            'actor' => $actorLabel,
                            'ip' => $actorIp,
                            'action' => 'publish_release',
                        ]);

                        if ($ok) {
                            $message = 'Թարմացումը կիրառվեց ֆայլի կցումով։ Սերվերի վրա կիրառվել է ' . (int)($apply['applied_count'] ?? 0) . ' ֆայլ, backup ID՝ ' . (string)($apply['backup_id'] ?? '—') . '։';

                            $pushResult = wp_push_send_notification(
                                wp_admin_updates_build_release_push_payload($config, $input, $actorLabel)
                            );

                            if (!empty($pushResult['ok'])) {
                                $message .= ' Թարմացման push ծանուցումը նույնպես ուղարկվեց։ ' . (string)($pushResult['message'] ?? '');
                            } else {
                                $message .= ' Բայց ավտոմատ push ծանուցումը չուղարկվեց։ ' . (string)($pushResult['message'] ?? '');
                            }
                        } else {
                            $message = 'Package-ը կիրառվեց, բայց version publish save-ը չհաջողվեց։';
                            $messageType = 'error';
                        }
                    }
                }
            }
        }
    } elseif ($action === 'clear_history') {
        $ok = wp_version_history_clear();

        if ($ok) {
            $message = 'Update history-ը ամբողջությամբ ջնջվեց։';
        } else {
            $message = 'Չհաջողվեց ջնջել update history-ը։';
            $messageType = 'error';
        }
    } elseif ($action === 'clear_push_history') {
        $ok = wp_push_history_clear();

        if ($ok) {
            $message = 'Push պատմությունը ամբողջությամբ ջնջվեց։';
        } else {
            $message = 'Չհաջողվեց ջնջել push պատմությունը։';
            $messageType = 'error';
        }
    } elseif ($action === 'rollback') {
        $historyId = trim((string)($_POST['history_id'] ?? ''));
        $historyItem = wp_version_history_find($historyId);

        if (!$historyItem || empty($historyItem['snapshot']) || !is_array($historyItem['snapshot'])) {
            $message = 'Rollback-ի համար անհրաժեշտ snapshot-ը չգտնվեց։';
            $messageType = 'error';
        } else {
            $rollbackSnapshot = wp_admin_updates_preserve_actor_access($historyItem['snapshot'], $adminUser);

            $ok = wp_version_save($rollbackSnapshot, [
                'actor' => $actorLabel,
                'ip' => $actorIp,
                'action' => 'rollback',
            ]);

            if ($ok) {
                $saveResult = wp_version_last_save_result();
                $message = !empty($saveResult['changed'])
                    ? 'Configuration-ը վերականգնվեց ընտրած history entry-ից։'
                    : 'Ընտրված history entry-ն արդեն ընթացիկ վիճակն է, նոր փոփոխություն չկար։';
            } else {
                $message = 'Rollback-ը չհաջողվեց։';
                $messageType = 'error';
            }
        }
    } elseif (in_array($action, ['save_release_draft', 'save_maintenance', 'save_page_modes', 'save_access', 'save_access_permissions', 'save_access_draft'], true)) {
        if ($action === 'save_access_permissions') {
            $input = $config;
            $input['admin_user_permissions'] = array_key_exists('admin_permission_rows_present', $_POST)
                ? ($_POST['admin_permission_rows'] ?? [])
                : ($config['admin_user_permissions'] ?? []);
            $input = wp_admin_updates_preserve_actor_access($input, $adminUser);
        } elseif ($action === 'save_release_draft' || $action === 'save_access_draft') {
            $input = wp_admin_updates_collect_input($config);
            $input = wp_admin_updates_preserve_actor_access($input, $adminUser);
            unset($input['release_apply_mode']);
        } else {
            $input = wp_admin_updates_collect_input($config);
            $input = wp_admin_updates_preserve_actor_access($input, $adminUser);
            unset($input['release_apply_mode']);
            if ($action === 'save_page_modes' && array_key_exists('page_app_modes_present', $_POST)) {
                $input['page_app_modes'] = $_POST['page_app_modes'] ?? [];
            }
        }

        $secretSave = ['ok' => true, 'messages' => [], 'errors' => []];
        if ($action === 'save_access') {
            $secretSave = wp_admin_updates_store_social_secrets_from_post();
            if (!$secretSave['ok']) {
                $message = implode(' ', $secretSave['errors']);
                $messageType = 'error';
            }
        }

        $ok = $messageType === 'error' ? false : wp_version_save($input, [
                'actor' => $actorLabel,
                'ip' => $actorIp,
                'action' => match ($action) {
                    'save_release_draft' => 'save_release_draft',
                    'save_maintenance' => 'save_maintenance',
                    'save_page_modes' => 'save_page_modes',
                    'save_access' => 'save_access',
                    'save_access_permissions' => 'save_access_permissions',
                    'save_access_draft' => 'save_access_draft',
                    default => 'save',
                },
            ]);

        if ($ok) {
            $saveResult = wp_version_last_save_result();
            $changed = !empty($saveResult['changed']);
            if ($action === 'save_release_draft') {
                $message = $changed ? 'Թարմացման դաշտերը պահպանվեցին։' : 'Թարմացման բաժնում նոր փոփոխություն չկար։';
            } elseif ($action === 'save_maintenance') {
                $message = $changed ? 'Տեխնիկական սպասարկման տվյալները պահպանվեցին։' : 'Տեխնիկական սպասարկման բաժնում նոր փոփոխություն չկար։';
            } elseif ($action === 'save_page_modes') {
                $message = $changed ? 'Ծրագրային էջերի կարգավորումները պահպանվեցին։' : 'Ծրագրային էջերի բաժնում նոր փոփոխություն չկար։';
            } elseif ($action === 'save_access_permissions') {
                $message = $changed ? 'Օգտատիրոջ բաժինների թույլտվությունները պահպանվեցին։' : 'Թույլտվությունների բաժնում նոր փոփոխություն չկար։';
            } elseif ($action === 'save_access_draft') {
                $message = $changed ? 'Մուտքերի հիմնական դաշտերը պահպանվեցին։' : 'Մուտքերի բաժնում նոր փոփոխություն չկար։';
            } else {
                $message = $changed ? 'Մուտքերի և նշումների տվյալները պահպանվեցին։' : 'Մուտքերի և նշումների բաժնում նոր փոփոխություն չկար։';
                if (!empty($secretSave['messages'])) {
                    $message .= ' ' . implode(' ', $secretSave['messages']);
                }
            }
        } else {
            if ($messageType !== 'error') {
                $message = 'Չհաջողվեց պահպանել configuration-ը։';
                $messageType = 'error';
            }
        }
    } else {
        $input = wp_admin_updates_collect_input($config);
        $input = wp_admin_updates_preserve_actor_access($input, $adminUser);
        unset($input['release_apply_mode']);

        $ok = wp_version_save($input, [
            'actor' => $actorLabel,
            'ip' => $actorIp,
            'action' => 'save_general',
        ]);

        if ($ok) {
            $saveResult = wp_version_last_save_result();
            $message = !empty($saveResult['changed'])
                ? 'Configuration-ը պահպանվեց։ Նոր version/maintenance տվյալները հասանելի են հաջորդ check-ից սկսած։'
                : 'Պահպանելու նոր փոփոխություն չկար։';
        } else {
            $message = 'Չհաջողվեց պահպանել configuration-ը։';
            $messageType = 'error';
        }
    }

    $config = wp_version_load();
    $pushConfig = wp_push_bootstrap_config();
    $pushStats = wp_push_stats();
    $translationSettings = wp_translation_settings(true);
    $translationCacheStats = wp_translation_cache_counts();
    $translationEntries = wp_translation_cache_list_entries($translationFilters['lang'], $translationFilters['search'], 80);
    $translationSongOptions = wp_admin_updates_translation_song_options();

    if (wp_admin_updates_is_async_request()) {
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'ok' => $messageType !== 'error',
            'message' => $message,
            'type' => $messageType,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $_SESSION['admin_updates_flash'] = [
        'message' => $message,
        'type' => $messageType,
    ];

    header('Location: /admin_updates.php');
    exit;
}

$history = wp_version_history_load(25);
$isScheduledActive = wp_version_is_scheduled_maintenance_active($config);
$isMaintenanceActive = wp_version_is_maintenance_active($config);
$adminEmailsText = implode("\n", (array)($config['admin_emails'] ?? []));
$adminEmailCount = count(array_filter((array)($config['admin_emails'] ?? []), static fn($email): bool => trim((string)$email) !== ''));
$adminPermissionRows = wp_admin_updates_permission_rows($config, $adminUser);
$googleClientSecretStatus = wp_admin_updates_social_secret_status(wp_admin_updates_social_secret_value('social_auth_google_client_secret'));
$packageUploadedAt = wp_version_format_datetime_admin((string)($config['server_package_uploaded_at'] ?? ''));
$packageAppliedAt = wp_version_format_datetime_admin((string)($config['server_package_applied_at'] ?? ''));
$packageSyncedAt = wp_version_format_datetime_admin((string)($config['server_package_release_synced_at'] ?? ''));
$packageMode = (string)($config['server_package_mode'] ?? 'partial');
$packageLinkedAppVersion = trim((string)($config['server_package_linked_app_version'] ?? ''));
$packageLinkedWebVersion = trim((string)($config['server_package_linked_web_version'] ?? ''));
$isPackageSyncedToCurrentRelease =
    !empty($config['server_package_file']) &&
    $packageLinkedAppVersion !== '' &&
    $packageLinkedWebVersion !== '' &&
    $packageLinkedAppVersion === (string)($config['app_version'] ?? '') &&
    $packageLinkedWebVersion === (string)($config['web_version'] ?? '');
$pushLastSentAt = wp_version_format_datetime_admin((string)($pushConfig['last_sent_at'] ?? ''));
$pushHistory = wp_push_history_load(50);
$csrfToken = wp_admin_updates_csrf_token();
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Settings — Worship Platform Admin</title>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <?php include __DIR__ . '/admin_updates_css.php'; ?>
  <style>
  /* ── Settings page extras ── */
  :root {
    --line-soft: #f1f5f9;
    --radius-sm: 10px;
    --radius-md: 20px;
  }

  [hidden] { display:none !important; }

  /* Badges */
  .badge { display:inline-flex; align-items:center; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
  .badge.success { background:var(--success-bg); color:var(--success); }
  .badge.warning { background:var(--warning-bg); color:#b58b00; }
  .badge.danger  { background:var(--danger-bg);  color:var(--danger); }
  .badge.neutral { background:#f1f5f9; color:var(--muted); }

  /* Section-tab hidden buttons kept for JS */
  button.section-tab.nav-item {
    width:calc(100% - 32px); font-family:inherit; font-size:15px; font-weight:600;
    background:transparent; border:none; cursor:pointer; color:var(--muted);
    display:flex; align-items:center; gap:14px;
    padding:13px 24px; border-radius:12px; margin:2px 16px;
    transition:background .15s, color .15s; text-align:left;
  }
  button.section-tab.nav-item:hover { background:rgba(67,24,255,0.05); color:var(--text); }
  button.section-tab.nav-item.active { background:var(--primary); color:#fff; box-shadow:0 4px 15px rgba(67,24,255,0.3); }
  button.section-tab.nav-item.active svg { stroke:#fff; }

  /* Section content */
  .section-content { display:none; }
  .section-content.is-active { display:block; }

  /* Settings form */
  .settings-group { background:var(--surface); border-radius:var(--radius); padding:32px; box-shadow:var(--shadow-sm); margin-bottom:24px; }
  .settings-group h3 { font-size:18px; font-weight:700; margin:0 0 20px; color:var(--text); }
  .form-field { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
  .form-field label { font-size:13px; font-weight:700; color:var(--text); }
  .form-field input, .form-field textarea, .form-field select {
    padding:12px 14px; border:1px solid var(--line); border-radius:10px;
    font-family:inherit; font-size:14px; font-weight:500; color:var(--text);
    background:var(--surface); outline:none; transition:.15s;
  }
  .form-field input:focus, .form-field textarea:focus, .form-field select:focus {
    border-color:var(--primary); box-shadow:0 0 0 3px rgba(67,24,255,0.1);
  }
  .form-field textarea { min-height:100px; resize:vertical; }

  /* Section-specific: banner, chip, push stats */
  .section-focus { background:var(--surface); border-radius:var(--radius-lg); padding:28px; display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; box-shadow:var(--shadow-sm); }
  .section-focus-copy h2 { margin:0; font-size:22px; font-weight:700; color:var(--text); }
  .section-focus-copy p { margin:6px 0 0; color:var(--muted); }
  .chips { display:flex; gap:8px; flex-wrap:wrap; }
  .chip { background:#f1f5f9; padding:6px 12px; border-radius:8px; font-size:13px; font-weight:600; color:var(--text); }
  
  .banner { background:var(--primary); color:#fff; padding:20px 28px; border-radius:var(--radius); margin-bottom:24px; }
  .eyebrow { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); margin-bottom:8px; }

  code { background:#f1f5f9; padding:2px 8px; border-radius:6px; font-family:monospace; font-size:13px; color:var(--primary); }
  pre { background:#f8faff; border:1px solid var(--line); border-radius:12px; padding:20px; overflow:auto; font-size:13px; }

  .push-stats-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:16px; margin-bottom:24px; }
  .push-stat-card { background:var(--surface); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow-sm); text-align:center; }
  .push-stat-val { font-size:28px; font-weight:800; color:var(--text); display:block; }
  .push-stat-lbl { font-size:12px; font-weight:600; color:var(--muted); margin-top:4px; display:block; }

  /* Tab bar for settings sub-sections */

  /* Page heading */
  .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
  .page-header h2 { font-size:32px; font-weight:800; color:var(--text); letter-spacing:-.5px; margin:0; }
  .page-header p { margin:8px 0 0; font-size:15px; color:var(--muted); }
  </style>


</head>
<body>
  <script>
    const ADMIN_I18N = {
      'Թարմացում և տեղադրում': {ru: 'Обновление и установка', en: 'Update & Deploy'},
      'Թարմացումների Վահանակ': {ru: 'Панель обновлений', en: 'Updates Dashboard'},
      'Սա update-ների, deploy-ի և maintenance-ի կառավարման հիմնական վահանակն է։ Աշխատանքը բաժանված է պարզ փուլերի, որպեսզի phone-ից ու computer-ից արագ գտնես ուզած գործողությունը և սխալ publish չանես։': {ru: 'Основная панель управления обновлениями и обслуживанием. Работа разделена на простые этапы для быстрого доступа с телефона и ПК.', en: 'Main dashboard for updates, deploy, and maintenance. Work is divided into simple stages for quick access from phone and PC.'},
      'Ծրագրի ընթացիկ տարբերակ': {ru: 'Текущая версия приложения', en: 'Current App Version'},
      'Կայքի ընթացիկ տարբերակ': {ru: 'Текущая версия сайта', en: 'Current Web Version'},
      'Փաթեթի կապի վիճակ': {ru: 'Статус связи пакета', en: 'Package Sync Status'},
      'Ծրագրի ընդհանուր ճանաչված տեղադրումներ': {ru: 'Общее количество установок', en: 'Total Known Installs'},
           'Կարգավորումներ և համակարգ': {ru: 'Настройки и система', en: 'Settings & System'},
      '<?= __('Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։\') ?>': {ru: 'Управляйте версиями, устройствами, доступами и т.д.', en: 'Manage app versions, devices, accesses, etc.'},
      'Երգերի ցանկ': {ru: 'Список песен', en: 'Music Library'},
      'Կարգավորումներ': {ru: 'Настройки', en: 'Settings'},
      'Դուրս գալ': {ru: 'Выйти', en: 'Log Out'},
      'Ադմին': {ru: 'Админ', en: 'Admin'}
    };
    const currentLang = '<?= $adminLang ?>';
    if (currentLang !== 'hy') {
      function translateNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.textContent.trim();
          if (text && ADMIN_I18N[text] && ADMIN_I18N[text][currentLang]) {
            node.textContent = node.textContent.replace(text, ADMIN_I18N[text][currentLang]);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
          node.childNodes.forEach(translateNode);
        }
      }
      document?.addEventListener('DOMContentLoaded', () => {
        translateNode(document.body);
      });
    }
  </script>
