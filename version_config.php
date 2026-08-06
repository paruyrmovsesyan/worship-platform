<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

function wp_version_admin_timezone(): DateTimeZone {
    static $timezone = null;
    if ($timezone instanceof DateTimeZone) {
        return $timezone;
    }

    $timezone = new DateTimeZone('Asia/Yerevan');
    return $timezone;
}

function wp_version_now_iso(): string {
    return (new DateTimeImmutable('now', wp_version_admin_timezone()))->format(DateTimeInterface::ATOM);
}

function wp_version_release_types(): array {
    return [
        'major' => 'Մեծ թարմացում',
        'feature' => 'Նոր հնարավորություն',
        'patch' => 'Փոքր ուղղում',
        'hotfix' => 'Արագ շտկում',
        'maintenance' => 'Տեխնիկական թարմացում',
        'content' => 'Բովանդակության թարմացում',
    ];
}

function wp_version_sanitize_release_type($value): string {
    $value = strtolower(trim((string)$value));
    $allowed = wp_version_release_types();
    return array_key_exists($value, $allowed) ? $value : 'feature';
}

function wp_version_release_label(?string $value): string {
    $type = wp_version_sanitize_release_type($value);
    $allowed = wp_version_release_types();
    return (string)($allowed[$type] ?? $allowed['feature']);
}

function wp_version_package_modes(): array {
    return [
        'partial' => 'Մասամբ ֆայլերի թարմացում',
        'full' => 'Ամբողջական փաթեթի տեղադրում',
    ];
}

function wp_version_sanitize_package_mode($value): string {
    $value = strtolower(trim((string)$value));
    $allowed = wp_version_package_modes();
    return array_key_exists($value, $allowed) ? $value : 'partial';
}

function wp_version_package_mode_label(?string $value): string {
    $mode = wp_version_sanitize_package_mode($value);
    $allowed = wp_version_package_modes();
    return (string)($allowed[$mode] ?? $allowed['partial']);
}

function wp_version_page_app_registry(): array {
    return [
        'landing' => [
            'label'       => 'Գլխավոր / Landing',
            'path'        => '/',
            'description' => 'Կայքի մեկնարկային էջը և ծրագրի առաջին բացումը։',
        ],
        'main' => [
            'label'       => 'Երգերի գրադարան',
            'path'        => '/songs',
            'description' => 'Հիմնական երգերի ցանկը, որոնումը և օֆֆլայն գրադարանը։',
        ],
        'song' => [
            'label'       => 'Երգի դիտում',
            'path'        => '/song/:id',
            'description' => 'Երգի բառերը, ակորդները և transpose գործիքները։',
        ],
        'favorites' => [
            'label'       => 'Պահպանված երգեր',
            'path'        => '/favorites',
            'description' => 'User-ի սիրելի և պահպանված երգերի բաժինը։',
        ],
        'setlists' => [
            'label'       => 'Սեթլիստներ',
            'path'        => '/setlists',
            'description' => 'Սեթլիստների workspace-ը և սեթլիստի ներքին էջերը։',
        ],
        'account' => [
            'label'       => 'Հաշիվ / Կարգավորումներ',
            'path'        => '/profile',
            'description' => 'Հաշվի կարգավորումներ, push ծանուցումներ և user data։',
        ],
        'news' => [
            'label'       => 'Նորություններ',
            'path'        => '/news',
            'description' => 'Նորությունների և հայտարարությունների բաժինը։',
        ],
        'teams' => [
            'label'       => 'Թիմեր',
            'path'        => '/teams',
            'description' => 'Թիմերի ցանկ, ստեղծում և թիմի ներքին էջ։',
        ],
        'community' => [
            'label'       => 'Համայնք',
            'path'        => '/community',
            'description' => 'Օգտատերերի համայնքի և քննարկումների բաժինը։',
        ],
        'pricing' => [
            'label'       => 'Բաժանորդագրություն',
            'path'        => '/pricing',
            'description' => 'Վճարովի պլաններ, բաժանորդագրության ընտրություն։',
        ],
        'resources' => [
            'label'       => 'Ռեսուրսներ',
            'path'        => '/resources',
            'description' => 'Ուսուցողական նյութեր, ձեռնարկներ և ռեսուրսներ։',
        ],
        'song_request' => [
            'label'       => 'Երգ խնդրել',
            'path'        => '/song-request',
            'description' => 'Օգտատիրոջ կողմից երգ ավելացնելու կամ խմբագրելու հարցում։',
        ],
        'auth' => [
            'label' => 'Մուտք և գրանցում',
            'path' => '/loginuser.php',
            'description' => 'Մուտք, գրանցում, password reset և email verify flow-երը։',
        ],
    ];
}

function wp_version_admin_section_registry(): array {
    return [
        'release' => [
            'label' => 'Թարմացում և տեղադրում',
            'description' => 'Տարբերակներ, ZIP փաթեթ, կիրառման եղանակ և հրապարակում։',
        ],
        'about' => [
            'label' => 'Ծրագրի մասին',
            'description' => 'PWA ծրագրում ցուցադրվող նկարագրություն, իրավական տվյալներ և օգտակար հղումներ։',
        ],
        'site_info' => [
            'label' => 'Ընդհանուր տվյալներ և SEO',
            'description' => 'Կայքի գլխավոր վերնագիր, SEO նկարագրություն, կապի և սոցիալական էջերի տվյալներ։',
        ],
        'maintenance' => [
            'label' => 'Տեխնիկական աշխատանքներ',
            'description' => 'Տեխնիկական սպասարկում և ծրագրային էջերի միացում/անջատում։',
        ],
        'push' => [
            'label' => 'Push ծանուցումներ',
            'description' => 'Push կարգավորումներ, ուղարկում, push սարքեր և push պատմություն։',
        ],
        'devices' => [
            'label' => 'Սարքեր',
            'description' => 'Հիմնական և ադմին ծրագրերի սարքերի ցանկը ու մաքրումը։',
        ],
        'history' => [
            'label' => 'Պատմություն',
            'description' => 'Թարմացումների պատմություն, մաքրում և վերականգնում։',
        ],
        'access' => [
            'label' => 'Մուտքեր',
            'description' => 'Ադմին email-ներ, թույլտվություններ և ներքին նշումներ։',
        ],
        'moderation' => [
            'label' => 'Մոդերացիա',
            'description' => 'Օգտատերերի ուղարկած նոր երգերի և խմբագրման հարցումների հաստատում կամ մերժում։',
        ],
        'translations' => [
            'label' => 'Թարգմանություններ',
            'description' => 'Լեզուների ձեռքով թարգմանություններ, պահոց և թարգմանված տողերի խմբագրում։',
        ],
        'songs_editor' => [
            'label' => 'Երգերի խմբագրում',
            'description' => 'Երգերի ադմին էջ, ավելացում, խմբագրում, արտահանում և որոնում։',
        ],
    ];
}

function wp_version_default_admin_permissions(): array {
    $permissions = [];
    foreach (wp_version_admin_section_registry() as $key => $meta) {
        $permissions[$key] = true;
    }

    return $permissions;
}

function wp_version_sanitize_admin_user_permissions($value): array {
    $defaults = wp_version_default_admin_permissions();
    $normalized = [];

    if (!is_array($value)) {
        return $normalized;
    }

    $isRowList = true;
    foreach (array_keys($value) as $key) {
        if (!(is_int($key) || (is_string($key) && ctype_digit($key)))) {
            $isRowList = false;
            break;
        }
    }
    if ($isRowList) {
        foreach ($value as $row) {
            if (!is_array($row)) {
                continue;
            }

            $email = strtolower(trim((string)($row['email'] ?? '')));
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            $rowPermissions = [];
            $sections = $row['sections'] ?? [];
            foreach ($defaults as $section => $enabledByDefault) {
                $rowPermissions[$section] = array_key_exists($section, $sections)
                    ? !empty($sections[$section])
                    : $enabledByDefault;
            }
            $normalized[$email] = $rowPermissions;
        }

        return $normalized;
    }

    foreach ($value as $email => $permissions) {
        $email = strtolower(trim((string)$email));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !is_array($permissions)) {
            continue;
        }

        $rowPermissions = [];
        foreach ($defaults as $section => $enabledByDefault) {
            $rowPermissions[$section] = array_key_exists($section, $permissions)
                ? !empty($permissions[$section])
                : $enabledByDefault;
        }
        $normalized[$email] = $rowPermissions;
    }

    return $normalized;
}

function wp_version_default_page_app_modes(): array {
    $modes = [];
    foreach (wp_version_page_app_registry() as $key => $page) {
        $modes[$key] = true;
    }
    return $modes;
}

function wp_version_sanitize_page_app_modes($value): array {
    $defaults = wp_version_default_page_app_modes();
    if (!is_array($value)) {
        return $defaults;
    }
    $normalized = [];
    foreach ($defaults as $key => $defaultValue) {
        $normalized[$key] = !empty($value[$key]);
    }
    return $normalized;
}

function wp_version_page_web_registry(): array {
    return [
        'landing' => [
            'label'       => 'Գլխավոր / Landing',
            'path'        => '/',
            'description' => 'Կայքի մեկնարկային էջը և ծրագրի առաջին բացումը։',
        ],
        'main' => [
            'label'       => 'Երգերի գրադարան',
            'path'        => '/songs',
            'description' => 'Հիմնական երգերի ցանկը, որոնումը և օֆֆլայն գրադարանը։',
        ],
        'song' => [
            'label'       => 'Երգի դիտում',
            'path'        => '/song/:id',
            'description' => 'Երգի բառերը, ակորդները և transpose գործիքները։',
        ],
        'favorites' => [
            'label'       => 'Պահպանված երգեր',
            'path'        => '/favorites',
            'description' => 'Օգտատիրոջ սիրելի և պահպանված երգերի բաժինը։',
        ],
        'setlists' => [
            'label'       => 'Սեթլիստներ',
            'path'        => '/setlists',
            'description' => 'Սեթլիստների workspace-ը և սեթլիստի ներքին էջերը։',
        ],
        'news' => [
            'label'       => 'Նորություններ',
            'path'        => '/news',
            'description' => 'Նորությունների և հայտարարությունների բաժինը։',
        ],
        'teams' => [
            'label'       => 'Թիմեր',
            'path'        => '/teams',
            'description' => 'Թիմերի ցանկ, ստեղծում և թիմի ներքին էջ։',
        ],
        'community' => [
            'label'       => 'Համայնք',
            'path'        => '/community',
            'description' => 'Օգտատերերի համայնքի և քննարկումների բաժինը։',
        ],
        'pricing' => [
            'label'       => 'Բաժանորդագրություն',
            'path'        => '/pricing',
            'description' => 'Վճարովի պլաններ, բաժանորդագրության ընտրություն։',
        ],
        'resources' => [
            'label'       => 'Ռեսուրսներ',
            'path'        => '/resources',
            'description' => 'Ուսուցողական նյութեր, ձեռնարկներ և ռեսուրսներ։',
        ],
        'song_request' => [
            'label'       => 'Երգ խնդրել',
            'path'        => '/song-request',
            'description' => 'Օգտատիրոջ կողմից երգ ավելացնելու կամ խմբագրելու հարցում։',
        ],
        'auth' => [
            'label'       => 'Մուտք և գրանցում',
            'path'        => '/loginuser.php',
            'description' => 'Մուտք, գրանցում, password reset և email verify flow-երը։',
        ],
    ];
}

function wp_version_default_page_web_modes(): array {
    $modes = [];
    foreach (wp_version_page_web_registry() as $key => $page) {
        $modes[$key] = true; // All web pages enabled by default
    }
    return $modes;
}

function wp_version_sanitize_page_web_modes($value): array {
    $defaults = wp_version_default_page_web_modes();
    if (!is_array($value)) {
        return $defaults;
    }
    $normalized = [];
    foreach ($defaults as $key => $defaultValue) {
        $normalized[$key] = !empty($value[$key]);
    }
    return $normalized;
}

function wp_version_default_app_about(): array {
    return [
        'tagline' => [
            'hy' => 'Երգեր, ակորդներ և թիմային համագործակցություն մեկ ծրագրում։',
            'en' => 'Songs, chords, and team collaboration in one app.',
            'ru' => 'Песни, аккорды и командная работа в одном приложении.',
        ],
        'license_text' => [
            'hy' => 'Worship Platform-ը PM Studio-ի սեփական ծրագրային ապահովումն է։ Օգտագործված բաց կոդով գրադարանները տարածվում են իրենց համապատասխան լիցենզիաներով։',
            'en' => 'Worship Platform is proprietary software of PM Studio. Open-source libraries are distributed under their respective licenses.',
            'ru' => 'Worship Platform является проприетарным программным обеспечением PM Studio. Библиотеки с открытым исходным кодом распространяются по соответствующим лицензиям.',
        ],
        'owner' => 'PM Studio',
        'copyright_year' => '2026',
        'privacy_url' => '/privacy',
        'terms_url' => '/terms',
        'support_url' => '/support',
        'licenses' => [
            ['name' => 'React / React DOM', 'license' => 'MIT License'],
            ['name' => 'React Router', 'license' => 'MIT License'],
        ],
    ];
}

function wp_version_sanitize_public_url($value, string $fallback): string {
    $url = mb_substr(trim((string)$value), 0, 500);
    if ($url === '') return $fallback;
    if (str_starts_with($url, '/') && !str_starts_with($url, '//')) return $url;
    if (filter_var($url, FILTER_VALIDATE_URL) && preg_match('/^https?:\/\//i', $url)) return $url;
    return $fallback;
}

function wp_version_sanitize_app_about($value): array {
    $defaults = wp_version_default_app_about();
    $value = is_array($value) ? $value : [];
    $tagline = is_array($value['tagline'] ?? null) ? $value['tagline'] : [];
    $licenseText = is_array($value['license_text'] ?? null) ? $value['license_text'] : [];
    $legacyTagline = [
        'hy' => 'Երգեր, ակորդներ և ծառայության գործիքներ՝ մեկ հարմար հարթակում։',
        'en' => 'Songs, chords, and ministry tools in one convenient platform.',
        'ru' => 'Песни, аккорды и инструменты служения на одной удобной платформе.',
    ];
    $legacyLicenseText = [
        'hy' => 'Worship Platform-ը պաշտպանված ծրագրային արտադրանք է։ Երրորդ կողմի բաղադրիչները տարածվում են իրենց համապատասխան լիցենզիաներով։',
        'en' => 'Worship Platform is protected software. Third-party components are distributed under their respective licenses.',
        'ru' => 'Worship Platform является защищенным программным продуктом. Сторонние компоненты распространяются по своим лицензиям.',
    ];
    $languages = ['hy', 'en', 'ru'];
    $normalizedTagline = [];
    $normalizedLicenseText = [];
    foreach ($languages as $language) {
        $taglineValue = trim((string)($tagline[$language] ?? $defaults['tagline'][$language]));
        $licenseValue = trim((string)($licenseText[$language] ?? $defaults['license_text'][$language]));
        if ($taglineValue === $legacyTagline[$language]) {
            $taglineValue = $defaults['tagline'][$language];
        }
        if ($licenseValue === $legacyLicenseText[$language]) {
            $licenseValue = $defaults['license_text'][$language];
        }
        $normalizedTagline[$language] = mb_substr($taglineValue, 0, 300);
        $normalizedLicenseText[$language] = mb_substr($licenseValue, 0, 1500);
    }

    $rawLicenses = $value['licenses'] ?? $defaults['licenses'];
    if (is_string($rawLicenses)) {
        $rawLicenses = preg_split('/\R/u', $rawLicenses) ?: [];
        $rawLicenses = array_map(static function ($line): array {
            $parts = array_map('trim', explode('|', (string)$line, 2));
            return ['name' => $parts[0] ?? '', 'license' => $parts[1] ?? ''];
        }, $rawLicenses);
    }
    $licenses = [];
    foreach (is_array($rawLicenses) ? $rawLicenses : [] as $item) {
        if (!is_array($item)) continue;
        $name = mb_substr(trim((string)($item['name'] ?? '')), 0, 120);
        $license = mb_substr(trim((string)($item['license'] ?? '')), 0, 120);
        if ($name === '') continue;
        $licenses[] = ['name' => $name, 'license' => $license];
        if (count($licenses) >= 20) break;
    }
    if (!$licenses) $licenses = $defaults['licenses'];

    $year = trim((string)($value['copyright_year'] ?? $defaults['copyright_year']));
    if (!preg_match('/^\d{4}$/', $year)) $year = $defaults['copyright_year'];

    return [
        'tagline' => $normalizedTagline,
        'license_text' => $normalizedLicenseText,
        'owner' => mb_substr(trim((string)($value['owner'] ?? $defaults['owner'])) ?: $defaults['owner'], 0, 120),
        'copyright_year' => $year,
        'privacy_url' => wp_version_sanitize_public_url($value['privacy_url'] ?? '', $defaults['privacy_url']),
        'terms_url' => wp_version_sanitize_public_url($value['terms_url'] ?? '', $defaults['terms_url']),
        'support_url' => wp_version_sanitize_public_url($value['support_url'] ?? '', $defaults['support_url']),
        'licenses' => $licenses,
    ];
}

function wp_version_defaults(): array {
    return [
        'app_version' => '2.7.0',
        'web_version' => '2.7.0',
        'app_release_stamp' => '',
        'web_release_stamp' => '',
        'app_release_type' => 'feature',
        'web_release_type' => 'content',
        'app_release_summary' => '',
        'web_release_summary' => '',
        'app_title' => 'Ծրագրի նոր տարբերակ',
        'app_message' => 'Ծրագիրը թարմացվել է։ Սեղմեք թարմացնել, որպեսզի օֆֆլայն և օնլայն բովանդակությունը նորացվի։',
        'web_title' => 'Կայքի նոր տարբերակ',
        'web_message' => 'Կայքը թարմացվել է։ Սեղմեք թարմացնել, որպեսզի բացվի նոր տարբերակը։',
        'app_about' => wp_version_default_app_about(),
        'maintenance_enabled' => false,
        'maintenance_message' => 'Կայքում ընթացքի մեջ են տեխնիկական աշխատանքներ։ Խնդրում ենք փորձել մի փոքր հետո։',
        'maintenance_start_at' => '',
        'maintenance_end_at' => '',
        'maintenance_allowed_ips' => '',
        'server_package_file' => '',
        'server_package_mode' => 'partial',
        'server_package_uploaded_at' => '',
        'server_package_uploaded_by' => '',
        'server_package_applied_at' => '',
        'server_package_applied_by' => '',
        'server_package_last_backup' => '',
        'server_package_linked_app_version' => '',
        'server_package_linked_web_version' => '',
        'server_package_release_synced_at' => '',
        'admin_emails' => [],
        'admin_user_permissions' => [],
        'social_auth_google_client_id' => '169805085378-f58dpr8rkp993ag9h8fu05idnocn4j6s.apps.googleusercontent.com',
        'social_auth_google_redirect_uri' => 'https://worship.pmstudio.am/social_auth.php?provider=google',
        'page_app_modes' => wp_version_default_page_app_modes(),
        'page_web_modes' => wp_version_default_page_web_modes(),
        'site_seo_title' => 'Worship Platform',
        'site_seo_description' => 'Երգեր, ակորդներ և թիմային համագործակցություն մեկ ծրագրում։',
        'site_seo_keywords' => '',
        'site_seo_name' => 'Worship Platform',
        'site_seo_logo' => 'https://worship.pmstudio.am/user_uploaded_logo.png',
        'site_seo_image' => 'https://worship.pmstudio.am/og-image.png',
        'site_seo_google_verification' => '',
        'site_seo_bing_verification' => '',
        'site_seo_yandex_verification' => 'af423fbb5786a5d1',
        'site_seo_default_author' => 'Worship Platform',
        'site_seo_news_publisher' => 'Worship Platform',
        'site_seo_news_logo' => 'https://worship.pmstudio.am/user_uploaded_logo.png',
        'site_seo_index_home' => true,
        'site_seo_index_songs' => true,
        'site_seo_index_song_pages' => false,
        'site_seo_index_news' => true,
        'site_seo_index_news_articles' => true,
        'site_seo_index_transpose' => true,
        'site_contact_email' => '',
        'site_contact_phone' => '',
        'site_contact_address' => '',
        'site_social_facebook' => '',
        'site_social_instagram' => '',
        'landing_hero_title1' => 'Առաջնորդի՛ր Պաշտամունքը',
        'landing_hero_title2' => 'Մեկ Միասնական Հարթակում',
        'landing_hero_subtitle' => 'Ակորդներ, երգացանկեր և թիմային համագործակցություն — ամեն ինչ մեկ հարթակում։',
        'about_hero_title' => 'Մեր Մասին',
        'about_hero_subtitle' => 'Worship Platform-ը երաժիշտների, պաշտամունքի թիմերի և առաջնորդների համար ստեղծված միասնական հարթակ է:',
        'about_mission_title' => 'Մեր Առաքելությունը',
        'about_mission_text' => 'Մեր նպատակն է ապահովել պաշտամունքի թիմերին ժամանակակից թվային գործիքներով՝ ակորդներ, երգացանկեր, տրանսպոզիցիա և իրական ժամանակում թիմային համագործակցություն:',
        'about_vision_title' => 'Մեր Տեսլականը',
        'about_vision_text' => 'Ստեղծել հզոր համայնք, որտեղ յուրաքանչյուր երաժիշտ և թիմ կկարողանա հեշտությամբ կազմակերպել իրենց ծառայությունը:',
        'about_stat1_number' => '1000+',
        'about_stat1_label' => 'Ակտիվ Երգեր',
        'about_stat2_number' => '500+',
        'about_stat2_label' => 'Պաշտամունքի Թիմեր',
        'about_stat3_number' => '10,000+',
        'about_stat3_label' => 'Օգտատերեր',
        'privacy_title' => 'Գաղտնիության Քաղաքականություն',
        'privacy_subtitle' => 'Ձեր անձնական տվյալների պաշտպանությունն ու գաղտնիությունը մեր առաջնահերթությունն է:',
        'privacy_content' => "### 1. Տվյալների Հավաքագրում\nWorship Platform-ում մենք հավաքագրում ենք միայն այն անձնական տվյալները, որոնք անհրաժեշտ են ծառայություններից լիարժեք օգտվելու համար (անուն, էլ․ փոստի հասցե, պահպանված երգացանկեր, ակտիվության տվյալներ):\n\n### 2. Տվյալների Օգտագործում\nՁեր տվյալներն օգտագործվում են միմիայն հարթակի գործառույթներն ապահովելու, թիմային համագործակցությունը կազմակերպելու և կարևոր ծանուցումներ ուղարկելու համար։ Մենք ԵՐԲԵՔ չենք վաճառում կամ փոխանցում Ձեր տվյալները երրորդ անձանց։\n\n### 3. Պաշտպանություն և Անվտանգություն\nԲոլոր տվյալները պահպանվում են վերջին ստանդարտներին համապատասխանող ծածկագրմամբ (SSL/TLS encryption) և պաշտպանված սերվերներում:\n\n### 4. Օգտատիրոջ Իրավունքները\nԴուք ցանկացած պահի կարող եք թարմացնել Ձեր տվյալները, արտահանել դրանք կամ ամբողջությամբ ջնջել Ձեր հաշիվը Կարգավորումներ բաժնից:",
        'terms_title' => 'Օգտագործման Պայմաններ',
        'terms_subtitle' => 'Worship Platform-ից օգտվելու կանոնները, իրավունքներն ու պարտականությունները:',
        'terms_content' => "### 1. Ընդհանուր Դրույթներ\nՕգտվելով Worship Platform հարթակից՝ Դուք համաձայնում եք սույն Օգտագործման Պայմաններին: Հարթակը նախատեսված է պաշտամունքի երգերի, ակորդների և երգացանկերի կազմակերպման համար:\n\n### 2. Հաշվի Գրանցում և Անվտանգություն\nՕգտատերը պատասխանատու է իր հաշվի տվյալների (գաղտնաբառի) անվտանգության համար: Հարթակում արգելվում է իրականացնել ապօրինի գործողություններ կամ չլիազորված մուտքի փորձեր:\n\n### 3. Հեղինակային Իրավունքներ և Բովանդակություն\nԵրգերի տեքստերն ու ակորդները տեղադրվում են հոգևոր ծառայության և ուսուցողական նպատակներով: Օգտատերերի կողմից ստեղծված երգացանկերը պատկանում են տվյալ օգտատերերին կամ թիմերին:\n\n### 4. Պատասխանատվության Սահմանափակում\nWorship Platform-ը ձգտում է ապահովել հարթակի 24/7 անխափան աշխատանքը, սակայն պատասխանատվություն չի կրում տեխնիկական վերանորոգման կամ ինտերնետ կապի ընդհատումներով պայմանավորված ժամանակավոր դադարների համար:",
        'cookies_title' => 'Cookie-ների Քաղաքականություն',
        'cookies_subtitle' => 'Ինչպես ենք օգտագործում Cookie ֆայլերն ու տեղային պահոցը (LocalStorage) Ձեր փորձառությունը բարելավելու համար:',
        'cookies_content' => "### 1. Ի՞նչ են Cookie-ները\nCookie-ները փոքր տեքստային ֆայլեր են, որոնք պահպանվում են Ձեր սարքում (համակարգիչ, հեռախոս), երբ այցելում եք կայք: Դրանք օգնում են կայքին հիշել Ձեր նախընտրությունները և ապահովել անվտանգ մուտք:\n\n### 2. Ինչպե՞ս ենք Օգտագործում Cookie-ները\nWorship Platform-ում Cookie-ները և LocalStorage-ն օգտագործվում են հետևյալ նպատակներով․\n• Ավտորիզացիա և Սեսիա․ Ձեր մուտքն ապահով և ակտիվ պահելու համար:\n• Նախընտրություններ․ Լեզվի ընտրությունը (հայերեն, ռուսերեն, անգլերեն) և դիզայնի թեման (մութ/լուսավոր) հիշելու համար:\n• Անցանց Պահոց (Offline Cache)․ Երգերի տեքստերն ու ակորդները ինտերնետի բացակայության դեպքում արագ ցուցադրելու համար:\n\n### 3. Երրորդ Կողմի Cookie-ներ և Գովազդներ\nՄենք ՉԵՆՔ օգտագործում գովազդային կամ հետևող (tracking) երրորդ կողմի cookie-ներ: Ձեր տվյալներն ու ակտիվությունը չեն փոխանցվում գովազդային գործակալություններին:\n\n### 4. Ինչպե՞ս Կառավարել Cookie-ները\nԴուք կարող եք ցանկացած պահի մաքրել կամ արգելափակել Cookie-ները Ձեր դիտարկիչի (Browser) կարգավորումներից, սակայն որոշ ֆունկցիաներ (օրինակ՝ ավտոմատ մուտքը) կարող են ժամանակավորապես չգործել:",
        'blocked_os_list' => [],
        'meta_note' => '',
        'updated_at' => wp_version_now_iso(),
    ];
}

function wp_version_normalize_datetime($value): string {
    $value = trim((string)$value);
    if ($value === '') return '';

    try {
        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $value)) {
            $dt = DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $value, wp_version_admin_timezone());
            if (!$dt) {
                return '';
            }
        } else {
            $dt = new DateTimeImmutable($value, wp_version_admin_timezone());
        }

        return $dt->setTimezone(wp_version_admin_timezone())->format(DateTimeInterface::ATOM);
    } catch (Throwable $e) {
        return '';
    }
}

function wp_version_format_datetime_local(?string $value): string {
    $value = trim((string)$value);
    if ($value === '') return '';

    try {
        $dt = new DateTimeImmutable($value, wp_version_admin_timezone());
        return $dt->setTimezone(wp_version_admin_timezone())->format('Y-m-d\TH:i');
    } catch (Throwable $e) {
        return '';
    }
}

function wp_version_format_datetime_admin(?string $value, string $format = 'Y-m-d H:i'): string {
    $value = trim((string)$value);
    if ($value === '') return '';

    try {
        $dt = new DateTimeImmutable($value, wp_version_admin_timezone());
        return $dt->setTimezone(wp_version_admin_timezone())->format($format);
    } catch (Throwable $e) {
        return '';
    }
}

function wp_version_sanitize_email_list($value): array {
    if (is_array($value)) {
        $rawItems = $value;
    } else {
        $rawItems = preg_split('/[\r\n,;]+/', (string)$value) ?: [];
    }

    $emails = [];
    foreach ($rawItems as $item) {
        $email = strtolower(trim((string)$item));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) continue;
        $emails[$email] = true;
    }

    return array_keys($emails);
}

function wp_version_sanitize(array $raw): array {
    $defaults = wp_version_defaults();
    $config = array_merge($defaults, $raw);

    $config['app_version'] = trim((string)($config['app_version'] ?? $defaults['app_version'])) ?: $defaults['app_version'];
    $config['web_version'] = trim((string)($config['web_version'] ?? $defaults['web_version'])) ?: $defaults['web_version'];
    $config['app_release_stamp'] = mb_substr(trim((string)($config['app_release_stamp'] ?? '')), 0, 80);
    $config['web_release_stamp'] = mb_substr(trim((string)($config['web_release_stamp'] ?? '')), 0, 80);
    $config['app_release_type'] = wp_version_sanitize_release_type($config['app_release_type'] ?? $defaults['app_release_type']);
    $config['web_release_type'] = wp_version_sanitize_release_type($config['web_release_type'] ?? $defaults['web_release_type']);
    $config['app_release_summary'] = mb_substr(trim((string)($config['app_release_summary'] ?? '')), 0, 240);
    $config['web_release_summary'] = mb_substr(trim((string)($config['web_release_summary'] ?? '')), 0, 240);
    $config['app_title'] = mb_substr(trim((string)($config['app_title'] ?? $defaults['app_title'])) ?: $defaults['app_title'], 0, 120);
    $config['web_title'] = mb_substr(trim((string)($config['web_title'] ?? $defaults['web_title'])) ?: $defaults['web_title'], 0, 120);
    $config['app_message'] = mb_substr(trim((string)($config['app_message'] ?? $defaults['app_message'])) ?: $defaults['app_message'], 0, 600);
    $config['web_message'] = mb_substr(trim((string)($config['web_message'] ?? $defaults['web_message'])) ?: $defaults['web_message'], 0, 600);
    $config['app_about'] = wp_version_sanitize_app_about($config['app_about'] ?? []);
    $config['maintenance_enabled'] = !empty($config['maintenance_enabled']);
    $config['maintenance_message'] = mb_substr(trim((string)($config['maintenance_message'] ?? $defaults['maintenance_message'])) ?: $defaults['maintenance_message'], 0, 600);
    $config['maintenance_start_at'] = wp_version_normalize_datetime($config['maintenance_start_at'] ?? '');
    $config['maintenance_end_at'] = wp_version_normalize_datetime($config['maintenance_end_at'] ?? '');
    $config['maintenance_allowed_ips'] = trim((string)($config['maintenance_allowed_ips'] ?? ''));
    $config['server_package_file'] = mb_substr(trim((string)($config['server_package_file'] ?? '')), 0, 220);
    $config['server_package_mode'] = wp_version_sanitize_package_mode($config['server_package_mode'] ?? 'partial');
    $config['server_package_uploaded_at'] = wp_version_normalize_datetime($config['server_package_uploaded_at'] ?? '');
    $config['server_package_uploaded_by'] = mb_substr(trim((string)($config['server_package_uploaded_by'] ?? '')), 0, 190);
    $config['server_package_applied_at'] = wp_version_normalize_datetime($config['server_package_applied_at'] ?? '');
    $config['server_package_applied_by'] = mb_substr(trim((string)($config['server_package_applied_by'] ?? '')), 0, 190);
    $config['server_package_last_backup'] = mb_substr(trim((string)($config['server_package_last_backup'] ?? '')), 0, 190);
    $config['server_package_linked_app_version'] = mb_substr(trim((string)($config['server_package_linked_app_version'] ?? '')), 0, 60);
    $config['server_package_linked_web_version'] = mb_substr(trim((string)($config['server_package_linked_web_version'] ?? '')), 0, 60);
    $config['server_package_release_synced_at'] = wp_version_normalize_datetime($config['server_package_release_synced_at'] ?? '');
    $config['admin_emails'] = wp_version_sanitize_email_list($config['admin_emails'] ?? []);
    $config['admin_user_permissions'] = wp_version_sanitize_admin_user_permissions($config['admin_user_permissions'] ?? []);
    $config['page_app_modes'] = wp_version_sanitize_page_app_modes($config['page_app_modes'] ?? []);
    $config['page_web_modes'] = wp_version_sanitize_page_web_modes($config['page_web_modes'] ?? []);
    
    $blocked_os = is_array($config['blocked_os_list'] ?? null) ? $config['blocked_os_list'] : [];
    $config['blocked_os_list'] = array_values(array_filter(array_map('strtolower', array_map('trim', $blocked_os))));
    
    $config['social_auth_google_client_id'] = mb_substr(trim((string)($config['social_auth_google_client_id'] ?? '')), 0, 255);
    $config['social_auth_google_redirect_uri'] = mb_substr(trim((string)($config['social_auth_google_redirect_uri'] ?? '')), 0, 255);
    $config['meta_note'] = mb_substr(trim((string)($config['meta_note'] ?? '')), 0, 1200);

    $config['site_seo_title'] = mb_substr(trim((string)($config['site_seo_title'] ?? $defaults['site_seo_title'])), 0, 120);
    $config['site_seo_description'] = mb_substr(trim((string)($config['site_seo_description'] ?? $defaults['site_seo_description'])), 0, 300);
    $config['site_seo_keywords'] = mb_substr(trim((string)($config['site_seo_keywords'] ?? $defaults['site_seo_keywords'])), 0, 255);
    $config['site_seo_name'] = mb_substr(trim((string)($config['site_seo_name'] ?? $defaults['site_seo_name'])), 0, 120);
    $config['site_seo_logo'] = mb_substr(trim((string)($config['site_seo_logo'] ?? $defaults['site_seo_logo'])), 0, 500);
    $config['site_seo_image'] = mb_substr(trim((string)($config['site_seo_image'] ?? $defaults['site_seo_image'])), 0, 500);
    $config['site_seo_google_verification'] = mb_substr(trim((string)($config['site_seo_google_verification'] ?? '')), 0, 255);
    $config['site_seo_bing_verification'] = mb_substr(trim((string)($config['site_seo_bing_verification'] ?? '')), 0, 255);
    $config['site_seo_yandex_verification'] = mb_substr(
        trim((string)($config['site_seo_yandex_verification'] ?? '')) ?: $defaults['site_seo_yandex_verification'],
        0,
        255
    );
    $config['site_seo_default_author'] = mb_substr(trim((string)($config['site_seo_default_author'] ?? $defaults['site_seo_default_author'])), 0, 120);
    $config['site_seo_news_publisher'] = mb_substr(trim((string)($config['site_seo_news_publisher'] ?? $defaults['site_seo_news_publisher'])), 0, 120);
    $config['site_seo_news_logo'] = mb_substr(trim((string)($config['site_seo_news_logo'] ?? $defaults['site_seo_news_logo'])), 0, 500);
    foreach (['site_seo_index_home', 'site_seo_index_songs', 'site_seo_index_song_pages', 'site_seo_index_news', 'site_seo_index_news_articles', 'site_seo_index_transpose'] as $indexSetting) {
        $config[$indexSetting] = !empty($config[$indexSetting]);
    }
    $config['site_contact_email'] = mb_substr(trim((string)($config['site_contact_email'] ?? $defaults['site_contact_email'])), 0, 120);
    $config['site_contact_phone'] = mb_substr(trim((string)($config['site_contact_phone'] ?? $defaults['site_contact_phone'])), 0, 50);
    $config['site_contact_address'] = mb_substr(trim((string)($config['site_contact_address'] ?? $defaults['site_contact_address'])), 0, 200);
    $config['site_social_facebook'] = mb_substr(trim((string)($config['site_social_facebook'] ?? $defaults['site_social_facebook'])), 0, 255);
    $config['site_social_instagram'] = mb_substr(trim((string)($config['site_social_instagram'] ?? $defaults['site_social_instagram'])), 0, 255);
    $config['site_social_youtube'] = mb_substr(trim((string)($config['site_social_youtube'] ?? $defaults['site_social_youtube'])), 0, 255);
    $config['landing_hero_title1'] = mb_substr(trim((string)($config['landing_hero_title1'] ?? $defaults['landing_hero_title1'])), 0, 150);
    $config['landing_hero_title2'] = mb_substr(trim((string)($config['landing_hero_title2'] ?? $defaults['landing_hero_title2'])), 0, 150);
    $config['landing_hero_subtitle'] = mb_substr(trim((string)($config['landing_hero_subtitle'] ?? $defaults['landing_hero_subtitle'])), 0, 400);
    $config['about_hero_title'] = mb_substr(trim((string)($config['about_hero_title'] ?? $defaults['about_hero_title'])), 0, 150);
    $config['about_hero_subtitle'] = mb_substr(trim((string)($config['about_hero_subtitle'] ?? $defaults['about_hero_subtitle'])), 0, 500);
    $config['about_mission_title'] = mb_substr(trim((string)($config['about_mission_title'] ?? $defaults['about_mission_title'])), 0, 150);
    $config['about_mission_text'] = mb_substr(trim((string)($config['about_mission_text'] ?? $defaults['about_mission_text'])), 0, 2000);
    $config['about_vision_title'] = mb_substr(trim((string)($config['about_vision_title'] ?? $defaults['about_vision_title'])), 0, 150);
    $config['about_vision_text'] = mb_substr(trim((string)($config['about_vision_text'] ?? $defaults['about_vision_text'])), 0, 2000);
    $config['about_stat1_number'] = mb_substr(trim((string)($config['about_stat1_number'] ?? $defaults['about_stat1_number'])), 0, 50);
    $config['about_stat1_label'] = mb_substr(trim((string)($config['about_stat1_label'] ?? $defaults['about_stat1_label'])), 0, 100);
    $config['about_stat2_number'] = mb_substr(trim((string)($config['about_stat2_number'] ?? $defaults['about_stat2_number'])), 0, 50);
    $config['about_stat2_label'] = mb_substr(trim((string)($config['about_stat2_label'] ?? $defaults['about_stat2_label'])), 0, 100);
    $config['about_stat3_number'] = mb_substr(trim((string)($config['about_stat3_number'] ?? $defaults['about_stat3_number'])), 0, 50);
    $config['about_stat3_label'] = mb_substr(trim((string)($config['about_stat3_label'] ?? $defaults['about_stat3_label'])), 0, 100);
    $config['privacy_title'] = mb_substr(trim((string)($config['privacy_title'] ?? $defaults['privacy_title'])), 0, 150);
    $config['privacy_subtitle'] = mb_substr(trim((string)($config['privacy_subtitle'] ?? $defaults['privacy_subtitle'])), 0, 500);
    $config['privacy_content'] = mb_substr(trim((string)($config['privacy_content'] ?? $defaults['privacy_content'])), 0, 20000);
    $config['terms_title'] = mb_substr(trim((string)($config['terms_title'] ?? $defaults['terms_title'])), 0, 150);
    $config['terms_subtitle'] = mb_substr(trim((string)($config['terms_subtitle'] ?? $defaults['terms_subtitle'])), 0, 500);
    $config['terms_content'] = mb_substr(trim((string)($config['terms_content'] ?? $defaults['terms_content'])), 0, 20000);
    $config['cookies_title'] = mb_substr(trim((string)($config['cookies_title'] ?? $defaults['cookies_title'])), 0, 150);
    $config['cookies_subtitle'] = mb_substr(trim((string)($config['cookies_subtitle'] ?? $defaults['cookies_subtitle'])), 0, 500);
    $config['cookies_content'] = mb_substr(trim((string)($config['cookies_content'] ?? $defaults['cookies_content'])), 0, 20000);
    $config['updated_at'] = wp_version_normalize_datetime($config['updated_at'] ?? '') ?: wp_version_now_iso();

    return $config;
}

function wp_version_load(): array {
    static $configCache = null;
    if ($configCache !== null) {
        return $configCache;
    }
    $defaults = wp_version_defaults();
    try {
        $pdo = wp_runtime_open_pdo();
        $stmt = $pdo->prepare("SELECT setting_value FROM sys_settings WHERE setting_key = 'version_config'");
        $stmt->execute();
        $val = $stmt->fetchColumn();
        if ($val !== false && $val !== null) {
            $decoded = json_decode((string)$val, true);
            if (is_array($decoded)) {
                $configCache = wp_version_sanitize($decoded);
                return $configCache;
            }
        }
    } catch (Throwable $e) {
        try {
            $conn = wp_runtime_open_mysqli();
            $stmt = $conn->prepare("SELECT setting_value FROM sys_settings WHERE setting_key = 'version_config'");
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $decoded = json_decode($row['setting_value'] ?? '', true);
                if (is_array($decoded)) {
                    $configCache = wp_version_sanitize($decoded);
                    return $configCache;
                }
            }
        } catch (Throwable $e2) {}
    }

    $configCache = $defaults;
    return $configCache;
}

function wp_version_is_scheduled_maintenance_active(array $config, ?DateTimeImmutable $now = null): bool {
    $start = trim((string)($config['maintenance_start_at'] ?? ''));
    $end = trim((string)($config['maintenance_end_at'] ?? ''));

    if ($start === '' && $end === '') {
        return false;
    }

    $now = $now ?: new DateTimeImmutable('now', wp_version_admin_timezone());

    try {
        $startAt = $start !== '' ? new DateTimeImmutable($start, wp_version_admin_timezone()) : null;
        $endAt = $end !== '' ? new DateTimeImmutable($end, wp_version_admin_timezone()) : null;
    } catch (Throwable $e) {
        return false;
    }

    if ($startAt && $now < $startAt) return false;
    if ($endAt && $now > $endAt) return false;

    return true;
}

function wp_version_is_maintenance_active(array $config): bool {
    $is_active = false;
    
    if (!empty($config['maintenance_enabled'])) {
        $is_active = true;
    } elseif (wp_version_is_scheduled_maintenance_active($config)) {
        $is_active = true;
    }

    if ($is_active && !empty($config['maintenance_allowed_ips'])) {
        $client_ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
        if ($client_ip) {
            $allowed_ips = array_map('trim', explode(',', $config['maintenance_allowed_ips']));
            foreach ($allowed_ips as $ip) {
                if ($ip !== '' && strpos($client_ip, $ip) !== false) {
                    return false; // Bypass maintenance for this IP
                }
            }
        }
    }

    return $is_active;
}

function wp_version_diff(array $before, array $after): array {
    $changed = [];

    foreach ($after as $key => $value) {
        if (!array_key_exists($key, $before)) {
            $changed[] = $key;
            continue;
        }

        if ($before[$key] !== $value) {
            $changed[] = $key;
        }
    }

    return $changed;
}

function wp_version_history_append(array $entry): void {
    $id = $entry['id'] ?? bin2hex(random_bytes(8));
    $at = wp_version_normalize_datetime($entry['at'] ?? '') ?: wp_version_now_iso();
    $actor = mb_substr(trim((string)($entry['actor'] ?? '')), 0, 190);
    $ip = mb_substr(trim((string)($entry['ip'] ?? '')), 0, 80);
    $action = mb_substr(trim((string)($entry['action'] ?? '')), 0, 100);
    $changed_fields = json_encode($entry['changed_fields'] ?? [], JSON_UNESCAPED_UNICODE);
    $snapshot = json_encode($entry['snapshot'] ?? [], JSON_UNESCAPED_UNICODE);
    $note = (string)($entry['note'] ?? '');

    try {
        $pdo = wp_runtime_open_pdo();
        $stmt = $pdo->prepare("INSERT INTO version_history (id, at, actor, ip, action, changed_fields, snapshot, note) VALUES (:id, :at, :actor, :ip, :action, :cf, :snap, :note)");
        $stmt->execute([
            ':id' => $id, ':at' => $at, ':actor' => $actor, ':ip' => $ip,
            ':action' => $action, ':cf' => $changed_fields, ':snap' => $snapshot, ':note' => $note
        ]);
        return;
    } catch (Throwable $e) {}

    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare("INSERT INTO version_history (id, at, actor, ip, action, changed_fields, snapshot, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('ssssssss', $id, $at, $actor, $ip, $action, $changed_fields, $snapshot, $note);
        $stmt->execute();
    } catch (Throwable $e) {}
}

function wp_version_history_load(int $limit = 20): array {
    $items = [];
    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare("SELECT * FROM version_history ORDER BY at DESC LIMIT ?");
        $stmt->bind_param('i', $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $row['changed_fields'] = json_decode($row['changed_fields'] ?? '[]', true) ?: [];
            $row['snapshot'] = json_decode($row['snapshot'] ?? '{}', true) ?: [];
            $items[] = $row;
        }
    } catch (Throwable $e) {}
    
    return $items;
}

function wp_version_history_find(string $id): ?array {
    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare("SELECT * FROM version_history WHERE id = ?");
        $stmt->bind_param('s', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $row['changed_fields'] = json_decode($row['changed_fields'] ?? '[]', true) ?: [];
            $row['snapshot'] = json_decode($row['snapshot'] ?? '{}', true) ?: [];
            return $row;
        }
    } catch (Throwable $e) {}
    return null;
}

function wp_version_history_clear(): bool {
    try {
        $conn = wp_runtime_open_mysqli();
        return $conn->query("TRUNCATE TABLE version_history");
    } catch (Throwable $e) {
        return false;
    }
}

function wp_version_store_last_save_result(array $result): void {
    $GLOBALS['wp_version_last_save_result'] = $result;
}

function wp_version_last_save_result(): array {
    $result = $GLOBALS['wp_version_last_save_result'] ?? null;
    return is_array($result) ? $result : [];
}

function wp_version_save(array $input, array $meta = []): bool {
    $current = wp_version_load();
    $candidate = wp_version_sanitize(array_merge($current, $input, [
        'updated_at' => (string)($current['updated_at'] ?? ''),
    ]));
    $changedFields = array_values(array_filter(
        wp_version_diff($current, $candidate),
        static fn(string $field): bool => $field !== 'updated_at'
    ));

    if (!$changedFields) {
        wp_version_store_last_save_result([
            'ok' => true,
            'changed' => false,
            'history_appended' => false,
            'changed_fields' => [],
            'config' => $current,
        ]);
        return true;
    }

    $candidate['updated_at'] = wp_version_now_iso();
    $config = wp_version_sanitize($candidate);
    
    $saved = false;
    $json = json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    try {
        $pdo = wp_runtime_open_pdo();
        $stmt = $pdo->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES ('version_config', :json) ON DUPLICATE KEY UPDATE setting_value = :json2");
        $saved = $stmt->execute([':json' => $json, ':json2' => $json]);
    } catch (Throwable $e) {
        try {
            $conn = wp_runtime_open_mysqli();
            $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES ('version_config', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
            $stmt->bind_param('ss', $json, $json);
            $saved = $stmt->execute();
        } catch (Throwable $e2) {}
    }

    if (!$saved) {
        wp_version_store_last_save_result([
            'ok' => false,
            'changed' => true,
            'history_appended' => false,
            'changed_fields' => $changedFields,
            'config' => $config,
        ]);
        return false;
    }

    $historyId = bin2hex(random_bytes(8));

    wp_version_history_append([
        'id' => $historyId,
        'at' => $config['updated_at'],
        'actor' => (string)($meta['actor'] ?? 'admin'),
        'ip' => (string)($meta['ip'] ?? ''),
        'action' => (string)($meta['action'] ?? 'save'),
        'changed_fields' => $changedFields,
        'snapshot' => $config,
        'note' => (string)($config['meta_note'] ?? ''),
    ]);

    wp_version_store_last_save_result([
        'ok' => true,
        'changed' => true,
        'history_appended' => true,
        'changed_fields' => $changedFields,
        'config' => $config,
        'history_id' => $historyId,
    ]);

    return true;
}
