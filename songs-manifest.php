<?php
declare(strict_types=1);

header('Content-Type: application/manifest+json; charset=utf-8');

echo json_encode([
    'name' => 'Worship Admin Songs',
    'short_name' => 'Admin Songs',
    'id' => '/songs.php?source=admin-app',
    'start_url' => '/songs.php?source=admin-app',
    'scope' => '/',
    'display_override' => ['window-controls-overlay', 'standalone', 'minimal-ui'],
    'display' => 'standalone',
    'description' => 'Երգերի կառավարման առանձին ծրագիր Worship Platform-ի ադմինների համար։',
    'categories' => ['productivity', 'utilities', 'music'],
    'launch_handler' => [
        'client_mode' => ['focus-existing', 'auto'],
    ],
    'prefer_related_applications' => false,
    'background_color' => '#070910',
    'theme_color' => '#070910',
    'orientation' => 'portrait',
    'shortcuts' => [
        [
            'name' => 'Երգերի ցանկ',
            'short_name' => 'Երգեր',
            'description' => 'Բացել երգերի կառավարման հիմնական բաժինը',
            'url' => '/songs.php?source=admin-app',
            'icons' => [
                [
                    'src' => '/wolarm_developers.png',
                    'sizes' => '192x192',
                    'type' => 'image/png',
                ],
            ],
        ],
        [
            'name' => 'Թարմացումներ',
            'short_name' => 'Թարմ.',
            'description' => 'Բացել թարմացումների և տեղադրման կառավարումը',
            'url' => '/admin_updates.php?source=admin-app',
            'icons' => [
                [
                    'src' => '/wolarm_developers.png',
                    'sizes' => '192x192',
                    'type' => 'image/png',
                ],
            ],
        ],
    ],
    'screenshots' => [
        [
            'src' => '/admin-screenshot-dashboard.svg',
            'sizes' => '1242x2688',
            'type' => 'image/svg+xml',
            'form_factor' => 'narrow',
            'label' => 'Worship Admin ծրագրի հիմնական dashboard տեսքը',
        ],
        [
            'src' => '/admin-screenshot-editor.svg',
            'sizes' => '1600x900',
            'type' => 'image/svg+xml',
            'form_factor' => 'wide',
            'label' => 'Worship Admin ծրագրի երգերի խմբագրման էկրանը',
        ],
    ],
    'icons' => [
        [
            'src' => '/wolarm_developers.png',
            'sizes' => '192x192',
            'type' => 'image/png',
            'purpose' => 'any maskable',
        ],
        [
            'src' => '/wolarm_developers.png',
            'sizes' => '512x512',
            'type' => 'image/png',
            'purpose' => 'any maskable',
        ],
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
