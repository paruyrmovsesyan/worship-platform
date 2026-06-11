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
      'Վերադառնալ ադմին վահանակ': {ru: 'Вернуться в админку', en: 'Back to Admin'},
      'Բացել տարբերակի տվյալները': {ru: 'Данные версии', en: 'Version Data'},
      'Դուրս գալ admin-ից': {ru: 'Выйти из админки', en: 'Log Out'},
      'Արագ հոսք': {ru: 'Быстрый старт', en: 'Quick Flow'},
      'Լրացրու version/message դաշտերը `Թարմացում և տեղադրում` բաժնում։': {ru: 'Заполните поля version/message в разделе «Обновление и установка».', en: 'Fill in version/message fields in the "Update & Deploy" section.'},
      'Ընտրիր կիրառման տարբերակը` առանց ֆայլի կամ ֆայլով։': {ru: 'Выберите вариант применения: с файлом или без.', en: 'Choose deployment mode: with or without file.'},
      'Սեղմիր `Կիրառել թարմացումը` ու ավարտիր գործընթացը։': {ru: 'Нажмите «Применить обновление» для завершения.', en: 'Click "Apply Update" to finish.'},
      '1. Թարմացում և տեղադրում': {ru: '1. Обновление и установка', en: '1. Update & Deploy'},
      '2. Տեխնիկական աշխատանքներ': {ru: '2. Тех. работы', en: '2. Maintenance'},
      '3. Push ծանուցումներ': {ru: '3. Push-уведомления', en: '3. Push Notifications'},
      '4. Սարքեր': {ru: '4. Устройства', en: '4. Devices'},
      '5. Պատմություն': {ru: '5. История', en: '5. History'},
      '6. Մուտքեր': {ru: '6. Доступы', en: '6. Access'},
      '7. Մոդերացիա': {ru: '7. Модерация', en: '7. Moderation'},
      '8. Թարգմանություններ': {ru: '8. Переводы', en: '8. Translations'},
      'Թողարկման գլխավոր հոսք': {ru: 'Главный поток релиза', en: 'Main Release Flow'},
      'Այստեղ լրացնում ես տարբերակները, հաղորդագրությունները և ընտրում ես ինչպես կիրառել թարմացումը։': {ru: 'Здесь вы заполняете версии, сообщения и выбираете способ применения обновления.', en: 'Here you fill in versions, messages, and choose how to apply the update.'},
      'Ծրագիր': {ru: 'Программа', en: 'App'},
      'Կայք': {ru: 'Сайт', en: 'Web'},
      'Փաթեթ պատրաստ': {ru: 'Пакет готов', en: 'Package Ready'},
      'Գնալ կիրառման կոճակին': {ru: 'Перейти к применению', en: 'Go to Apply button'},
      'Նոր հնարավորություն': {ru: 'Новая функция', en: 'New Feature'},
      'ԱՆՋԱՏՎԱԾ': {ru: 'ОТКЛЮЧЕНО', en: 'DISABLED'},
      'Տեխնիկական աշխատանքների վիճակ': {ru: 'Состояние тех. работ', en: 'Maintenance Status'},
      'Վերջին թարմացումը (UTC+4)': {ru: 'Последнее обновление', en: 'Last update'},
      'Թողարկման կենդանի ամփոփում': {ru: 'Живая сводка релиза', en: 'Live Release Summary'},
      'Մինչև սեղմես `Կիրառել թարմացումը`, այստեղ միանգամից երևում է ինչ տարբերակ է գնալու, ինչ ձևով է կիրառվելու և արդյոք հիմնական դաշտերը լրացված են։': {ru: 'До нажатия кнопки здесь сразу видно, какая версия будет применена.', en: 'Before applying, you can see what version will be deployed.'},
      'Փոփոխությունները կպահպանվեն ավտոմատ': {ru: 'Изменения сохраняются автоматически', en: 'Changes saved automatically'},
      'Ծրագրի թողարկում': {ru: 'Релиз программы', en: 'App Release'},
      'Նոր հնարավորություն - Ծրագրի նոր տարբերակ': {ru: 'Новая версия программы', en: 'New App Version'},
      'Կայքի թողարկում': {ru: 'Релиз сайта', en: 'Web Release'},
      'Նոր հնարավորություն - Կայքի նոր տարբերակ': {ru: 'Новая версия сайта', en: 'New Web Version'},
      'Կիրառման ձև': {ru: 'Способ применения', en: 'Deployment Mode'},
      'Կփոխվեն միայն տարբերակների, հաղորդագրությունների և կարգավորումների տվյալները` առանց սերվերի ֆայլերի փոփոխման:': {ru: 'Будут изменены только данные версий и настройки.', en: 'Only version data and settings will be changed.'},
      'ԿԻՐԱՌԵԼ ԹԱՐՄԱՑՈՒՄԸ': {ru: 'ПРИМЕНИТЬ ОБНОВЛЕНИЕ', en: 'APPLY UPDATE'},
      'ՊԱՏՐԱՍՏ': {ru: 'ГОТОВ', en: 'READY'},
      'ՍՊԱՍՄԱՆ ՄԵՋ': {ru: 'В ОЖИДАНИИ', en: 'PENDING'}
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
  <script>
    const ADMIN_I18N = {
      'Թարմացում և տեղադրում': {ru: 'Обновление и установка', en: 'Update & Deploy'},
      'Թարմացումների Վահանակ': {ru: 'Панель обновлений', en: 'Updates Dashboard'},
      'Ծրագրի ընթացիկ տարբերակ': {ru: 'Текущая версия приложения', en: 'Current App Version'},
      'Կայքի ընթացիկ տարբերակ': {ru: 'Текущая версия сайта', en: 'Current Web Version'},
      'Փաթեթի կապի վիճակ': {ru: 'Статус связи пакета', en: 'Package Sync Status'},
      'Ծրագրի ընդհանուր ճանաչված տեղադրումներ': {ru: 'Общее количество установок', en: 'Total Known Installs'},
      '1. Թարմացում և տեղադրում': {ru: 'Обновление и установка', en: 'Update & Deploy'},
      '2. Տեխնիկական աշխատանքներ': {ru: 'Тех. работы', en: 'Maintenance'},
      '3. Push ծանուցումներ': {ru: 'Push-уведомления', en: 'Push Notifications'},
      '4. Սարքեր': {ru: 'Устройства', en: 'Devices'},
      '5. Պատմություն': {ru: 'История', en: 'History'},
      '6. Մուտքեր': {ru: 'Доступы', en: 'Access'},
      '7. Մոդերացիա': {ru: 'Модерация', en: 'Moderation'},
      '8. Թարգմանություններ': {ru: 'Переводы', en: 'Translations'},
      'Կարգավորումներ և համակարգ': {ru: 'Настройки и система', en: 'Settings & System'},
      '<?= __('Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։') ?>': {ru: 'Управляйте версиями, устройствами, доступами и т.д.', en: 'Manage app versions, devices, accesses, etc.'},
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

<div class="app-layout">
  <?php
    $activePage = "settings";
    include __DIR__ . "/admin_sidebar.php";
  ?>
  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div class="app-content">
      <div class="page-header" style="padding-bottom: 0; border: none; align-items: flex-start; margin-bottom: 32px; display: flex; justify-content: space-between;">
        <div>
          <h2 style="font-size: 34px; margin-bottom: 8px; font-weight:800; color:var(--text); letter-spacing:-0.5px;"><?= __('Համակարգի կարգավորումներ') ?> 😍</h2>
          <p style="margin:0; font-size:15px; color:var(--muted); font-weight: 500;"><?= __('Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։') ?></p>
        </div>
        
      </div>

      <?php if ($hasAnyAdminSectionAccess): ?>
      <div class="settings-dashboard" id="settingsDashboard">
        <div class="section-switcher grid-view" role="tablist">
        <?php if (!empty($adminSectionPermissions["release"])): ?>
        <button class="section-tab active" type="button" data-section-tab="release">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          <div class="tab-text">
            <span><?= __('1. Թարմացում և տեղադրում') ?></span>
          <small><?= __('Տարբերակներ, հաղորդագրություններ, ZIP փաթեթ և հրապարակում') ?></small>
                  </div>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions["maintenance"])): ?>
        <button class="section-tab" type="button" data-section-tab="maintenance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          <div class="tab-text">
            <span><?= __('2. Տեխնիկական աշխատանքներ') ?></span>
          <small><?= __('Կայքի և ծրագրի անհասանելիության պլանավորում') ?></small>
                  </div>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions["push"])): ?>
        <button class="section-tab" type="button" data-section-tab="push">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <div class="tab-text">
            <span><?= __('3. Push ծանուցումներ') ?></span>
          <small><?= __('Ուղարկել ծանուցումներ բոլորին կամ կոնկրետ սարքերին') ?></small>
                  </div>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions["devices"])): ?>
        <button class="section-tab" type="button" data-section-tab="devices">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
          <div class="tab-text">
            <span><?= __('4. Սարքեր') ?></span>
          <small><?= __('Գրանցված սարքերի, տեսակների և ակտիվության կառավարում') ?></small>
                  </div>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions["history"])): ?>
        <button class="section-tab" type="button" data-section-tab="history">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <div class="tab-text">
            <span><?= __('5. Պատմություն') ?></span>
          <small><?= __('Նախկին թողարկումների և թարմացումների արխիվ') ?></small>
                  </div>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions["access"])): ?>
        <button class="section-tab" type="button" data-section-tab="access">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <div class="tab-text">
            <span><?= __('6. Մուտքեր') ?></span>
          <small><?= __('Ադմինների և համակարգի թույլտվությունների կառավարում') ?></small>
                  </div>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions["moderation"])): ?>
        <button class="section-tab" type="button" data-section-tab="moderation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <div class="tab-text">
            <span><?= __('7. Մոդերացիա') ?></span>
          <small><?= __('Օգտատերերի գործողությունների վերահսկում') ?></small>
                  </div>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions["translations"])): ?>
        <button class="section-tab" type="button" data-section-tab="translations">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <div class="tab-text">
            <span><?= __('8. Թարգմանություններ') ?></span>
          <small><?= __('Համակարգի բառարանների և տեքստերի կառավարում') ?></small>
                  </div>
        </button>
        <?php endif; ?>
        </div>
      </div>
      
      <div class="settings-content-wrapper" id="settingsContentWrapper" hidden>
        <div class="section-back-nav">
          <button type="button" class="btn" id="btnBackToDashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Վերադառնալ կարգավորումներին
          </button>
        </div>
      <?php endif; ?>

      <div
      class="banner <?= htmlspecialchars($messageType, ENT_QUOTES) ?>"
      id="adminBanner"
      <?= $message !== '' ? '' : 'hidden' ?>
    ><?= htmlspecialchars($message, ENT_QUOTES) ?></div>

    <?php if (!$hasAnyAdminSectionAccess): ?>
    <section class="settings-group">
      <div class="settings-group-header">
              <h3>Բաժինների հասանելիություն չկա</h3>
              <p>Այս օգտահաշվի համար ադմին բաժինների թույլտվություններ դեռ միացված չեն։ Խնդրիր լիազորված ադմինին՝ միացնել անհրաժեշտ բաժինները <code><?= __('Մուտքեր') ?></code> բաժնից։</p>
            </div>
    </section>
    <?php endif; ?>

    <section class="section-focus" id="sectionFocusBar" aria-live="polite"<?= $hasAnyAdminSectionAccess ? '' : ' hidden' ?>>
      <div class="section-focus-copy">
        <div class="eyebrow" id="sectionFocusEyebrow">Թարմացում և տեղադրում</div>
        <h2 id="sectionFocusTitle">Թողարկման գլխավոր հոսք</h2>
        <p id="sectionFocusDescription">Այստեղ լրացնում ես տարբերակները, հաղորդագրությունները և ընտրում ես ինչպես կիրառել թարմացումը։</p>
      </div>
      <div class="section-focus-side">
        <div class="chips section-focus-meta" id="sectionFocusMeta">
          <div class="chip">Ծրագիր <?= htmlspecialchars((string)$config['app_version'], ENT_QUOTES) ?></div>
          <div class="chip">Կայք <?= htmlspecialchars((string)$config['web_version'], ENT_QUOTES) ?></div>
        </div>
        <button class="btn btn-primary" type="button" id="sectionFocusActionBtn">Գնալ հիմնական գործողությանը</button>
      </div>
    </section>

    <div class="layout" id="adminLayout">
      <form id="releaseControlForm" method="post" enctype="multipart/form-data" class="stack" data-section-container>
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
        <div class="stats" data-admin-section="release maintenance all" data-admin-permission="release,maintenance">
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= htmlspecialchars(wp_version_release_label((string)$config['app_release_type']), ENT_QUOTES) ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars((string)$config['app_version'], ENT_QUOTES) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= htmlspecialchars(wp_version_release_label((string)$config['web_release_type']), ENT_QUOTES) ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars((string)$config['web_version'], ENT_QUOTES) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= $isScheduledActive ? 'Ժամանակացույցով տեխնիկական աշխատանքը ակտիվ է' : 'Տեխնիկական աշխատանքների վիճակ' ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= $isMaintenanceActive ? 'ՄԻԱՑՎԱԾ' : 'ԱՆՋԱՏՎԱԾ' ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Վերջին թարմացումը (UTC+4)</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)$config['updated_at']) ?: '—', ENT_QUOTES) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
        </div>

        <section class="settings-group" id="releaseWorkspacePanel" data-admin-section="release all" data-admin-permission="release">
          <div class="settings-group-header">
              <h3>Թողարկման կենդանի ամփոփում</h3>
              <p>Մինչև սեղմես `Կիրառել թարմացումը`, այստեղ միանգամից երևում է ինչ տարբերակ է գնալու, ինչ ձևով է կիրառվելու և արդյոք հիմնական դաշտերը լրացված են։</p>
            </div>
          <div class="chips" style="margin-top:12px">
            <div class="autosave-status" id="releaseAutosaveStatus" data-state="idle">Փոփոխությունները կպահպանվեն ավտոմատ</div>
          </div>

          <div class="release-workspace">
            <div class="release-summary-grid">
              <article class="release-summary-card">
                <strong>Ծրագրի թողարկում</strong>
                <span id="releaseAppSummaryText">Տարբերակը և հաղորդագրությունը պատրաստ են ծրագրի համար։</span>
                <div class="chips">
                  <div class="chip" id="releaseAppVersionChip"><?= htmlspecialchars((string)$config['app_version'], ENT_QUOTES) ?></div>
                  <div class="chip" id="releaseAppTypeChip"><?= htmlspecialchars(wp_version_release_label((string)$config['app_release_type']), ENT_QUOTES) ?></div>
                </div>
              </article>
              <article class="release-summary-card">
                <strong>Կայքի թողարկում</strong>
                <span id="releaseWebSummaryText">Տարբերակը և հաղորդագրությունը պատրաստ են կայքի համար։</span>
                <div class="chips">
                  <div class="chip" id="releaseWebVersionChip"><?= htmlspecialchars((string)$config['web_version'], ENT_QUOTES) ?></div>
                  <div class="chip" id="releaseWebTypeChip"><?= htmlspecialchars(wp_version_release_label((string)$config['web_release_type']), ENT_QUOTES) ?></div>
                </div>
              </article>
              <article class="release-summary-card">
                <strong>Կիրառման ձև</strong>
                <span id="releaseApplySummaryText">Ընթացիկ տարբերակը կորոշի արդյոք փոխվում են միայն տվյալները, թե նաև սերվերի ֆայլերը։</span>
                <div class="chips">
                  <div class="chip" id="releaseApplyModeChip">Առանց ֆայլի կցման</div>
                  <div class="chip" id="releasePackageStatusChip"><?= htmlspecialchars((string)($config['server_package_file'] ?: 'Փաթեթ չկա'), ENT_QUOTES) ?></div>
                </div>
              </article>
            </div>

            <aside class="release-checklist">
              <h3>Կիրառելուց առաջ ստուգում</h3>
              <p>Այս փոքր ցանկը օգնում է արագ հասկանալ` կարո՞ղ ես արդեն հրապարակել, թե դեռ մի բան պակասում է։</p>
              <div class="release-checklist-list">
                <div class="release-check" id="releaseCheckVersions" data-state="done">
                  <div class="release-check-badge">1</div>
                  <div>
                    <strong>Տարբերակները լրացված են</strong>
                    <span>Ծրագրի և կայքի տարբերակները պատրաստ են հրապարակման համար։</span>
                  </div>
                </div>
                <div class="release-check" id="releaseCheckMessages" data-state="done">
                  <div class="release-check-badge">2</div>
                  <div>
                    <strong>Հաղորդագրությունները լրացված են</strong>
                    <span>Օգտատերը կտեսնի հստակ վերնագիր և բացատրություն։</span>
                  </div>
                </div>
                <div class="release-check" id="releaseCheckPackage" data-state="<?= !empty($config['server_package_file']) ? 'done' : 'warn' ?>">
                  <div class="release-check-badge">3</div>
                  <div>
                    <strong>Փաթեթի վիճակը հասկանալի է</strong>
                    <span id="releaseCheckPackageText"><?= !empty($config['server_package_file']) ? 'Արդեն կա պահված ZIP փաթեթ, որը կարելի է կիրառել։' : 'Եթե ընտրես ֆայլով թարմացում, պետք է ընտրես ZIP փաթեթ կամ պահված փաթեթ ունենաս։' ?></span>
                  </div>
                </div>
                <div class="release-check" id="releaseCheckMaintenance" data-state="<?= $isMaintenanceActive || $isScheduledActive ? 'warn' : 'done' ?>">
                  <div class="release-check-badge">4</div>
                  <div>
                    <strong>Հասանելիության վիճակը ստուգված է</strong>
                    <span id="releaseCheckMaintenanceText"><?= $isMaintenanceActive || $isScheduledActive ? 'Տեխնիկական աշխատանքները միացված են կամ նախատեսված են, ստուգիր դա նախքան հրապարակելը։' : 'Տեխնիկական աշխատանքները այժմ չեն խանգարում հրապարակմանը։' ?></span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div class="grid">
          <section class="settings-group" data-admin-section="release all" data-admin-permission="release">
            <div class="settings-group-header">
              <h3>Ծրագիր / PWA</h3>
              <p>Այս տարբերակը standalone ծրագրի համար է։ Փոխելիս ծրագիրը կառաջարկի ամբողջական թարմացում և նոր offline sync։ Թարմացման տեսակը բացատրում է փոփոխության բնույթը, իսկ կարճ նկարագրությունը ցույց է տալիս ինչ է փոխվել։</p>
            </div>
            <div class="form-field">
              <label for="app_version">Ծրագրի տարբերակ</label>
              <input class="input-field" id="app_version" name="app_version" value="<?= htmlspecialchars((string)$config['app_version'], ENT_QUOTES) ?>" class="input-field" required>
            </div>
            <div class="form-field">
              <label for="app_release_type">Թարմացման տեսակ</label>
              <select id="app_release_type" name="app_release_type" class="input-field">
                <?php foreach ($releaseTypes as $releaseTypeValue => $releaseTypeLabel): ?>
                  <option value="<?= htmlspecialchars($releaseTypeValue, ENT_QUOTES) ?>" <?= (string)$config['app_release_type'] === $releaseTypeValue ? 'selected' : '' ?>>
                    <?= htmlspecialchars($releaseTypeLabel, ENT_QUOTES) ?>
                  </option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="form-field">
              <label for="app_release_summary">Կարճ նկարագրություն</label>
              <input class="input-field" id="app_release_summary" name="app_release_summary" maxlength="240" value="<?= htmlspecialchars((string)$config['app_release_summary'], ENT_QUOTES) ?>" class="input-field" placeholder="Օր.` Offline sync improvements և performance fix-եր">
            </div>
            <div class="form-field">
              <label for="app_title">Թարմացման վերնագիր</label>
              <input class="input-field" id="app_title" name="app_title" value="<?= htmlspecialchars((string)$config['app_title'], ENT_QUOTES) ?>" class="input-field" required>
            </div>
            <div class="form-field">
              <label for="app_message">Թարմացման հաղորդագրություն</label>
              <textarea id="app_message" name="app_message" required class="input-field"><?= htmlspecialchars((string)$config['app_message'], ENT_QUOTES) ?></textarea>
            </div>
          </section>

          <section class="settings-group" data-admin-section="release all" data-admin-permission="release">
            <div class="settings-group-header">
              <h3>Կայք / Web</h3>
              <p>Այս տարբերակը browser տարբերակի համար է։ Փոխելիս կայքը կբերի refresh պատուհան և կվերբեռնի օնլայն տարբերակը։ Թարմացման տեսակը օգնում է տարբերակել բովանդակության թարմացումը, արագ շտկումը կամ մեծ փոփոխությունը։</p>
            </div>
            <div class="form-field">
              <label for="web_version">Կայքի տարբերակ</label>
              <input class="input-field" id="web_version" name="web_version" value="<?= htmlspecialchars((string)$config['web_version'], ENT_QUOTES) ?>" class="input-field" required>
            </div>
            <div class="form-field">
              <label for="web_release_type">Թարմացման տեսակ</label>
              <select id="web_release_type" name="web_release_type" class="input-field">
                <?php foreach ($releaseTypes as $releaseTypeValue => $releaseTypeLabel): ?>
                  <option value="<?= htmlspecialchars($releaseTypeValue, ENT_QUOTES) ?>" <?= (string)$config['web_release_type'] === $releaseTypeValue ? 'selected' : '' ?>>
                    <?= htmlspecialchars($releaseTypeLabel, ENT_QUOTES) ?>
                  </option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="form-field">
              <label for="web_release_summary">Կարճ նկարագրություն</label>
              <input class="input-field" id="web_release_summary" name="web_release_summary" maxlength="240" value="<?= htmlspecialchars((string)$config['web_release_summary'], ENT_QUOTES) ?>" class="input-field" placeholder="Օր.` UI refresh և content update">
            </div>
            <div class="form-field">
              <label for="web_title">Թարմացման վերնագիր</label>
              <input class="input-field" id="web_title" name="web_title" value="<?= htmlspecialchars((string)$config['web_title'], ENT_QUOTES) ?>" class="input-field" required>
            </div>
            <div class="form-field">
              <label for="web_message">Թարմացման հաղորդագրություն</label>
              <textarea id="web_message" name="web_message" required class="input-field"><?= htmlspecialchars((string)$config['web_message'], ENT_QUOTES) ?></textarea>
            </div>
          </section>

          <section class="settings-group" data-admin-section="release maintenance all" data-admin-permission="release,maintenance">
            <div class="settings-group-header">
              <h3>Արագ գործողություններ</h3>
              <p>Սրանք արագ լրացման և միացման կոճակներ են։ Վերջնական կիրառումը մնում է մեկ հիմնական <code>Կիրառել թարմացումը</code> կոճակով` ըստ ընտրված կիրառման ձևի։</p>
            </div>

            <div class="quick-stack">
              <div class="quick-strip">
                <div class="quick-strip-head">
                  <strong>Տարբերակներ</strong>
                  <span>Մի քանի սեղմումով փոխիր տարբերակները կամ լրացրու հիմնական տեքստերը։</span>
                </div>
                <div class="quick-actions-grid">
                  <button class="btn" type="button" data-bump-target="app" data-bump-kind="patch">Ծրագիր +1 patch</button>
                  <button class="btn" type="button" data-bump-target="web" data-bump-kind="patch">Կայք +1 patch</button>
                  <button class="btn" type="button" data-bump-target="both" data-bump-kind="patch">Երկուսն էլ +1 patch</button>
                  <button class="btn" type="button" data-bump-target="both" data-bump-kind="minor">Երկուսն էլ +1 minor</button>
                  <button class="btn" type="button" data-bump-target="both" data-bump-kind="major">Երկուսն էլ +1 major</button>
                  <button class="btn" type="button" id="fillDefaultTextsBtn">Լրացնել տեքստերը</button>
                  <button class="btn" type="button" id="copyAppContentToWebBtn">Ծրագիր -> Կայք</button>
                  <button class="btn btn-wide" type="button" id="syncVersionsBtn">Նույն տարբերակը երկուսի համար</button>
                </div>
              </div>

              <div class="quick-strip">
                <div class="quick-strip-head">
                  <strong>Տեխնիկական աշխատանքներ</strong>
                  <span>Արագ միացրու կամ ժամ տուր տեխնիկական աշխատանքներին՝ առանց schedule դաշտերը ձեռքով լրացնելու։</span>
                </div>
                <div class="quick-actions-grid">
                  <button class="btn" type="button" data-maintenance-hours="0.5">30 րոպե</button>
                  <button class="btn" type="button" data-maintenance-hours="1">1 ժամ</button>
                  <button class="btn" type="button" data-maintenance-hours="2">2 ժամ</button>
                  <button class="btn" type="button" data-maintenance-hours="4">4 ժամ</button>
                  <button class="btn" type="button" id="startMaintenanceNowBtn">Միացնել հիմա</button>
                  <button class="btn" type="button" id="clearScheduleBtn">Մաքրել schedule-ը</button>
                  <button class="btn" type="button" id="disableMaintenanceBtn">Անջատել տեխնիկական աշխատանքները</button>
                </div>
              </div>
            </div>
          </section>

          <section class="settings-group" data-admin-section="release all" data-admin-permission="release">
            <div class="settings-group-header">
              <h3>Թարմացման տրամաբանություն</h3>
              <p><code>major.minor.patch</code> մոտեցումը պահպանում է թարմացման իմաստը։ Major-ը մեծ փոփոխություն է, Minor-ը նոր հնարավորություն կամ նկատելի թարմացում, Patch-ը փոքր ուղղում։ Թարմացման տեսակը տալիս է հասկանալի բացատրություն, իսկ կարճ նկարագրությունը երևում է update modal-ում։</p>
            </div>
          </section>

          <section class="settings-group" data-admin-section="release all" data-admin-permission="release">
            <div class="settings-group-header">
              <h3>Փաթեթ և տեղադրում</h3>
              <p>Այստեղ ընտրում եք ինչպես կիրառել տարբերակը. միայն version/message թարմացմամբ կամ ZIP ֆայլի կցումով։ Եթե ընտրեք ֆայլով տարբերակը, նույն հոսքի մեջ կկատարվի նաև սերվերի ֆայլերի թարմացումը։</p>
            </div>

            <div class="package-meta">
              <div class="chip">Ընթացիկ փաթեթ <?= htmlspecialchars((string)($config['server_package_file'] ?: '—'), ENT_QUOTES) ?></div>
              <div class="chip">Ռեժիմ <?= htmlspecialchars(wp_version_package_mode_label($packageMode), ENT_QUOTES) ?></div>
              <div class="chip">Ներբեռնվել է <?= htmlspecialchars($packageUploadedAt ?: '—', ENT_QUOTES) ?></div>
              <div class="chip">Կիրառվել է <?= htmlspecialchars($packageAppliedAt ?: '—', ENT_QUOTES) ?></div>
              <div class="chip"><?= $isPackageSyncedToCurrentRelease ? 'Կապը պատրաստ է' : 'Կապը սպասման մեջ է' ?></div>
              <div class="chip">Կապվել է <?= htmlspecialchars($packageSyncedAt ?: '—', ENT_QUOTES) ?></div>
              <div class="chip">Կապված ծրագիր <?= htmlspecialchars($packageLinkedAppVersion ?: '—', ENT_QUOTES) ?></div>
              <div class="chip">Կապված կայք <?= htmlspecialchars($packageLinkedWebVersion ?: '—', ENT_QUOTES) ?></div>
              <div class="chip">Վերջին պահուստավորում <?= htmlspecialchars((string)($config['server_package_last_backup'] ?: '—'), ENT_QUOTES) ?></div>
            </div>

            <div class="package-mode-grid">
              <div class="package-mode-card">
                <strong>Մասամբ ֆայլերի թարմացում</strong>
                <span>Փոխվում են միայն ZIP-ի ներսում եղած ֆայլերը։ Հարմար է, երբ թարմացնում եք մեկ կամ մի քանի կոնկրետ ֆայլ։</span>
              </div>
              <div class="package-mode-card">
                <strong>Ամբողջական փաթեթի տեղադրում</strong>
                <span>Փաթեթը դիտարկվում է որպես ամբողջ release package։ Հարմար է մեծ deploy-երի համար, երբ նույն release-ի հետ շատ ֆայլեր եք թարմացնում։</span>
              </div>
            </div>

            <div class="row-2">
              <div class="form-field">
                <label for="release_apply_mode">Կիրառման տարբերակ</label>
                <select class="input-field" id="release_apply_mode" name="release_apply_mode">
                  <option value="without_file">Առանց ֆայլի կցման</option>
                  <option value="with_file">Ֆայլի կցումով</option>
                </select>
              </div>
              <div class="form-field">
                <label for="server_package_mode">Տեղադրման ռեժիմ</label>
                <select class="input-field" id="server_package_mode" name="server_package_mode">
                  <?php foreach ($packageModes as $packageModeValue => $packageModeLabel): ?>
                    <option value="<?= htmlspecialchars($packageModeValue, ENT_QUOTES) ?>" <?= $packageMode === $packageModeValue ? 'selected' : '' ?>>
                      <?= htmlspecialchars($packageModeLabel, ENT_QUOTES) ?>
                    </option>
                  <?php endforeach; ?>
                </select>
              </div>
              <div class="form-field">
                <label for="server_package_file">ZIP թարմացման փաթեթ</label>
                <input id="server_package_file" name="server_package_file" type="file" accept=".zip,application/zip">
              </div>
            </div>

            <div id="packageModeHelper" class="package-helper"></div>

            <div class="danger-note">Եթե ընտրեք `ֆայլի կցումով` տարբերակը և նոր ZIP չընտրեք, համակարգը կօգտագործի արդեն ներբեռնված ընթացիկ փաթեթը։ `Առանց ֆայլի կցման` տարբերակում ZIP դաշտը պարզապես անտեսվում է։</div>
          </section>

          <section class="settings-group" id="maintenancePanel" data-admin-section="maintenance" data-admin-permission="maintenance">
            <div class="settings-group-header">
              <h3>Տեխնիկական աշխատանքներ</h3>
              <p>Միացրեք այս ռեժիմը, երբ կայքում կամ հավելվածում կատարվում են կարևոր թարմացումներ։</p>
            </div>
            
            <div class="toggle-switch-wrapper">
              <div class="toggle-switch-info">
                <h4>Ձեռքով միացնել (Maintenance)</h4>
                <p>Միացրու անմիջապես սպասարկման ռեժիմը՝ անկախ պլանավորված ժամերից։</p>
              </div>
              <label class="toggle-switch" for="maintenance_enabled">
                <input id="maintenance_enabled" name="maintenance_enabled" type="checkbox" <?= !empty($config['maintenance_enabled']) ? 'checked' : '' ?>>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="form-field">
              <label for="maintenance_message">Ցուցադրվող հաղորդագրություն</label>
              <p class="help-text">Այս տեքստը կտեսնեն օգտատերերը, երբ փորձեն մուտք գործել կայք:</p>
              <textarea id="maintenance_message" name="maintenance_message" class="input-field" placeholder="Կայքում ընթանում են տեխնիկական աշխատանքներ..."><?= htmlspecialchars((string)$config['maintenance_message'], ENT_QUOTES) ?></textarea>
            </div>

            <div class="form-field" style="flex-direction: row; gap: 20px; align-items: center;">
              <div style="flex:1;">
                <label for="maintenance_start_at">Պլանավորված սկիզբ</label>
                <input id="maintenance_start_at" name="maintenance_start_at" type="datetime-local" class="input-field" style="margin-top:8px;" value="<?= htmlspecialchars(wp_version_format_datetime_local((string)$config['maintenance_start_at']), ENT_QUOTES) ?>">
              </div>
              <div style="flex:1;">
                <label for="maintenance_end_at">Պլանավորված ավարտ</label>
                <input id="maintenance_end_at" name="maintenance_end_at" type="datetime-local" class="input-field" style="margin-top:8px;" value="<?= htmlspecialchars(wp_version_format_datetime_local((string)$config['maintenance_end_at']), ENT_QUOTES) ?>">
              </div>
            </div>

            <div class="form-field">
              <label for="maintenance_allowed_ips">Թույլատրված IP հասցեներ (Whitelist)</label>
              <p class="help-text">Այս IP հասցեներից մուտք գործողների համար կայքը և ծրագիրը կաշխատեն սովորականի պես (նույնիսկ երբ միացված է): Տարանջատեք ստորակետով (օր.` 192.168.1.1, 10.0.0.1)։</p>
              <input id="maintenance_allowed_ips" name="maintenance_allowed_ips" type="text" class="input-field" placeholder="IP հասցեներ..." value="<?= htmlspecialchars((string)($config['maintenance_allowed_ips'] ?? ''), ENT_QUOTES) ?>">
            </div>

            <div class="chips" style="margin-top:24px; justify-content: flex-end;">
              <div class="autosave-status" id="maintenanceAutosaveStatus" data-state="idle">Փոփոխությունները կպահպանվեն ավտոմատ</div>
            </div>
          </section>

          <section class="settings-group" id="pageModesPanel" data-admin-section="maintenance" data-admin-permission="maintenance">
            <div class="grid" style="padding-top: 24px;">
              <div class="stack" style="gap: 16px;">
                <div class="settings-group-header" style="padding: 0; border: none; background: transparent;">
                  <h3>Ծրագրային էջեր (PWA/App Shell)</h3>
                  <p>Ընտրեք, թե որ էջերը պետք է աշխատեն որպես ծրագրային էջեր (առանց վերբեռնման, հավելվածի նման)։</p>
                </div>
                <div class="page-app-grid">
                  <input type="hidden" name="page_app_modes_present" value="1">
                  <?php foreach ($pageAppRegistry as $pageKey => $pageMeta): ?>
                    <?php $pageEnabled = !empty(($config['page_app_modes'] ?? [])[$pageKey]); ?>
                    <div class="toggle-switch-wrapper" style="margin-bottom: 0; padding: 12px 16px;">
                      <div class="toggle-switch-info">
                        <h4 style="margin-bottom:2px;"><?= htmlspecialchars((string)($pageMeta['label'] ?? $pageKey), ENT_QUOTES) ?></h4>
                        <p style="font-size:12px; margin-bottom:4px;"><?= htmlspecialchars((string)($pageMeta['description'] ?? ''), ENT_QUOTES) ?></p>
                        <code style="font-size:11px;"><?= htmlspecialchars((string)($pageMeta['path'] ?? ''), ENT_QUOTES) ?></code>
                      </div>
                      <label class="toggle-switch">
                        <input type="checkbox" name="page_app_modes[<?= htmlspecialchars($pageKey, ENT_QUOTES) ?>]" value="1" <?= $pageEnabled ? 'checked' : '' ?>>
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                  <?php endforeach; ?>
                </div>
              </div>

              <div class="stack" style="gap: 16px;">
                <div class="settings-group-header" style="padding: 0; border: none; background: transparent;">
                  <h3>Կայքի էջեր (Web)</h3>
                  <p>Ընտրեք, թե որ էջերը պետք է հասանելի լինեն կայքում (անջատելու դեպքում այցելուները կստանան «էջը անհասանելի է» հաղորդագրությունը)։</p>
                </div>
                <div class="page-app-grid">
                  <input type="hidden" name="page_web_modes_present" value="1">
                  <?php foreach ($pageWebRegistry as $pageKey => $pageMeta): ?>
                    <?php $pageEnabled = !empty(($config['page_web_modes'] ?? [])[$pageKey]); ?>
                    <div class="toggle-switch-wrapper" style="margin-bottom: 0; padding: 12px 16px;">
                      <div class="toggle-switch-info">
                        <h4 style="margin-bottom:2px;"><?= htmlspecialchars((string)($pageMeta['label'] ?? $pageKey), ENT_QUOTES) ?></h4>
                        <p style="font-size:12px; margin-bottom:4px;"><?= htmlspecialchars((string)($pageMeta['description'] ?? ''), ENT_QUOTES) ?></p>
                        <code style="font-size:11px;"><?= htmlspecialchars((string)($pageMeta['path'] ?? ''), ENT_QUOTES) ?></code>
                      </div>
                      <label class="toggle-switch">
                        <input type="checkbox" name="page_web_modes[<?= htmlspecialchars($pageKey, ENT_QUOTES) ?>]" value="1" <?= $pageEnabled ? 'checked' : '' ?>>
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                  <?php endforeach; ?>
                </div>
              </div>
            </div>

            <div class="chips" style="margin-top:20px; justify-content: flex-end;">
              <div class="autosave-status" id="pageModesAutosaveStatus" data-state="idle">Փոփոխությունները կպահպանվեն ավտոմատ</div>
            </div>
          </section>

          <section class="settings-group" id="accessOverviewPanel" data-admin-section="access all" data-admin-permission="access">
            <div class="settings-group-header">
              <h3>Մուտքերի արագ ամփոփում</h3>
              <p>Այս բաժինը միանգամից ցույց է տալիս ինչ սկզբունքով է աշխատում ադմինի հասանելիությունը, ով է ներսում և քանի whitelist email կա պահված։</p>
            </div>

            <div class="access-overview">
              <article class="access-card">
                <strong>Ընթացիկ հասանելիության ձև</strong>
                <span><?= $accessMode === 'modern' ? 'Հիմա աշխատում է դերային մուտքը։ Այսինքն հիմնականում հաշվի են առնվում օգտատիրոջ դերը և ադմին լինելու նշանը։' : 'Հիմա աշխատում է whitelist մուտքը։ Այսինքն հիմնականում որոշողը պահված email-ների ցանկն է։' ?></span>
                <div class="chips">
                  <div class="chip"><?= $accessMode === 'modern' ? 'Դերային մուտք' : 'Email whitelist' ?></div>
                  <div class="chip">Whitelist <?= (int)$adminEmailCount ?></div>
                </div>
              </article>
              <article class="access-card">
                <strong>Ով է հիմա ներսում</strong>
                <span>Սա օգնում է արագ տեսնել, թե կոնկրետ որ օգտատիրոջ հաշվով ես աշխատում ադմին վահանակում այս պահին։</span>
                <div class="chips">
                  <div class="chip"><?= htmlspecialchars((string)($adminUser['name'] ?? 'Օգտատեր'), ENT_QUOTES) ?></div>
                  <?php if (!empty($adminUser['email'])): ?>
                    <div class="chip"><?= htmlspecialchars((string)$adminUser['email'], ENT_QUOTES) ?></div>
                  <?php endif; ?>
                </div>
              </article>
              <article class="access-card">
                <strong>Ներքին խորհուրդ</strong>
                <span>Եթե ուզում ես կարճաժամկետ հասանելիություն տալ, ավելացրու email-ը whitelist-ում։ Եթե օգտատերերի դերերը արդեն ճիշտ են, թող whitelist-ը պահես հնարավորինս փոքր։</span>
                <div class="chips">
                  <div class="chip">Մաքուր whitelist</div>
                  <div class="chip">Փոքր ռիսկ</div>
                </div>
              </article>
            </div>
          </section>

          <section class="settings-group" id="accessPanel" data-admin-section="access all" data-admin-permission="access">
            <div class="settings-group-header">
              <h3>Admin մուտքեր</h3>
              <p>Եթե տվյալ օգտատիրոջ հաշվին դեր կամ ադմին նշան չկա, այստեղի email whitelist-ը կորոշի ով ունի admin access։ Մեկ email ամեն տողում։</p>
            </div>
            <div class="chips" style="margin-top:12px">
              <div class="autosave-status" id="accessDraftAutosaveStatus" data-state="idle">Փոփոխությունները կպահպանվեն ավտոմատ</div>
            </div>
            <div class="form-field">
              <label for="admin_emails">Admin email-ներ</label>
              <textarea class="input-field" id="admin_emails" name="admin_emails"><?= htmlspecialchars($adminEmailsText, ENT_QUOTES) ?></textarea>
            </div>
            <div class="access-helper">Խորհուրդ է տրվում այստեղ պահել միայն այն email-ները, որոնք իսկապես պետք է պահեստային կամ լրացուցիչ ադմին հասանելիություն ունենան։</div>
          </section>

          <section class="settings-group" id="accessPermissionsPanel" data-admin-section="access all" data-admin-permission="access">
            <div class="history-head">
              <div>
                <div class="settings-group-header">
              <h3>Բաժինների թույլտվություններ ըստ օգտատիրոջ</h3>
              <p>Այս բլոկով կարող ես սահմանել, թե որ email-ը ադմինի որ բաժիններն է տեսնելու։ Եթե email-ը այստեղ չկա, կաշխատի հին տրամաբանությամբ և տվյալ ադմինը կունենա լիարժեք հասանելիություն։</p>
            </div>
              </div>
              <button class="history-btn" id="addPermissionRowBtn" type="button">Ավելացնել օգտատեր</button>
            </div>

            <div class="history-toolbar">
              <div class="history-toolbar-copy">Սա չի փոխարինում ադմին մուտքի իրավունքը. այն միայն սահմանում է արդեն թույլատրված ադմինի ներսի բաժինները։</div>
              <div class="permission-status" id="permissionAutosaveStatus" data-state="idle">Փոփոխությունները կպահպանվեն ավտոմատ</div>
            </div>

            <div class="permission-list" id="permissionList">
              <input type="hidden" name="admin_permission_rows_present" value="1">
              <?php foreach ($adminPermissionRows as $index => $row): ?>
                <div class="permission-card" data-permission-row>
                  <div class="permission-row-head">
                    <div class="form-field" style="margin-top:0;flex:1 1 280px">
                      <label>Email</label>
                      <input
                        type="email"
                        name="admin_permission_rows[<?= (int)$index ?>][email]"
                        value="<?= htmlspecialchars((string)$row['email'], ENT_QUOTES) ?>"
                        placeholder="admin@example.com"
                      >
                    </div>
                    <button class="history-btn danger" type="button" data-remove-permission-row>Հեռացնել</button>
                  </div>
                  <div class="permission-grid">
                    <?php foreach ($adminSectionRegistry as $sectionKey => $sectionMeta): ?>
                      <label class="permission-check">
                        <input
                          type="checkbox"
                          name="admin_permission_rows[<?= (int)$index ?>][sections][<?= htmlspecialchars($sectionKey, ENT_QUOTES) ?>]"
                          value="1"
                          <?= !empty($row['permissions'][$sectionKey]) ? 'checked' : '' ?>
                        >
                        <span>
                          <strong><?= htmlspecialchars((string)($sectionMeta['label'] ?? $sectionKey), ENT_QUOTES) ?></strong>
                          <small><?= htmlspecialchars((string)($sectionMeta['description'] ?? ''), ENT_QUOTES) ?></small>
                        </span>
                      </label>
                    <?php endforeach; ?>
                  </div>
                </div>
              <?php endforeach; ?>
            </div>
          </section>

          <section class="settings-group" id="socialAuthPanel" data-admin-section="access all" data-admin-permission="access">
            <div class="history-head">
              <div>
                <div class="settings-group-header">
              <h3>Google մուտք</h3>
              <p>Այստեղ կարող ես լրացնել Google մուտքի տվյալները։ Բաց դաշտերը պահվում են ընդհանուր կարգավորումներում, իսկ գաղտնի բանալին պահվում է առանձին փակ պահոցում։ Եթե գաղտնի դաշտը դատարկ թողնես, գործող արժեքը կմնա նույնը։</p>
            </div>
              </div>
            </div>
            <div class="access-helper" style="margin-top:0">Client ID-ն, Redirect URI-ն և նշումները կպահպանվեն ավտոմատ։ Google-ի գաղտնի բանալին մնում է ձեռքով պահպանմամբ՝ անվտանգության համար։</div>

            <div class="stats" style="margin-bottom:16px">
              
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Google public տվյալներ</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars((string)($config['social_auth_google_client_id'] !== '' ? 'ՊԱՏՐԱՍՏ Է' : 'ԼՐԱՑՆԵԼ'), ENT_QUOTES) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
              
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Google գաղտնի բանալի</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars($googleClientSecretStatus, ENT_QUOTES) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
            </div>

            <div class="panel-embed">
              <h3>Google մուտք</h3>
              <div class="form-field">
                <label for="social_auth_google_client_id">Client ID</label>
                <input class="input-field" id="social_auth_google_client_id" name="social_auth_google_client_id" value="<?= htmlspecialchars((string)($config['social_auth_google_client_id'] ?? ''), ENT_QUOTES) ?>" placeholder="Google client id">
              </div>
              <div class="form-field">
                <label for="social_auth_google_client_secret">Client Secret</label>
                <input class="input-field" id="social_auth_google_client_secret" name="social_auth_google_client_secret" type="password" value="" placeholder="Նոր Google client secret">
              </div>
              <label class="permission-check" style="margin-top:10px">
                <input type="checkbox" name="social_auth_google_client_secret_clear" value="1">
                <span>
                  <strong>Մաքրել Google գաղտնի բանալին</strong>
                  <small>Նշիր միայն այն դեպքում, եթե ուզում ես ամբողջությամբ անջատել Google մուտքը։</small>
                </span>
              </label>
              <div class="form-field">
                <label for="social_auth_google_redirect_uri">Redirect URI</label>
                <input class="input-field" id="social_auth_google_redirect_uri" name="social_auth_google_redirect_uri" value="<?= htmlspecialchars((string)($config['social_auth_google_redirect_uri'] ?? ''), ENT_QUOTES) ?>" placeholder="Դատարկ թողնելու դեպքում կկազմվի ավտոմատ">
              </div>
              <div class="access-helper">Google Console-ում redirect հասցեն պետք է ցույց տա դեպի <code>/social_auth.php?provider=google</code>։</div>
              <div class="action-buttons" style="margin-top:14px">
                <button class="btn" type="submit" name="form_action" value="save_access">Պահպանել Google գաղտնի բանալին</button>
              </div>
            </div>
          </section>

          <section class="settings-group" data-admin-section="access all" data-admin-permission="access">
            <div class="settings-group-header">
              <h3>Նշումներ</h3>
              <p>Ներքին նշում է։ Պատմության մեջ նույնպես կերևա։</p>
            </div>
            <div class="form-field">
              <label for="meta_note">Ներքին նշում</label>
              <textarea class="input-field" id="meta_note" name="meta_note"><?= htmlspecialchars((string)$config['meta_note'], ENT_QUOTES) ?></textarea>
            </div>

            <div class="access-helper">Նշումները և admin email-ները պահպանվում են ավտոմատ։</div>
          </section>

          <div class="sticky-actions" id="releaseActionPanel" data-admin-section="release" data-admin-permission="release">
            <span style="font-size: 13px; color: var(--muted); margin-right: auto; padding-left: 8px;">Ընտրիր կիրառման տարբերակը և սեղմիր հիմնական կոճակը։</span>
            <button class="btn btn-primary" type="submit" name="form_action" value="apply_release" style="padding: 14px 24px; font-size: 15px; font-weight: 800; border-radius: 12px; box-shadow: 0 4px 15px rgba(67, 24, 255, 0.25);">Կիրառել թարմացումը</button>
          </div>
        </div>
      </form>

      <div class="stack" data-section-container>
        <div class="stack">
          <section class="settings-group" id="moderationPanel" data-admin-section="moderation all" data-admin-permission="moderation">
            <div class="history-head">
              <div>
                <div class="settings-group-header">
              <h3>Երգերի մոդերացիայի հերթ</h3>
              <p>Այս բաժնում երևում են օգտատերերի ուղարկած նոր երգերի և խմբագրման բոլոր հարցումները։ Հաստատելուց հետո տվյալները անմիջապես կկիրառվեն երգերի բազայում, իսկ մերժելու դեպքում հարցումը կմնա պատմության մեջ որպես մերժված։</p>
            </div>
              </div>
            </div>

            <div class="stats" style="margin-bottom:16px">
              
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Սպասման մեջ</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($moderationCounts['pending'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
              
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Հաստատված</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($moderationCounts['approved'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
              
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Մերժված</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($moderationCounts['rejected'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
              
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Ընդհանուր</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($moderationCounts['all'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
            </div>

            <form method="get" class="stack" style="margin-top:16px" data-moderation-filter-form="1">
            <div class="row-2">
              <div class="form-field">
                <label for="moderation_status">Վիճակ</label>
                <select class="input-field" id="moderation_status" name="moderation_status">
                  <option value="pending" <?= $moderationFilters['status'] === 'pending' ? 'selected' : '' ?>>Միայն սպասման մեջ</option>
                  <option value="approved" <?= $moderationFilters['status'] === 'approved' ? 'selected' : '' ?>>Միայն հաստատված</option>
                  <option value="rejected" <?= $moderationFilters['status'] === 'rejected' ? 'selected' : '' ?>>Միայն մերժված</option>
                  <option value="all" <?= $moderationFilters['status'] === 'all' ? 'selected' : '' ?>>Բոլորը</option>
                </select>
              </div>
              <div class="form-field">
                <label for="moderation_search">Որոնում</label>
                <input class="input-field" id="moderation_search" name="moderation_search" value="<?= htmlspecialchars($moderationFilters['search'], ENT_QUOTES) ?>" placeholder="Որոնել վերնագրով, կատարողով կամ email-ով">
              </div>
            </div>

            <div class="action-buttons">
              <button class="btn" type="submit">Կիրառել զտումը</button>
              <a class="btn" href="/admin_updates.php" data-moderation-clear-filters="1">Մաքրել</a>
            </div>
            </form>

            <?php if (!$moderationRequests): ?>
              <div class="history-item" style="margin-top:16px">
                <div class="history-title">Հարցումներ չեն գտնվել</div>
                <div class="note">Ընթացիկ զտման պայմաններով մոդերացիայի հերթում գրառում չկա։</div>
              </div>
            <?php else: ?>
              <div class="stack" style="margin-top:16px">
                <?php foreach ($moderationRequests as $request): ?>
                  <?php
                    $requestId = (int)($request['id'] ?? 0);
                    $requestStatus = (string)($request['status'] ?? 'pending');
                    $requestType = (string)($request['request_type'] ?? 'edit');
                    $requestTitleValue = trim((string)($request['title_hy'] ?? $request['title'] ?? ''));
                    $requestArtistValue = trim((string)($request['artist'] ?? ''));
                    $requestKeyValue = trim((string)($request['song_key'] ?? ''));
                    $requestBpmValue = (int)($request['bpm'] ?? 0);
                    $requestTagsValue = trim((string)($request['tags'] ?? ''));
                    $requestMessageValue = trim((string)($request['submitted_message'] ?? ''));
                    $sourceSnapshot = is_array($request['source_snapshot_data'] ?? null) ? $request['source_snapshot_data'] : [];
                    $requestChanges = is_array($request['change_set'] ?? null) ? $request['change_set'] : [];
                    $sourceTitleValue = trim((string)($sourceSnapshot['title_hy'] ?? $sourceSnapshot['title'] ?? ''));
                    $sourceArtistValue = trim((string)($sourceSnapshot['artist'] ?? ''));
                    $sourceKeyValue = trim((string)($sourceSnapshot['song_key'] ?? ''));
                    $sourceBpmValue = (int)($sourceSnapshot['bpm'] ?? 0);
                    $sourceTagsValue = trim((string)($sourceSnapshot['tags'] ?? ''));
                  ?>
                  <article class="device-card">
                    <div class="device-header">
                      <div class="device-identity">
                        <div class="device-title"><?= htmlspecialchars($requestTitleValue !== '' ? $requestTitleValue : 'Անվերնագիր հարցում', ENT_QUOTES) ?></div>
                        <div class="device-subtitle"><?= htmlspecialchars(wp_song_request_type_label($requestType), ENT_QUOTES) ?> • <?= htmlspecialchars((string)($request['submitted_by_name'] ?: $request['submitted_by_email'] ?: 'Օգտատեր'), ENT_QUOTES) ?></div>
                        <div class="history-time"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($request['created_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                      </div>
                      <div class="device-actions">
                        <div class="chip <?= $requestStatus === 'approved' ? 'success' : ($requestStatus === 'rejected' ? 'warning' : '') ?>"><?= htmlspecialchars(wp_song_request_status_label($requestStatus), ENT_QUOTES) ?></div>
                        <?php if (!empty($request['submitted_by_email'])): ?>
                          <div class="chip"><?= htmlspecialchars((string)$request['submitted_by_email'], ENT_QUOTES) ?></div>
                        <?php endif; ?>
                      </div>
                    </div>

                    <div class="device-meta-grid">
                      <div class="device-meta"><strong>Հայերեն</strong><span><?= htmlspecialchars((string)($request['title_hy'] ?? ''), ENT_QUOTES) ?: '—' ?></span></div>
                      <div class="device-meta"><strong>Լատինատառ</strong><span><?= htmlspecialchars((string)($request['title_lat'] ?? ''), ENT_QUOTES) ?: '—' ?></span></div>
                      <div class="device-meta"><strong>Անգլերեն</strong><span><?= htmlspecialchars((string)($request['title_en'] ?? ''), ENT_QUOTES) ?: '—' ?></span></div>
                      <div class="device-meta"><strong>Ռուսերեն</strong><span><?= htmlspecialchars((string)($request['title_ru'] ?? ''), ENT_QUOTES) ?: '—' ?></span></div>
                      <div class="device-meta"><strong>Կատարող</strong><span><?= htmlspecialchars($requestArtistValue !== '' ? $requestArtistValue : '—', ENT_QUOTES) ?></span></div>
                      <div class="device-meta"><strong>Տոնայնություն</strong><span><?= htmlspecialchars($requestKeyValue !== '' ? $requestKeyValue : '—', ENT_QUOTES) ?></span></div>
                      <div class="device-meta"><strong>BPM</strong><span><?= $requestBpmValue > 0 ? (int)$requestBpmValue : '—' ?></span></div>
                      <div class="device-meta"><strong>Տեգեր</strong><span><?= htmlspecialchars($requestTagsValue !== '' ? $requestTagsValue : '—', ENT_QUOTES) ?></span></div>
                      <div class="device-meta"><strong>Կապված երգ</strong><span><?= !empty($request['song_id']) ? '#' . (int)$request['song_id'] : 'Նոր երգ' ?></span></div>
                    </div>

                    <?php if ($requestMessageValue !== ''): ?>
                      <div class="note" style="margin-top:10px"><strong>Օգտատիրոջ մեկնաբանություն.</strong> <?= htmlspecialchars($requestMessageValue, ENT_QUOTES) ?></div>
                    <?php endif; ?>

                    <?php if ($requestType === 'edit' && $requestChanges): ?>
                      <div class="moderation-history">
                        <strong>Խմբագրման տարբերությունները</strong>
                        <span>Սա պահվում է մոդերացիայի պատմության մեջ նաև հաստատելուց կամ մերժելուց հետո։ Ընդամենը փոփոխված դաշտեր՝ <?= count($requestChanges) ?>։</span>
                      </div>
                      <div class="moderation-diff-grid">
                        <?php foreach ($requestChanges as $change): ?>
                          <?php
                            $changeLabel = (string)($change['label'] ?? 'Դաշտ');
                            $changeKind = (string)($change['kind'] ?? 'changed');
                            $changeKindLabel = match ($changeKind) {
                                'added' => 'Ավելացված է',
                                'removed' => 'Հեռացված է',
                                default => 'Փոխված է',
                            };
                            $beforeValue = (string)($change['before'] ?? '—');
                            $afterValue = (string)($change['after'] ?? '—');
                            $isLongChange = !empty($change['is_long']);
                          ?>
                          <div class="moderation-diff-item" data-kind="<?= htmlspecialchars($changeKind, ENT_QUOTES) ?>">
                            <div class="moderation-diff-head">
                              <div class="moderation-diff-title"><?= htmlspecialchars($changeLabel, ENT_QUOTES) ?></div>
                              <div class="moderation-diff-badge"><?= htmlspecialchars($changeKindLabel, ENT_QUOTES) ?></div>
                            </div>
                            <div class="moderation-diff-values">
                              <div class="moderation-diff-box">
                                <strong>Գործող տարբերակ</strong>
                                <?php if ($isLongChange): ?>
                                  <pre><?= htmlspecialchars($beforeValue, ENT_QUOTES) ?></pre>
                                <?php else: ?>
                                  <span><?= htmlspecialchars($beforeValue, ENT_QUOTES) ?></span>
                                <?php endif; ?>
                              </div>
                              <div class="moderation-diff-box">
                                <strong>Առաջարկված տարբերակ</strong>
                                <?php if ($isLongChange): ?>
                                  <pre><?= htmlspecialchars($afterValue, ENT_QUOTES) ?></pre>
                                <?php else: ?>
                                  <span><?= htmlspecialchars($afterValue, ENT_QUOTES) ?></span>
                                <?php endif; ?>
                              </div>
                            </div>
                          </div>
                        <?php endforeach; ?>
                      </div>
                    <?php endif; ?>

                    <?php if ($sourceSnapshot): ?>
                      <details class="panel-embed" style="margin-top:12px">
                        <summary style="cursor:pointer;font-weight:800;">Բացել գործող տարբերակը</summary>
                        <div class="device-meta-grid" style="margin-top:12px">
                          <div class="device-meta"><strong>Վերնագիր</strong><span><?= htmlspecialchars($sourceTitleValue !== '' ? $sourceTitleValue : '—', ENT_QUOTES) ?></span></div>
                          <div class="device-meta"><strong>Կատարող</strong><span><?= htmlspecialchars($sourceArtistValue !== '' ? $sourceArtistValue : '—', ENT_QUOTES) ?></span></div>
                          <div class="device-meta"><strong>Տոնայնություն</strong><span><?= htmlspecialchars($sourceKeyValue !== '' ? $sourceKeyValue : '—', ENT_QUOTES) ?></span></div>
                          <div class="device-meta"><strong>BPM</strong><span><?= $sourceBpmValue > 0 ? (int)$sourceBpmValue : '—' ?></span></div>
                          <div class="device-meta"><strong>Տեգեր</strong><span><?= htmlspecialchars($sourceTagsValue !== '' ? $sourceTagsValue : '—', ENT_QUOTES) ?></span></div>
                        </div>
                        <?php if (!empty($sourceSnapshot['chords'])): ?>
                          <div class="form-field" style="margin-top:12px">
                            <label>Գործող ակորդներ</label>
                            <textarea class="input-field" readonly><?= htmlspecialchars((string)$sourceSnapshot['chords'], ENT_QUOTES) ?></textarea>
                          </div>
                        <?php endif; ?>
                        <?php if (!empty($sourceSnapshot['lyrics'])): ?>
                          <div class="form-field">
                            <label>Գործող բառեր</label>
                            <textarea class="input-field" readonly><?= htmlspecialchars((string)$sourceSnapshot['lyrics'], ENT_QUOTES) ?></textarea>
                          </div>
                        <?php endif; ?>
                      </details>
                    <?php endif; ?>

                    <?php if (!empty($request['chords']) || !empty($request['lyrics'])): ?>
                      <details class="panel-embed" style="margin-top:12px">
                        <summary style="cursor:pointer;font-weight:800;">Բացել առաջարկված ակորդներն ու բառերը</summary>
                        <?php if (!empty($request['chords'])): ?>
                          <div class="form-field" style="margin-top:12px">
                            <label>Առաջարկվող ակորդներ</label>
                            <textarea class="input-field" readonly><?= htmlspecialchars((string)$request['chords'], ENT_QUOTES) ?></textarea>
                          </div>
                        <?php endif; ?>
                        <?php if (!empty($request['lyrics'])): ?>
                          <div class="form-field">
                            <label>Առաջարկվող բառեր</label>
                            <textarea class="input-field" readonly><?= htmlspecialchars((string)$request['lyrics'], ENT_QUOTES) ?></textarea>
                          </div>
                        <?php endif; ?>
                      </details>
                    <?php endif; ?>

                    <?php if ($requestStatus === 'pending'): ?>
                      <form method="post" class="stack" style="margin-top:14px" data-moderation-decision-form="1">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                        <input type="hidden" name="song_request_id" value="<?= $requestId ?>">
                        <div class="form-field" style="margin-top:0">
                          <label for="song_request_review_note_<?= $requestId ?>">Ադմինի նշում</label>
                          <textarea class="input-field" id="song_request_review_note_<?= $requestId ?>" name="song_request_review_note" rows="3" placeholder="Օր. սա լավ ուղղում է, կամ՝ խնդրում եմ ուղարկել ավելի ամբողջական տարբերակ"></textarea>
                        </div>
                        <div class="action-buttons">
                          <button class="btn btn-primary" type="submit" name="form_action" value="approve_song_request">Հաստատել և կիրառել</button>
                          <button class="history-btn danger" type="submit" name="form_action" value="reject_song_request">Մերժել</button>
                        </div>
                      </form>
                    <?php else: ?>
                      <div class="note" style="margin-top:12px">
                        <strong>Ադմինի որոշում.</strong>
                        <?= htmlspecialchars((string)($request['review_note'] ?? 'Նշում չկա։'), ENT_QUOTES) ?>
                        <?php if (!empty($request['reviewed_by_name']) || !empty($request['reviewed_at'])): ?>
                          <br>
                          <span style="color:var(--muted)">
                            <?= htmlspecialchars((string)($request['reviewed_by_name'] ?? 'admin'), ENT_QUOTES) ?>
                            •
                            <?= htmlspecialchars(wp_version_format_datetime_admin((string)($request['reviewed_at'] ?? '')) ?: '—', ENT_QUOTES) ?>
                          </span>
                        <?php endif; ?>
                      </div>
                    <?php endif; ?>
                  </article>
                <?php endforeach; ?>
              </div>
            <?php endif; ?>
          </section>
        </div>
      </div>

      <div class="stack" data-section-container>
        <form method="get" class="stack">
          <section class="settings-group" id="translationFilterPanel" data-admin-section="translations all" data-admin-permission="translations">
            <div class="history-head">
              <div>
                <div class="settings-group-header">
              <h3>Թարգմանությունների դիտում և զտում</h3>
              <p>Այստեղ կարող ես տեսնել cache եղած թարգմանությունները, զտել ըստ լեզվի և գտնել կոնկրետ աղբյուր տեքստը կամ արդեն թարգմանված տարբերակը։</p>
            </div>
              </div>
            </div>
            <div class="row-2">
              <div class="form-field">
                <label for="translation_lang">Լեզու</label>
                <select class="input-field" id="translation_lang" name="translation_lang">
                  <option value="all" <?= $translationFilters['lang'] === 'all' ? 'selected' : '' ?>>Բոլորը</option>
                  <option value="ru" <?= $translationFilters['lang'] === 'ru' ? 'selected' : '' ?>>Ռուսերեն</option>
                  <option value="en" <?= $translationFilters['lang'] === 'en' ? 'selected' : '' ?>>Անգլերեն</option>
                </select>
              </div>
              <div class="form-field">
                <label for="translation_search">Որոնում</label>
                <input class="input-field" id="translation_search" name="translation_search" value="<?= htmlspecialchars($translationFilters['search'], ENT_QUOTES) ?>" placeholder="Որոնել աղբյուրով, թարգմանությամբ կամ context-ով">
              </div>
            </div>
            <div class="action-buttons">
              <button class="btn" type="submit">Կիրառել զտումը</button>
              <a class="btn" href="/admin_updates.php">Մաքրել զտումը</a>
            </div>
          </section>
        </form>

        <form method="post" class="stack" id="translationControlForm">
          <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">

          <div class="stats" data-admin-section="translations all" data-admin-permission="translations">
            
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Թարգմանության աշխատակարգ</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;">ՁԵՌՔՈՎ</strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
            
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Ընթացիկ ռեժիմ</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars((string)($translationSettings['mode'] ?? 'manual'), ENT_QUOTES) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
            
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Ընդհանուր թարգմանված գրառումներ</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($translationCacheStats['all'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          </div>

          <section class="settings-group" id="translationSettingsPanel" data-admin-section="translations all" data-admin-permission="translations">
            <div class="settings-group-header">
              <h3>Երգ ընտրել և վերնագիրը թարգմանել</h3>
              <p>Ընտրիր երգը ցանկից, և նույն տեղում լրացրու ռուսերեն ու անգլերեն վերնագրերը։ Եթե տվյալ լեզվի թարգմանությունը արդեն կա, դաշտը կլրացվի ավտոմատ։</p>
            </div>

            <div class="row-2">
              <div class="form-field">
                <label for="translation_song_id">Երգը ցանկից</label>
                <select class="input-field" id="translation_song_id" name="translation_song_id">
                  <option value="">Ընտրիր երգը</option>
                  <?php foreach ($translationSongOptions as $songOption): ?>
                    <option
                      value="<?= (int)$songOption['id'] ?>"
                      data-title="<?= htmlspecialchars((string)$songOption['title'], ENT_QUOTES) ?>"
                      data-hy="<?= htmlspecialchars((string)$songOption['hy'], ENT_QUOTES) ?>"
                      data-lat="<?= htmlspecialchars((string)$songOption['lat'], ENT_QUOTES) ?>"
                      data-ru="<?= htmlspecialchars((string)$songOption['ru'], ENT_QUOTES) ?>"
                      data-en="<?= htmlspecialchars((string)$songOption['en'], ENT_QUOTES) ?>"
                    >
                      #<?= (int)$songOption['id'] ?> — <?= htmlspecialchars((string)$songOption['title'], ENT_QUOTES) ?>
                    </option>
                  <?php endforeach; ?>
                </select>
              </div>
              <div class="form-field">
                <label for="translation_song_source_preview">Հայերեն վերնագիր</label>
                <input class="input-field" id="translation_song_source_preview" type="text" value="" placeholder="Ընտրելուց հետո այստեղ կերևա վերնագիրը" readonly>
              </div>
            </div>

            <div class="row-2">
              <div class="form-field">
                <label for="translation_song_lat">Հայերեն լատինատառ</label>
                <textarea class="input-field" id="translation_song_lat" name="translation_song_lat" rows="4" placeholder="Օր. Egiptos"></textarea>
              </div>
              <div class="form-field">
                <label for="translation_song_ru">Ռուսերեն վերնագիր</label>
                <textarea class="input-field" id="translation_song_ru" name="translation_song_ru" rows="4" placeholder="Ռուսերեն տարբերակ"></textarea>
              </div>
            </div>

            <div class="row-2">
              <div class="form-field">
                <label for="translation_song_en">Անգլերեն վերնագիր</label>
                <textarea class="input-field" id="translation_song_en" name="translation_song_en" rows="4" placeholder="Անգլերեն տարբերակ"></textarea>
              </div>
            </div>

            <div class="access-helper">Պահպանումը գրում է ընտրված երգի վերնագրի թարգմանությունը, և այն կաշխատի նաև երգերի ցանկում ու երգի դիտման էջում։</div>

            <div class="action-buttons">
              <button class="btn btn-primary" type="submit" name="form_action" value="save_song_title_translations">Պահպանել երկու լեզուներով</button>
            </div>
          </section>

          <section class="settings-group" id="translationCachePanel" data-admin-section="translations all" data-admin-permission="translations">
            <div class="history-head">
              <div>
                <div class="settings-group-header">
              <h3>Թարգմանված գրառումների կառավարում</h3>
              <p>Սա պահված թարգմանությունների ցանկն է։ Կարող ես ձեռքով ուղղել թարգմանված տարբերակը, ջնջել մեկ գրառում, կամ մաքրել ամբողջ պահոցը։</p>
            </div>
              </div>
            </div>

            <div class="chips" style="margin-bottom:16px">
              <div class="chip">Ընդամենը <?= (int)($translationCacheStats['all'] ?? 0) ?></div>
              <div class="chip">Ռուսերեն <?= (int)($translationCacheStats['ru'] ?? 0) ?></div>
              <div class="chip">Անգլերեն <?= (int)($translationCacheStats['en'] ?? 0) ?></div>
              <div class="chip">Ցուցադրվում է մինչև 80 գրառում</div>
            </div>

            <div class="action-buttons" style="margin-bottom:16px">
              <button class="btn" type="button" data-translation-clear-cache="ru">Մաքրել ռուսերենի cache-ը</button>
              <button class="btn" type="button" data-translation-clear-cache="en">Մաքրել անգլերենի cache-ը</button>
              <button class="history-btn danger" type="button" data-translation-clear-cache="all">Մաքրել ամբողջ cache-ը</button>
            </div>

            <div class="autosave-status" id="translationActionStatus" data-state="idle">Պատրաստ է կառավարման համար</div>

            <?php if (!$translationEntries): ?>
              <div class="access-helper" style="margin-top:16px">Ընթացիկ զտման պայմաններով cache-ում թարգմանված գրառում չի գտնվել։</div>
            <?php else: ?>
              <div class="stack" style="margin-top:16px">
                <?php foreach ($translationEntries as $entry): ?>
                  <article class="panel-embed" data-translation-entry>
                    <input type="hidden" data-translation-lang value="<?= htmlspecialchars((string)$entry['lang'], ENT_QUOTES) ?>">
                    <input type="hidden" data-translation-context value="<?= htmlspecialchars((string)$entry['context'], ENT_QUOTES) ?>">
                    <textarea class="input-field" data-translation-source hidden><?= htmlspecialchars((string)$entry['source'], ENT_QUOTES) ?></textarea>

                    <div class="history-toolbar" style="margin-bottom:12px">
                      <div class="history-toolbar-copy">
                        <?= htmlspecialchars(wp_admin_updates_translation_lang_label((string)$entry['lang']), ENT_QUOTES) ?> •
                        <?= htmlspecialchars((string)$entry['context'], ENT_QUOTES) ?> •
                        <?= htmlspecialchars(wp_version_format_datetime_admin((string)($entry['updated_at'] ?? '')) ?: '—', ENT_QUOTES) ?>
                      </div>
                      <div class="autosave-status" data-translation-entry-status data-state="idle">Պատրաստ է խմբագրման</div>
                    </div>

                    <div class="form-field">
                      <label>Հայերեն աղբյուր</label>
                      <textarea class="input-field" readonly><?= htmlspecialchars((string)$entry['source'], ENT_QUOTES) ?></textarea>
                    </div>

                    <div class="form-field">
                      <label>Թարգմանված տարբերակ</label>
                      <textarea class="input-field" data-translation-text><?= htmlspecialchars((string)$entry['text'], ENT_QUOTES) ?></textarea>
                    </div>

                    <div class="action-buttons">
                      <button class="btn" type="button" data-translation-save-entry>Պահպանել ուղղումը</button>
                      <button class="history-btn danger" type="button" data-translation-delete-entry>Ջնջել այս գրառումը</button>
                    </div>
                  </article>
                <?php endforeach; ?>
              </div>
            <?php endif; ?>
          </section>
        </form>
      </div>

      <form method="post" class="stack" data-section-container>
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
        <div class="stats" data-admin-section="push devices all" data-admin-permission="push,devices">
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Push ծանուցումների վիճակ</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= !empty($pushConfig['enabled']) ? 'ՄԻԱՑՎԱԾ' : 'ԱՆՋԱՏՎԱԾ' ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Ծրագրի ընդհանուր ճանաչված տեղադրումներ</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($installStats['main']['known_count'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Վերջին <?= (int)($installStats['window_days'] ?? 60) ?> օրում ակտիվ երևացած սարքեր</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($installStats['main']['count'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Push միացրած սարքեր</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($pushStats['subscriptions'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Վերջին ուղարկումը</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars($pushLastSentAt ?: '—', ENT_QUOTES) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
        </div>

        <section class="settings-group" data-admin-section="push all" data-admin-permission="push">
          <div class="settings-group-header">
              <h3>Push ծանուցումներ</h3>
              <p>Այս բաժնից կարող եք միացնել browser/app push ծանուցումները, տեսնել քանի սարք է բաժանորդագրված, և ուղարկել ձեռքով նորություն, թարմացում կամ հայտարարություն։ Push-ը հասնում է բոլոր այն տեղադրված ծրագրերին, որոնք թույլ են տվել ծանուցումները։ <code>Ծրագրի ընդհանուր ճանաչված տեղադրումներ</code> թիվը կայուն ընդհանուր հաշվիչն է, իսկ <code>վերջին <?= (int)($installStats['window_days'] ?? 60) ?> օրում ակտիվ երևացած սարքեր</code>-ը ժամանակավոր activity հաշվիչն է և կարող է պակասել, եթե ծրագիրը երկար ժամանակ չի բացվել օնլայն։</p>
            </div>
          <div class="chips" style="margin-top:12px">
            <div class="autosave-status" id="pushAutosaveStatus" data-state="idle">Փոփոխությունները կպահպանվեն ավտոմատ</div>
          </div>

          <div class="switch-row">
            <div class="switch-copy">
              <strong>Միացնել push ծանուցումները</strong>
              <span><?= !empty($pushConfig['supported']) ? 'Եթե սա ակտիվ է, կայքի և ծրագրի user-ները կարող են բաժանորդագրվել push ծանուցումներին։' : 'Սերվերի վրա OpenSSL աջակցություն չկա, դրա համար push notifications-ը չի կարող ամբողջությամբ աշխատել։' ?></span>
            </div>
            <label class="switch" for="push_enabled">
              <input id="push_enabled" name="push_enabled" type="checkbox" <?= !empty($pushConfig['enabled']) ? 'checked' : '' ?> <?= empty($pushConfig['supported']) ? 'disabled' : '' ?>>
              <span class="slider"></span>
            </label>
          </div>

          <div class="row-2">
            <div class="form-field">
              <label for="push_subject">Կապի հասցե (VAPID subject)</label>
              <input class="input-field" id="push_subject" name="push_subject" value="<?= htmlspecialchars((string)($pushConfig['vapid_subject'] ?? ''), ENT_QUOTES) ?>" placeholder="mailto:admin@example.com">
            </div>
            <div class="form-field">
              <label for="push_public_key_preview">Հանրային բանալի</label>
              <input class="input-field" id="push_public_key_preview" value="<?= htmlspecialchars((string)($pushConfig['vapid_public_key'] ?? ''), ENT_QUOTES) ?>" readonly>
            </div>
          </div>

          <div class="access-helper">Push կարգավորումների այս դաշտերը պահպանվում են ավտոմատ։</div>
        </section>

        <section class="settings-group" id="devicesPanel" data-admin-section="devices all" data-admin-permission="devices">
          <div class="history-head">
            <div>
              <div class="settings-group-header">
              <h3>Ծրագրի ակտիվ սարքեր</h3>
              <p>Այս բաժնում երևում են ինչպես հիմնական ծրագրի, այնպես էլ admin ծրագրի ակտիվ սարքերը։ Տվյալները թարմացվում են, երբ տեղադրված ծրագիրը օնլայն բացվում է և install հաշվիչին activity է ուղարկում։</p>
            </div>
            </div>
          </div>

          <div class="device-toolbar">
            <div class="device-toolbar-grid">
              <div class="form-field" style="margin-top:0">
                <label for="device_search">Որոնել սարք կամ օգտատեր</label>
                <input class="input-field" id="device_search" name="device_search" value="<?= htmlspecialchars($deviceFilters['search'], ENT_QUOTES) ?>" placeholder="Անուն, email, username, IP, սարք">
              </div>
              <div class="form-field" style="margin-top:0">
                <label for="device_scope">Տեսք</label>
                <select class="input-field" id="device_scope" name="device_scope">
                  <option value="all" <?= $deviceFilters['scope'] === 'all' ? 'selected' : '' ?>>Բոլորը</option>
                  <option value="main" <?= $deviceFilters['scope'] === 'main' ? 'selected' : '' ?>>Միայն հիմնական ծրագիր</option>
                  <option value="admin" <?= $deviceFilters['scope'] === 'admin' ? 'selected' : '' ?>>Միայն ադմին ծրագիր</option>
                </select>
              </div>
              <div class="form-field" style="margin-top:0">
                <label for="device_link">Կապվածություն</label>
                <select class="input-field" id="device_link" name="device_link">
                  <option value="all" <?= $deviceFilters['link'] === 'all' ? 'selected' : '' ?>>Բոլորը</option>
                  <option value="linked" <?= $deviceFilters['link'] === 'linked' ? 'selected' : '' ?>>Միայն կապված օգտահաշվով</option>
                  <option value="guest" <?= $deviceFilters['link'] === 'guest' ? 'selected' : '' ?>>Միայն անանուն</option>
                </select>
              </div>
              <div class="form-field" style="margin-top:0">
                <label for="device_platform">Հարթակ</label>
                <select class="input-field" id="device_platform" name="device_platform">
                  <option value="all">Բոլորը</option>
                  <?php foreach ($deviceFilterOptions['platforms'] as $platformOption): ?>
                    <option value="<?= htmlspecialchars($platformOption, ENT_QUOTES) ?>" <?= $deviceFilters['platform'] === $platformOption ? 'selected' : '' ?>><?= htmlspecialchars($platformOption, ENT_QUOTES) ?></option>
                  <?php endforeach; ?>
                </select>
              </div>
              <div class="form-field" style="margin-top:0">
                <label for="device_browser">Դիտարկիչ</label>
                <select class="input-field" id="device_browser" name="device_browser">
                  <option value="all">Բոլորը</option>
                  <?php foreach ($deviceFilterOptions['browsers'] as $browserOption): ?>
                    <option value="<?= htmlspecialchars($browserOption, ENT_QUOTES) ?>" <?= $deviceFilters['browser'] === $browserOption ? 'selected' : '' ?>><?= htmlspecialchars($browserOption, ENT_QUOTES) ?></option>
                  <?php endforeach; ?>
                </select>
              </div>
              <div class="form-field" style="margin-top:0">
                <label for="device_sort">Դասավորել ըստ</label>
                <select class="input-field" id="device_sort" name="device_sort">
                  <option value="last_seen_newest" <?= $deviceFilters['sort'] === 'last_seen_newest' ? 'selected' : '' ?>>Վերջին ակտիվություն՝ նորից հին</option>
                  <option value="last_seen_oldest" <?= $deviceFilters['sort'] === 'last_seen_oldest' ? 'selected' : '' ?>>Վերջին ակտիվություն՝ հինից նոր</option>
                  <option value="installed_newest" <?= $deviceFilters['sort'] === 'installed_newest' ? 'selected' : '' ?>>Առաջին գրանցում՝ նորից հին</option>
                  <option value="installed_oldest" <?= $deviceFilters['sort'] === 'installed_oldest' ? 'selected' : '' ?>>Առաջին գրանցում՝ հինից նոր</option>
                  <option value="identity_asc" <?= $deviceFilters['sort'] === 'identity_asc' ? 'selected' : '' ?>>Անուն՝ Ա-Ֆ</option>
                  <option value="identity_desc" <?= $deviceFilters['sort'] === 'identity_desc' ? 'selected' : '' ?>>Անուն՝ Ֆ-Ա</option>
                  <option value="platform_asc" <?= $deviceFilters['sort'] === 'platform_asc' ? 'selected' : '' ?>>Հարթակով խմբավորված</option>
                </select>
              </div>
            </div>
            <div class="device-toolbar-actions">
              <div class="device-toolbar-summary">
                Ֆիլտրից հետո երևում է <?= count($filteredMainInstallDevices) ?> հիմնական և <?= count($filteredAdminInstallDevices) ?> ադմին սարք։
              </div>
              <div class="action-buttons">
                <button class="btn" id="applyDeviceFiltersBtn" type="button">Կիրառել</button>
                <a class="btn btn-ghost" href="/admin_updates.php">Մաքրել ֆիլտրերը</a>
              </div>
            </div>
          </div>

          <div class="stats" style="margin-top:16px">
            
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Հիմնական ծրագիր ակտիվ սարքեր (<?= (int)($installStats['window_days'] ?? 60) ?> օր)</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($installStats['main']['count'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
            
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Հիմնական ծրագիր ընդհանուր ճանաչված</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($installStats['main']['known_count'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
            
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Ադմին ծրագիր ակտիվ սարքեր (<?= (int)($installStats['window_days'] ?? 60) ?> օր)</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($installStats['admin']['count'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
            
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Ադմին ծրագիր ընդհանուր ճանաչված</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($installStats['admin']['known_count'] ?? 0) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
            
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Վերջին ակտիվություն` հիմնական</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($installStats['main']['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
            
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Վերջին ակտիվություն` ադմին</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($installStats['admin']['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(67, 24, 255, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +0%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          </div>

          <?php if ($showMainDeviceSection): ?>
          <div class="history-head" style="margin-top:18px">
            <div>
              <div class="settings-group-header">
              <h3>Հիմնական ծրագրի սարքեր</h3>
              <p>Վերջին <?= (int)($installStats['window_days'] ?? 60) ?> օրում օնլայն երևացած հիմնական ծրագրի սարքերը։</p>
            </div>
            </div>
          </div>

          <?php if (!$filteredMainInstallDevices): ?>
            <div class="history-item">
              <div class="history-title">Հիմնական ծրագրի սարքեր չեն գտնվել</div>
              <div class="note">Փորձիր փոխել ֆիլտրերը կամ սպասիր, մինչև հիմնական ծրագիրը նորից օնլայն երևա։</div>
            </div>
          <?php else: ?>
            <div class="device-list">
              <?php foreach ($filteredMainInstallDevices as $device): ?>
                <div class="device-card">
                  <div class="device-header">
                    <div class="device-identity">
                      <div class="device-title"><?= htmlspecialchars(wp_admin_updates_install_identity($device), ENT_QUOTES) ?></div>
                      <div class="device-subtitle"><?= htmlspecialchars(wp_admin_updates_install_secondary($device), ENT_QUOTES) ?></div>
                      <div class="history-time">Վերջին ակտիվությունը <?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                    </div>
                    <div class="device-actions">
                      <div class="chip <?= !empty($device['user_id']) || !empty($device['user_name']) || !empty($device['user_username']) || !empty($device['user_email']) ? 'success' : 'warning' ?>"><?= htmlspecialchars(wp_admin_updates_install_link_status($device), ENT_QUOTES) ?></div>
                      <form method="post" style="margin:0" onsubmit="return window.confirm('Վստա՞հ եք, որ ուզում եք մաքրել այս սարքի տվյալը։');">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                        <input type="hidden" name="form_action" value="remove_install_device">
                        <input type="hidden" name="install_scope" value="main">
                        <input type="hidden" name="install_device_id" value="<?= htmlspecialchars((string)($device['device_id'] ?? ''), ENT_QUOTES) ?>">
                        <input type="hidden" name="install_device_signature" value="<?= htmlspecialchars((string)($device['device_signature'] ?? ''), ENT_QUOTES) ?>">
                        <button class="history-btn danger" type="submit">Մաքրել տվյալը</button>
                      </form>
                    </div>
                  </div>

                  <div class="chips">
                      <?php if (!empty($device['user_id'])): ?>
                        <div class="chip">Օգտատեր #<?= (int)$device['user_id'] ?></div>
                      <?php endif; ?>
                      <?php if (!empty($device['user_username'])): ?>
                        <div class="chip">@<?= htmlspecialchars((string)$device['user_username'], ENT_QUOTES) ?></div>
                      <?php endif; ?>
                      <?php if (!empty($device['user_email'])): ?>
                        <div class="chip">Email <?= htmlspecialchars((string)$device['user_email'], ENT_QUOTES) ?></div>
                      <?php endif; ?>
                  </div>

                  <div class="device-meta-grid">
                    <div class="device-meta"><strong>Սարքի ID</strong><span><?= htmlspecialchars(wp_install_mask_device_id((string)($device['device_id'] ?? '')), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>IP հասցե</strong><span><?= htmlspecialchars(wp_admin_updates_install_ip($device), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Աղբյուր</strong><span><?= htmlspecialchars((string)($device['source'] ?? '—'), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Հարթակ</strong><span><?= htmlspecialchars(wp_admin_updates_install_platform((string)($device['user_agent'] ?? '')), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Browser</strong><span><?= htmlspecialchars(wp_admin_updates_install_browser((string)($device['user_agent'] ?? '')), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Առաջին գրանցում</strong><span><?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['installed_at'] ?? '')) ?: '—', ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Վերջին կապ</strong><span><?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></span></div>
                  </div>

                  <?php if (!empty($device['user_agent'])): ?>
                    <div class="note" style="margin-top:10px;word-break:break-word"><?= htmlspecialchars((string)$device['user_agent'], ENT_QUOTES) ?></div>
                  <?php endif; ?>
                </div>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
          <?php endif; ?>

          <?php if ($showAdminDeviceSection): ?>
          <div class="history-head" style="margin-top:18px">
            <div>
              <div class="settings-group-header">
              <h3>Ադմին ծրագրի սարքեր</h3>
              <p>Այստեղ երևում են admin panel-ը որպես առանձին ծրագիր բացող ակտիվ սարքերը։</p>
            </div>
            </div>
          </div>

          <?php if (!$filteredAdminInstallDevices): ?>
            <div class="history-item">
              <div class="history-title">Ադմին ծրագրի սարքեր չեն գտնվել</div>
              <div class="note">Փորձիր փոխել ֆիլտրերը կամ սպասիր, մինչև ադմին ծրագիրը նորից օնլայն երևա։</div>
            </div>
          <?php else: ?>
            <div class="device-list">
              <?php foreach ($filteredAdminInstallDevices as $device): ?>
                <div class="device-card">
                  <div class="device-header">
                    <div class="device-identity">
                      <div class="device-title"><?= htmlspecialchars(wp_admin_updates_install_identity($device), ENT_QUOTES) ?></div>
                      <div class="device-subtitle"><?= htmlspecialchars(wp_admin_updates_install_secondary($device), ENT_QUOTES) ?></div>
                      <div class="history-time">Վերջին ակտիվությունը <?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                    </div>
                    <div class="device-actions">
                      <div class="chip <?= !empty($device['user_id']) || !empty($device['user_name']) || !empty($device['user_username']) || !empty($device['user_email']) ? 'success' : 'warning' ?>"><?= htmlspecialchars(wp_admin_updates_install_link_status($device), ENT_QUOTES) ?></div>
                      <form method="post" style="margin:0" onsubmit="return window.confirm('Վստա՞հ եք, որ ուզում եք մաքրել այս սարքի տվյալը։');">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                        <input type="hidden" name="form_action" value="remove_install_device">
                        <input type="hidden" name="install_scope" value="admin">
                        <input type="hidden" name="install_device_id" value="<?= htmlspecialchars((string)($device['device_id'] ?? ''), ENT_QUOTES) ?>">
                        <input type="hidden" name="install_device_signature" value="<?= htmlspecialchars((string)($device['device_signature'] ?? ''), ENT_QUOTES) ?>">
                        <button class="history-btn danger" type="submit">Մաքրել տվյալը</button>
                      </form>
                    </div>
                  </div>

                  <div class="chips">
                      <?php if (!empty($device['user_id'])): ?>
                        <div class="chip">Օգտատեր #<?= (int)$device['user_id'] ?></div>
                      <?php endif; ?>
                      <?php if (!empty($device['user_username'])): ?>
                        <div class="chip">@<?= htmlspecialchars((string)$device['user_username'], ENT_QUOTES) ?></div>
                      <?php endif; ?>
                      <?php if (!empty($device['user_email'])): ?>
                        <div class="chip">Email <?= htmlspecialchars((string)$device['user_email'], ENT_QUOTES) ?></div>
                      <?php endif; ?>
                  </div>

                  <div class="device-meta-grid">
                    <div class="device-meta"><strong>Սարքի ID</strong><span><?= htmlspecialchars(wp_install_mask_device_id((string)($device['device_id'] ?? '')), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>IP հասցե</strong><span><?= htmlspecialchars(wp_admin_updates_install_ip($device), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Աղբյուր</strong><span><?= htmlspecialchars((string)($device['source'] ?? '—'), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Հարթակ</strong><span><?= htmlspecialchars(wp_admin_updates_install_platform((string)($device['user_agent'] ?? '')), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Browser</strong><span><?= htmlspecialchars(wp_admin_updates_install_browser((string)($device['user_agent'] ?? '')), ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Առաջին գրանցում</strong><span><?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['installed_at'] ?? '')) ?: '—', ENT_QUOTES) ?></span></div>
                    <div class="device-meta"><strong>Վերջին կապ</strong><span><?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></span></div>
                  </div>

                  <?php if (!empty($device['user_agent'])): ?>
                    <div class="note" style="margin-top:10px;word-break:break-word"><?= htmlspecialchars((string)$device['user_agent'], ENT_QUOTES) ?></div>
                  <?php endif; ?>
                </div>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
          <?php endif; ?>
        </section>

        <section class="settings-group" id="pushComposerPanel" data-admin-section="push all" data-admin-permission="push">
          <div class="settings-group-header">
              <h3>Ուղարկել Push ծանուցում</h3>
              <p>Այս գործողությունը հերթագրում է ծանուցումը բոլոր բաժանորդագրված սարքերի համար և անմիջապես ուղարկում է push signal-ը, որպեսզի notification-ը երևա user-ի սարքում։</p>
            </div>

          <div class="push-workspace">
            <div>
              <div class="row-2">
                <div class="form-field">
                  <label for="push_title">Վերնագիր</label>
                  <input class="input-field" id="push_title" name="push_title" maxlength="160" value="Worship Platform" required>
                </div>
                <div class="form-field">
                  <label for="push_tag">Խումբ (tag)</label>
                  <input class="input-field" id="push_tag" name="push_tag" maxlength="120" value="worship-update">
                </div>
              </div>

              <div class="form-field">
                <label for="push_body">Բովանդակություն</label>
                <textarea class="input-field" id="push_body" name="push_body" required>Նոր թարմացում կամ հայտարարություն կա։ Բացեք Worship Platform-ը մանրամասների համար։</textarea>
              </div>

              <div class="row-2">
                <div class="form-field">
                  <label for="push_url">Բացվող հղում</label>
                  <input class="input-field" id="push_url" name="push_url" value="/main.html" placeholder="/main.html">
                </div>
                <div class="form-field">
                  <label for="push_icon">Նշան (icon)</label>
                  <input class="input-field" id="push_icon" name="push_icon" value="/wolarm_youth.png" placeholder="/wolarm_youth.png">
                </div>
              </div>

              <div class="push-template-strip">
                <button class="btn" type="button" data-push-template="release">Թարմացում</button>
                <button class="btn" type="button" data-push-template="news">Նորություն</button>
                <button class="btn" type="button" data-push-template="maintenance">Տեխնիկական աշխատանք</button>
                <button class="btn" type="button" data-push-template="reminder">Հիշեցում</button>
              </div>

              <div class="action-buttons" style="margin-top:14px">
                <button class="btn btn-primary" id="sendPushBtn" type="button" <?= empty($pushConfig['supported']) ? 'disabled' : '' ?>>Ուղարկել Push ծանուցումը</button>
              </div>
            </div>

            <aside class="push-preview">
              <h3>Ուղարկման նախադիտում</h3>
              <p>Այստեղ նույն պահին երևում է ինչպես կարող է notification-ը նստել սարքի վրա, որպեսզի ուղարկելուց առաջ արագ ստուգես տեքստը։</p>
              <div class="push-preview-phone">
                <div class="push-preview-screen">
                  <div class="push-preview-banner">
                    <div class="push-preview-top">
                      <div class="push-preview-app">Worship Platform</div>
                      <div class="push-preview-tag" id="pushPreviewTag">worship-update</div>
                    </div>
                    <div class="push-preview-title" id="pushPreviewTitle">Worship Platform</div>
                    <div class="push-preview-body" id="pushPreviewBody">Նոր թարմացում կամ հայտարարություն կա։ Բացեք Worship Platform-ը մանրամասների համար։</div>
                  </div>
                  <div class="push-preview-meta">
                    <div class="chip" id="pushPreviewUrl">Հղում /main.html</div>
                    <div class="chip" id="pushPreviewIcon">Նշան /wolarm_youth.png</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section class="settings-group" id="pushSubscriptionsPanel" data-admin-section="push all" data-admin-permission="push">
            <div class="history-head">
            <div>
              <div class="settings-group-header">
              <h3>Push միացրած սարքերի տվյալներ</h3>
              <p>Այստեղ երևում են բաժանորդագրված սարքերի տվյալները` օգտահաշիվը, IP-ն, browser/device signature-ը, endpoint host-ը և վերջին ակտիվությունը։</p>
            </div>
            </div>
          </div>

          <div class="history-toolbar">
            <div class="field history-search">
              <label for="pushSubscriptionSearch">Որոնել push սարքերի մեջ</label>
              <input class="input-field" id="pushSubscriptionSearch" type="search" placeholder="Անուն, email, IP, endpoint, browser">
            </div>
            <div class="history-toolbar-copy" id="pushSubscriptionSummary">Ցուցադրվում են բոլոր գրանցված push սարքերը։</div>
          </div>

          <?php if (!$pushSubscriptions): ?>
            <div class="history-item">
              <div class="history-title">Բաժանորդագրված սարքեր դեռ չկան</div>
              <div class="note">Երբ user-ը միացնի push ծանուցումները, նրա սարքը կհայտնվի այստեղ։</div>
            </div>
          <?php else: ?>
            <div class="history-list">
              <?php foreach ($pushSubscriptions as $subscription): ?>
                <div class="history-item" data-push-subscription-item data-push-subscription-search="<?= htmlspecialchars(wp_admin_updates_push_search_haystack($subscription), ENT_QUOTES) ?>">
                  <div class="history-top">
                    <div>
                      <div class="history-title"><?= htmlspecialchars(wp_admin_updates_push_identity($subscription), ENT_QUOTES) ?></div>
                      <div class="history-time">Գրանցվել է <?= htmlspecialchars(wp_version_format_datetime_admin((string)($subscription['created_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                      <div class="chip">ID <?= htmlspecialchars(substr((string)($subscription['id'] ?? ''), 0, 12) ?: '—', ENT_QUOTES) ?></div>
                      <button
                        class="history-btn danger"
                        type="submit"
                        name="form_action"
                        value="remove_push_subscription:<?= htmlspecialchars((string)($subscription['id'] ?? ''), ENT_QUOTES) ?>"
                        onclick="return confirm('Վստա՞հ եք, որ ուզում եք հեռացնել այս push սարքը։');"
                      >Հեռացնել</button>
                    </div>
                  </div>

                  <div class="chips">
                    <div class="chip">Endpoint <?= htmlspecialchars(wp_admin_updates_push_endpoint_host((string)($subscription['endpoint'] ?? '')), ENT_QUOTES) ?></div>
                    <div class="chip">IP <?= htmlspecialchars(wp_admin_updates_push_ip($subscription), ENT_QUOTES) ?></div>
                    <div class="chip">Վերջին կապ <?= htmlspecialchars(wp_version_format_datetime_admin((string)($subscription['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                    <div class="chip">Թարմացվել է <?= htmlspecialchars(wp_version_format_datetime_admin((string)($subscription['updated_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                    <?php if (!empty($subscription['user_id'])): ?>
                      <div class="chip">User ID <?= (int)$subscription['user_id'] ?></div>
                    <?php endif; ?>
                  </div>

                  <?php if (!empty($subscription['user_agent'])): ?>
                    <div class="note"><?= htmlspecialchars((string)$subscription['user_agent'], ENT_QUOTES) ?></div>
                  <?php endif; ?>
                </div>
              <?php endforeach; ?>
            </div>
            <div class="history-item" id="pushSubscriptionEmptyState" hidden>
              <div class="history-title">Համընկնող push սարք չգտնվեց</div>
              <div class="note">Փոխիր որոնման բառը կամ մաքրիր դաշտը, որպեսզի տեսնես բոլոր գրանցված սարքերը։</div>
            </div>
          <?php endif; ?>
        </section>

        <section class="settings-group" id="pushHistoryPanel" data-admin-section="push all" data-admin-permission="push">
          <div class="history-head">
            <div>
              <div class="settings-group-header">
              <h3>Push հաղորդագրությունների պատմություն</h3>
              <p>Այստեղ պահվում են վերջին ուղարկված push հաղորդագրությունները, ուղարկող ադմինը և ուղարկման արդյունքը ըստ սարքերի։</p>
            </div>
            </div>
            <?php if ($pushHistory): ?>
              <button
                class="history-btn"
                type="submit"
                name="form_action"
                value="clear_push_history"
                onclick="return confirm('Վստա՞հ եք, որ ուզում եք ամբողջությամբ ջնջել push պատմությունը։');"
              >Մաքրել push պատմությունը</button>
            <?php endif; ?>
          </div>

          <div class="history-toolbar">
            <div class="field history-search">
              <label for="pushHistorySearch">Որոնել push պատմության մեջ</label>
              <input class="input-field" id="pushHistorySearch" type="search" placeholder="Վերնագիր, բովանդակություն, ուղարկող, խումբ">
            </div>
            <div class="history-toolbar-copy" id="pushHistorySummary">Այստեղ երևում են բոլոր վերջին ուղարկումները։</div>
          </div>

          <?php if (!$pushHistory): ?>
            <div class="history-item">
              <div class="history-title">Push պատմություն դեռ չկա</div>
              <div class="note">Առաջին ուղարկումից հետո այստեղ կտեսնեք ուղարկված հաղորդագրությունները և դրանց արդյունքը։</div>
            </div>
          <?php else: ?>
            <div class="history-list" id="pushHistoryList">
              <?php foreach ($pushHistory as $item): ?>
                <div class="history-item" data-push-history-item data-push-history-search="<?= htmlspecialchars(wp_admin_updates_push_history_search_haystack($item), ENT_QUOTES) ?>">
                  <div class="history-top">
                    <div>
                      <div class="history-title"><?= htmlspecialchars((string)($item['title'] ?? 'Push հաղորդագրություն'), ENT_QUOTES) ?></div>
                      <div class="history-time"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($item['created_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                    </div>
                    <div class="chip">Ուղարկել է <?= htmlspecialchars((string)($item['actor'] ?? 'admin'), ENT_QUOTES) ?></div>
                  </div>

                  <div class="chips">
                    <div class="chip">Հերթագրվել է <?= (int)($item['queued'] ?? 0) ?></div>
                    <div class="chip">Հասել է <?= (int)($item['success'] ?? 0) ?></div>
                    <div class="chip">Ձախողվել է <?= (int)($item['failed'] ?? 0) ?></div>
                    <?php if (!empty($item['removed'])): ?>
                      <div class="chip">Հեռացվել է <?= (int)$item['removed'] ?></div>
                    <?php endif; ?>
                    <?php if (!empty($item['tag'])): ?>
                      <div class="chip">Tag <?= htmlspecialchars((string)$item['tag'], ENT_QUOTES) ?></div>
                    <?php endif; ?>
                    <?php if (!empty($item['url'])): ?>
                      <div class="chip">Հղում <?= htmlspecialchars((string)$item['url'], ENT_QUOTES) ?></div>
                    <?php endif; ?>
                  </div>

                  <?php if (!empty($item['body'])): ?>
                    <div class="note"><?= htmlspecialchars((string)$item['body'], ENT_QUOTES) ?></div>
                  <?php endif; ?>
                </div>
              <?php endforeach; ?>
            </div>
            <div class="history-item" id="pushHistoryEmptyState" hidden>
              <div class="history-title">Push պատմության մեջ համընկնում չգտնվեց</div>
              <div class="note">Փոխիր որոնումը կամ մաքրիր դաշտը, որպեսզի նորից տեսնես ամբողջ պատմությունը։</div>
            </div>
            <?php if (count($pushHistory) > 5): ?>
              <div class="history-more">
                <button class="history-btn" id="loadMorePushHistoryBtn" type="button">Բեռնել ևս 5-ը</button>
              </div>
            <?php endif; ?>
          <?php endif; ?>
        </section>
      </form>

      <aside class="stack" data-section-container>
        <section class="settings-group" id="historyPanel" data-admin-section="history all" data-admin-permission="history">
          <div class="history-head">
            <div>
              <div class="settings-group-header">
              <h3>Թարմացումների պատմություն</h3>
              <p>Այստեղ պահվում են միայն իրական փոփոխությունները` ամբողջ snapshot-ով, որպեսզի հետո հնարավոր լինի վերականգնել ցանկացած տարբերակ մեկ սեղմումով։</p>
            </div>
            </div>
            <?php if ($history): ?>
              <form method="post" onsubmit="return confirm('Վստա՞հ եք, որ ուզում եք ամբողջությամբ ջնջել update history-ը։');">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                <input type="hidden" name="form_action" value="clear_history">
                <button class="history-btn" type="submit">Ջնջել ամբողջ պատմությունը</button>
              </form>
            <?php endif; ?>
          </div>

          <div class="history-toolbar">
            <div class="field history-search">
              <label for="historySearch">Որոնել պատմության մեջ</label>
              <input class="input-field" id="historySearch" type="search" placeholder="Ադմին, գործողություն, տարբերակ, նշում">
            </div>
            <div class="history-toolbar-copy" id="historySummary">Այստեղ երևում են բոլոր վերջին իրական փոփոխությունները։</div>
          </div>

          <?php if (!$history): ?>
            <div class="history-item">
              <div class="history-title">Պատմություն դեռ չկա</div>
              <div class="note">Առաջին save-ից հետո այստեղ կտեսնեք ով, երբ և ինչ է փոխել։</div>
            </div>
          <?php else: ?>
            <div class="history-list" id="historyList">
              <?php foreach ($history as $item): ?>
                <div class="history-item" data-history-item data-history-search="<?= htmlspecialchars(wp_admin_updates_history_search_haystack($item), ENT_QUOTES) ?>">
                  <div class="history-top">
                    <div>
                      <div class="history-title"><?= htmlspecialchars((string)($item['actor'] ?? 'admin'), ENT_QUOTES) ?> · <?= htmlspecialchars(wp_admin_updates_history_action_label((string)($item['action'] ?? 'save')), ENT_QUOTES) ?></div>
                      <div class="history-time"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($item['at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                    </div>
                    <div class="chip"><?= !empty($item['snapshot']['maintenance_enabled']) ? 'Ձեռքով միացված է' : 'Ձեռքով անջատված է' ?></div>
                  </div>

                  <div class="chips">
                    <div class="chip">App <?= htmlspecialchars((string)($item['snapshot']['app_version'] ?? '—'), ENT_QUOTES) ?></div>
                    <div class="chip">Web <?= htmlspecialchars((string)($item['snapshot']['web_version'] ?? '—'), ENT_QUOTES) ?></div>
                    <div class="chip">App Type <?= htmlspecialchars(wp_version_release_label((string)($item['snapshot']['app_release_type'] ?? 'feature')), ENT_QUOTES) ?></div>
                    <div class="chip">Web Type <?= htmlspecialchars(wp_version_release_label((string)($item['snapshot']['web_release_type'] ?? 'content')), ENT_QUOTES) ?></div>
                    <?php if (!empty($item['snapshot']['server_package_file'])): ?>
                      <div class="chip">Փաթեթ <?= htmlspecialchars((string)$item['snapshot']['server_package_file'], ENT_QUOTES) ?></div>
                    <?php endif; ?>
                    <?php if (!empty($item['snapshot']['server_package_linked_app_version']) || !empty($item['snapshot']['server_package_linked_web_version'])): ?>
                      <div class="chip">
                        Կապված <?= htmlspecialchars((string)($item['snapshot']['server_package_linked_app_version'] ?? '—'), ENT_QUOTES) ?>/<?= htmlspecialchars((string)($item['snapshot']['server_package_linked_web_version'] ?? '—'), ENT_QUOTES) ?>
                      </div>
                    <?php endif; ?>
                    <?php if (!empty($item['ip'])): ?>
                      <div class="chip">IP <?= htmlspecialchars((string)$item['ip'], ENT_QUOTES) ?></div>
                    <?php endif; ?>
                  </div>

                  <?php if (!empty($item['snapshot']['app_release_summary']) || !empty($item['snapshot']['web_release_summary'])): ?>
                    <div class="note"><?=
                      htmlspecialchars(
                        trim(
                          'App: ' . ((string)($item['snapshot']['app_release_summary'] ?? '') ?: '—') .
                          "\n" .
                          'Web: ' . ((string)($item['snapshot']['web_release_summary'] ?? '') ?: '—')
                        ),
                        ENT_QUOTES
                      )
                    ?></div>
                  <?php endif; ?>

                  <?php if (!empty($item['changed_fields']) && is_array($item['changed_fields'])): ?>
                    <div class="chips">
                      <?php foreach ($item['changed_fields'] as $field): ?>
                        <div class="chip"><?= htmlspecialchars((string)$field, ENT_QUOTES) ?></div>
                      <?php endforeach; ?>
                    </div>
                  <?php endif; ?>

                  <?php if (!empty($item['note'])): ?>
                    <div class="note"><?= htmlspecialchars((string)$item['note'], ENT_QUOTES) ?></div>
                  <?php endif; ?>

                  <?php if (!empty($item['snapshot']) && is_array($item['snapshot']) && !empty($adminSectionPermissions['release'])): ?>
                    <div class="history-actions">
                      <form method="post">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                        <input type="hidden" name="form_action" value="rollback">
                        <input type="hidden" name="history_id" value="<?= htmlspecialchars((string)($item['id'] ?? ''), ENT_QUOTES) ?>">
                        <button class="history-btn" type="submit">Rollback այս տարբերակին</button>
                      </form>
                    </div>
                  <?php endif; ?>
                </div>
              <?php endforeach; ?>
            </div>
            <div class="history-item" id="historyEmptyState" hidden>
              <div class="history-title">Պատմության մեջ համընկնում չգտնվեց</div>
              <div class="note">Փոխիր որոնումը կամ մաքրիր դաշտը, որպեսզի տեսնես ամբողջ փոփոխությունների ցանկը։</div>
            </div>
            <?php if (count($history) > 5): ?>
              <div class="history-more">
                <button class="history-btn" id="loadMoreHistoryBtn" type="button">Բեռնել ևս 5-ը</button>
              </div>
            <?php endif; ?>
          <?php endif; ?>
        </section>

        <section class="settings-group" data-admin-section="access all" data-admin-permission="access">
          <div class="settings-group-header">
              <h3>Ադմին session</h3>
              <p>Այս էջը բացվել է նոր admin login հարթակով։ Access-ը ստուգվում է user login + <code>role/is_admin</code> կամ admin email whitelist-ով, և նույն login/logout հոսքն է կիսում <code>/songs.php</code>-ի հետ։</p>
            </div>
          <div class="access-mini-grid">
            <div class="access-mini">
              <strong>Մուտքի ձև</strong>
              <span><?= $accessMode === 'modern' ? 'Դերային մուտք' : 'Ադմին whitelist' ?></span>
            </div>
            <div class="access-mini">
              <strong>Ընթացիկ օգտատեր</strong>
              <span><?= htmlspecialchars((string)($adminUser['name'] ?? 'Օգտատեր'), ENT_QUOTES) ?></span>
            </div>
            <div class="access-mini">
              <strong>Հիմնական ծրագիր</strong>
              <span><?= (int)($installStats['main']['known_count'] ?? 0) ?> ճանաչված, <?= (int)($installStats['main']['count'] ?? 0) ?> ակտիվ</span>
            </div>
            <div class="access-mini">
              <strong>Ադմին ծրագիր</strong>
              <span><?= (int)($installStats['admin']['known_count'] ?? 0) ?> ճանաչված, <?= (int)($installStats['admin']['count'] ?? 0) ?> ակտիվ</span>
            </div>
            <?php if (!empty($adminUser['email'])): ?>
              <div class="access-mini">
                <strong>Email</strong>
                <span><?= htmlspecialchars((string)$adminUser['email'], ENT_QUOTES) ?></span>
              </div>
            <?php endif; ?>
            <div class="access-mini">
              <strong>Whitelist email-ներ</strong>
              <span><?= (int)$adminEmailCount ?> պահված հասցե</span>
            </div>
          </div>
          <div class="access-actions">
            <a class="btn" href="/songs.php">Բացել ադմին վահանակը</a>
            <a class="btn" href="/admin_logout.php">Դուրս գալ ադմինից</a>
          </div>
        </section>
      </aside>
    </div>
  </div></main></div>
  <script>
    (function(){
      const appVersionInput = document.getElementById('app_version');
      const webVersionInput = document.getElementById('web_version');
      const appReleaseTypeInput = document.getElementById('app_release_type');
      const webReleaseTypeInput = document.getElementById('web_release_type');
      const appReleaseSummaryInput = document.getElementById('app_release_summary');
      const webReleaseSummaryInput = document.getElementById('web_release_summary');
      const appTitleInput = document.getElementById('app_title');
      const appMessageInput = document.getElementById('app_message');
      const webTitleInput = document.getElementById('web_title');
      const webMessageInput = document.getElementById('web_message');
      const maintenanceEnabledInput = document.getElementById('maintenance_enabled');
      const maintenanceStartInput = document.getElementById('maintenance_start_at');
      const maintenanceEndInput = document.getElementById('maintenance_end_at');
      const maintenanceMessageInput = document.getElementById('maintenance_message');
      const maintenanceAllowedIpsInput = document.getElementById('maintenance_allowed_ips');
      const releaseAppSummaryText = document.getElementById('releaseAppSummaryText');
      const releaseWebSummaryText = document.getElementById('releaseWebSummaryText');
      const releaseApplySummaryText = document.getElementById('releaseApplySummaryText');
      const releaseAppVersionChip = document.getElementById('releaseAppVersionChip');
      const releaseWebVersionChip = document.getElementById('releaseWebVersionChip');
      const releaseAppTypeChip = document.getElementById('releaseAppTypeChip');
      const releaseWebTypeChip = document.getElementById('releaseWebTypeChip');
      const releaseApplyModeChip = document.getElementById('releaseApplyModeChip');
      const releasePackageStatusChip = document.getElementById('releasePackageStatusChip');
      const releaseCheckVersions = document.getElementById('releaseCheckVersions');
      const releaseCheckMessages = document.getElementById('releaseCheckMessages');
      const releaseCheckPackage = document.getElementById('releaseCheckPackage');
      const releaseCheckMaintenance = document.getElementById('releaseCheckMaintenance');
      const releaseCheckPackageText = document.getElementById('releaseCheckPackageText');
      const releaseCheckMaintenanceText = document.getElementById('releaseCheckMaintenanceText');
      const adminLayout = document.getElementById('adminLayout');
      const releaseControlForm = document.getElementById('releaseControlForm');
      const releaseApplyModeInput = document.getElementById('release_apply_mode');
      const packageModeInput = document.getElementById('server_package_mode');
      const packageFileInput = document.getElementById('server_package_file');
      const packageModeHelper = document.getElementById('packageModeHelper');
      const fillDefaultTextsBtn = document.getElementById('fillDefaultTextsBtn');
      const copyAppContentToWebBtn = document.getElementById('copyAppContentToWebBtn');
      const syncVersionsBtn = document.getElementById('syncVersionsBtn');
      const startMaintenanceNowBtn = document.getElementById('startMaintenanceNowBtn');
      const clearScheduleBtn = document.getElementById('clearScheduleBtn');
      const disableMaintenanceBtn = document.getElementById('disableMaintenanceBtn');
      const historyItems = Array.from(document.querySelectorAll('[data-history-item]'));
      const loadMoreHistoryBtn = document.getElementById('loadMoreHistoryBtn');
      const pushHistoryItems = Array.from(document.querySelectorAll('[data-push-history-item]'));
      const loadMorePushHistoryBtn = document.getElementById('loadMorePushHistoryBtn');
      const pushSubscriptionItems = Array.from(document.querySelectorAll('[data-push-subscription-item]'));
      const csrfTokenInput = document.querySelector('input[name="csrf_token"]');
      const sendPushBtn = document.getElementById('sendPushBtn');
      const pushTitleInput = document.getElementById('push_title');
      const pushBodyInput = document.getElementById('push_body');
      const pushUrlInput = document.getElementById('push_url');
      const pushIconInput = document.getElementById('push_icon');
      const pushTagInput = document.getElementById('push_tag');
      const pushPreviewTitle = document.getElementById('pushPreviewTitle');
      const pushPreviewBody = document.getElementById('pushPreviewBody');
      const pushPreviewTag = document.getElementById('pushPreviewTag');
      const pushPreviewUrl = document.getElementById('pushPreviewUrl');
      const pushPreviewIcon = document.getElementById('pushPreviewIcon');
      const applyDeviceFiltersBtn = document.getElementById('applyDeviceFiltersBtn');
      const historySearchInput = document.getElementById('historySearch');
      const sectionFocusBar = document.getElementById('sectionFocusBar');
      const pushHistorySearchInput = document.getElementById('pushHistorySearch');
      const pushSubscriptionSearchInput = document.getElementById('pushSubscriptionSearch');
      const historySummary = document.getElementById('historySummary');
      const pushHistorySummary = document.getElementById('pushHistorySummary');
      const pushSubscriptionSummary = document.getElementById('pushSubscriptionSummary');
      const historyEmptyState = document.getElementById('historyEmptyState');
      const pushHistoryEmptyState = document.getElementById('pushHistoryEmptyState');
      const pushSubscriptionEmptyState = document.getElementById('pushSubscriptionEmptyState');
      const sectionFocusEyebrow = document.getElementById('sectionFocusEyebrow');
      const sectionFocusTitle = document.getElementById('sectionFocusTitle');
      const sectionFocusDescription = document.getElementById('sectionFocusDescription');
      const sectionFocusMeta = document.getElementById('sectionFocusMeta');
      const sectionFocusActionBtn = document.getElementById('sectionFocusActionBtn');
      const sectionTabs = Array.from(document.querySelectorAll('[data-section-tab]'));
      const sectionPanels = Array.from(document.querySelectorAll('[data-admin-section]'));
      const sectionContainers = Array.from(document.querySelectorAll('[data-section-container]'));
      const permissionList = document.getElementById('permissionList');
      const permissionAutosaveStatus = document.getElementById('permissionAutosaveStatus');
      const releaseAutosaveStatus = document.getElementById('releaseAutosaveStatus');
      const maintenanceAutosaveStatus = document.getElementById('maintenanceAutosaveStatus');
      const pageModesAutosaveStatus = document.getElementById('pageModesAutosaveStatus');
      const accessDraftAutosaveStatus = document.getElementById('accessDraftAutosaveStatus');
      const pushAutosaveStatus = document.getElementById('pushAutosaveStatus');
      const addPermissionRowBtn = document.getElementById('addPermissionRowBtn');
      const adminEmailsInput = document.getElementById('admin_emails');
      const googleClientIdInput = document.getElementById('social_auth_google_client_id');
      const googleRedirectUriInput = document.getElementById('social_auth_google_redirect_uri');
      const translationActionStatus = document.getElementById('translationActionStatus');
      const translationCachePanel = document.getElementById('translationCachePanel');
      const translationSongSelect = document.getElementById('translation_song_id');
      const translationSongSourcePreview = document.getElementById('translation_song_source_preview');
      const translationSongLat = document.getElementById('translation_song_lat');
      const translationSongRu = document.getElementById('translation_song_ru');
      const translationSongEn = document.getElementById('translation_song_en');
      const metaNoteInput = document.getElementById('meta_note');
      const pushEnabledInput = document.getElementById('push_enabled');
      const pushSubjectInput = document.getElementById('push_subject');
      const sectionStorageKey = 'worship-admin-updates-section';
      const allowedSections = <?= json_encode(array_values($visibleAdminSections), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
      const allowedSectionSet = new Set(allowedSections);
      const defaultSection = <?= json_encode($defaultAdminSection, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
      const permissionSections = <?= json_encode($adminSectionRegistry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
      const devicesRefreshDelay = 15000;
      let devicesRefreshTimer = 0;
      const historyPageSize = 5;
      let visibleHistoryCount = historyPageSize;
      let visiblePushHistoryCount = historyPageSize;
      let nextPermissionRowIndex = <?= (int)count($adminPermissionRows) ?>;
      let currentSection = 'release';
      let permissionAutosaveTimer = 0;
      let permissionAutosaveInFlight = false;
      let permissionAutosaveQueued = false;
      let permissionAutosaveSuccessTimer = 0;
      const releaseTypeLabels = {
        major: 'Մեծ թարմացում',
        feature: 'Նոր հնարավորություն',
        patch: 'Փոքր ուղղում',
        hotfix: 'Արագ շտկում',
        maintenance: 'Տեխնիկական թարմացում',
        content: 'Բովանդակության թարմացում'
      };
      const pushTemplates = {
        release: {
          title: 'Worship Platform',
          body: 'Հասանելի է նոր թարմացում։ Բացեք Worship Platform-ը մանրամասների և նոր տարբերակը տեսնելու համար։',
          url: '/main.html',
          icon: '/wolarm_youth.png',
          tag: 'worship-update'
        },
        news: {
          title: 'Նորություն Worship Platform-ում',
          body: 'Ավելացվել է նոր բովանդակություն կամ հայտարարություն։ Բացեք Worship Platform-ը դիտելու համար։',
          url: '/news.html',
          icon: '/wolarm_youth.png',
          tag: 'worship-news'
        },
        maintenance: {
          title: 'Տեխնիկական աշխատանքներ',
          body: 'Տեղի են ունենում կարճ տեխնիկական աշխատանքներ։ Շնորհակալ ենք համբերատարության համար։',
          url: '/page_unavailable.html',
          icon: '/wolarm_youth.png',
          tag: 'worship-maintenance'
        },
        reminder: {
          title: 'Հիշեցում',
          body: 'Բացեք Worship Platform-ը և ստուգեք վերջին երգերը, սեթլիստները և նորությունները։',
          url: '/main.html',
          icon: '/wolarm_youth.png',
          tag: 'worship-reminder'
        }
      };
      const sectionFocusConfig = {
        release: {
          eyebrow: 'Թարմացում և տեղադրում',
          title: 'Թողարկման գլխավոր հոսք',
          description: 'Այստեղ լրացնում ես տարբերակները, հաղորդագրությունները և ընտրում ես ինչպես կիրառել թարմացումը։',
          actionLabel: 'Գնալ կիրառման կոճակին',
          targetId: 'releaseActionPanel',
          meta: [
            `Ծրագիր <?= htmlspecialchars((string)$config['app_version'], ENT_QUOTES) ?>`,
            `Կայք <?= htmlspecialchars((string)$config['web_version'], ENT_QUOTES) ?>`,
            `Փաթեթ <?= $isPackageSyncedToCurrentRelease ? 'պատրաստ' : 'սպասման մեջ' ?>`
          ]
        },
        maintenance: {
          eyebrow: 'Տեխնիկական աշխատանքներ',
          title: 'Հասանելիության և ծրագրային էջերի կառավարում',
          description: 'Այստեղ արագ միացնում կամ անջատում ես տեխնիկական աշխատանքները և ընտրում ես որ էջերն աշխատեն որպես ծրագրային էջեր։',
          actionLabel: 'Գնալ պահպանման կոճակին',
          targetId: 'maintenancePanel',
          meta: [
            `Վիճակ <?= $isMaintenanceActive ? 'միացված է' : 'անջատված է' ?>`,
            `Ծրագրային էջեր <?= count(array_filter((array)($config['page_app_modes'] ?? []))) ?>`
          ]
        },
        push: {
          eyebrow: 'Push ծանուցումներ',
          title: 'Ծանուցումների բաժին',
          description: 'Այստեղ միացնում ես ծանուցումները, ուղարկում ես նոր հաղորդագրություն և տեսնում ես բաժանորդագրված սարքերի ու ուղարկումների պատմությունը։',
          actionLabel: 'Գնալ ուղարկման դաշտին',
          targetId: 'pushComposerPanel',
          meta: [
            `Ծանուցումներ <?= !empty($pushConfig['enabled']) ? 'միացված են' : 'անջատված են' ?>`,
            `Սարքեր <?= (int)($pushStats['subscriptions'] ?? 0) ?>`,
            `Վերջին ուղարկում <?= htmlspecialchars($pushLastSentAt ?: '—', ENT_QUOTES) ?>`
          ]
        },
        devices: {
          eyebrow: 'Սարքեր',
          title: 'Հիմնական և ադմին ծրագրերի սարքեր',
          description: 'Այս բաժնում կարող ես արագ գտնել սարքեր, տեսնել կապված օգտահաշիվները, մաքրել տվյալը և տարբերակել հիմնական ու ադմին ծրագիրը։',
          actionLabel: 'Գնալ ֆիլտրերին',
          targetId: 'devicesPanel',
          meta: [
            `Հիմնական <?= count($filteredMainInstallDevices) ?>`,
            `Ադմին <?= count($filteredAdminInstallDevices) ?>`,
            `Ակտիվ պատուհան <?= (int)($installStats['window_days'] ?? 60) ?> օր`
          ]
        },
        history: {
          eyebrow: 'Պատմություն',
          title: 'Փոփոխությունների հետք և վերականգնում',
          description: 'Այստեղ պահվում են բոլոր իրական փոփոխությունները, որպեսզի արագ գտնես տարբերակը և անհրաժեշտության դեպքում հետ բերես այն։',
          actionLabel: 'Գնալ պատմությանը',
          targetId: 'historyPanel',
          meta: [
            `Գրառումներ <?= count($history) ?>`,
            `Push պատմություն <?= count($pushHistory) ?>`
          ]
        },
        access: {
          eyebrow: 'Մուտքեր',
          title: 'Ադմինի հասանելիություն և ներքին նշումներ',
          description: 'Այս բաժինը օգտագործիր ադմինի թույլտվությունների, ներքին նշումների և ընթացիկ մուտքի ամփոփ տվյալների համար։',
          actionLabel: 'Գնալ մուտքերի բաժնին',
          targetId: 'accessPanel',
          meta: [
            `Ռեժիմ <?= $accessMode === 'modern' ? 'դերային մուտք' : 'ադմին մուտք' ?>`,
            `Ադմին <?= htmlspecialchars((string)($adminUser['name'] ?? 'Օգտատեր'), ENT_QUOTES) ?>`
          ]
        },
        moderation: {
          eyebrow: 'Մոդերացիա',
          title: 'Օգտատերերի ուղարկած երգերի հերթ',
          description: 'Այստեղ հավաքվում են նոր երգերի և խմբագրման բոլոր հարցումները, որոնք ադմինը պետք է հաստատի կամ մերժի։',
          actionLabel: 'Գնալ մոդերացիայի հերթին',
          targetId: 'moderationPanel',
          meta: [
            `Սպասման մեջ <?= (int)($moderationCounts['pending'] ?? 0) ?>`,
            `Ընդամենը <?= (int)($moderationCounts['all'] ?? 0) ?>`
          ]
        },
        translations: {
          eyebrow: 'Թարգմանություններ',
          title: 'Լեզուների ձեռքով թարգմանությունների ղեկավարում',
          description: 'Այստեղ կարող ես ձեռքով ավելացնել, ուղղել և մաքրել ռուսերեն ու անգլերեն թարգմանությունները։',
          actionLabel: 'Գնալ թարգմանությունների կարգավորումներին',
          targetId: 'translationSettingsPanel',
          meta: [
            `Ռեժիմ <?= htmlspecialchars((string)($translationSettings['mode'] ?? 'manual'), ENT_QUOTES) ?>`,
            `Cache <?= (int)($translationCacheStats['all'] ?? 0) ?>`
          ]
        }
      };

      function parseVersion(value) {
        const match = String(value || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
        if (!match) return [1, 0, 0];
        return [Number(match[1]), Number(match[2]), Number(match[3])];
      }

      function formatVersion(parts) {
        return parts.join('.');
      }

      function bumpVersion(value, kind) {
        const parts = parseVersion(value);
        if (kind === 'major') {
          parts[0] += 1;
          parts[1] = 0;
          parts[2] = 0;
        } else if (kind === 'minor') {
          parts[1] += 1;
          parts[2] = 0;
        } else {
          parts[2] += 1;
        }
        return formatVersion(parts);
      }

      function nowLocalDate() {
        return new Date();
      }

      function toDatetimeLocal(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return [
          date.getFullYear(),
          '-',
          pad(date.getMonth() + 1),
          '-',
          pad(date.getDate()),
          'T',
          pad(date.getHours()),
          ':',
          pad(date.getMinutes())
        ].join('');
      }

      function ensureDefaultUpdateTexts() {
        const appTypeLabel = releaseTypeLabels[appReleaseTypeInput.value] || 'Ծրագրի թարմացում';
        const webTypeLabel = releaseTypeLabels[webReleaseTypeInput.value] || 'Կայքի թարմացում';
        const appVersion = appVersionInput.value.trim() || '1.0.0';
        const webVersion = webVersionInput.value.trim() || '1.0.0';

        if (!appReleaseSummaryInput.value.trim()) {
          appReleaseSummaryInput.value = appTypeLabel + ' ' + appVersion + ' տարբերակի համար';
        }
        if (!webReleaseSummaryInput.value.trim()) {
          webReleaseSummaryInput.value = webTypeLabel + ' ' + webVersion + ' տարբերակի համար';
        }

        if (!appTitleInput.value.trim()) {
          appTitleInput.value = 'Ծրագրի ' + appTypeLabel;
        }
        if (!webTitleInput.value.trim()) {
          webTitleInput.value = 'Կայքի ' + webTypeLabel;
        }
        if (!appMessageInput.value.trim()) {
          appMessageInput.value = 'Հասանելի է ծրագրի ' + appTypeLabel + ' ' + appVersion + ' տարբերակը։ Սեղմեք թարմացնել, որպեսզի օֆֆլայն և օնլայն բովանդակությունը նորացվի։';
        }
        if (!webMessageInput.value.trim()) {
          webMessageInput.value = 'Հասանելի է կայքի ' + webTypeLabel + ' ' + webVersion + ' տարբերակը։ Սեղմեք թարմացնել, որպեսզի բացվի նոր տարբերակը։';
        }
      }

      function getFilteredItems(items) {
        return items.filter((item) => item.dataset.filterHidden !== '1');
      }

      function applyDatasetSearch(items, query, datasetKey) {
        const needle = String(query || '').trim().toLowerCase();
        items.forEach((item) => {
          const haystack = String(item.dataset[datasetKey] || '').toLowerCase();
          item.dataset.filterHidden = needle && !haystack.includes(needle) ? '1' : '0';
        });
        return getFilteredItems(items).length;
      }

      function renderSectionFocus(section) {
        if (!sectionFocusBar) {
          return;
        }
        const config = sectionFocusConfig[section] || sectionFocusConfig.release;
        if (sectionFocusEyebrow) {
          sectionFocusEyebrow.textContent = config.eyebrow;
        }
        if (sectionFocusTitle) {
          sectionFocusTitle.textContent = config.title;
        }
        if (sectionFocusDescription) {
          sectionFocusDescription.textContent = config.description;
        }
        if (sectionFocusActionBtn) {
          sectionFocusActionBtn.textContent = config.actionLabel;
          sectionFocusActionBtn.dataset.targetId = config.targetId;
        }
        if (sectionFocusMeta) {
          sectionFocusMeta.innerHTML = '';
          (config.meta || []).forEach((label) => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.textContent = label;
            sectionFocusMeta.appendChild(chip);
          });
        }
      }

      function panelAllowed(panel) {
        const required = String(panel.getAttribute('data-admin-permission') || '').trim();
        if (!required) {
          return true;
        }

        return required
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .some((section) => allowedSectionSet.has(section));
      }

      function renderHistoryPage() {
        if (!historyItems.length) {
          if (historySummary) {
            historySummary.textContent = 'Պատմության գրառումներ դեռ չկան։';
          }
          return;
        }

        const filtered = getFilteredItems(historyItems);
        let visibleIndex = 0;

        historyItems.forEach((item) => {
          if (item.dataset.filterHidden === '1') {
            item.hidden = true;
            return;
          }
          item.hidden = visibleIndex >= visibleHistoryCount;
          visibleIndex += 1;
        });

        if (historyEmptyState) {
          historyEmptyState.hidden = filtered.length !== 0;
        }
        if (historySummary) {
          historySummary.textContent = filtered.length === historyItems.length
            ? `Ցուցադրվում է ${Math.min(filtered.length, visibleHistoryCount)} / ${filtered.length} պատմության գրառում։`
            : `Գտնվեց ${filtered.length} պատմության գրառում ${historyItems.length}-ից։`;
        }

        if (loadMoreHistoryBtn) {
          const hasMore = visibleHistoryCount < filtered.length;
          loadMoreHistoryBtn.hidden = !hasMore;
          if (hasMore) {
            loadMoreHistoryBtn.textContent = `Բեռնել ևս ${Math.min(historyPageSize, filtered.length - visibleHistoryCount)}-ը`;
          }
        }
      }

      function renderPushHistoryPage() {
        if (!pushHistoryItems.length) {
          if (pushHistorySummary) {
            pushHistorySummary.textContent = 'Push պատմության գրառումներ դեռ չկան։';
          }
          return;
        }

        const filtered = getFilteredItems(pushHistoryItems);
        let visibleIndex = 0;

        pushHistoryItems.forEach((item) => {
          if (item.dataset.filterHidden === '1') {
            item.hidden = true;
            return;
          }
          item.hidden = visibleIndex >= visiblePushHistoryCount;
          visibleIndex += 1;
        });

        if (pushHistoryEmptyState) {
          pushHistoryEmptyState.hidden = filtered.length !== 0;
        }
        if (pushHistorySummary) {
          pushHistorySummary.textContent = filtered.length === pushHistoryItems.length
            ? `Ցուցադրվում է ${Math.min(filtered.length, visiblePushHistoryCount)} / ${filtered.length} push գրառում։`
            : `Գտնվեց ${filtered.length} push գրառում ${pushHistoryItems.length}-ից։`;
        }

        if (loadMorePushHistoryBtn) {
          const hasMore = visiblePushHistoryCount < filtered.length;
          loadMorePushHistoryBtn.hidden = !hasMore;
          if (hasMore) {
            loadMorePushHistoryBtn.textContent = `Բեռնել ևս ${Math.min(historyPageSize, filtered.length - visiblePushHistoryCount)}-ը`;
          }
        }
      }

      function renderPushSubscriptionList() {
        if (!pushSubscriptionItems.length) {
          if (pushSubscriptionSummary) {
            pushSubscriptionSummary.textContent = 'Գրանցված push սարքեր դեռ չկան։';
          }
          return;
        }

        const filtered = getFilteredItems(pushSubscriptionItems);
        pushSubscriptionItems.forEach((item) => {
          item.hidden = item.dataset.filterHidden === '1';
        });

        if (pushSubscriptionEmptyState) {
          pushSubscriptionEmptyState.hidden = filtered.length !== 0;
        }
        if (pushSubscriptionSummary) {
          pushSubscriptionSummary.textContent = filtered.length === pushSubscriptionItems.length
            ? `Ցուցադրվում է ${filtered.length} գրանցված push սարք։`
            : `Գտնվեց ${filtered.length} push սարք ${pushSubscriptionItems.length}-ից։`;
        }
      }

      function renderPushPreview() {
        const title = pushTitleInput ? pushTitleInput.value.trim() : '';
        const body = pushBodyInput ? pushBodyInput.value.trim() : '';
        const tag = pushTagInput ? pushTagInput.value.trim() : '';
        const url = pushUrlInput ? pushUrlInput.value.trim() : '';
        const icon = pushIconInput ? pushIconInput.value.trim() : '';

        if (pushPreviewTitle) {
          pushPreviewTitle.textContent = title || 'Առանց վերնագրի';
        }
        if (pushPreviewBody) {
          pushPreviewBody.textContent = body || 'Առանց բովանդակության';
        }
        if (pushPreviewTag) {
          pushPreviewTag.textContent = tag || 'առանց խմբի';
        }
        if (pushPreviewUrl) {
          pushPreviewUrl.textContent = `Հղում ${url || '—'}`;
        }
        if (pushPreviewIcon) {
          pushPreviewIcon.textContent = `Նշան ${icon || '—'}`;
        }
      }

      function applyPushTemplate(key) {
        const template = pushTemplates[key];
        if (!template) {
          return;
        }
        if (pushTitleInput) {
          pushTitleInput.value = template.title;
        }
        if (pushBodyInput) {
          pushBodyInput.value = template.body;
        }
        if (pushUrlInput) {
          pushUrlInput.value = template.url;
        }
        if (pushIconInput) {
          pushIconInput.value = template.icon;
        }
        if (pushTagInput) {
          pushTagInput.value = template.tag;
        }
        renderPushPreview();
      }

      function setReleaseCheckState(element, state, text) {
        if (!element) {
          return;
        }
        element.dataset.state = state;
        const textNode = element.querySelector('span');
        if (textNode && typeof text === 'string') {
          textNode.textContent = text;
        }
      }

      function renderReleaseWorkspaceSummary() {
        const appVersion = appVersionInput ? appVersionInput.value.trim() : '';
        const webVersion = webVersionInput ? webVersionInput.value.trim() : '';
        const appType = appReleaseTypeInput ? (releaseTypeLabels[appReleaseTypeInput.value] || 'Ծրագրի թարմացում') : 'Ծրագրի թարմացում';
        const webType = webReleaseTypeInput ? (releaseTypeLabels[webReleaseTypeInput.value] || 'Կայքի թարմացում') : 'Կայքի թարմացում';
        const appTitle = appTitleInput ? appTitleInput.value.trim() : '';
        const webTitle = webTitleInput ? webTitleInput.value.trim() : '';
        const appMessage = appMessageInput ? appMessageInput.value.trim() : '';
        const webMessage = webMessageInput ? webMessageInput.value.trim() : '';
        const applyMode = releaseApplyModeInput ? releaseApplyModeInput.value : 'without_file';
        const packageMode = packageModeInput ? packageModeInput.value : 'partial';
        const hasNewPackage = !!(packageFileInput && packageFileInput.files && packageFileInput.files.length > 0);
        const hasSavedPackage = <?= !empty($config['server_package_file']) ? 'true' : 'false' ?>;
        const maintenanceActive = !!(maintenanceEnabledInput && maintenanceEnabledInput.checked) || !!(maintenanceStartInput && maintenanceStartInput.value) || !!(maintenanceEndInput && maintenanceEndInput.value);

        if (releaseAppSummaryText) {
          releaseAppSummaryText.textContent = appTitle
            ? `${appType} · ${appTitle}`
            : `${appType} տարբերակի համար դեռ պետք է լրացնել վերնագիրը։`;
        }
        if (releaseWebSummaryText) {
          releaseWebSummaryText.textContent = webTitle
            ? `${webType} · ${webTitle}`
            : `${webType} տարբերակի համար դեռ պետք է լրացնել վերնագիրը։`;
        }
        if (releaseApplySummaryText) {
          if (applyMode === 'with_file') {
            releaseApplySummaryText.textContent = hasNewPackage
              ? `Կկիրառվեն նաև սերվերի ֆայլերը նոր ZIP փաթեթով (${packageMode === 'full' ? 'ամբողջական' : 'մասամբ'} ռեժիմ)։`
              : (hasSavedPackage
                ? `Կկիրառվեն նաև սերվերի ֆայլերը արդեն պահված ZIP փաթեթով (${packageMode === 'full' ? 'ամբողջական' : 'մասամբ'} ռեժիմ)։`
                : 'Ֆայլով թարմացումն ընտրված է, բայց դեռ պետք է ընտրես ZIP փաթեթ։');
          } else {
            releaseApplySummaryText.textContent = 'Կփոխվեն միայն տարբերակների, հաղորդագրությունների և կարգավորումների տվյալները՝ առանց սերվերի ֆայլերի փոխման։';
          }
        }

        if (releaseAppVersionChip) {
          releaseAppVersionChip.textContent = `Ծրագիր ${appVersion || '—'}`;
        }
        if (releaseWebVersionChip) {
          releaseWebVersionChip.textContent = `Կայք ${webVersion || '—'}`;
        }
        if (releaseAppTypeChip) {
          releaseAppTypeChip.textContent = appType;
        }
        if (releaseWebTypeChip) {
          releaseWebTypeChip.textContent = webType;
        }
        if (releaseApplyModeChip) {
          releaseApplyModeChip.textContent = applyMode === 'with_file' ? 'Ֆայլի կցումով' : 'Առանց ֆայլի կցման';
        }
        if (releasePackageStatusChip) {
          releasePackageStatusChip.textContent = hasNewPackage
            ? `Նոր ZIP ընտրված է`
            : (hasSavedPackage ? 'Պահված ZIP կա' : 'Փաթեթ դեռ չկա');
        }

        const versionsReady = appVersion !== '' && webVersion !== '';
        const messagesReady = appTitle !== '' && appMessage !== '' && webTitle !== '' && webMessage !== '';
        const packageReady = applyMode !== 'with_file' || hasNewPackage || hasSavedPackage;

        setReleaseCheckState(
          releaseCheckVersions,
          versionsReady ? 'done' : 'warn',
          versionsReady
            ? 'Ծրագրի և կայքի տարբերակները պատրաստ են հրապարակման համար։'
            : 'Լրացրու և ստուգիր թե ծրագրի, թե կայքի տարբերակները։'
        );
        setReleaseCheckState(
          releaseCheckMessages,
          messagesReady ? 'done' : 'warn',
          messagesReady
            ? 'Օգտատերը կտեսնի հստակ վերնագիր և բացատրություն։'
            : 'Լրացրու վերնագրերն ու հաղորդագրությունները, որպեսզի թարմացումը հասկանալի լինի։'
        );
        setReleaseCheckState(
          releaseCheckPackage,
          packageReady ? 'done' : 'warn',
          packageReady
            ? (applyMode === 'with_file'
              ? (hasNewPackage ? 'Ընտրված է նոր ZIP փաթեթ, որը կարելի է կիրառել։' : 'Կիրառման համար արդեն կա պահված ZIP փաթեթ։')
              : 'Առանց ֆայլի կցման տարբերակում լրացուցիչ ZIP պետք չէ։')
            : 'Ֆայլով թարմացման համար պետք է ընտրես ZIP փաթեթ կամ ունենաս արդեն պահված փաթեթ։'
        );
        setReleaseCheckState(
          releaseCheckMaintenance,
          maintenanceActive ? 'warn' : 'done',
          maintenanceActive
            ? 'Տեխնիկական աշխատանքները միացված են կամ նախատեսված են, ստուգիր դա նախքան հրապարակելը։'
            : 'Տեխնիկական աշխատանքները այժմ չեն խանգարում հրապարակմանը։'
        );
      }

      function renderPackageModeHelp() {
        if (!packageModeInput || !packageModeHelper || !releaseApplyModeInput) {
          return;
        }

        var applyMode = releaseApplyModeInput.value || 'without_file';
        var mode = packageModeInput.value;
        var withFile = applyMode === 'with_file';

        packageModeInput.disabled = !withFile;
        if (packageFileInput) {
          packageFileInput.disabled = !withFile;
        }

        if (!withFile) {
          packageModeHelper.textContent = 'Այս տարբերակում կպահպանվեն version/message/settings տվյալները առանց սերվերի ֆայլերի փոխարինման։ ZIP փաթեթ ընտրել պետք չէ։';
          return;
        }

        if (mode === 'full') {
          packageModeHelper.textContent = 'Ամբողջական փաթեթի ռեժիմը լավ է, երբ ZIP-ը ամբողջ release/build package-ն է։ Կիրառման պահին նոր ZIP չընտրելու դեպքում կօգտագործվի ընթացիկ փաթեթը։';
          return;
        }

        packageModeHelper.textContent = 'Մասամբ թարմացման ռեժիմը լավ է, երբ ուզում եք փոխել միայն կոնկրետ ֆայլեր, օրինակ `main.html`, `sw.js` կամ որևէ առանձին script։ Կիրառումը կօգտագործի ընտրված նոր ZIP-ը կամ արդեն ներբեռնված ընթացիկ փաթեթը։';
      }

      function submitAdminPost(action, fields) {
        const form = document.createElement('form');
        form.method = 'post';
        form.action = '/admin_updates.php';
        form.style.display = 'none';

        const csrfToken = csrfTokenInput ? csrfTokenInput.value : '';
        if (csrfToken) {
          const csrfField = document.createElement('input');
          csrfField.type = 'hidden';
          csrfField.name = 'csrf_token';
          csrfField.value = csrfToken;
          form.appendChild(csrfField);
        }

        const actionField = document.createElement('input');
        actionField.type = 'hidden';
        actionField.name = 'form_action';
        actionField.value = action;
        form.appendChild(actionField);

        Object.keys(fields || {}).forEach((key) => {
          const value = fields[key];
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value == null ? '' : String(value);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      }

      async function postAdminAction(action, fields) {
        const formData = new URLSearchParams();
        if (csrfTokenInput && csrfTokenInput.value) {
          formData.set('csrf_token', csrfTokenInput.value);
        }
        formData.set('form_action', action);
        Object.entries(fields || {}).forEach(([key, value]) => {
          formData.append(key, value == null ? '' : String(value));
        });

        const response = await fetch('/admin_updates.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          },
          body: formData.toString()
        });

        let result = null;
        try {
          result = await response.json();
        } catch (error) {}

        if (!response.ok || !result || result.ok === false) {
          throw new Error((result && result.message) ? result.message : 'Չհաջողվեց պահպանել տվյալները։');
        }

        return result;
      }

      function setAdminBanner(type, text) {
        const banner = document.getElementById('adminBanner');
        if (!(banner instanceof HTMLElement)) {
          return;
        }

        banner.hidden = !text;
        banner.classList.remove('success', 'error', 'warning');
        banner.classList.add(type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'success'));
        banner.textContent = text || '';
      }

      function getModerationFilterState() {
        const statusInput = document.getElementById('moderation_status');
        const searchInput = document.getElementById('moderation_search');
        return {
          status: statusInput instanceof HTMLSelectElement ? String(statusInput.value || 'pending').trim() : 'pending',
          search: searchInput instanceof HTMLInputElement ? String(searchInput.value || '').trim() : ''
        };
      }

      async function refreshModerationPanel(nextFilters) {
        const panel = document.getElementById('moderationPanel');
        if (!(panel instanceof HTMLElement)) {
          return;
        }

        const url = new URL(window.location.href);
        const filterState = nextFilters || getModerationFilterState();

        if (!filterState.status || filterState.status === 'pending') {
          url.searchParams.delete('moderation_status');
        } else {
          url.searchParams.set('moderation_status', filterState.status);
        }

        if (!filterState.search) {
          url.searchParams.delete('moderation_search');
        } else {
          url.searchParams.set('moderation_search', filterState.search);
        }

        const response = await fetch(url.toString(), {
          credentials: 'same-origin',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'text/html'
          }
        });

        if (!response.ok) {
          throw new Error('Չհաջողվեց թարմացնել մոդերացիայի ցանկը։');
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const nextPanel = doc.getElementById('moderationPanel');
        if (!(nextPanel instanceof HTMLElement)) {
          throw new Error('Մոդերացիայի նոր բլոկը չգտնվեց։');
        }

        panel.innerHTML = nextPanel.innerHTML;

        const title = doc.title || document.title;
        window.history.replaceState({}, title, url.toString());
      }

      function setAutosaveState(statusElement, state, text) {
        if (!statusElement) {
          return;
        }
        statusElement.dataset.state = state;
        statusElement.textContent = text;
      }

      function setTranslationStatus(statusElement, state, text) {
        if (!statusElement) {
          return;
        }
        statusElement.dataset.state = state;
        statusElement.textContent = text;
      }

      function createAutosaveController(statusElement, action, buildFields, defaultDelay) {
        let timer = 0;
        let inFlight = false;
        let queued = false;
        let successTimer = 0;

        async function saveNow() {
          if (inFlight) {
            queued = true;
            return;
          }

          inFlight = true;
          queued = false;

          if (successTimer) {
            window.clearTimeout(successTimer);
            successTimer = 0;
          }

          setAutosaveState(statusElement, 'saving', 'Պահպանվում է…');

          try {
            const result = await postAdminAction(action, buildFields());
            setAutosaveState(statusElement, 'saved', result.message || 'Պահպանվեց');
            successTimer = window.setTimeout(() => {
              setAutosaveState(statusElement, 'idle', 'Փոփոխությունները կպահպանվեն ավտոմատ');
            }, 2200);
          } catch (error) {
            setAutosaveState(statusElement, 'error', (error && error.message) ? error.message : 'Չհաջողվեց պահպանել');
          } finally {
            inFlight = false;
            if (queued) {
              queued = false;
              saveNow();
            }
          }
        }

        function schedule(delay) {
          if (timer) {
            window.clearTimeout(timer);
          }
          setAutosaveState(statusElement, 'saving', 'Կպահպանվի ավտոմատ…');
          timer = window.setTimeout(() => {
            timer = 0;
            saveNow();
          }, typeof delay === 'number' ? delay : defaultDelay);
        }

        return {
          schedule,
          flush: saveNow
        };
      }

      function setPermissionAutosaveState(state, text) {
        if (!permissionAutosaveStatus) {
          return;
        }
        permissionAutosaveStatus.dataset.state = state;
        permissionAutosaveStatus.textContent = text;
      }

      function collectPermissionRowsPayload() {
        const payload = { admin_permission_rows_present: '1' };
        const rows = Array.from(document.querySelectorAll('[data-permission-row]'));

        rows.forEach((row, index) => {
          const emailInput = row.querySelector('input[type="email"]');
          payload[`admin_permission_rows[${index}][email]`] = emailInput instanceof HTMLInputElement
            ? emailInput.value.trim()
            : '';

          Object.keys(permissionSections || {}).forEach((sectionKey) => {
            const checkbox = row.querySelector(`input[type="checkbox"][name$="[sections][${sectionKey}]"]`);
            if (checkbox instanceof HTMLInputElement && checkbox.checked) {
              payload[`admin_permission_rows[${index}][sections][${sectionKey}]`] = '1';
            }
          });
        });

        return payload;
      }

      async function savePermissionRowsNow() {
        if (permissionAutosaveInFlight) {
          permissionAutosaveQueued = true;
          return;
        }

        permissionAutosaveInFlight = true;
        permissionAutosaveQueued = false;

        if (permissionAutosaveSuccessTimer) {
          window.clearTimeout(permissionAutosaveSuccessTimer);
          permissionAutosaveSuccessTimer = 0;
        }

        setPermissionAutosaveState('saving', 'Թույլտվությունները պահպանվում են…');

        try {
          const result = await postAdminAction('save_access_permissions', collectPermissionRowsPayload());

          setPermissionAutosaveState('saved', result.message || 'Թույլտվությունները պահպանվեցին');
          permissionAutosaveSuccessTimer = window.setTimeout(() => {
            setPermissionAutosaveState('idle', 'Փոփոխությունները կպահպանվեն ավտոմատ');
          }, 2200);
        } catch (error) {
          setPermissionAutosaveState('error', (error && error.message) ? error.message : 'Չհաջողվեց պահպանել թույլտվությունները');
        } finally {
          permissionAutosaveInFlight = false;
          if (permissionAutosaveQueued) {
            permissionAutosaveQueued = false;
            savePermissionRowsNow();
          }
        }
      }

      function schedulePermissionAutosave(delay) {
        if (permissionAutosaveTimer) {
          window.clearTimeout(permissionAutosaveTimer);
        }
        setPermissionAutosaveState('saving', 'Թույլտվությունները կպահպանվեն…');
        permissionAutosaveTimer = window.setTimeout(() => {
          permissionAutosaveTimer = 0;
          savePermissionRowsNow();
        }, typeof delay === 'number' ? delay : 700);
      }

      function applyDeviceFilters() {
        const url = new URL(window.location.href);
        const fields = [
          ['device_search', document.getElementById('device_search')],
          ['device_scope', document.getElementById('device_scope')],
          ['device_link', document.getElementById('device_link')],
          ['device_platform', document.getElementById('device_platform')],
          ['device_browser', document.getElementById('device_browser')],
          ['device_sort', document.getElementById('device_sort')]
        ];

        fields.forEach(([key, element]) => {
          const value = element ? String(element.value || '').trim() : '';
          if (!value || value === 'all' || (key === 'device_sort' && value === 'last_seen_newest')) {
            url.searchParams.delete(key);
          } else {
            url.searchParams.set(key, value);
          }
        });

        window.location.href = url.toString();
      }

      function panelMatchesSection(panel, section) {
        const value = String(panel.getAttribute('data-admin-section') || '').trim();
        if (!value) {
          return true;
        }

        const sections = value.split(/\s+/).filter(Boolean);
        return section === 'all' || sections.includes(section);
      }

      function setActiveSection(section) {
        if (!sectionTabs.length) {
          if (sectionFocusBar) {
            sectionFocusBar.hidden = true;
          }
          currentSection = '';
          return;
        }

        if (section === 'deploy') {
          section = 'release';
        }

        const nextSection = section; // 'all' means dashboard view
        
        const dashboardView = document.getElementById('settingsDashboard');
        const contentWrapper = document.getElementById('settingsContentWrapper');
        const pageHeader = document.querySelector('.page-header');
        const adminBanner = document.getElementById('adminBanner');

        if (nextSection === 'all' || !nextSection) {
          // Show Dashboard
          if (dashboardView) dashboardView.hidden = false;
          if (contentWrapper) contentWrapper.hidden = true;
          if (pageHeader) pageHeader.style.display = 'flex';
          if (adminBanner) adminBanner.style.display = 'block';
          
          sectionTabs.forEach((tab) => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
          });
        } else {
          // Show specific section
          if (dashboardView) dashboardView.hidden = true;
          if (contentWrapper) contentWrapper.hidden = false;
          if (pageHeader) pageHeader.style.display = 'none'; // hide title in detail view for cleaner look
          if (adminBanner) adminBanner.style.display = 'none'; // optional
          
          sectionTabs.forEach((tab) => {
            const active = tab.getAttribute('data-section-tab') === nextSection;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
          });

          sectionPanels.forEach((panel) => {
            panel.hidden = !panelAllowed(panel) || !panelMatchesSection(panel, nextSection);
          });

          sectionContainers.forEach((container) => {
            const visiblePanels = Array.from(container.querySelectorAll('[data-admin-section]')).some((panel) => !panel.hidden);
            container.hidden = !visiblePanels;
          });
        }

        if (adminLayout) {
          const visibleContainers = sectionContainers.filter((container) => !container.hidden).length;
          adminLayout.classList.toggle('layout-single', visibleContainers <= 1);
          adminLayout.classList.toggle('layout-focused', nextSection !== 'all');
        }

        currentSection = nextSection;
        renderSectionFocus(nextSection);

        try {
          window.localStorage.setItem(sectionStorageKey, nextSection);
        } catch (error) {
        }

        scheduleDevicesRefresh(nextSection);
      }

      function createPermissionRow(index, email) {
        const card = document.createElement('div');
        card.className = 'permission-card';
        card.dataset.permissionRow = '1';

        const head = document.createElement('div');
        head.className = 'permission-row-head';

        const field = document.createElement('div');
        field.className = 'field';
        field.style.marginTop = '0';
        field.style.flex = '1 1 280px';

        const label = document.createElement('label');
        label.textContent = 'Email';

        const input = document.createElement('input');
        input.type = 'email';
        input.name = `admin_permission_rows[${index}][email]`;
        input.value = email || '';
        input.placeholder = 'admin@example.com';

        field.appendChild(label);
        field.appendChild(input);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'history-btn danger';
        removeBtn.setAttribute('data-remove-permission-row', '1');
        removeBtn.textContent = 'Հեռացնել';

        head.appendChild(field);
        head.appendChild(removeBtn);

        const grid = document.createElement('div');
        grid.className = 'permission-grid';

        Object.entries(permissionSections).forEach(([sectionKey, sectionMeta]) => {
          const item = document.createElement('label');
          item.className = 'permission-check';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.name = `admin_permission_rows[${index}][sections][${sectionKey}]`;
          checkbox.value = '1';
          checkbox.checked = true;

          const copy = document.createElement('span');
          const strong = document.createElement('strong');
          strong.textContent = sectionMeta.label || sectionKey;
          const small = document.createElement('small');
          small.textContent = sectionMeta.description || '';

          copy.appendChild(strong);
          copy.appendChild(small);
          item.appendChild(checkbox);
          item.appendChild(copy);
          grid.appendChild(item);
        });

        card.appendChild(head);
        card.appendChild(grid);
        return card;
      }

      function stopDevicesRefresh() {
        if (devicesRefreshTimer) {
          window.clearTimeout(devicesRefreshTimer);
          devicesRefreshTimer = 0;
        }
      }

      function scheduleDevicesRefresh(section) {
        stopDevicesRefresh();
        if (section !== 'devices' || document.hidden) {
          return;
        }

        devicesRefreshTimer = window.setTimeout(() => {
          const activeElement = document.activeElement;
          const tagName = activeElement && activeElement.tagName ? activeElement.tagName.toLowerCase() : '';
          const isEditable = tagName === 'input' || tagName === 'textarea' || (activeElement && activeElement.isContentEditable);
          if (!document.hidden && !isEditable) {
            window.location.reload();
            return;
          }
          scheduleDevicesRefresh('devices');
        }, devicesRefreshDelay);
      }

      function buildReleaseDraftFields() {
        return {
          app_version: appVersionInput ? appVersionInput.value.trim() : '',
          web_version: webVersionInput ? webVersionInput.value.trim() : '',
          app_release_type: appReleaseTypeInput ? appReleaseTypeInput.value : '',
          web_release_type: webReleaseTypeInput ? webReleaseTypeInput.value : '',
          app_release_summary: appReleaseSummaryInput ? appReleaseSummaryInput.value.trim() : '',
          web_release_summary: webReleaseSummaryInput ? webReleaseSummaryInput.value.trim() : '',
          app_title: appTitleInput ? appTitleInput.value.trim() : '',
          app_message: appMessageInput ? appMessageInput.value : '',
          web_title: webTitleInput ? webTitleInput.value.trim() : '',
          web_message: webMessageInput ? webMessageInput.value : '',
          server_package_mode: packageModeInput ? packageModeInput.value : 'partial'
        };
      }

      function buildMaintenanceFields() {
        return {
          maintenance_enabled: maintenanceEnabledInput && maintenanceEnabledInput.checked ? '1' : '',
          maintenance_start_at: maintenanceStartInput ? maintenanceStartInput.value : '',
          maintenance_end_at: maintenanceEndInput ? maintenanceEndInput.value : '',
          maintenance_message: maintenanceMessageInput ? maintenanceMessageInput.value : '',
          maintenance_allowed_ips: maintenanceAllowedIpsInput ? maintenanceAllowedIpsInput.value : ''
        };
      }

      function buildPageModesFields() {
        const payload = { page_app_modes_present: '1', page_web_modes_present: '1' };
        document.querySelectorAll('input[name^="page_app_modes["]').forEach((input) => {
          if (input instanceof HTMLInputElement && input.checked) {
            payload[input.name] = '1';
          }
        });
        document.querySelectorAll('input[name^="page_web_modes["]').forEach((input) => {
          if (input instanceof HTMLInputElement && input.checked) {
            payload[input.name] = '1';
          }
        });
        return payload;
      }

      function buildAccessDraftFields() {
        return {
          admin_emails: adminEmailsInput ? adminEmailsInput.value : '',
          social_auth_google_client_id: googleClientIdInput ? googleClientIdInput.value.trim() : '',
          social_auth_google_redirect_uri: googleRedirectUriInput ? googleRedirectUriInput.value.trim() : '',
          meta_note: metaNoteInput ? metaNoteInput.value : ''
        };
      }

      function buildPushSettingsFields() {
        return {
          push_enabled: pushEnabledInput && pushEnabledInput.checked ? '1' : '',
          push_subject: pushSubjectInput ? pushSubjectInput.value.trim() : ''
        };
      }

      const releaseAutosave = createAutosaveController(releaseAutosaveStatus, 'save_release_draft', buildReleaseDraftFields, 900);
      const maintenanceAutosave = createAutosaveController(maintenanceAutosaveStatus, 'save_maintenance', buildMaintenanceFields, 700);
      const pageModesAutosave = createAutosaveController(pageModesAutosaveStatus, 'save_page_modes', buildPageModesFields, 400);
      const accessDraftAutosave = createAutosaveController(accessDraftAutosaveStatus, 'save_access_draft', buildAccessDraftFields, 850);
      const pushSettingsAutosave = createAutosaveController(pushAutosaveStatus, 'save_push_settings', buildPushSettingsFields, 700);

      document.querySelectorAll('[data-bump-target]').forEach((btn) => {
        btn?.addEventListener('click', () => {
          const target = btn.getAttribute('data-bump-target');
          const kind = btn.getAttribute('data-bump-kind') || 'patch';

          if (target === 'app' || target === 'both') {
            appVersionInput.value = bumpVersion(appVersionInput.value, kind);
            if (appReleaseTypeInput && (kind === 'patch' || kind === 'minor' || kind === 'major')) {
              appReleaseTypeInput.value = kind === 'major' ? 'major' : (kind === 'minor' ? 'feature' : 'patch');
            }
          }
          if (target === 'web' || target === 'both') {
            webVersionInput.value = bumpVersion(webVersionInput.value, kind);
            if (webReleaseTypeInput && (kind === 'patch' || kind === 'minor' || kind === 'major')) {
              webReleaseTypeInput.value = kind === 'major' ? 'major' : (kind === 'minor' ? 'content' : 'patch');
            }
          }
          renderReleaseWorkspaceSummary();
          releaseAutosave.schedule(450);
        });
      });

      syncVersionsBtn?.addEventListener('click', () => {
        const version = appVersionInput.value.trim() || webVersionInput.value.trim() || '1.0.0';
        appVersionInput.value = version;
        webVersionInput.value = version;
        ensureDefaultUpdateTexts();
        renderReleaseWorkspaceSummary();
        releaseAutosave.schedule(450);
      });

      fillDefaultTextsBtn?.addEventListener('click', () => {
        ensureDefaultUpdateTexts();
        renderReleaseWorkspaceSummary();
        releaseAutosave.schedule(450);
      });

      copyAppContentToWebBtn?.addEventListener('click', () => {
        if (appVersionInput.value.trim() && !webVersionInput.value.trim()) {
          webVersionInput.value = appVersionInput.value.trim();
        }
        if (appReleaseTypeInput.value) {
          webReleaseTypeInput.value = appReleaseTypeInput.value;
        }
        if (appReleaseSummaryInput.value.trim()) {
          webReleaseSummaryInput.value = appReleaseSummaryInput.value.trim();
        }
        if (appTitleInput.value.trim()) {
          webTitleInput.value = appTitleInput.value.trim();
        }
        if (appMessageInput.value.trim()) {
          webMessageInput.value = appMessageInput.value.trim();
        }
        renderReleaseWorkspaceSummary();
        releaseAutosave.schedule(450);
      });

      document.querySelectorAll('[data-maintenance-hours]').forEach((btn) => {
        btn?.addEventListener('click', () => {
          const hours = Number(btn.getAttribute('data-maintenance-hours') || '0');
          const start = nowLocalDate();
          const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

          maintenanceEnabledInput.checked = false;
          maintenanceStartInput.value = toDatetimeLocal(start);
          maintenanceEndInput.value = toDatetimeLocal(end);

          if (!maintenanceMessageInput.value.trim()) {
            maintenanceMessageInput.value = 'Կայքում ընթացքի մեջ են տեխնիկական աշխատանքներ։ Խնդրում ենք փորձել մի փոքր հետո։';
          }
          renderReleaseWorkspaceSummary();
          maintenanceAutosave.schedule(350);
        });
      });

      startMaintenanceNowBtn?.addEventListener('click', () => {
        maintenanceEnabledInput.checked = true;
        maintenanceStartInput.value = '';
        maintenanceEndInput.value = '';

        if (!maintenanceMessageInput.value.trim()) {
          maintenanceMessageInput.value = 'Կայքում ընթացքի մեջ են տեխնիկական աշխատանքներ։ Խնդրում ենք փորձել մի փոքր հետո։';
        }
        renderReleaseWorkspaceSummary();
        maintenanceAutosave.schedule(350);
      });

      clearScheduleBtn?.addEventListener('click', () => {
        maintenanceStartInput.value = '';
        maintenanceEndInput.value = '';
        renderReleaseWorkspaceSummary();
        maintenanceAutosave.schedule(350);
      });

      disableMaintenanceBtn?.addEventListener('click', () => {
        maintenanceEnabledInput.checked = false;
        maintenanceStartInput.value = '';
        maintenanceEndInput.value = '';
        renderReleaseWorkspaceSummary();
        maintenanceAutosave.schedule(350);
      });

      releaseApplyModeInput?.addEventListener('change', renderPackageModeHelp);
      releaseApplyModeInput?.addEventListener('change', renderReleaseWorkspaceSummary);
      packageModeInput?.addEventListener('change', renderPackageModeHelp);
      packageModeInput?.addEventListener('change', renderReleaseWorkspaceSummary);
      packageFileInput?.addEventListener('change', renderReleaseWorkspaceSummary);

      [
        appVersionInput,
        webVersionInput,
        appReleaseTypeInput,
        webReleaseTypeInput,
        appReleaseSummaryInput,
        webReleaseSummaryInput,
        appTitleInput,
        webTitleInput,
        appMessageInput,
        webMessageInput,
        maintenanceEnabledInput,
        maintenanceStartInput,
        maintenanceEndInput
      ].forEach((input) => {
        input?.addEventListener('input', renderReleaseWorkspaceSummary);
        input?.addEventListener('change', renderReleaseWorkspaceSummary);
      });

      [
        appVersionInput,
        webVersionInput,
        appReleaseTypeInput,
        webReleaseTypeInput,
        appReleaseSummaryInput,
        webReleaseSummaryInput,
        appTitleInput,
        webTitleInput,
        appMessageInput,
        webMessageInput,
        packageModeInput
      ].forEach((input) => {
        input?.addEventListener('input', () => releaseAutosave.schedule(900));
        input?.addEventListener('change', () => releaseAutosave.schedule(500));
      });

      [
        maintenanceEnabledInput,
        maintenanceStartInput,
        maintenanceEndInput,
        maintenanceMessageInput,
        maintenanceAllowedIpsInput
      ].forEach((input) => {
        input?.addEventListener('input', () => maintenanceAutosave.schedule(750));
        input?.addEventListener('change', () => maintenanceAutosave.schedule(450));
      });

      sectionTabs.forEach((tab) => {
        tab?.addEventListener('click', () => {
          setActiveSection(tab.getAttribute('data-section-tab') || 'release');
        });
      });

      const btnBackToDashboard = document.getElementById('btnBackToDashboard');
      if (btnBackToDashboard) {
        btnBackToDashboard.addEventListener('click', () => {
          setActiveSection('all');
          const url = new URL(window.location.href);
          url.searchParams.delete('section');
          window.history.pushState({}, '', url);
        });
      }

      sectionFocusActionBtn?.addEventListener('click', () => {
        const targetId = sectionFocusActionBtn.dataset.targetId || '';
        const target = targetId ? document.getElementById(targetId) : null;
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      sendPushBtn?.addEventListener('click', () => {
        const title = pushTitleInput ? pushTitleInput.value.trim() : '';
        const body = pushBodyInput ? pushBodyInput.value.trim() : '';
        const url = pushUrlInput ? pushUrlInput.value.trim() : '/main.html';
        const icon = pushIconInput ? pushIconInput.value.trim() : '/wolarm_youth.png';
        const tag = pushTagInput ? pushTagInput.value.trim() : 'worship-update';

        if (!title || !body) {
          window.alert('Push ծանուցման վերնագիրն ու բովանդակությունը պարտադիր են։');
          return;
        }

        submitAdminPost('send_push', {
          push_title: title,
          push_body: body,
          push_url: url || '/main.html',
          push_icon: icon || '/wolarm_youth.png',
          push_tag: tag || 'worship-update'
        });
      });

      document.querySelectorAll('[data-push-template]').forEach((btn) => {
        btn?.addEventListener('click', () => {
          applyPushTemplate(btn.getAttribute('data-push-template') || '');
        });
      });

      addPermissionRowBtn?.addEventListener('click', () => {
        if (!permissionList) {
          return;
        }
        permissionList.appendChild(createPermissionRow(nextPermissionRowIndex, ''));
        nextPermissionRowIndex += 1;
        schedulePermissionAutosave(500);
      });

      permissionList?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.closest('[data-remove-permission-row]')) {
          return;
        }
        const row = target.closest('[data-permission-row]');
        if (row) {
          row.remove();
          schedulePermissionAutosave(250);
        }
      });

      permissionList?.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        if (target.matches('input[type="checkbox"], input[type="email"]')) {
          schedulePermissionAutosave(500);
        }
      });

      permissionList?.addEventListener('focusout', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        if (target.matches('input[type="email"]')) {
          schedulePermissionAutosave(350);
        }
      });

      translationSongSelect?.addEventListener('change', () => {
        const option = translationSongSelect.options[translationSongSelect.selectedIndex];
        const title = option?.getAttribute('data-title') || '';
        const lat = option?.getAttribute('data-lat') || '';
        const ru = option?.getAttribute('data-ru') || '';
        const en = option?.getAttribute('data-en') || '';

        if (translationSongSourcePreview) {
          translationSongSourcePreview.value = title;
        }
        if (translationSongLat) {
          translationSongLat.value = lat;
        }
        if (translationSongRu) {
          translationSongRu.value = ru;
        }
        if (translationSongEn) {
          translationSongEn.value = en;
        }
      });

      document.querySelectorAll('[data-translation-clear-cache]').forEach((button) => {
        button?.addEventListener('click', async () => {
          const lang = button.getAttribute('data-translation-clear-cache') || 'all';
          const label = lang === 'all'
            ? 'ամբողջ թարգմանությունների cache-ը'
            : (lang === 'ru' ? 'ռուսերենի cache-ը' : 'անգլերենի cache-ը');

          if (!window.confirm(`Վստա՞հ եք, որ ուզում եք մաքրել ${label}։`)) {
            return;
          }

          setTranslationStatus(translationActionStatus, 'saving', 'Մաքրվում է թարգմանությունների cache-ը...');

          try {
            const result = await postAdminAction('clear_translation_cache', {
              translation_cache_lang: lang
            });
            setTranslationStatus(translationActionStatus, 'saved', result.message || 'Թարգմանությունների cache-ը մաքրվեց։');
            window.setTimeout(() => window.location.reload(), 500);
          } catch (error) {
            setTranslationStatus(translationActionStatus, 'error', error.message || 'Չհաջողվեց մաքրել թարգմանությունների cache-ը։');
          }
        });
      });

      translationCachePanel?.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const saveButton = target.closest('[data-translation-save-entry]');
        const deleteButton = target.closest('[data-translation-delete-entry]');
        if (!saveButton && !deleteButton) {
          return;
        }

        const entry = target.closest('[data-translation-entry]');
        if (!(entry instanceof HTMLElement)) {
          return;
        }

        const langInput = entry.querySelector('[data-translation-lang]');
        const contextInput = entry.querySelector('[data-translation-context]');
        const sourceInput = entry.querySelector('[data-translation-source]');
        const textInput = entry.querySelector('[data-translation-text]');
        const statusEl = entry.querySelector('[data-translation-entry-status]');

        const lang = langInput instanceof HTMLInputElement ? langInput.value : '';
        const context = contextInput instanceof HTMLInputElement ? contextInput.value : '';
        const source = sourceInput instanceof HTMLTextAreaElement ? sourceInput.value : '';
        const text = textInput instanceof HTMLTextAreaElement ? textInput.value : '';

        if (!lang || !context || !source) {
          setTranslationStatus(statusEl, 'error', 'Գրառման տվյալները թերի են։');
          return;
        }

        if (saveButton) {
          if (!text.trim()) {
            setTranslationStatus(statusEl, 'error', 'Թարգմանված տարբերակը դատարկ չի կարող լինել։');
            return;
          }

          setTranslationStatus(statusEl, 'saving', 'Պահպանվում է...');
          setTranslationStatus(translationActionStatus, 'saving', 'Պահպանվում է ընտրված թարգմանությունը...');

          try {
            const result = await postAdminAction('update_translation_cache_entry', {
              translation_entry_lang: lang,
              translation_entry_context: context,
              translation_entry_source: source,
              translation_entry_text: text
            });
            setTranslationStatus(statusEl, 'saved', 'Պահպանվեց');
            setTranslationStatus(translationActionStatus, 'saved', result.message || 'Թարգմանության գրառումը պահպանվեց։');
          } catch (error) {
            setTranslationStatus(statusEl, 'error', error.message || 'Չհաջողվեց պահպանել գրառումը։');
            setTranslationStatus(translationActionStatus, 'error', error.message || 'Չհաջողվեց պահպանել թարգմանության գրառումը։');
          }
          return;
        }

        if (!window.confirm('Վստա՞հ եք, որ ուզում եք ջնջել այս թարգմանության գրառումը։')) {
          return;
        }

        setTranslationStatus(statusEl, 'saving', 'Ջնջվում է...');
        setTranslationStatus(translationActionStatus, 'saving', 'Ջնջվում է ընտրված թարգմանության գրառումը...');

        try {
          const result = await postAdminAction('delete_translation_cache_entry', {
            translation_entry_lang: lang,
            translation_entry_context: context,
            translation_entry_source: source
          });
          entry.remove();
          setTranslationStatus(translationActionStatus, 'saved', result.message || 'Թարգմանության գրառումը ջնջվեց։');
        } catch (error) {
          setTranslationStatus(statusEl, 'error', error.message || 'Չհաջողվեց ջնջել գրառումը։');
          setTranslationStatus(translationActionStatus, 'error', error.message || 'Չհաջողվեց ջնջել թարգմանության գրառումը։');
        }
      });

      document?.addEventListener('submit', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLFormElement)) {
          return;
        }

        if (target.matches('[data-moderation-filter-form]')) {
          event.preventDefault();
          const submitButton = target.querySelector('button[type="submit"]');
          if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
          }
          setAdminBanner('success', 'Մոդերացիայի ցանկը թարմացվում է…');
          try {
            await refreshModerationPanel(getModerationFilterState());
            setAdminBanner('success', 'Մոդերացիայի զտումը կիրառվեց։');
          } catch (error) {
            setAdminBanner('error', (error && error.message) ? error.message : 'Չհաջողվեց կիրառել մոդերացիայի զտումը։');
          } finally {
            if (submitButton instanceof HTMLButtonElement) {
              submitButton.disabled = false;
            }
          }
          return;
        }

        if (target.matches('[data-moderation-decision-form]')) {
          event.preventDefault();
          const submitter = event.submitter;
          if (!(submitter instanceof HTMLButtonElement)) {
            return;
          }

          const action = String(submitter.value || '').trim();
          if (!action) {
            return;
          }

          const requestIdInput = target.querySelector('input[name="song_request_id"]');
          const reviewNoteInput = target.querySelector('textarea[name="song_request_review_note"]');
          const requestId = requestIdInput instanceof HTMLInputElement ? String(requestIdInput.value || '').trim() : '';
          const reviewNote = reviewNoteInput instanceof HTMLTextAreaElement ? reviewNoteInput.value : '';

          if (!requestId) {
            setAdminBanner('error', 'Հարցման նույնականացուցիչը չգտնվեց։');
            return;
          }

          const formButtons = Array.from(target.querySelectorAll('button[type="submit"]'));
          formButtons.forEach((button) => {
            button.disabled = true;
          });

          setAdminBanner('success', action === 'approve_song_request'
            ? 'Հարցումը հաստատվում է…'
            : 'Հարցումը մերժվում է…');

          try {
            const result = await postAdminAction(action, {
              song_request_id: requestId,
              song_request_review_note: reviewNote
            });
            await refreshModerationPanel();
            setAdminBanner(result.type === 'error' ? 'error' : 'success', result.message || 'Մոդերացիայի հարցումը մշակվեց։');
          } catch (error) {
            setAdminBanner('error', (error && error.message) ? error.message : 'Չհաջողվեց մշակել մոդերացիայի հարցումը։');
          } finally {
            formButtons.forEach((button) => {
              button.disabled = false;
            });
          }
        }
      });

      document?.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        if (target.id === 'moderation_status') {
          const form = target.closest('form[data-moderation-filter-form]');
          if (form instanceof HTMLFormElement) {
            form.requestSubmit();
          }
        }
      });

      document?.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const clearButton = target.closest('[data-moderation-clear-filters]');
        if (!(clearButton instanceof HTMLElement)) {
          return;
        }

        event.preventDefault();
        const statusInput = document.getElementById('moderation_status');
        const searchInput = document.getElementById('moderation_search');
        if (statusInput instanceof HTMLSelectElement) {
          statusInput.value = 'pending';
        }
        if (searchInput instanceof HTMLInputElement) {
          searchInput.value = '';
        }

        setAdminBanner('success', 'Մոդերացիայի զտումը մաքրվում է…');
        try {
          await refreshModerationPanel({ status: 'pending', search: '' });
          setAdminBanner('success', 'Մոդերացիայի զտումը մաքրվեց։');
        } catch (error) {
          setAdminBanner('error', (error && error.message) ? error.message : 'Չհաջողվեց մաքրել մոդերացիայի զտումը։');
        }
      });

      document.querySelectorAll('input[name^="page_app_modes["]').forEach((input) => {
        input?.addEventListener('change', () => {
          pageModesAutosave.schedule(300);
        });
      });

      [adminEmailsInput, googleClientIdInput, googleRedirectUriInput, metaNoteInput].forEach((input) => {
        input?.addEventListener('input', () => accessDraftAutosave.schedule(900));
        input?.addEventListener('change', () => accessDraftAutosave.schedule(500));
        input?.addEventListener('blur', () => accessDraftAutosave.schedule(350));
      });

      [pushEnabledInput, pushSubjectInput].forEach((input) => {
        input?.addEventListener('input', () => pushSettingsAutosave.schedule(750));
        input?.addEventListener('change', () => pushSettingsAutosave.schedule(400));
      });

      [pushTitleInput, pushBodyInput, pushUrlInput, pushIconInput, pushTagInput].forEach((input) => {
        input?.addEventListener('input', renderPushPreview);
        input?.addEventListener('change', renderPushPreview);
      });

      applyDeviceFiltersBtn?.addEventListener('click', applyDeviceFilters);
      ['device_scope', 'device_link', 'device_platform', 'device_browser', 'device_sort'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', applyDeviceFilters);
      });
      document.getElementById('device_search')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          applyDeviceFilters();
        }
      });

      historySearchInput?.addEventListener('input', () => {
        visibleHistoryCount = historyPageSize;
        applyDatasetSearch(historyItems, historySearchInput.value, 'historySearch');
        renderHistoryPage();
      });
      historySearchInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
        }
      });

      pushHistorySearchInput?.addEventListener('input', () => {
        visiblePushHistoryCount = historyPageSize;
        applyDatasetSearch(pushHistoryItems, pushHistorySearchInput.value, 'pushHistorySearch');
        renderPushHistoryPage();
      });
      pushHistorySearchInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
        }
      });

      pushSubscriptionSearchInput?.addEventListener('input', () => {
        applyDatasetSearch(pushSubscriptionItems, pushSubscriptionSearchInput.value, 'pushSubscriptionSearch');
        renderPushSubscriptionList();
      });
      pushSubscriptionSearchInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
        }
      });

      releaseControlForm?.addEventListener('submit', (event) => {
        const submitter = event.submitter;
        if (!submitter) {
          return;
        }

        const action = submitter.value || '';
        if (action === 'apply_release') {
          const applyMode = releaseApplyModeInput ? releaseApplyModeInput.value : 'without_file';
          if (applyMode !== 'with_file') {
            if (!window.confirm('Վստա՞հ եք, որ ուզում եք կիրառել թարմացումը առանց ֆայլի կցման։ Կփոխվեն միայն version/settings տվյալները։')) {
              event.preventDefault();
            }
            return;
          }

          const usingNewPackage = !!(packageFileInput && packageFileInput.files && packageFileInput.files.length > 0);
          const prompt = usingNewPackage
            ? 'Վստա՞հ եք, որ ուզում եք կիրառել թարմացումը և նոր ZIP package-ը տեղադրել սերվերի վրա։'
            : 'Վստա՞հ եք, որ ուզում եք կիրառել թարմացումը և արդեն առկա package-ը տեղադրել սերվերի վրա։';

          if (!window.confirm(prompt)) {
            event.preventDefault();
          }
          return;
        }
      });

      loadMoreHistoryBtn?.addEventListener('click', () => {
        visibleHistoryCount += historyPageSize;
        renderHistoryPage();
      });

      loadMorePushHistoryBtn?.addEventListener('click', () => {
        visiblePushHistoryCount += historyPageSize;
        renderPushHistoryPage();
      });

      window?.addEventListener('focus', () => {
        const activeSection = sectionTabs.find((tab) => tab.classList.contains('active'))?.getAttribute('data-section-tab') || 'release';
        if (activeSection === 'devices') {
          window.location.reload();
        }
      });

      document?.addEventListener('visibilitychange', () => {
        const activeSection = sectionTabs.find((tab) => tab.classList.contains('active'))?.getAttribute('data-section-tab') || 'release';
        if (document.hidden) {
          stopDevicesRefresh();
          return;
        }
        if (activeSection === 'devices') {
          window.location.reload();
        }
      });

      let initialSection = defaultSection || 'all';
      try {
        initialSection = window.localStorage.getItem(sectionStorageKey) || defaultSection || 'all';
      } catch (error) {
      }
      // If URL has a specific section, use it. But if empty, stick to 'all'
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('section')) {
        initialSection = urlParams.get('section');
      } else {
        initialSection = 'all'; // Default to dashboard grid!
      }

      setActiveSection(initialSection);
      applyDatasetSearch(historyItems, historySearchInput ? historySearchInput.value : '', 'historySearch');
      applyDatasetSearch(pushHistoryItems, pushHistorySearchInput ? pushHistorySearchInput.value : '', 'pushHistorySearch');
      applyDatasetSearch(pushSubscriptionItems, pushSubscriptionSearchInput ? pushSubscriptionSearchInput.value : '', 'pushSubscriptionSearch');
      renderPackageModeHelp();
      renderReleaseWorkspaceSummary();
      renderPushPreview();
      renderHistoryPage();
      renderPushHistoryPage();
      renderPushSubscriptionList();
    })();
  </script>
</body>
</html>
