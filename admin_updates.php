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
        'blocked_os_list' => array_key_exists('blocked_os_list_present', $_POST) ? ($_POST['blocked_os_list'] ?? []) : ($config['blocked_os_list'] ?? []),
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

</head>
<body>
  <script>
    <?= __('const ADMIN_I18N = {
      \'Թարմացում և տեղադրում\': {ru: \'Обновление и установка\', en: \'Update & Deploy\'},
      \'Թարմացումների Վահանակ\': {ru: \'Панель обновлений\', en: \'Updates Dashboard\'},
      \'Սա update-ների, deploy-ի և maintenance-ի կառավարման հիմնական վահանակն է։ Աշխատանքը բաժանված է պարզ փուլերի, որպեսզի phone-ից ու computer-ից արագ գտնես ուզած գործողությունը և սխալ publish չանես։\': {ru: \'Основная панель управления обновлениями и обслуживанием. Работа разделена на простые этапы для быстрого доступа с телефона и ПК.\', en: \'Main dashboard for updates, deploy, and maintenance. Work is divided into simple stages for quick access from phone and PC.\'},
      \'Ծրագրի ընթացիկ տարբերակ\': {ru: \'Текущая версия приложения\', en: \'Current App Version\'},
      \'Կայքի ընթացիկ տարբերակ\': {ru: \'Текущая версия сайта\', en: \'Current Web Version\'},
      \'Փաթեթի կապի վիճակ\': {ru: \'Статус связи пакета\', en: \'Package Sync Status\'},
      \'Ծրագրի ընդհանուր ճանաչված տեղադրումներ\': {ru: \'Общее количество установок\', en: \'Total Known Installs\'},
      \'Վերադառնալ ադմին վահանակ\': {ru: \'Вернуться в админку\', en: \'Back to Admin\'},
      \'Բացել տարբերակի տվյալները\': {ru: \'Данные версии\', en: \'Version Data\'},
      \'Դուրս գալ admin-ից\': {ru: \'Выйти из админки\', en: \'Log Out\'},
      \'Արագ հոսք\': {ru: \'Быстрый старт\', en: \'Quick Flow\'},
      \'Լրացրու version/message դաշտերը `Թարմացում և տեղադրում` բաժնում։\': {ru: \'Заполните поля version/message в разделе «Обновление и установка».\', en: \'Fill in version/message fields in the \"Update & Deploy\" section.\'},
      \'Ընտրիր կիրառման տարբերակը` առանց ֆայլի կամ ֆայլով։\': {ru: \'Выберите вариант применения: с файлом или без.\', en: \'Choose deployment mode: with or without file.\'},
      \'Սեղմիր `Կիրառել թարմացումը` ու ավարտիր գործընթացը։\': {ru: \'Нажмите «Применить обновление» для завершения.\', en: \'Click \"Apply Update\" to finish.\'},
      \'1. Թարմացում և տեղադրում\': {ru: \'1. Обновление и установка\', en: \'1. Update & Deploy\'},
      \'2. Տեխնիկական աշխատանքներ\': {ru: \'2. Тех. работы\', en: \'2. Maintenance\'},
      \'3. Push ծանուցումներ\': {ru: \'3. Push-уведомления\', en: \'3. Push Notifications\'},
      \'4. Սարքեր\': {ru: \'4. Устройства\', en: \'4. Devices\'},
      \'5. Պատմություն\': {ru: \'5. История\', en: \'5. History\'},
      \'6. Մուտքեր\': {ru: \'6. Доступы\', en: \'6. Access\'},
      \'7. Մոդերացիա\': {ru: \'7. Модерация\', en: \'7. Moderation\'},
      \'8. Թարգմանություններ\': {ru: \'8. Переводы\', en: \'8. Translations\'},
      \'Թողարկման գլխավոր հոսք\': {ru: \'Главный поток релиза\', en: \'Main Release Flow\'},
      \'Այստեղ լրացնում ես տարբերակները, հաղորդագրությունները և ընտրում ես ինչպես կիրառել թարմացումը։\': {ru: \'Здесь вы заполняете версии, сообщения и выбираете способ применения обновления.\', en: \'Here you fill in versions, messages, and choose how to apply the update.\'},
      \'Ծրագիր\': {ru: \'Программа\', en: \'App\'},
      \'Կայք\': {ru: \'Сайт\', en: \'Web\'},
      \'Փաթեթ պատրաստ\': {ru: \'Пакет готов\', en: \'Package Ready\'},
      \'Գնալ կիրառման կոճակին\': {ru: \'Перейти к применению\', en: \'Go to Apply button\'},
      \'Նոր հնարավորություն\': {ru: \'Новая функция\', en: \'New Feature\'},
      \'ԱՆՋԱՏՎԱԾ\': {ru: \'ОТКЛЮЧЕНО\', en: \'DISABLED\'},
      \'Տեխնիկական աշխատանքների վիճակ\': {ru: \'Состояние тех. работ\', en: \'Maintenance Status\'},
      \'Վերջին թարմացումը (UTC+4)\': {ru: \'Последнее обновление\', en: \'Last update\'},
      \'Թողարկման կենդանի ամփոփում\': {ru: \'Живая сводка релиза\', en: \'Live Release Summary\'},
      \'Մինչև սեղմես `Կիրառել թարմացումը`, այստեղ միանգամից երևում է ինչ տարբերակ է գնալու, ինչ ձևով է կիրառվելու և արդյոք հիմնական դաշտերը լրացված են։\': {ru: \'До нажатия кнопки здесь сразу видно, какая версия будет применена.\', en: \'Before applying, you can see what version will be deployed.\'},
      \'Փոփոխությունները կպահպանվեն ավտոմատ\': {ru: \'Изменения сохраняются автоматически\', en: \'Changes saved automatically\'},
      \'Ծրագրի թողարկում\': {ru: \'Релиз программы\', en: \'App Release\'},
      \'Նոր հնարավորություն - Ծրագրի նոր տարբերակ\': {ru: \'Новая версия программы\', en: \'New App Version\'},
      \'Կայքի թողարկում\': {ru: \'Релиз сайта\', en: \'Web Release\'},
      \'Նոր հնարավորություն - Կայքի նոր տարբերակ\': {ru: \'Новая версия сайта\', en: \'New Web Version\'},
      \'Կիրառման ձև\': {ru: \'Способ применения\', en: \'Deployment Mode\'},
      \'Կփոխվեն միայն տարբերակների, հաղորդագրությունների և կարգավորումների տվյալները` առանց սերվերի ֆայլերի փոփոխման:\': {ru: \'Будут изменены только данные версий и настройки.\', en: \'Only version data and settings will be changed.\'},
      \'ԿԻՐԱՌԵԼ ԹԱՐՄԱՑՈՒՄԸ\': {ru: \'ПРИМЕНИТЬ ОБНОВЛЕНИЕ\', en: \'APPLY UPDATE\'},
      \'ՊԱՏՐԱՍՏ\': {ru: \'ГОТОВ\', en: \'READY\'},
      \'ՍՊԱՍՄԱՆ ՄԵՋ\': {ru: \'В ОЖИДАНИИ\', en: \'PENDING\'},
      \'Կարգավորումներ և համակարգ\': {ru: \'Настройки и система\', en: \'Settings & System\'},
      \'Երգերի ցանկ\': {ru: \'Список песен\', en: \'Music Library\'},
      \'Կարգավորումներ\': {ru: \'Настройки\', en: \'Settings\'},
      \'Դուրս գալ\': {ru: \'Выйти\', en: \'Log Out\'},
      \'Ադմին\': {ru: \'Админ\', en: \'Admin\'}
    };
    const currentLang = \'') ?><?= $adminLang ?>';
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
    <?php
      $adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
      $adminEmail = trim((string)($adminUser['email'] ?? ''));
      include __DIR__ . '/admin_topbar.php';
    ?>

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
            <?= __('Վերադառնալ կարգավորումներին') ?>
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
              <h3><?= __('Բաժինների հասանելիություն չկա') ?></h3>
              <p><?= __('Այս օգտահաշվի համար ադմին բաժինների թույլտվություններ դեռ միացված չեն։ Խնդրիր լիազորված ադմինին՝ միացնել անհրաժեշտ բաժինները') ?> <code><?= __('Մուտքեր') ?></code> <?= __('բաժնից։') ?></p>
            </div>
    </section>
    <?php endif; ?>

    <section class="section-focus" id="sectionFocusBar" aria-live="polite"<?= $hasAnyAdminSectionAccess ? '' : ' hidden' ?>>
      <div class="section-focus-copy">
        <div class="eyebrow" id="sectionFocusEyebrow"><?= __('Թարմացում և տեղադրում') ?></div>
        <h2 id="sectionFocusTitle"><?= __('Թողարկման գլխավոր հոսք') ?></h2>
        <p id="sectionFocusDescription"><?= __('Այստեղ լրացնում ես տարբերակները, հաղորդագրությունները և ընտրում ես ինչպես կիրառել թարմացումը։') ?></p>
      </div>
      <div class="section-focus-side">
        <div class="chips section-focus-meta" id="sectionFocusMeta">
          <div class="chip"><?= __('Ծրագիր') ?> <?= htmlspecialchars((string)$config['app_version'], ENT_QUOTES) ?></div>
          <div class="chip"><?= __('Կայք') ?> <?= htmlspecialchars((string)$config['web_version'], ENT_QUOTES) ?></div>
        </div>
        <button class="btn btn-primary" type="button" id="sectionFocusActionBtn"><?= __('Գնալ հիմնական գործողությանը') ?></button>
      </div>
    </section>

    <div class="layout" id="adminLayout">
      <form id="releaseControlForm" method="post" enctype="multipart/form-data" class="stack" data-section-container>
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
        <div class="stats" data-admin-section="release maintenance all" data-admin-permission="release,maintenance">
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= $isScheduledActive ? 'Ժամանակացույցով տեխնիկական աշխատանքը ակտիվ է' : 'Տեխնիկական աշխատանքների վիճակ' ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= $isMaintenanceActive ? 'ՄԻԱՑՎԱԾ' : 'ԱՆՋԱՏՎԱԾ' ?></strong>
              </div>
              
            </div>
            
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= __('Վերջին թարմացումը (UTC+4)') ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)$config['updated_at']) ?: '—', ENT_QUOTES) ?></strong>
              </div>
              
            </div>
            
          </div>
        </div>

        <div class="bento-split" id="releaseWorkspacePanel" data-admin-section="release all" data-admin-permission="release">
          
          <!-- LEFT: App & Web Versions -->
          <div class="bento-card" style="display: flex; flex-direction: column;">
            <div class="bento-header" style="flex-direction: row; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 20px;">
              <div>
                <h3 style="margin: 0;"><?= __('Տարբերակներ և Տեքստեր') ?></h3>
                <p style="margin: 0; font-size: 12px; color: var(--muted);"><?= __('Լրացրեք նոր տարբերակների տվյալները:') ?></p>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-icon" type="button" data-bump-target="app" data-bump-kind="patch" title="<?= __('Ծրագիր +1') ?>">+A</button>
                <button class="btn btn-icon" type="button" data-bump-target="web" data-bump-kind="patch" title="<?= __('Կայք +1') ?>">+W</button>
                <button class="btn" type="button" id="fillDefaultTextsBtn" style="padding: 6px 10px; font-size: 12px;"><?= __('Ավտո լրացում') ?></button>
              </div>
            </div>

            <div class="bento-split-even" style="margin-bottom:0; gap: 24px;">
              
              <!-- App Column -->
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(67,24,255,0.04); padding: 10px 12px; border-radius: 8px;">
                  <strong style="font-size:13px; color:var(--primary); margin:0;"><span style="margin-right:6px;">📱</span><?= __('Ծրագիր / App') ?></strong>
                  <span id="releaseAppTypeChip" class="chip primary" style="margin:0; padding: 2px 8px; font-size: 11px;"><?= htmlspecialchars(wp_version_release_label((string)$config['app_release_type']), ENT_QUOTES) ?></span>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                  <div class="form-field" style="margin-bottom:0;">
                    <label for="app_version"><?= __('Տարբերակ') ?></label>
                    <input id="app_version" name="app_version" value="<?= htmlspecialchars((string)$config['app_version'], ENT_QUOTES) ?>" required>
                  </div>
                  <div class="form-field" style="margin-bottom:0;">
                    <label for="app_release_type"><?= __('Տեսակ') ?></label>
                    <select id="app_release_type" name="app_release_type">
                      <?php foreach ($releaseTypes as $releaseTypeValue => $releaseTypeLabel): ?>
                        <option value="<?= htmlspecialchars($releaseTypeValue, ENT_QUOTES) ?>" <?= (string)$config['app_release_type'] === $releaseTypeValue ? 'selected' : '' ?>><?= htmlspecialchars($releaseTypeLabel, ENT_QUOTES) ?></option>
                      <?php endforeach; ?>
                    </select>
                  </div>
                </div>

                <div class="form-field" style="margin-bottom:0;">
                  <label for="app_release_summary"><?= __('Կարճ նկարագրություն') ?></label>
                  <input id="app_release_summary" name="app_release_summary" maxlength="240" value="<?= htmlspecialchars((string)$config['app_release_summary'], ENT_QUOTES) ?>" placeholder="<?= __('Օր.` Տեխնիկական բարելավումներ') ?>">
                </div>
                <div class="form-field" style="margin-bottom:0;">
                  <label for="app_title"><?= __('Վերնագիր') ?></label>
                  <input id="app_title" name="app_title" value="<?= htmlspecialchars((string)$config['app_title'], ENT_QUOTES) ?>" required>
                </div>
                <div class="form-field" style="margin-bottom:0; flex-grow: 1;">
                  <label for="app_message"><?= __('Հաղորդագրություն (Ամբողջական)') ?></label>
                  <textarea id="app_message" name="app_message" style="height: 100%; min-height: 80px;" required><?= htmlspecialchars((string)$config['app_message'], ENT_QUOTES) ?></textarea>
                </div>
              </div>

              <!-- Web Column -->
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(67,24,255,0.04); padding: 10px 12px; border-radius: 8px;">
                  <strong style="font-size:13px; color:var(--primary); margin:0;"><span style="margin-right:6px;">💻</span><?= __('Կայք / Web') ?></strong>
                  <span id="releaseWebTypeChip" class="chip primary" style="margin:0; padding: 2px 8px; font-size: 11px;"><?= htmlspecialchars(wp_version_release_label((string)$config['web_release_type']), ENT_QUOTES) ?></span>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                  <div class="form-field" style="margin-bottom:0;">
                    <label for="web_version"><?= __('Տարբերակ') ?></label>
                    <input id="web_version" name="web_version" value="<?= htmlspecialchars((string)$config['web_version'], ENT_QUOTES) ?>" required>
                  </div>
                  <div class="form-field" style="margin-bottom:0;">
                    <label for="web_release_type"><?= __('Տեսակ') ?></label>
                    <select id="web_release_type" name="web_release_type">
                      <?php foreach ($releaseTypes as $releaseTypeValue => $releaseTypeLabel): ?>
                        <option value="<?= htmlspecialchars($releaseTypeValue, ENT_QUOTES) ?>" <?= (string)$config['web_release_type'] === $releaseTypeValue ? 'selected' : '' ?>><?= htmlspecialchars($releaseTypeLabel, ENT_QUOTES) ?></option>
                      <?php endforeach; ?>
                    </select>
                  </div>
                </div>

                <div class="form-field" style="margin-bottom:0;">
                  <label for="web_release_summary"><?= __('Կարճ նկարագրություն') ?></label>
                  <input id="web_release_summary" name="web_release_summary" maxlength="240" value="<?= htmlspecialchars((string)$config['web_release_summary'], ENT_QUOTES) ?>" placeholder="<?= __('Օր.` Վիզուալ փոփոխություններ') ?>">
                </div>
                <div class="form-field" style="margin-bottom:0;">
                  <label for="web_title"><?= __('Վերնագիր') ?></label>
                  <input id="web_title" name="web_title" value="<?= htmlspecialchars((string)$config['web_title'], ENT_QUOTES) ?>" required>
                </div>
                <div class="form-field" style="margin-bottom:0; flex-grow: 1;">
                  <label for="web_message"><?= __('Հաղորդագրություն (Ամբողջական)') ?></label>
                  <textarea id="web_message" name="web_message" style="height: 100%; min-height: 80px;" required><?= htmlspecialchars((string)$config['web_message'], ENT_QUOTES) ?></textarea>
                </div>
              </div>

            </div>
          </div>

          <!-- RIGHT: Deploy settings & Checklist -->
          <div style="display:flex; flex-direction:column; gap:24px;">
            
            <div class="bento-card">
              <div class="bento-header" style="margin-bottom: 16px;">
                <h3><?= __('Տեղադրում (ZIP)') ?></h3>
                <p><?= __('Ֆայլերի փաթեթի կարգավորումներ') ?></p>
              </div>
              <div class="form-field">
                <label for="release_apply_mode"><?= __('Կիրառման տարբերակ') ?></label>
                <select id="release_apply_mode" name="release_apply_mode">
                  <option value="without_file"><?= __('Առանց ֆայլի (միայն տեքստեր)') ?></option>
                  <option value="with_file"><?= __('Ֆայլով (ZIP փաթեթ)') ?></option>
                </select>
              </div>
              <div class="form-field">
                <label for="server_package_mode"><?= __('Ռեժիմ') ?></label>
                <select id="server_package_mode" name="server_package_mode">
                  <?php foreach ($packageModes as $packageModeValue => $packageModeLabel): ?>
                    <option value="<?= htmlspecialchars($packageModeValue, ENT_QUOTES) ?>" <?= $packageMode === $packageModeValue ? 'selected' : '' ?>><?= htmlspecialchars($packageModeLabel, ENT_QUOTES) ?></option>
                  <?php endforeach; ?>
                </select>
              </div>
              <div class="form-field" style="margin-bottom:0;">
                <label for="server_package_file"><?= __('Ներբեռնել ZIP ֆայլ') ?></label>
                <input id="server_package_file" name="server_package_file" type="file" accept=".zip,application/zip" style="padding: 5px 8px; background: #f8fafc;">
              </div>
              <div id="packageModeHelper" class="compact-alert info" style="margin-top:12px; margin-bottom:0; display:none;"></div>
            </div>

            <div class="bento-card" style="background: rgba(248, 250, 255, 0.5); border: 1px solid #eef2ff; box-shadow: none;">
              <div class="bento-header" style="margin-bottom: 12px;">
                <h3><?= __('Ստուգում (Checklist)') ?></h3>
                <p><?= __('Անվտանգության քայլեր նախքան կիրառելը') ?></p>
              </div>
              <div class="timeline" style="margin-top: 0;">
                <div class="timeline-item" id="releaseCheckVersions" data-state="done">
                  <div class="timeline-head"><span class="timeline-title"><?= __('Տարբերակներ') ?></span></div>
                </div>
                <div class="timeline-item" id="releaseCheckMessages" data-state="done">
                  <div class="timeline-head"><span class="timeline-title"><?= __('Հաղորդագրություն') ?></span></div>
                </div>
                <div class="timeline-item" id="releaseCheckPackage" data-state="<?= !empty($config['server_package_file']) ? 'done' : 'warn' ?>">
                  <div class="timeline-head"><span class="timeline-title"><?= __('Փաթեթ') ?></span></div>
                  <div class="timeline-content" id="releaseCheckPackageText"><?= !empty($config['server_package_file']) ? 'Արդեն կա պահված փաթեթ։' : 'Սպասում է ընտրության։' ?></div>
                </div>
                <div class="timeline-item" id="releaseCheckMaintenance" data-state="<?= $isMaintenanceActive || $isScheduledActive ? 'warn' : 'done' ?>">
                  <div class="timeline-head"><span class="timeline-title"><?= __('Աշխատանքներ') ?></span></div>
                  <div class="timeline-content" id="releaseCheckMaintenanceText"><?= $isMaintenanceActive || $isScheduledActive ? 'Տեխ. աշխատանքները ակտիվ են։' : 'Խանգարող հանգամանքներ չկան։' ?></div>
                </div>
              </div>
              <div class="chips" style="margin-top:16px;">
                <div class="autosave-status chip" id="releaseAutosaveStatus" data-state="idle" style="width:100%;justify-content:center;"><?= __('Ավտոմատ պահպանում') ?></div>
              </div>
            </div>

          </div>
        </div>

          <div class="bento-split-even" id="maintenancePanel" data-admin-section="maintenance" data-admin-permission="maintenance">
            
            <div class="bento-card">
              <div class="bento-header">
                <h3><?= __('Տեխնիկական աշխատանքներ') ?></h3>
                <p><?= __('Անջատել հասանելիությունը կամ պլանավորել աշխատանքներ։') ?></p>
              </div>

              <div class="toggle-switch-wrapper">
                <div class="toggle-switch-info">
                  <h4><?= __('Panic Button (Անմիջապես միացնել)') ?></h4>
                  <p><?= __('Անկախ ժամերից, համակարգը կանցնի սպասարկման ռեժիմի։') ?></p>
                </div>
                <label class="toggle-switch" for="maintenance_enabled">
                  <input id="maintenance_enabled" name="maintenance_enabled" type="checkbox" <?= !empty($config['maintenance_enabled']) ? 'checked' : '' ?>>
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="form-field">
                <label for="maintenance_message"><?= __('Հաղորդագրություն այցելուների համար') ?></label>
                <textarea id="maintenance_message" name="maintenance_message" placeholder="<?= __('Կայքում ընթացքի մեջ են տեխնիկական աշխատանքներ...') ?>"><?= htmlspecialchars((string)$config['maintenance_message'], ENT_QUOTES) ?></textarea>
              </div>

              <div class="bento-grid cols-3" style="gap:8px; margin-bottom:8px;">
                <div class="form-field" style="grid-column: span 1;">
                  <label for="maintenance_start_at"><?= __('Սկիզբ') ?></label>
                  <input id="maintenance_start_at" name="maintenance_start_at" type="datetime-local" value="<?= htmlspecialchars(wp_version_format_datetime_local((string)$config['maintenance_start_at']), ENT_QUOTES) ?>" style="padding: 6px;">
                </div>
                <div class="form-field" style="grid-column: span 1;">
                  <label for="maintenance_end_at"><?= __('Ավարտ') ?></label>
                  <input id="maintenance_end_at" name="maintenance_end_at" type="datetime-local" value="<?= htmlspecialchars(wp_version_format_datetime_local((string)$config['maintenance_end_at']), ENT_QUOTES) ?>" style="padding: 6px;">
                </div>
                <div class="form-field" style="grid-column: span 1;">
                  <label><?= __('Արագ') ?></label>
                  <div style="display:flex; gap:4px; margin-top:2px;">
                    <button class="btn btn-icon" type="button" data-maintenance-hours="0.5" title="30ր">30m</button>
                    <button class="btn btn-icon" type="button" data-maintenance-hours="1" title="1ժ">1h</button>
                    <button class="btn btn-icon" type="button" id="resetMaintenanceBtn" title="Մաքրել">✕</button>
                  </div>
                </div>
              </div>

              <div class="form-field">
                <label for="maintenance_allowed_ips"><?= __('Whitelist (IP հասցեներ ստորակետով)') ?></label>
                <input id="maintenance_allowed_ips" name="maintenance_allowed_ips" type="text" placeholder="<?= __('192.168.1.1, 10.0.0.1') ?>" value="<?= htmlspecialchars((string)($config['maintenance_allowed_ips'] ?? ''), ENT_QUOTES) ?>">
              </div>
              
              <div class="bento-header" style="margin-top:24px;">
                <h3><?= __('Օպերացիոն համակարգերի սահմանափակում') ?></h3>
                <p><?= __('Ընտրեք այն հարթակները, որոնց համար մուտքը պետք է արգելափակվի։') ?></p>
              </div>
              
              <div class="bento-grid cols-2" style="gap:12px;">
                <?php 
                $platforms = ['ios' => 'iOS', 'android' => 'Android', 'windows' => 'Windows', 'macos' => 'macOS', 'linux' => 'Linux'];
                foreach ($platforms as $pk => $plabel): 
                  $isChecked = in_array($pk, $config['blocked_os_list'] ?? []);
                ?>
                <label class="toggle-switch-wrapper" style="padding:12px 16px;">
                  <div class="toggle-switch-info">
                    <h4 style="margin-bottom:2px;"><?= $plabel ?></h4>
                    <p style="font-size:11px; color:var(--muted);"><?= __('Արգելափակել մուտքը') ?></p>
                  </div>
                  <div class="toggle-switch">
                    <input type="checkbox" name="blocked_os_list[<?= $pk ?>]" value="<?= $pk ?>" class="blocked-os-input" <?= $isChecked ? 'checked' : '' ?>>
                    <span class="toggle-slider"></span>
                  </div>
                </label>
                <?php endforeach; ?>
              </div>
              <div class="chips" style="margin-top:12px">
                <div class="autosave-status chip" id="maintenanceAutosaveStatus" data-state="idle" style="width:100%;justify-content:center;"><?= __('Փոփոխությունները կպահպանվեն ավտոմատ') ?></div>
              </div>
            </div>

            <div class="bento-card" id="pageModesPanel" data-admin-section="maintenance" data-admin-permission="maintenance">
              <div class="bento-header">
                <h3><?= __('Էջերի Կառավարում (App / Web)') ?></h3>
                <p><?= __('Անջատել որոշակի էջեր, եթե կան խնդիրներ։') ?></p>
              </div>

              <div class="bento-split-even" style="gap: 16px; margin-bottom:0;">
                <div>
                  <div class="eyebrow"><?= __('Ծրագիր (PWA)') ?></div>
                  <input type="hidden" name="page_app_modes_present" value="1">
                  <?php foreach ($pageAppRegistry as $pageKey => $pageMeta): ?>
                    <?php $pageEnabled = !empty(($config['page_app_modes'] ?? [])[$pageKey]); ?>
                    <div class="form-field row" style="border-bottom: 1px solid #f1f5f9; padding-bottom:6px; margin-bottom:6px;" title="<?= htmlspecialchars((string)($pageMeta['description'] ?? ''), ENT_QUOTES) ?>">
                      <label style="font-size:12px; font-weight:600; text-transform:none; color:var(--text); cursor:help;"><?= htmlspecialchars((string)($pageMeta['label'] ?? $pageKey), ENT_QUOTES) ?></label>
                      <label class="toggle-switch mini">
                        <input type="checkbox" name="page_app_modes[<?= htmlspecialchars($pageKey, ENT_QUOTES) ?>]" value="1" <?= $pageEnabled ? 'checked' : '' ?>>
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                  <?php endforeach; ?>
                </div>

                <div>
                  <div class="eyebrow"><?= __('Կայք (Web)') ?></div>
                  <input type="hidden" name="page_web_modes_present" value="1">
                  <?php foreach ($pageWebRegistry as $pageKey => $pageMeta): ?>
                    <?php $pageEnabled = !empty(($config['page_web_modes'] ?? [])[$pageKey]); ?>
                    <div class="form-field row" style="border-bottom: 1px solid #f1f5f9; padding-bottom:6px; margin-bottom:6px;" title="<?= htmlspecialchars((string)($pageMeta['description'] ?? ''), ENT_QUOTES) ?>">
                      <label style="font-size:12px; font-weight:600; text-transform:none; color:var(--text); cursor:help;"><?= htmlspecialchars((string)($pageMeta['label'] ?? $pageKey), ENT_QUOTES) ?></label>
                      <label class="toggle-switch mini">
                        <input type="checkbox" name="page_web_modes[<?= htmlspecialchars($pageKey, ENT_QUOTES) ?>]" value="1" <?= $pageEnabled ? 'checked' : '' ?>>
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                  <?php endforeach; ?>
                </div>
              </div>

              <div class="chips" style="margin-top:12px">
                <div class="autosave-status chip" id="pageModesAutosaveStatus" data-state="idle" style="width:100%;justify-content:center;"><?= __('Փոփոխությունները կպահպանվեն ավտոմատ') ?></div>
              </div>
            </div>
          </div>

          <div class="bento-grid cols-3" id="accessOverviewPanel" data-admin-section="access all" data-admin-permission="access" style="gap:16px;">
            <div class="bento-card" style="padding:20px;">
              <span style="display:block; color:var(--muted); font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:8px;"><?= __('Ընթացիկ հասանելիություն') ?></span>
              <p style="font-size:13px; color:var(--text); line-height:1.4; margin:0 0 12px;"><?= $accessMode === 'modern' ? 'Հիմա աշխատում է դերային մուտքը։ Այսինքն հաշվի են առնվում օգտատիրոջ դերը և ադմին նշանը։' : 'Հիմա աշխատում է whitelist մուտքը։ Որոշողը պահված email-ների ցանկն է։' ?></p>
              <div class="chips">
                <div class="chip <?= $accessMode === 'modern' ? 'primary' : 'warning' ?>"><?= $accessMode === 'modern' ? 'Դերային մուտք' : 'Email whitelist' ?></div>
                <div class="chip"><?= __('Whitelist') ?> <?= (int)$adminEmailCount ?></div>
              </div>
            </div>

            <div class="bento-card" style="padding:20px;">
              <span style="display:block; color:var(--muted); font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:8px;"><?= __('Ով է հիմա ներսում') ?></span>
              <p style="font-size:13px; color:var(--text); line-height:1.4; margin:0 0 12px;"><?= __('Կոնկրետ որ օգտատիրոջ հաշվով ես աշխատում ադմին վահանակում այս պահին։') ?></p>
              <div class="chips">
                <div class="chip primary"><?= htmlspecialchars((string)($adminUser['name'] ?? 'Օգտատեր'), ENT_QUOTES) ?></div>
                <?php if (!empty($adminUser['email'])): ?>
                  <div class="chip"><?= htmlspecialchars((string)$adminUser['email'], ENT_QUOTES) ?></div>
                <?php endif; ?>
              </div>
            </div>

            <div class="bento-card" style="padding:20px;">
              <span style="display:block; color:var(--muted); font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:8px;"><?= __('Ներքին խորհուրդ') ?></span>
              <p style="font-size:13px; color:var(--text); line-height:1.4; margin:0 0 12px;"><?= __('Եթե օգտատերերի դերերը արդեն ճիշտ են, թող whitelist-ը պահես հնարավորինս փոքր՝ անվտանգության համար։') ?></p>
              <div class="chips">
                <div class="chip success"><?= __('Փոքր ռիսկ') ?></div>
              </div>
            </div>
          </div>

          <div class="bento-split-even" style="margin-top:24px; gap:24px;">
            <div class="bento-card" id="accessPanel" data-admin-section="access all" data-admin-permission="access">
              <div class="bento-header" style="margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h3 style="margin:0;"><?= __('Admin մուտքեր (Whitelist)') ?></h3>
                    <p style="margin:4px 0 0; font-size:13px; color:var(--muted);"><?= __('Մեկ email ամեն տողում։') ?></p>
                  </div>
                  <div class="chip" id="accessDraftAutosaveStatus" data-state="idle" style="font-size:11px;"><?= __('Ավտոմատ պահպանում') ?></div>
                </div>
              </div>
              <div class="form-field" style="margin:0;">
                <textarea class="input-field" id="admin_emails" name="admin_emails" style="min-height:120px; font-family:monospace; padding:12px; font-size:13px;"><?= htmlspecialchars($adminEmailsText, ENT_QUOTES) ?></textarea>
              </div>
            </div>

            <div class="bento-card" data-admin-section="access all" data-admin-permission="access">
              <div class="bento-header" style="margin-bottom:12px;">
                <h3 style="margin:0;"><?= __('Ներքին նշումներ') ?></h3>
                <p style="margin:4px 0 0; font-size:13px; color:var(--muted);"><?= __('Այս նշումը կերևա պատմության մեջ։') ?></p>
              </div>
              <div class="form-field" style="margin:0;">
                <textarea class="input-field" id="meta_note" name="meta_note" style="min-height:120px; padding:12px; font-size:13px;"><?= htmlspecialchars((string)$config['meta_note'], ENT_QUOTES) ?></textarea>
              </div>
            </div>
          </div>

          <div class="bento-card" id="accessPermissionsPanel" data-admin-section="access all" data-admin-permission="access" style="margin-top:24px;">
            <div class="bento-header">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                <div style="flex:1;">
                  <h3 style="margin:0;"><?= __('Բաժինների թույլտվություններ') ?></h3>
                  <p style="margin:4px 0 0; font-size:13px; color:var(--muted);"><?= __('Սահմանիր, թե որ email-ը ադմինի որ բաժիններն է տեսնելու։ Եթե email-ը այստեղ չկա, կունենա լիարժեք հասանելիություն։') ?></p>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                  <div class="chip" id="permissionAutosaveStatus" data-state="idle" style="font-size:11px;"><?= __('Ավտոմատ պահպանում') ?></div>
                  <button class="btn btn-primary" id="addPermissionRowBtn" type="button" style="padding:6px 16px; font-size:13px; border-radius:8px;"><?= __('+ Ավելացնել օգտատեր') ?></button>
                </div>
              </div>
            </div>

            <div class="permission-list" id="permissionList" style="margin-top:16px; display:flex; flex-direction:column; gap:12px;">
              <input type="hidden" name="admin_permission_rows_present" value="1">
              <?php foreach ($adminPermissionRows as $index => $row): ?>
                <div class="bento-card" data-permission-row style="padding:16px; background:#f8fafc; border-radius:12px; box-shadow:none;">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:12px;">
                    <div class="form-field" style="margin:0; flex:1; max-width:300px;">
                      <input class="input-field" type="email" name="admin_permission_rows[<?= (int)$index ?>][email]" value="<?= htmlspecialchars((string)$row['email'], ENT_QUOTES) ?>" placeholder="admin@example.com" style="padding:8px;">
                    </div>
                    <button class="btn btn-ghost danger" type="button" data-remove-permission-row style="padding:4px 8px; font-size:12px;"><?= __('Հեռացնել') ?></button>
                  </div>
                  <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:12px;">
                    <?php foreach ($adminSectionRegistry as $sectionKey => $sectionMeta): ?>
                      <label class="permission-check" style="margin:0; background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="admin_permission_rows[<?= (int)$index ?>][sections][<?= htmlspecialchars($sectionKey, ENT_QUOTES) ?>]" value="1" <?= !empty($row['permissions'][$sectionKey]) ? 'checked' : '' ?>>
                        <span style="font-size:13px; color:var(--text);">
                          <strong><?= htmlspecialchars((string)($sectionMeta['label'] ?? $sectionKey), ENT_QUOTES) ?></strong>
                        </span>
                      </label>
                    <?php endforeach; ?>
                  </div>
                </div>
              <?php endforeach; ?>
            </div>
          </div>

          <div class="bento-split-even" id="socialAuthPanel" data-admin-section="access all" data-admin-permission="access" style="margin-top:24px; gap:24px;">
            <div class="bento-card" style="padding:24px; display:flex; flex-direction:column; justify-content:center;">
              <h3 style="margin:0 0 12px;"><?= __('Google մուտք (Social Auth)') ?></h3>
              <p style="font-size:13px; color:var(--muted); line-height:1.5; margin:0 0 16px;"><?= __('Client ID-ն և Redirect URI-ն պահվում են ընդհանուր կարգավորումներում, իսկ Secret-ը՝ անվտանգ պահոցում։') ?></p>
              
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="background:#f8fafc; padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:13px; font-weight:600; color:var(--muted);"><?= __('Client ID') ?></span>
                  <div class="chip <?= $config['social_auth_google_client_id'] !== '' ? 'success' : 'warning' ?>"><?= htmlspecialchars((string)($config['social_auth_google_client_id'] !== '' ? 'Պատրաստ է' : 'Բացակայում է'), ENT_QUOTES) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:13px; font-weight:600; color:var(--muted);"><?= __('Client Secret') ?></span>
                  <div class="chip <?= strpos($googleClientSecretStatus, 'ԲԱՑԱԿԱՅՈՒՄ') === false ? 'success' : 'warning' ?>"><?= htmlspecialchars($googleClientSecretStatus, ENT_QUOTES) ?></div>
                </div>
              </div>
            </div>

            <div class="bento-card" style="padding:24px;">
              <div class="form-field">
                <label for="social_auth_google_client_id" style="font-size:12px;"><?= __('Client ID') ?></label>
                <input class="input-field" id="social_auth_google_client_id" name="social_auth_google_client_id" value="<?= htmlspecialchars((string)($config['social_auth_google_client_id'] ?? ''), ENT_QUOTES) ?>" placeholder="<?= __('Google client id') ?>" style="padding:8px;">
              </div>
              <div class="form-field">
                <label for="social_auth_google_client_secret" style="font-size:12px;"><?= __('Client Secret (Նոր)') ?></label>
                <input class="input-field" id="social_auth_google_client_secret" name="social_auth_google_client_secret" type="password" value="" placeholder="<?= __('Լրացրեք նոր բանալին պահպանելու համար') ?>" style="padding:8px;">
              </div>
              <div class="form-field">
                <label for="social_auth_google_redirect_uri" style="font-size:12px;"><?= __('Redirect URI') ?></label>
                <input class="input-field" id="social_auth_google_redirect_uri" name="social_auth_google_redirect_uri" value="<?= htmlspecialchars((string)($config['social_auth_google_redirect_uri'] ?? ''), ENT_QUOTES) ?>" placeholder="<?= __('Դատարկ թողնելու դեպքում կկազմվի ավտոմատ') ?>" style="padding:8px;">
              </div>
              
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
                <label class="permission-check" style="margin:0; font-size:12px;">
                  <input type="checkbox" name="social_auth_google_client_secret_clear" value="1">
                  <span><?= __('Մաքրել Secret-ը') ?></span>
                </label>
                <button class="btn btn-primary" type="submit" name="form_action" value="save_access" style="padding:8px 16px; font-size:13px; border-radius:8px;"><?= __('Պահպանել Secret-ը') ?></button>
              </div>
            </div>
          </div>

          <div class="sticky-actions" id="releaseActionPanel" data-admin-section="release" data-admin-permission="release">
            <span style="font-size: 13px; color: var(--muted); margin-right: auto; padding-left: 8px;"><?= __('Ընտրիր կիրառման տարբերակը և սեղմիր հիմնական կոճակը։') ?></span>
            <button class="btn btn-primary" type="submit" name="form_action" value="apply_release" style="padding: 14px 24px; font-size: 15px; font-weight: 800; border-radius: 12px; box-shadow: 0 4px 15px rgba(67, 24, 255, 0.25);"><?= __('Կիրառել թարմացումը') ?></button>
          </div>
        </div>
      </form>

      <div class="stack" data-section-container>
        <div class="stack">
          <div class="bento-card" id="moderationPanel" data-admin-section="moderation all" data-admin-permission="moderation">
            <div class="bento-header">
              <h3 style="margin:0 0 4px;"><?= __('Երգերի մոդերացիայի հերթ') ?></h3>
              <p style="margin:0; font-size:13px; color:var(--muted);"><?= __('Այս բաժնում երևում են օգտատերերի ուղարկած նոր երգերի և խմբագրման բոլոր հարցումները։ Հաստատելուց հետո տվյալները անմիջապես կկիրառվեն երգերի բազայում։') ?></p>
            </div>

            <div class="bento-grid cols-4" style="gap:12px; margin-top:16px;">
              <div class="bento-card" style="padding:16px; text-align:center;">
                <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Սպասման մեջ') ?></span>
                <strong style="font-size:24px; color:var(--warning);"><?= (int)($moderationCounts['pending'] ?? 0) ?></strong>
              </div>
              <div class="bento-card" style="padding:16px; text-align:center;">
                <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Հաստատված') ?></span>
                <strong style="font-size:24px; color:var(--success);"><?= (int)($moderationCounts['approved'] ?? 0) ?></strong>
              </div>
              <div class="bento-card" style="padding:16px; text-align:center;">
                <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Մերժված') ?></span>
                <strong style="font-size:24px; color:var(--danger);"><?= (int)($moderationCounts['rejected'] ?? 0) ?></strong>
              </div>
              <div class="bento-card" style="padding:16px; text-align:center;">
                <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Ընդհանուր') ?></span>
                <strong style="font-size:24px; color:var(--primary);"><?= (int)($moderationCounts['all'] ?? 0) ?></strong>
              </div>
            </div>

            <form method="get" style="margin-top:24px; padding:16px; background:#f8fafc; border-radius:12px; border:1px solid var(--border);" data-moderation-filter-form="1">
              <div class="bento-grid cols-3" style="gap:12px; align-items:end;">
                <div class="form-field" style="margin:0;">
                  <label for="moderation_status" style="font-size:12px;"><?= __('Վիճակ') ?></label>
                  <select class="input-field" id="moderation_status" name="moderation_status" style="padding:8px;">
                    <option value="pending" <?= $moderationFilters['status'] === 'pending' ? 'selected' : '' ?>><?= __('Միայն սպասման մեջ') ?></option>
                    <option value="approved" <?= $moderationFilters['status'] === 'approved' ? 'selected' : '' ?>><?= __('Միայն հաստատված') ?></option>
                    <option value="rejected" <?= $moderationFilters['status'] === 'rejected' ? 'selected' : '' ?>><?= __('Միայն մերժված') ?></option>
                    <option value="all" <?= $moderationFilters['status'] === 'all' ? 'selected' : '' ?>><?= __('Բոլորը') ?></option>
                  </select>
                </div>
                <div class="form-field" style="margin:0;">
                  <label for="moderation_search" style="font-size:12px;"><?= __('Որոնում') ?></label>
                  <input class="input-field" id="moderation_search" name="moderation_search" value="<?= htmlspecialchars($moderationFilters['search'], ENT_QUOTES) ?>" placeholder="<?= __('Վերնագիր, հեղինակ կամ email') ?>" style="padding:8px;">
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-primary" type="submit" style="padding:8px 16px; flex:1;"><?= __('Զտել') ?></button>
                  <a class="btn" href="/admin_updates.php" data-moderation-clear-filters="1" style="padding:8px 16px; flex:1; text-align:center;"><?= __('Մաքրել') ?></a>
                </div>
              </div>
            </form>

            <?php if (!$moderationRequests): ?>
              <div class="history-item" style="margin-top:16px">
                <div class="history-title"><?= __('Հարցումներ չեն գտնվել') ?></div>
                <div class="note"><?= __('Ընթացիկ զտման պայմաններով մոդերացիայի հերթում գրառում չկա։') ?></div>
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
                  <article class="bento-card" style="padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.05); border:1px solid var(--border);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                      <div>
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                          <div class="chip <?= $requestStatus === 'approved' ? 'success' : ($requestStatus === 'rejected' ? 'danger' : 'warning') ?>"><?= htmlspecialchars(wp_song_request_status_label($requestStatus), ENT_QUOTES) ?></div>
                          <div class="chip" style="background:#f1f5f9; border:none;"><?= htmlspecialchars(wp_song_request_type_label($requestType), ENT_QUOTES) ?></div>
                          <span style="font-size:12px; color:var(--muted);"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($request['created_at'] ?? '')) ?: '—', ENT_QUOTES) ?></span>
                        </div>
                        <h4 style="margin:0; font-size:18px; color:var(--text);"><?= htmlspecialchars($requestTitleValue !== '' ? $requestTitleValue : 'Անվերնագիր հարցում', ENT_QUOTES) ?></h4>
                        <div style="font-size:13px; color:var(--muted); margin-top:4px;">
                          <?= __('Առաջարկող:') ?> <strong><?= htmlspecialchars((string)($request['submitted_by_name'] ?: $request['submitted_by_email'] ?: 'Անանուն'), ENT_QUOTES) ?></strong>
                          <?php if (!empty($request['submitted_by_email'])): ?>
                            <span style="color:var(--primary);">(<?= htmlspecialchars((string)$request['submitted_by_email'], ENT_QUOTES) ?>)</span>
                          <?php endif; ?>
                        </div>
                      </div>
                      <?php if (!empty($request['song_id'])): ?>
                        <div class="chip" style="background:var(--primary); color:#fff; border:none;">Song #<?= (int)$request['song_id'] ?></div>
                      <?php endif; ?>
                    </div>

                    <?php if ($requestMessageValue !== ''): ?>
                      <div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:12px; border-radius:4px; font-size:13px; margin-bottom:16px;">
                        <strong><?= __('Մեկնաբանություն:') ?></strong> <?= htmlspecialchars($requestMessageValue, ENT_QUOTES) ?>
                      </div>
                    <?php endif; ?>

                    <?php if ($requestType === 'edit' && $requestChanges): ?>
                      <div style="font-size:13px; font-weight:600; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:4px;"><?= __('Խմբագրման տարբերությունները') ?> (<?= count($requestChanges) ?>)</div>
                      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
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
                          <div style="background:#fff; border:1px solid var(--border); border-radius:8px; overflow:hidden;">
                            <div style="background:#f8fafc; padding:8px 12px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                              <strong style="font-size:13px;"><?= htmlspecialchars($changeLabel, ENT_QUOTES) ?></strong>
                              <span style="font-size:11px; padding:2px 6px; border-radius:4px; background:<?= $changeKind === 'added' ? '#dcfce7' : ($changeKind === 'removed' ? '#fee2e2' : '#fef9c3') ?>; color:<?= $changeKind === 'added' ? '#166534' : ($changeKind === 'removed' ? '#991b1b' : '#854d0e') ?>;"><?= htmlspecialchars($changeKindLabel, ENT_QUOTES) ?></span>
                            </div>
                            <div class="bento-split-even" style="gap:0; grid-template-columns:1fr 1fr;">
                              <div style="padding:12px; border-right:1px solid var(--border); background:#fff5f5;">
                                <div style="font-size:11px; color:#991b1b; font-weight:600; text-transform:uppercase; margin-bottom:4px;"><?= __('Ընթացիկ (Հին)') ?></div>
                                <?php if ($isLongChange): ?>
                                  <pre style="margin:0; font-size:12px; white-space:pre-wrap; word-break:break-word; max-height:150px; overflow-y:auto;"><?= htmlspecialchars($beforeValue, ENT_QUOTES) ?></pre>
                                <?php else: ?>
                                  <div style="font-size:13px; word-break:break-word;"><?= htmlspecialchars($beforeValue, ENT_QUOTES) ?></div>
                                <?php endif; ?>
                              </div>
                              <div style="padding:12px; background:#f0fdf4;">
                                <div style="font-size:11px; color:#166534; font-weight:600; text-transform:uppercase; margin-bottom:4px;"><?= __('Առաջարկված (Նոր)') ?></div>
                                <?php if ($isLongChange): ?>
                                  <pre style="margin:0; font-size:12px; white-space:pre-wrap; word-break:break-word; max-height:150px; overflow-y:auto;"><?= htmlspecialchars($afterValue, ENT_QUOTES) ?></pre>
                                <?php else: ?>
                                  <div style="font-size:13px; word-break:break-word;"><?= htmlspecialchars($afterValue, ENT_QUOTES) ?></div>
                                <?php endif; ?>
                              </div>
                            </div>
                          </div>
                        <?php endforeach; ?>
                      </div>
                    <?php endif; ?>

                    <?php if ($requestType === 'new'): ?>
                      <div style="font-size:13px; font-weight:600; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:4px;"><?= __('Նոր Երգի Տվյալներ') ?></div>
                      <div class="bento-grid cols-2" style="gap:16px; margin-bottom:16px; background:#f8fafc; padding:16px; border-radius:8px; border:1px solid var(--border);">
                        <div>
                          <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-bottom:4px;"><?= __('Մետատվյալներ') ?></div>
                          <ul style="margin:0; padding:0; list-style:none; font-size:13px; display:flex; flex-direction:column; gap:4px;">
                            <li><strong>HY:</strong> <?= htmlspecialchars((string)($request['title_hy'] ?? ''), ENT_QUOTES) ?: '—' ?></li>
                            <li><strong>EN:</strong> <?= htmlspecialchars((string)($request['title_en'] ?? ''), ENT_QUOTES) ?: '—' ?></li>
                            <li><strong>RU:</strong> <?= htmlspecialchars((string)($request['title_ru'] ?? ''), ENT_QUOTES) ?: '—' ?></li>
                            <li><strong>Հեղինակ:</strong> <?= htmlspecialchars($requestArtistValue !== '' ? $requestArtistValue : '—', ENT_QUOTES) ?></li>
                            <li><strong>Տոնայնություն:</strong> <?= htmlspecialchars($requestKeyValue !== '' ? $requestKeyValue : '—', ENT_QUOTES) ?></li>
                            <li><strong>BPM:</strong> <?= $requestBpmValue > 0 ? (int)$requestBpmValue : '—' ?></li>
                            <li><strong>Տեգեր:</strong> <?= htmlspecialchars($requestTagsValue !== '' ? $requestTagsValue : '—', ENT_QUOTES) ?></li>
                          </ul>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                          <?php if (!empty($request['chords'])): ?>
                            <div>
                              <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-bottom:4px;"><?= __('Ակորդներ') ?></div>
                              <pre style="margin:0; padding:8px; background:#fff; border:1px solid var(--border); border-radius:4px; font-size:11px; max-height:100px; overflow-y:auto;"><?= htmlspecialchars((string)$request['chords'], ENT_QUOTES) ?></pre>
                            </div>
                          <?php endif; ?>
                          <?php if (!empty($request['lyrics'])): ?>
                            <div>
                              <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-bottom:4px;"><?= __('Բառեր') ?></div>
                              <pre style="margin:0; padding:8px; background:#fff; border:1px solid var(--border); border-radius:4px; font-size:11px; max-height:100px; overflow-y:auto;"><?= htmlspecialchars((string)$request['lyrics'], ENT_QUOTES) ?></pre>
                            </div>
                          <?php endif; ?>
                        </div>
                      </div>
                    <?php endif; ?>

                    <?php if ($requestStatus === 'pending'): ?>
                      <div style="border-top:1px solid var(--border); padding-top:16px; margin-top:16px;">
                        <form method="post" data-moderation-decision-form="1" style="margin:0; display:flex; flex-direction:column; gap:12px;">
                          <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                          <input type="hidden" name="song_request_id" value="<?= $requestId ?>">
                          <div class="form-field" style="margin:0;">
                            <label for="song_request_review_note_<?= $requestId ?>" style="font-size:12px;"><?= __('Ադմինի նշում (պարտադիր չէ)') ?></label>
                            <input class="input-field" id="song_request_review_note_<?= $requestId ?>" name="song_request_review_note" placeholder="<?= __('Օր. շատ լավ հավելում է...') ?>" style="padding:8px;">
                          </div>
                          <div style="display:flex; gap:12px; justify-content:flex-end;">
                            <button class="btn danger" type="submit" name="form_action" value="reject_song_request" style="padding:8px 16px;"><?= __('Մերժել') ?></button>
                            <button class="btn btn-primary success" type="submit" name="form_action" value="approve_song_request" style="padding:8px 24px; background:var(--success); border-color:var(--success);"><?= __('Հաստատել և Պահպանել') ?></button>
                          </div>
                        </form>
                      </div>
                    <?php else: ?>
                      <div style="border-top:1px solid var(--border); padding-top:16px; margin-top:16px; font-size:13px;">
                        <strong><?= __('Որոշում:') ?></strong> 
                        <span style="color:<?= $requestStatus === 'approved' ? 'var(--success)' : 'var(--danger)' ?>;"><?= htmlspecialchars((string)($request['review_note'] ?? 'Առանց նշումի'), ENT_QUOTES) ?></span>
                        <div style="color:var(--muted); margin-top:4px; font-size:12px;">
                          <?= __('Ադմին՝') ?> <?= htmlspecialchars((string)($request['reviewed_by_name'] ?? 'admin'), ENT_QUOTES) ?> • <?= htmlspecialchars(wp_version_format_datetime_admin((string)($request['reviewed_at'] ?? '')) ?: '—', ENT_QUOTES) ?>
                        </div>
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
          <div class="bento-card" id="translationFilterPanel" data-admin-section="translations all" data-admin-permission="translations" style="margin-bottom:24px;">
            <div class="bento-header" style="margin-bottom:16px;">
              <h3 style="margin:0 0 4px;"><?= __('Թարգմանությունների դիտում և զտում') ?></h3>
              <p style="margin:0; font-size:13px; color:var(--muted);"><?= __('Այստեղ կարող ես տեսնել cache եղած թարգմանությունները, զտել ըստ լեզվի և գտնել կոնկրետ աղբյուր տեքստը կամ արդեն թարգմանված տարբերակը։') ?></p>
            </div>
            <form method="get" class="bento-grid cols-3" style="gap:12px; align-items:end; background:#f8fafc; padding:16px; border-radius:12px; border:1px solid var(--border);">
              <div class="form-field" style="margin:0;">
                <label for="translation_lang" style="font-size:12px;"><?= __('Լեզու') ?></label>
                <select class="input-field" id="translation_lang" name="translation_lang" style="padding:8px;">
                  <option value="all" <?= $translationFilters['lang'] === 'all' ? 'selected' : '' ?>><?= __('Բոլորը') ?></option>
                  <option value="ru" <?= $translationFilters['lang'] === 'ru' ? 'selected' : '' ?>><?= __('Ռուսերեն') ?></option>
                  <option value="en" <?= $translationFilters['lang'] === 'en' ? 'selected' : '' ?>><?= __('Անգլերեն') ?></option>
                </select>
              </div>
              <div class="form-field" style="margin:0;">
                <label for="translation_search" style="font-size:12px;"><?= __('Որոնում') ?></label>
                <input class="input-field" id="translation_search" name="translation_search" value="<?= htmlspecialchars($translationFilters['search'], ENT_QUOTES) ?>" placeholder="<?= __('Աղբյուր, թարգմանություն կամ context') ?>" style="padding:8px;">
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-primary" type="submit" style="padding:8px 16px; flex:1;"><?= __('Զտել') ?></button>
                <a class="btn" href="/admin_updates.php" style="padding:8px 16px; flex:1; text-align:center;"><?= __('Մաքրել') ?></a>
              </div>
            </form>
          </div>

        <form method="post" id="translationControlForm">
          <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">

          <div class="bento-grid cols-3" data-admin-section="translations all" data-admin-permission="translations" style="gap:16px; margin-bottom:24px;">
            <div class="bento-card" style="padding:16px; text-align:center;">
              <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Թարգմանության աշխատակարգ') ?></span>
              <strong style="font-size:24px; color:var(--primary);"><?= __('ՁԵՌՔՈՎ') ?></strong>
            </div>
            <div class="bento-card" style="padding:16px; text-align:center;">
              <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Ընթացիկ ռեժիմ') ?></span>
              <strong style="font-size:24px; color:var(--text);"><?= htmlspecialchars((string)($translationSettings['mode'] ?? 'manual'), ENT_QUOTES) ?></strong>
            </div>
            <div class="bento-card" style="padding:16px; text-align:center;">
              <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Թարգմանված գրառումներ') ?></span>
              <strong style="font-size:24px; color:var(--text);"><?= (int)($translationCacheStats['all'] ?? 0) ?></strong>
            </div>
          </div>

          <div class="bento-card" id="translationSettingsPanel" data-admin-section="translations all" data-admin-permission="translations" style="margin-bottom:24px;">
            <div class="bento-header" style="margin-bottom:16px;">
              <h3 style="margin:0 0 4px;"><?= __('Երգ ընտրել և վերնագիրը թարգմանել') ?></h3>
              <p style="margin:0; font-size:13px; color:var(--muted);"><?= __('Ընտրիր երգը ցանկից, և նույն տեղում լրացրու ռուսերեն ու անգլերեն վերնագրերը։ Եթե տվյալ լեզվի թարգմանությունը արդեն կա, դաշտը կլրացվի ավտոմատ։') ?></p>
            </div>

            <div class="bento-split-even" style="gap:16px; margin-bottom:16px;">
              <div class="form-field" style="margin:0;">
                <label for="translation_song_id" style="font-size:12px;"><?= __('Երգը ցանկից') ?></label>
                <select class="input-field" id="translation_song_id" name="translation_song_id" style="padding:8px;">
                  <option value=""><?= __('Ընտրիր երգը') ?></option>
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
              <div class="form-field" style="margin:0;">
                <label for="translation_song_source_preview" style="font-size:12px;"><?= __('Հայերեն վերնագիր') ?></label>
                <input class="input-field" id="translation_song_source_preview" type="text" value="" placeholder="<?= __('Ընտրելուց հետո այստեղ կերևա վերնագիրը') ?>" style="padding:8px;" readonly>
              </div>
            </div>

            <div class="bento-split-even" style="gap:16px; margin-bottom:16px;">
              <div class="form-field" style="margin:0;">
                <label for="translation_song_lat" style="font-size:12px;"><?= __('Հայերեն լատինատառ') ?></label>
                <textarea class="input-field" id="translation_song_lat" name="translation_song_lat" rows="2" placeholder="<?= __('Օր. Egiptos') ?>" style="padding:8px;"></textarea>
              </div>
              <div class="form-field" style="margin:0;">
                <label for="translation_song_ru" style="font-size:12px;"><?= __('Ռուսերեն վերնագիր') ?></label>
                <textarea class="input-field" id="translation_song_ru" name="translation_song_ru" rows="2" placeholder="<?= __('Ռուսերեն տարբերակ') ?>" style="padding:8px;"></textarea>
              </div>
            </div>

            <div class="bento-split-even" style="gap:16px; margin-bottom:16px;">
              <div class="form-field" style="margin:0;">
                <label for="translation_song_en" style="font-size:12px;"><?= __('Անգլերեն վերնագիր') ?></label>
                <textarea class="input-field" id="translation_song_en" name="translation_song_en" rows="2" placeholder="<?= __('Անգլերեն տարբերակ') ?>" style="padding:8px;"></textarea>
              </div>
              <div style="display:flex; align-items:flex-end;">
                <button class="btn btn-primary" type="submit" name="form_action" value="save_song_title_translations" style="padding:8px 24px; width:100%;"><?= __('Պահպանել թարգմանությունները') ?></button>
              </div>
            </div>

            <div class="access-helper" style="margin:0;"><?= __('Պահպանումը գրում է ընտրված երգի վերնագրի թարգմանությունը, և այն կաշխատի նաև երգերի ցանկում ու երգի դիտման էջում։') ?></div>
          </div>

          <div class="bento-card" id="translationCachePanel" data-admin-section="translations all" data-admin-permission="translations">
            <div class="bento-header" style="margin-bottom:16px;">
              <h3 style="margin:0 0 4px;"><?= __('Թարգմանված գրառումների կառավարում') ?></h3>
              <p style="margin:0; font-size:13px; color:var(--muted);"><?= __('Սա պահված թարգմանությունների ցանկն է։ Կարող ես ձեռքով ուղղել թարգմանված տարբերակը կամ ջնջել այն։') ?></p>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px; padding:12px; background:#f8fafc; border-radius:8px;">
              <div class="chips" style="margin:0;">
                <div class="chip"><?= __('Ընդամենը') ?> <?= (int)($translationCacheStats['all'] ?? 0) ?></div>
                <div class="chip"><?= __('Ռուսերեն') ?> <?= (int)($translationCacheStats['ru'] ?? 0) ?></div>
                <div class="chip"><?= __('Անգլերեն') ?> <?= (int)($translationCacheStats['en'] ?? 0) ?></div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-ghost" type="button" data-translation-clear-cache="ru" style="padding:4px 8px; font-size:12px;"><?= __('Մաքրել RU') ?></button>
                <button class="btn btn-ghost" type="button" data-translation-clear-cache="en" style="padding:4px 8px; font-size:12px;"><?= __('Մաքրել EN') ?></button>
                <button class="btn btn-ghost danger" type="button" data-translation-clear-cache="all" style="padding:4px 8px; font-size:12px;"><?= __('Մաքրել Ամբողջը') ?></button>
              </div>
            </div>

            <div class="autosave-status" id="translationActionStatus" data-state="idle" style="margin-bottom:16px;"><?= __('Պատրաստ է կառավարման համար') ?></div>

            <?php if (!$translationEntries): ?>
              <div style="padding:32px; text-align:center; color:var(--muted); background:#f8fafc; border-radius:12px;">
                <?= __('Ընթացիկ զտման պայմաններով cache-ում թարգմանված գրառում չի գտնվել։') ?>
              </div>
            <?php else: ?>
              <div style="display:flex; flex-direction:column; gap:16px;">
                <?php foreach ($translationEntries as $entry): ?>
                  <article class="bento-card" data-translation-entry style="padding:16px; border:1px solid var(--border); box-shadow:none;">
                    <input type="hidden" data-translation-lang value="<?= htmlspecialchars((string)$entry['lang'], ENT_QUOTES) ?>">
                    <input type="hidden" data-translation-context value="<?= htmlspecialchars((string)$entry['context'], ENT_QUOTES) ?>">
                    <textarea class="input-field" data-translation-source hidden><?= htmlspecialchars((string)$entry['source'], ENT_QUOTES) ?></textarea>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border);">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="chip" style="background:#e0f2fe; color:#0369a1; border:none; font-weight:600;"><?= htmlspecialchars(wp_admin_updates_translation_lang_label((string)$entry['lang']), ENT_QUOTES) ?></span>
                        <span style="font-size:12px; color:var(--muted);"><?= htmlspecialchars((string)$entry['context'], ENT_QUOTES) ?></span>
                      </div>
                      <div class="autosave-status" data-translation-entry-status data-state="idle" style="font-size:11px;"><?= __('Պատրաստ է խմբագրման') ?></div>
                    </div>

                    <div class="bento-split-even" style="gap:16px; margin-bottom:12px;">
                      <div class="form-field" style="margin:0;">
                        <label style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-bottom:4px;"><?= __('Աղբյուր (HY)') ?></label>
                        <div style="padding:12px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; font-size:13px; line-height:1.5; min-height:80px;">
                          <?= nl2br(htmlspecialchars((string)$entry['source'], ENT_QUOTES)) ?>
                        </div>
                      </div>

                      <div class="form-field" style="margin:0;">
                        <label style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-bottom:4px;"><?= __('Թարգմանություն') ?></label>
                        <textarea class="input-field" data-translation-text style="min-height:80px; padding:12px; font-size:13px; line-height:1.5; border-color:#cbd5e1;"><?= htmlspecialchars((string)$entry['text'], ENT_QUOTES) ?></textarea>
                      </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                      <button class="btn btn-ghost danger" type="button" data-translation-delete-entry style="padding:6px 12px; font-size:12px;"><?= __('Ջնջել') ?></button>
                      <button class="btn btn-primary" type="button" data-translation-save-entry style="padding:6px 16px; font-size:12px;"><?= __('Պահպանել') ?></button>
                    </div>
                  </article>
                <?php endforeach; ?>
              </div>
            <?php endif; ?>
          </div>
        </form>
      </div>

      <form method="post" class="stack" data-section-container>
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
        <div class="stats" data-admin-section="push devices all" data-admin-permission="push,devices">
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= __('Push ծանուցումների վիճակ') ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= !empty($pushConfig['enabled']) ? 'ՄԻԱՑՎԱԾ' : 'ԱՆՋԱՏՎԱԾ' ?></strong>
              </div>
              
            </div>
            
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= __('Ծրագրի ընդհանուր ճանաչված տեղադրումներ') ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($installStats['main']['known_count'] ?? 0) ?></strong>
              </div>
              
            </div>
            
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= __('Վերջին') ?> <?= (int)($installStats['window_days'] ?? 60) ?> <?= __('օրում ակտիվ երևացած սարքեր') ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($installStats['main']['count'] ?? 0) ?></strong>
              </div>
              
            </div>
            
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= __('Push միացրած սարքեր') ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= (int)($pushStats['subscriptions'] ?? 0) ?></strong>
              </div>
              
            </div>
            
          </div>
          
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;"><?= __('Վերջին ուղարկումը') ?></span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;"><?= htmlspecialchars($pushLastSentAt ?: '—', ENT_QUOTES) ?></strong>
              </div>
              
            </div>
            
          </div>
        </div>

        <div class="bento-card" data-admin-section="push all" data-admin-permission="push" style="margin-bottom: 16px;">
          <div class="bento-header">
            <h3><?= __('Push ծանուցումներ') ?></h3>
            <p><?= __('Այս բաժնից կարող եք միացնել browser/app push ծանուցումները:') ?></p>
          </div>
          
          <div class="toggle-switch-wrapper" style="margin-bottom: 16px;">
            <div class="toggle-switch-info">
              <h4><?= __('Միացնել push ծանուցումները') ?></h4>
              <p><?= !empty($pushConfig['supported']) ? 'Եթե սա ակտիվ է, կայքի և ծրագրի user-ները կարող են բաժանորդագրվել push ծանուցումներին։' : 'Սերվերի վրա OpenSSL աջակցություն չկա, դրա համար push notifications-ը չի կարող ամբողջությամբ աշխատել։' ?></p>
            </div>
            <label class="toggle-switch" for="push_enabled">
              <input id="push_enabled" name="push_enabled" type="checkbox" <?= !empty($pushConfig['enabled']) ? 'checked' : '' ?> <?= empty($pushConfig['supported']) ? 'disabled' : '' ?>>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="bento-grid cols-2" style="gap:8px;">
            <div class="form-field" style="margin:0;">
              <label for="push_subject"><?= __('Կապի հասցե (VAPID subject)') ?></label>
              <input class="input-field" id="push_subject" name="push_subject" value="<?= htmlspecialchars((string)($pushConfig['vapid_subject'] ?? ''), ENT_QUOTES) ?>" placeholder="mailto:admin@example.com">
            </div>
            <div class="form-field" style="margin:0;">
              <label for="push_public_key_preview"><?= __('Հանրային բանալի') ?></label>
              <input class="input-field" id="push_public_key_preview" value="<?= htmlspecialchars((string)($pushConfig['vapid_public_key'] ?? ''), ENT_QUOTES) ?>" readonly>
            </div>
          </div>
          <div class="chips" style="margin-top:12px; justify-content: flex-end;">
            <div class="autosave-status chip" id="pushAutosaveStatus" data-state="idle"><?= __('Ավտոմատ պահպանվում է') ?></div>
          </div>
        </div>

        <div class="bento-card" id="devicesPanel" data-admin-section="devices all" data-admin-permission="devices">
          <div class="bento-header">
            <h3><?= __('Ծրագրի ակտիվ սարքեր') ?></h3>
            <p><?= __('Այս բաժնում երևում են ակտիվ սարքերը։ Տվյալները թարմացվում են, երբ ծրագիրը օնլայն բացվում է։') ?></p>
          </div>

          <div class="bento-grid cols-6" style="gap:8px; margin-bottom:16px;">
            <div class="form-field" style="margin:0; grid-column: span 2;">
              <input class="input-field" id="device_search" name="device_search" value="<?= htmlspecialchars($deviceFilters['search'], ENT_QUOTES) ?>" placeholder="<?= __('Անուն, email, IP, սարք...') ?>" style="padding:6px;">
            </div>
            <div class="form-field" style="margin:0; grid-column: span 1;">
              <select class="input-field" id="device_scope" name="device_scope" style="padding:6px;">
                <option value="all" <?= $deviceFilters['scope'] === 'all' ? 'selected' : '' ?>><?= __('Բոլորը (App/Admin)') ?></option>
                <option value="main" <?= $deviceFilters['scope'] === 'main' ? 'selected' : '' ?>><?= __('Միայն App') ?></option>
                <option value="admin" <?= $deviceFilters['scope'] === 'admin' ? 'selected' : '' ?>><?= __('Միայն Admin') ?></option>
              </select>
            </div>
            <div class="form-field" style="margin:0; grid-column: span 1;">
              <select class="input-field" id="device_link" name="device_link" style="padding:6px;">
                <option value="all" <?= $deviceFilters['link'] === 'all' ? 'selected' : '' ?>><?= __('Բոլորը (Auth)') ?></option>
                <option value="linked" <?= $deviceFilters['link'] === 'linked' ? 'selected' : '' ?>><?= __('Մուտք գործած') ?></option>
                <option value="guest" <?= $deviceFilters['link'] === 'guest' ? 'selected' : '' ?>><?= __('Անանուն') ?></option>
              </select>
            </div>
            <div class="form-field" style="margin:0; grid-column: span 1;">
              <select class="input-field" id="device_platform" name="device_platform" style="padding:6px;">
                <option value="all"><?= __('Բոլոր հարթակներ') ?></option>
                <?php foreach ($deviceFilterOptions['platforms'] as $platformOption): ?>
                  <option value="<?= htmlspecialchars($platformOption, ENT_QUOTES) ?>" <?= $deviceFilters['platform'] === $platformOption ? 'selected' : '' ?>><?= htmlspecialchars($platformOption, ENT_QUOTES) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="form-field" style="margin:0; grid-column: span 1;">
              <select class="input-field" id="device_sort" name="device_sort" style="padding:6px;">
                <option value="last_seen_newest" <?= $deviceFilters['sort'] === 'last_seen_newest' ? 'selected' : '' ?>><?= __('Նորից հին') ?></option>
                <option value="last_seen_oldest" <?= $deviceFilters['sort'] === 'last_seen_oldest' ? 'selected' : '' ?>><?= __('Հինից նոր') ?></option>
              </select>
            </div>
            
            <div style="grid-column: 1 / -1; display:flex; justify-content:space-between; align-items:center;">
              <div style="font-size:12px; color:var(--muted);">
                <?= __('Ֆիլտրից հետո երևում է') ?> <?= count($filteredMainInstallDevices) ?> <?= __('հիմնական և') ?> <?= count($filteredAdminInstallDevices) ?> <?= __('ադմին սարք։') ?>
              </div>
            </div>
          </div>
            
          <div class="bento-grid cols-6" style="gap:12px; margin-top:16px;">
            <div class="bento-card" style="padding:16px; text-align:center;">
              <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Ակտիվ (App)') ?></span>
              <strong style="font-size:24px; color:var(--text);"><?= (int)($installStats['main']['count'] ?? 0) ?></strong>
            </div>
            <div class="bento-card" style="padding:16px; text-align:center;">
              <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Ընդհանուր (App)') ?></span>
              <strong style="font-size:24px; color:var(--text);"><?= (int)($installStats['main']['known_count'] ?? 0) ?></strong>
            </div>
            <div class="bento-card" style="padding:16px; text-align:center;">
              <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Ակտիվ (Admin)') ?></span>
              <strong style="font-size:24px; color:var(--text);"><?= (int)($installStats['admin']['count'] ?? 0) ?></strong>
            </div>
            <div class="bento-card" style="padding:16px; text-align:center;">
              <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Ընդհանուր (Admin)') ?></span>
              <strong style="font-size:24px; color:var(--text);"><?= (int)($installStats['admin']['known_count'] ?? 0) ?></strong>
            </div>
            <div class="bento-card" style="padding:16px; text-align:center; grid-column: span 2;">
              <span style="display:block; color:var(--muted); font-size:12px; margin-bottom:4px;"><?= __('Վերջին կապ (App / Admin)') ?></span>
              <strong style="font-size:14px; color:var(--text); display:block; margin-top:6px;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($installStats['main']['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></strong>
              <strong style="font-size:14px; color:var(--text); display:block; margin-top:2px;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($installStats['admin']['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></strong>
            </div>
          </div>

          <?php if ($showMainDeviceSection): ?>
            <h4 style="margin:24px 0 12px 0; font-size:15px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><?= __('Հիմնական ծրագրի սարքեր (App)') ?></h4>
            <?php if (!$filteredMainInstallDevices): ?>
              <div style="padding:16px; text-align:center; color:var(--muted);"><?= __('Հիմնական ծրագրի սարքեր չեն գտնվել') ?></div>
            <?php else: ?>
              <div style="overflow-x:auto;">
                <table class="bento-table">
                  <thead>
                    <tr>
                      <th><?= __('Օգտատեր') ?></th>
                      <th><?= __('IP / ID') ?></th>
                      <th><?= __('Հարթակ / Browser') ?></th>
                      <th><?= __('Ակտիվություն') ?></th>
                      <th style="text-align:right;"><?= __('Գործ.') ?></th>
                    </tr>
                  </thead>
                  <tbody id="mainDevicesTbody">
                    <?php $mainIndex = 0; foreach ($filteredMainInstallDevices as $device): $mainIndex++; ?>
                      <tr class="main-device-row" <?= $mainIndex > 10 ? 'style="display:none;"' : '' ?>>
                        <td>
                          <div class="table-primary"><?= htmlspecialchars(wp_admin_updates_install_identity($device), ENT_QUOTES) ?></div>
                          <div class="table-meta"><?= htmlspecialchars(wp_admin_updates_install_secondary($device), ENT_QUOTES) ?></div>
                          <?php if (!empty($device['user_id'])): ?>
                            <div class="chip success" style="margin-top:4px; padding:2px 6px; font-size:10px;">User #<?= (int)$device['user_id'] ?></div>
                          <?php endif; ?>
                        </td>
                        <td>
                          <div class="table-primary"><?= htmlspecialchars(wp_admin_updates_install_ip($device), ENT_QUOTES) ?></div>
                          <div class="table-meta" style="font-family:monospace;"><?= htmlspecialchars(wp_install_mask_device_id((string)($device['device_id'] ?? '')), ENT_QUOTES) ?></div>
                        </td>
                        <td>
                          <div class="table-primary"><?= htmlspecialchars(wp_admin_updates_install_platform((string)($device['user_agent'] ?? '')), ENT_QUOTES) ?></div>
                          <div class="table-meta"><?= htmlspecialchars(wp_admin_updates_install_browser((string)($device['user_agent'] ?? '')), ENT_QUOTES) ?></div>
                        </td>
                        <td>
                          <div class="table-primary"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                          <div class="table-meta"><?= __('Առաջին:') ?> <?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['installed_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                        </td>
                        <td style="text-align:right;">
                          <form method="post" style="margin:0" onsubmit="return window.confirm('Հեռացնե՞լ սարքը:');">
                            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                            <input type="hidden" name="form_action" value="remove_install_device">
                            <input type="hidden" name="install_scope" value="main">
                            <input type="hidden" name="install_device_id" value="<?= htmlspecialchars((string)($device['device_id'] ?? ''), ENT_QUOTES) ?>">
                            <input type="hidden" name="install_device_signature" value="<?= htmlspecialchars((string)($device['device_signature'] ?? ''), ENT_QUOTES) ?>">
                            <button class="btn btn-icon danger" type="submit" style="padding:4px 8px; font-size:11px;"><?= __('✕') ?></button>
                          </form>
                        </td>
                      </tr>
                    <?php endforeach; ?>
                  </tbody>
                </table>
              </div>
              <?php if (count($filteredMainInstallDevices) > 10): ?>
                <div style="text-align:center; padding:16px;" id="mainDevicesLoadMoreContainer">
                  <button type="button" class="btn btn-outline" style="padding:6px 16px; font-size:13px;" onclick="
                    let hidden = document.querySelectorAll('.main-device-row[style*=\'none\']');
                    for(let i=0; i<10 && i<hidden.length; i++) hidden[i].style.display='table-row';
                    if(hidden.length <= 10) this.parentElement.style.display='none';
                  "><?= __('Ցույց տալ ևս 10-ը') ?></button>
                </div>
              <?php endif; ?>
            <?php endif; ?>
          <?php endif; ?>

          <?php if ($showAdminDeviceSection): ?>
            <h4 style="margin:32px 0 12px 0; font-size:15px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><?= __('Ադմին ծրագրի սարքեր (Admin Panel)') ?></h4>
            <?php if (!$filteredAdminInstallDevices): ?>
              <div style="padding:16px; text-align:center; color:var(--muted);"><?= __('Ադմին ծրագրի սարքեր չեն գտնվել') ?></div>
            <?php else: ?>
              <div style="overflow-x:auto;">
                <table class="bento-table">
                  <thead>
                    <tr>
                      <th><?= __('Օգտատեր') ?></th>
                      <th><?= __('IP / ID') ?></th>
                      <th><?= __('Հարթակ / Browser') ?></th>
                      <th><?= __('Ակտիվություն') ?></th>
                      <th style="text-align:right;"><?= __('Գործ.') ?></th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php foreach ($filteredAdminInstallDevices as $device): ?>
                      <tr>
                        <td>
                          <div class="table-primary"><?= htmlspecialchars(wp_admin_updates_install_identity($device), ENT_QUOTES) ?></div>
                          <div class="table-meta"><?= htmlspecialchars(wp_admin_updates_install_secondary($device), ENT_QUOTES) ?></div>
                          <?php if (!empty($device['user_id'])): ?>
                            <div class="chip success" style="margin-top:4px; padding:2px 6px; font-size:10px;">User #<?= (int)$device['user_id'] ?></div>
                          <?php endif; ?>
                        </td>
                        <td>
                          <div class="table-primary"><?= htmlspecialchars(wp_admin_updates_install_ip($device), ENT_QUOTES) ?></div>
                          <div class="table-meta" style="font-family:monospace;"><?= htmlspecialchars(wp_install_mask_device_id((string)($device['device_id'] ?? '')), ENT_QUOTES) ?></div>
                        </td>
                        <td>
                          <div class="table-primary"><?= htmlspecialchars(wp_admin_updates_install_platform((string)($device['user_agent'] ?? '')), ENT_QUOTES) ?></div>
                          <div class="table-meta"><?= htmlspecialchars(wp_admin_updates_install_browser((string)($device['user_agent'] ?? '')), ENT_QUOTES) ?></div>
                        </td>
                        <td>
                          <div class="table-primary"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                          <div class="table-meta"><?= __('Առաջին:') ?> <?= htmlspecialchars(wp_version_format_datetime_admin((string)($device['installed_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                        </td>
                        <td style="text-align:right;">
                          <form method="post" style="margin:0" onsubmit="return window.confirm('Հեռացնե՞լ սարքը:');">
                            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                            <input type="hidden" name="form_action" value="remove_install_device">
                            <input type="hidden" name="install_scope" value="admin">
                            <input type="hidden" name="install_device_id" value="<?= htmlspecialchars((string)($device['device_id'] ?? ''), ENT_QUOTES) ?>">
                            <input type="hidden" name="install_device_signature" value="<?= htmlspecialchars((string)($device['device_signature'] ?? ''), ENT_QUOTES) ?>">
                            <button class="btn btn-icon danger" type="submit" style="padding:4px 8px; font-size:11px;"><?= __('✕') ?></button>
                          </form>
                        </td>
                      </tr>
                    <?php endforeach; ?>
                  </tbody>
                </table>
              </div>
            <?php endif; ?>
          <?php endif; ?>
        </div>

        <div class="bento-split-even" id="pushComposerPanel" data-admin-section="push all" data-admin-permission="push" style="align-items: stretch;">
          <div class="bento-card" style="display: flex; flex-direction: column;">
            <div class="bento-header">
              <h3><?= __('Ստեղծել ծանուցում') ?></h3>
              <p><?= __('Լրացրեք տվյալները ուղարկելու համար։') ?></p>
            </div>

            <div class="bento-grid cols-2" style="gap:8px;">
              <div class="form-field" style="margin:0;">
                <label for="push_title"><?= __('Վերնագիր') ?></label>
                <input class="input-field" id="push_title" name="push_title" maxlength="160" value="Worship Platform" required style="padding:6px;">
              </div>
              <div class="form-field" style="margin:0;">
                <label for="push_tag"><?= __('Խումբ (tag)') ?></label>
                <input class="input-field" id="push_tag" name="push_tag" maxlength="120" value="worship-update" style="padding:6px;">
              </div>
            </div>

            <div class="form-field" style="margin-top:8px; margin-bottom:8px;">
              <label for="push_body"><?= __('Բովանդակություն') ?></label>
              <textarea class="input-field" id="push_body" name="push_body" required style="min-height:60px;"><?= __('Նոր թարմացում կամ հայտարարություն կա։ Բացեք Worship Platform-ը մանրամասների համար։') ?></textarea>
            </div>

            <div class="bento-grid cols-2" style="gap:8px;">
              <div class="form-field" style="margin:0;">
                <label for="push_url"><?= __('Բացվող հղում') ?></label>
                <input class="input-field" id="push_url" name="push_url" value="/main.html" placeholder="/main.html" style="padding:6px;">
              </div>
              <div class="form-field" style="margin:0;">
                <label for="push_icon"><?= __('Նշան (icon)') ?></label>
                <input class="input-field" id="push_icon" name="push_icon" value="/wolarm_youth.png" placeholder="/wolarm_youth.png" style="padding:6px;">
              </div>
            </div>

            <div class="push-template-strip" style="margin-top:12px; display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-icon" style="font-size:11px; padding:4px 8px;" type="button" data-push-template="release"><?= __('Թարմացում') ?></button>
              <button class="btn btn-icon" style="font-size:11px; padding:4px 8px;" type="button" data-push-template="news"><?= __('Նորություն') ?></button>
              <button class="btn btn-icon" style="font-size:11px; padding:4px 8px;" type="button" data-push-template="maintenance"><?= __('Տեխ. աշխ.') ?></button>
              <button class="btn btn-icon" style="font-size:11px; padding:4px 8px;" type="button" data-push-template="reminder"><?= __('Հիշեցում') ?></button>
            </div>

            <div style="margin-top:auto; padding-top:16px;">
              <button class="btn btn-primary" style="width:100%" id="sendPushBtn" type="button" <?= empty($pushConfig['supported']) ? 'disabled' : '' ?>><?= __('Ուղարկել Push ծանուցումը') ?></button>
            </div>
          </div>

          <div class="bento-card push-preview" style="display:flex; flex-direction:column; justify-content:flex-start; align-items:center; background:#f8fafc;">
            <div class="bento-header" style="width:100%;">
              <h3 style="margin-bottom:4px;"><?= __('Phone Preview') ?></h3>
              <p style="font-size:11px;"><?= __('Այսպես այն կերևա հեռախոսի վրա') ?></p>
            </div>
            
            <div class="push-preview-phone" style="margin-top:auto; margin-bottom:auto; transform:scale(0.9);">
              <div class="push-preview-screen">
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 4px 16px 12px 16px; font-size:10px; font-weight:600; color:#000;">
                  <span>9:41</span>
                  <div style="display:flex; gap:4px; align-items:center;">
                    <svg width="12" height="10" viewBox="0 0 16 12" fill="black"><path d="M16 3.5C16 3.5 12.5 0 8 0C3.5 0 0 3.5 0 3.5L8 12L16 3.5Z"/></svg>
                    <svg width="12" height="10" viewBox="0 0 16 12" fill="black"><rect x="0" y="2" width="14" height="8" rx="2"/><path d="M14 4H16V8H14V4Z"/></svg>
                  </div>
                </div>
                <div class="push-preview-banner">
                  <div class="push-preview-top">
                    <div class="push-preview-app">Worship Platform</div>
                    <div class="push-preview-tag" id="pushPreviewTag">worship-update</div>
                  </div>
                  <div class="push-preview-title" id="pushPreviewTitle">Worship Platform</div>
                  <div class="push-preview-body" id="pushPreviewBody"><?= __('Նոր թարմացում կամ հայտարարություն կա։ Բացեք Worship Platform-ը մանրամասների համար։') ?></div>
                </div>
                <div class="push-preview-meta">
                  <div class="chip" id="pushPreviewUrl"><?= __('Հղում /main.html') ?></div>
                  <div class="chip" id="pushPreviewIcon"><?= __('Նշան /wolarm_youth.png') ?></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bento-card" id="pushSubscriptionsPanel" data-admin-section="push all" data-admin-permission="push" style="margin-bottom: 16px;">
          <div class="bento-header">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; width:100%;">
              <div>
                <h3 style="margin:0;"><?= __('Push միացրած սարքեր') ?></h3>
                <p style="margin:4px 0 0; font-size:13px; color:var(--muted);"><?= __('Այստեղ երևում են բաժանորդագրված սարքերի տվյալները:') ?></p>
              </div>
              <div class="form-field" style="margin:0; min-width:250px;">
                <input class="input-field" id="pushSubscriptionSearch" type="search" placeholder="<?= __('Անուն, email, IP, endpoint, browser') ?>" style="padding:6px; font-size:13px;">
              </div>
            </div>
          </div>

          <?php if (!$pushSubscriptions): ?>
            <div class="history-item" style="padding:16px; text-align:center; color:var(--muted);">
              <strong><?= __('Բաժանորդագրված սարքեր դեռ չկան') ?></strong>
            </div>
          <?php else: ?>
            <div style="overflow-x:auto;">
              <table class="bento-table" id="pushSubscriptionsTable">
                <thead>
                  <tr>
                    <th><?= __('Օգտատեր / ID') ?></th>
                    <th><?= __('IP / Endpoint') ?></th>
                    <th><?= __('Ակտիվություն') ?></th>
                    <th style="text-align:right;"><?= __('Գործ.') ?></th>
                  </tr>
                </thead>
                <tbody>
                  <?php foreach ($pushSubscriptions as $subscription): ?>
                    <tr data-push-subscription-item data-push-subscription-search="<?= htmlspecialchars(wp_admin_updates_push_search_haystack($subscription), ENT_QUOTES) ?>">
                      <td>
                        <div class="table-primary"><?= htmlspecialchars(wp_admin_updates_push_identity($subscription), ENT_QUOTES) ?></div>
                        <div class="table-meta"><?= __('ID:') ?> <?= htmlspecialchars(substr((string)($subscription['id'] ?? ''), 0, 8) ?: '—', ENT_QUOTES) ?></div>
                        <?php if (!empty($subscription['user_id'])): ?>
                          <div class="chip success" style="margin-top:4px; padding:2px 6px; font-size:10px;">User #<?= (int)$subscription['user_id'] ?></div>
                        <?php endif; ?>
                      </td>
                      <td>
                        <div class="table-primary"><?= htmlspecialchars(wp_admin_updates_push_ip($subscription), ENT_QUOTES) ?></div>
                        <div class="table-meta" style="font-family:monospace;" title="<?= htmlspecialchars(wp_admin_updates_push_endpoint_host((string)($subscription['endpoint'] ?? '')), ENT_QUOTES) ?>">
                          <?= htmlspecialchars(wp_admin_updates_push_endpoint_host((string)($subscription['endpoint'] ?? '')), ENT_QUOTES) ?>
                        </div>
                      </td>
                      <td>
                        <div class="table-primary"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($subscription['last_seen_at'] ?? '')) ?: '—', ENT_QUOTES) ?></div>
                        <div class="table-meta"><?= __('Վերջին կապ') ?></div>
                      </td>
                      <td style="text-align:right;">
                        <form method="post" style="margin:0" onsubmit="return window.confirm('Հեռացնե՞լ սարքը push ցանցից:');">
                          <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                          <input type="hidden" name="form_action" value="remove_push_subscription:<?= htmlspecialchars((string)($subscription['id'] ?? ''), ENT_QUOTES) ?>">
                          <button class="btn btn-icon danger" type="submit" style="padding:4px 8px; font-size:11px;"><?= __('✕') ?></button>
                        </form>
                      </td>
                    </tr>
                  <?php endforeach; ?>
                </tbody>
              </table>
            </div>
            <div class="history-item" id="pushSubscriptionEmptyState" hidden style="padding:16px; text-align:center; color:var(--muted);">
              <strong><?= __('Համընկնող push սարք չգտնվեց') ?></strong>
            </div>
          <?php endif; ?>
        </div>

        <div class="bento-card" id="pushHistoryPanel" data-admin-section="push all" data-admin-permission="push">
          <div class="bento-header">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; width:100%;">
              <div>
                <h3 style="margin:0;"><?= __('Ուղարկումների պատմություն') ?></h3>
                <p style="margin:4px 0 0; font-size:13px; color:var(--muted);"><?= __('Վերջին ուղարկված հաղորդագրությունները:') ?></p>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                <div class="form-field" style="margin:0;">
                  <input class="input-field" id="pushHistorySearch" type="search" placeholder="<?= __('Որոնել...') ?>" style="padding:6px; font-size:13px; width:150px;">
                </div>
                <?php if ($pushHistory): ?>
                  <button class="btn danger" style="padding:6px 12px; font-size:12px;" type="submit" name="form_action" value="clear_push_history" onclick="return confirm('Ջնջե՞լ ամբողջ պատմությունը։');"><?= __('Մաքրել') ?></button>
                <?php endif; ?>
              </div>
            </div>
          </div>

          <?php if (!$pushHistory): ?>
            <div class="history-item" style="padding:16px; text-align:center; color:var(--muted);">
              <strong><?= __('Push պատմություն դեռ չկա') ?></strong>
            </div>
          <?php else: ?>
            <div class="history-list" id="pushHistoryList">
              <?php foreach ($pushHistory as $item): ?>
                <div class="history-item bento-row" data-push-history-item data-push-history-search="<?= htmlspecialchars(wp_admin_updates_push_history_search_haystack($item), ENT_QUOTES) ?>" style="padding:12px; border-bottom:1px solid #f1f5f9;">
                  
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div>
                      <div style="font-weight:600; color:var(--text);"><?= htmlspecialchars((string)($item['title'] ?? 'Push հաղորդագրություն'), ENT_QUOTES) ?></div>
                      <div style="font-size:12px; color:var(--muted); margin-top:2px;">
                        <?= htmlspecialchars(wp_version_format_datetime_admin((string)($item['created_at'] ?? '')) ?: '—', ENT_QUOTES) ?> • <?= __('Ուղարկել է') ?> <?= htmlspecialchars((string)($item['actor'] ?? 'admin'), ENT_QUOTES) ?>
                      </div>
                    </div>
                    <div class="chips" style="gap:4px;">
                      <div class="chip" style="background:#e0f2fe; color:#0369a1; border:none;"><?= __('Հերթ.') ?> <?= (int)($item['queued'] ?? 0) ?></div>
                      <div class="chip success" style="border:none;"><?= __('Հասել է') ?> <?= (int)($item['success'] ?? 0) ?></div>
                      <?php if ((int)($item['failed'] ?? 0) > 0): ?>
                        <div class="chip danger" style="border:none;"><?= __('Սխալ') ?> <?= (int)($item['failed'] ?? 0) ?></div>
                      <?php endif; ?>
                    </div>
                  </div>

                  <?php if (!empty($item['body'])): ?>
                    <div style="font-size:13px; color:var(--text); background:#f8fafc; padding:8px 12px; border-radius:6px;"><?= htmlspecialchars((string)$item['body'], ENT_QUOTES) ?></div>
                  <?php endif; ?>

                </div>
              <?php endforeach; ?>
            </div>
            <div class="history-item" id="pushHistoryEmptyState" hidden style="padding:16px; text-align:center; color:var(--muted);">
              <strong><?= __('Համընկնում չգտնվեց') ?></strong>
            </div>
            <?php if (count($pushHistory) > 5): ?>
              <div class="history-more" style="padding:12px; text-align:center;">
                <button class="btn btn-ghost" id="loadMorePushHistoryBtn" type="button" style="font-size:13px;"><?= __('Բեռնել ևս 5-ը') ?></button>
              </div>
            <?php endif; ?>
          <?php endif; ?>
        </div>
      </form>

      <aside class="stack" data-section-container>
        <div class="bento-card" id="historyPanel" data-admin-section="history all" data-admin-permission="history">
          <div class="bento-header">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; width:100%;">
              <div>
                <h3 style="margin:0;"><?= __('Փոփոխությունների պատմություն և Վերականգնում') ?></h3>
                <p style="margin:6px 0 0; font-size:13px; color:var(--muted); line-height:1.5; max-width:600px;">
                  <?= __('Այստեղ ավտոմատ պահվում են Ձեր կատարած բոլոր պահպանումները։ Յուրաքանչյուր կետ (snapshot) ցույց է տալիս, թե այդ պահին ինչպիսին էին կարգավորումները։ Եթե ինչ-որ բան սխալ է գնացել, կարող եք ընտրել նախկին վիճակներից մեկը և <b>«Վերականգնել»</b> այն (Rollback)։') ?>
                </p>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                <div class="form-field" style="margin:0;">
                  <input class="input-field" id="historySearch" type="search" placeholder="<?= __('Որոնել (օրինակ՝ ադմինի անուն)') ?>" style="padding:6px; font-size:13px; width:200px;">
                </div>
                <?php if ($history): ?>
                  <form method="post" onsubmit="if(confirm('Վստա՞հ եք, որ ուզում եք ամբողջությամբ ջնջել պատմությունը։')) { return confirm('Հաստա՞տ ցանկանում եք մաքրել պատմությունը: Այս գործողությունը հնարավոր չէ հետարկել:'); } return false;" style="margin:0;">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                    <input type="hidden" name="form_action" value="clear_history">
                    <button class="btn danger" type="submit" style="padding:6px 14px; font-size:12px; font-weight:600; background:#ef4444; color:#fff; border:1px solid #dc2626; box-shadow:0 2px 8px rgba(239,68,68,0.3); border-radius:8px; transition:all 0.2s;" onmouseover="this.style.background='#dc2626';" onmouseout="this.style.background='#ef4444';"><?= __('Մաքրել պատմությունը') ?></button>
                  </form>
                <?php endif; ?>
              </div>
            </div>
          </div>

          <?php if (!$history): ?>
            <div style="padding:24px; text-align:center; color:var(--muted);">
              <strong><?= __('Պատմություն դեռ չկա') ?></strong>
              <div style="font-size:13px; margin-top:4px;"><?= __('Առաջին save-ից հետո այստեղ կտեսնեք փոփոխությունները։') ?></div>
            </div>
          <?php else: ?>
            <div class="bento-timeline" id="historyList">
              <?php 
              $lastSnapshotJson = null;
              foreach ($history as $item): 
                $currentSnapshotJson = json_encode($item['snapshot'] ?? []);
                // Skip adjacent identical snapshots (usually caused by double form submissions)
                if ($currentSnapshotJson === $lastSnapshotJson) continue;
                $lastSnapshotJson = $currentSnapshotJson;
              ?>
                <div class="bento-timeline-item" data-history-item data-history-search="<?= htmlspecialchars(wp_admin_updates_history_search_haystack($item), ENT_QUOTES) ?>">
                  <div class="bento-timeline-dot"></div>
                  <div class="bento-timeline-content">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                      <div>
                        <div style="font-weight:600; color:var(--text); font-size:14px;">
                          <?= htmlspecialchars((string)($item['actor'] ?? 'admin'), ENT_QUOTES) ?> 
                          <span style="color:var(--muted); font-weight:400; margin:0 4px;">•</span> 
                          <span style="color:var(--primary);"><?= htmlspecialchars(wp_admin_updates_history_action_label((string)($item['action'] ?? 'save')), ENT_QUOTES) ?></span>
                        </div>
                        <div style="font-size:12px; color:var(--muted); margin-top:4px;">
                          <?= htmlspecialchars(wp_version_format_datetime_admin((string)($item['at'] ?? '')) ?: '—', ENT_QUOTES) ?>
                        </div>
                      </div>
                      <?php if (!empty($item['snapshot']) && is_array($item['snapshot']) && !empty($adminSectionPermissions['release'])): ?>
                        <form method="post" style="margin:0;">
                          <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
                          <input type="hidden" name="form_action" value="rollback">
                          <input type="hidden" name="history_id" value="<?= htmlspecialchars((string)($item['id'] ?? ''), ENT_QUOTES) ?>">
                          <button class="btn btn-outline" type="submit" style="font-size:12px; padding:6px 12px; border-color:var(--primary); color:var(--primary);" onmouseover="this.style.background='var(--primary)'; this.style.color='#fff';" onmouseout="this.style.background='transparent'; this.style.color='var(--primary)';"><?= __('↺ Վերականգնել այս վիճակը') ?></button>
                        </form>
                      <?php endif; ?>
                    </div>

                    <?php if (!empty($item['changed_fields']) && is_array($item['changed_fields'])): ?>
                      <?php
                      $fieldNames = [
                        'app_version' => 'Հավելվածի տարբերակ',
                        'web_version' => 'Վեբ տարբերակ',
                        'maintenance_enabled' => 'Տեխ. աշխատանքներ',
                        'app_release_summary' => 'Հավելվածի նկարագրություն',
                        'web_release_summary' => 'Վեբ կայքի նկարագրություն',
                        'server_package_file' => 'ZIP Փաթեթ',
                        'admin_usernames' => 'Ադմիններ',
                        'blocked_os_list' => 'ՕՀ արգելափակում',
                        'page_app_modes' => 'Էջերի ռեժիմներ',
                        'access_restrictions' => 'Հասանելիություն',
                        'push_enabled' => 'Push ծանուցումներ'
                      ];
                      $readableFields = array_map(fn($f) => $fieldNames[$f] ?? $f, $item['changed_fields']);
                      ?>
                      <div style="font-size:12px; color:var(--text); margin-bottom:12px; padding:8px 12px; background: rgba(67,24,255,0.05); border-left: 3px solid var(--primary); border-radius:4px;">
                        <span style="color:var(--primary); font-weight:600;"><?= __('Այս քայլով փոխվել է՝') ?></span> 
                        <?= htmlspecialchars(implode(', ', $readableFields), ENT_QUOTES) ?>
                      </div>
                    <?php endif; ?>

                    <div style="font-size:11px; color:var(--muted); margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;"><?= __('Տվյալ պահի կարգավորումները (Snapshot)') ?></div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
                      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                        <div class="chip" style="font-size:12px; padding:4px 8px; background:#fff; border:1px solid #cbd5e1;"><?= __('App:') ?> <strong style="color:var(--text)"><?= htmlspecialchars((string)($item['snapshot']['app_version'] ?? '—'), ENT_QUOTES) ?></strong></div>
                        <div class="chip" style="font-size:12px; padding:4px 8px; background:#fff; border:1px solid #cbd5e1;"><?= __('Web:') ?> <strong style="color:var(--text)"><?= htmlspecialchars((string)($item['snapshot']['web_version'] ?? '—'), ENT_QUOTES) ?></strong></div>
                        <div class="chip <?= !empty($item['snapshot']['maintenance_enabled']) ? 'warning' : 'success' ?>" style="font-size:12px; padding:4px 8px; border:none; font-weight:600;">
                          <?= !empty($item['snapshot']['maintenance_enabled']) ? __('Տեխ. աշխատանքները միացված էր') : __('Տեխ. աշխատանքները անջատված էր') ?>
                        </div>
                      </div>

                      <?php if (!empty($item['snapshot']['app_release_summary']) || !empty($item['snapshot']['web_release_summary'])): ?>
                        <div style="font-size:13px; color:var(--text); margin-top:8px; padding-top:8px; border-top:1px solid #e2e8f0;">
                          <?php if (!empty($item['snapshot']['app_release_summary'])): ?>
                            <div style="margin-bottom:4px;"><strong><?= __('Հավելվածի նկարագրություն:') ?></strong> <span style="color:var(--muted)"><?= htmlspecialchars((string)($item['snapshot']['app_release_summary']), ENT_QUOTES) ?></span></div>
                          <?php endif; ?>
                          <?php if (!empty($item['snapshot']['web_release_summary'])): ?>
                            <div><strong><?= __('Վեբի նկարագրություն:') ?></strong> <span style="color:var(--muted)"><?= htmlspecialchars((string)($item['snapshot']['web_release_summary']), ENT_QUOTES) ?></span></div>
                          <?php endif; ?>
                        </div>
                      <?php endif; ?>
                    </div>

                    <?php if (!empty($item['note'])): ?>
                      <div style="font-size:12px; color:var(--primary); font-style:italic;">
                        "<?= htmlspecialchars((string)$item['note'], ENT_QUOTES) ?>"
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              <?php endforeach; ?>
            </div>
            <div id="historyEmptyState" hidden style="padding:16px; text-align:center; color:var(--muted);">
              <strong><?= __('Պատմության մեջ համընկնում չգտնվեց') ?></strong>
            </div>
            <?php if (count($history) > 5): ?>
              <div style="padding-top:16px; text-align:center;">
                <button class="btn btn-ghost" id="loadMoreHistoryBtn" type="button" style="font-size:13px;"><?= __('Բեռնել ևս 5-ը') ?></button>
              </div>
            <?php endif; ?>
          <?php endif; ?>
        </div>

        <section class="settings-group" data-admin-section="access all" data-admin-permission="access">
          <div class="settings-group-header">
              <h3><?= __('Ադմին session') ?></h3>
              <p><?= __('Այս էջը բացվել է նոր admin login հարթակով։ Access-ը ստուգվում է user login +') ?> <code>role/is_admin</code> <?= __('կամ admin email whitelist-ով, և նույն login/logout հոսքն է կիսում') ?> <code>/songs.php</code><?= __('-ի հետ։') ?></p>
            </div>
          <div class="access-mini-grid">
            <div class="access-mini">
              <strong><?= __('Մուտքի ձև') ?></strong>
              <span><?= $accessMode === 'modern' ? 'Դերային մուտք' : 'Ադմին whitelist' ?></span>
            </div>
            <div class="access-mini">
              <strong><?= __('Ընթացիկ օգտատեր') ?></strong>
              <span><?= htmlspecialchars((string)($adminUser['name'] ?? 'Օգտատեր'), ENT_QUOTES) ?></span>
            </div>
            <div class="access-mini">
              <strong><?= __('Հիմնական ծրագիր') ?></strong>
              <span><?= (int)($installStats['main']['known_count'] ?? 0) ?> <?= __('ճանաչված,') ?> <?= (int)($installStats['main']['count'] ?? 0) ?> <?= __('ակտիվ') ?></span>
            </div>
            <div class="access-mini">
              <strong><?= __('Ադմին ծրագիր') ?></strong>
              <span><?= (int)($installStats['admin']['known_count'] ?? 0) ?> <?= __('ճանաչված,') ?> <?= (int)($installStats['admin']['count'] ?? 0) ?> <?= __('ակտիվ') ?></span>
            </div>
            <?php if (!empty($adminUser['email'])): ?>
              <div class="access-mini">
                <strong><?= __('Email') ?></strong>
                <span><?= htmlspecialchars((string)$adminUser['email'], ENT_QUOTES) ?></span>
              </div>
            <?php endif; ?>
            <div class="access-mini">
              <strong><?= __('Whitelist email-ներ') ?></strong>
              <span><?= (int)$adminEmailCount ?> <?= __('պահված հասցե') ?></span>
            </div>
          </div>
          <div class="access-actions">
            <a class="btn" href="/songs.php"><?= __('Բացել ադմին վահանակը') ?></a>
            <a class="btn" href="/admin_logout.php"><?= __('Դուրս գալ ադմինից') ?></a>
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
          url: '/maintenance.html',
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
        const utc = date.getTime();
        const yerevanDate = new Date(utc + 4 * 3600000);
        const pad = (n) => String(n).padStart(2, '0');
        return [
          yerevanDate.getUTCFullYear(),
          '-',
          pad(yerevanDate.getUTCMonth() + 1),
          '-',
          pad(yerevanDate.getUTCDate()),
          'T',
          pad(yerevanDate.getUTCHours()),
          ':',
          pad(yerevanDate.getUTCMinutes())
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
        let contentNode = element.querySelector('.timeline-content');
        if (!contentNode) {
          contentNode = document.createElement('div');
          contentNode.className = 'timeline-content';
          element.appendChild(contentNode);
        }
        if (typeof text === 'string') {
          contentNode.textContent = text;
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
          if (result && result.csrf_failed && result.new_csrf_token) {
            if (csrfTokenInput) {
              csrfTokenInput.value = result.new_csrf_token;
            }
            if (!fields || !fields._retry) {
              const retryFields = Object.assign({}, fields || {}, { _retry: '1' });
              return postAdminAction(action, retryFields);
            }
          }
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
        const payload = {
          maintenance_enabled: maintenanceEnabledInput && maintenanceEnabledInput.checked ? '1' : '',
          maintenance_start_at: maintenanceStartInput ? maintenanceStartInput.value : '',
          maintenance_end_at: maintenanceEndInput ? maintenanceEndInput.value : '',
          maintenance_message: maintenanceMessageInput ? maintenanceMessageInput.value : '',
          maintenance_allowed_ips: maintenanceAllowedIpsInput ? maintenanceAllowedIpsInput.value : '',
          blocked_os_list_present: '1'
        };
        document.querySelectorAll('input.blocked-os-input:checked').forEach((input) => {
          payload['blocked_os_list[' + input.value + ']'] = input.value;
        });
        return payload;
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

      const resetMaintenanceBtn = document.getElementById('resetMaintenanceBtn');
      resetMaintenanceBtn?.addEventListener('click', () => {
        if (maintenanceStartInput) maintenanceStartInput.value = '';
        if (maintenanceEndInput) maintenanceEndInput.value = '';
        if (maintenanceMessageInput) maintenanceMessageInput.value = '';
        if (maintenanceEnabledInput) maintenanceEnabledInput.checked = false;
        maintenanceAutosave.schedule(100);
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
      
      document.querySelectorAll('.blocked-os-input').forEach((input) => {
        input.addEventListener('change', () => maintenanceAutosave.schedule(450));
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

      document.querySelectorAll('input[name^="page_app_modes["], input[name^="page_web_modes["]').forEach((input) => {
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
      // If URL has a specific section, use it.
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('section')) {
        initialSection = urlParams.get('section');
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
