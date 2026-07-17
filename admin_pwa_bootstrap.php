<?php
declare(strict_types=1);

function wp_admin_render_pwa_head(string $title, array $options = []): void
{
    $themeColor = (string)($options['theme_color'] ?? '#f4f7fe');
    $icon = (string)($options['icon'] ?? '/wolarm_developers.png');
    $manifest = (string)($options['manifest'] ?? '/songs-manifest.php');
    $viewport = (string)($options['viewport'] ?? 'width=device-width, initial-scale=1, viewport-fit=cover');
    $scope = (string)($options['scope'] ?? 'admin');
    $appleTitle = (string)($options['apple_title'] ?? 'Worship Admin');

    echo '<meta charset="utf-8">' . "\n";
    echo '<meta name="viewport" content="' . htmlspecialchars($viewport, ENT_QUOTES) . '">' . "\n";
    echo '<link rel="manifest" href="' . htmlspecialchars($manifest, ENT_QUOTES) . '">' . "\n";
    echo '<meta name="apple-mobile-web-app-capable" content="yes">' . "\n";
    echo '<meta name="apple-mobile-web-app-status-bar-style" content="default">' . "\n";
    echo '<meta name="apple-mobile-web-app-title" content="' . htmlspecialchars($appleTitle, ENT_QUOTES) . '">' . "\n";
    echo '<meta name="mobile-web-app-capable" content="yes">' . "\n";
    echo '<meta name="wp-app-scope" content="' . htmlspecialchars($scope, ENT_QUOTES) . '">' . "\n";
    echo '<meta name="theme-color" content="' . htmlspecialchars($themeColor, ENT_QUOTES) . '">' . "\n";
    echo '<title>' . htmlspecialchars($title, ENT_QUOTES) . '</title>' . "\n";
    echo '<link rel="apple-touch-icon" href="' . htmlspecialchars($icon, ENT_QUOTES) . '" type="image/png">' . "\n";
    echo '<link rel="icon" href="' . htmlspecialchars($icon, ENT_QUOTES) . '" type="image/png">' . "\n";
    echo '<script src="/pwa-init.js" defer></script>' . "\n";
}
