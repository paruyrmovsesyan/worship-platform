<?php
declare(strict_types=1);

const WP_RELEASE_RUNTIME_DIR = __DIR__ . '/_admin_runtime';
const WP_RELEASE_PACKAGES_DIR = WP_RELEASE_RUNTIME_DIR . '/packages';
const WP_RELEASE_BACKUPS_DIR = WP_RELEASE_RUNTIME_DIR . '/backups';

function wp_release_runtime_dirs(): array {
    return [
        WP_RELEASE_RUNTIME_DIR,
        WP_RELEASE_PACKAGES_DIR,
        WP_RELEASE_BACKUPS_DIR,
    ];
}

function wp_release_ensure_runtime_dirs(): bool {
    foreach (wp_release_runtime_dirs() as $dir) {
        if (is_dir($dir)) {
            continue;
        }

        if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
            return false;
        }
    }

    return true;
}

function wp_release_sanitize_filename(string $name): string {
    $name = trim(str_replace('\\', '/', $name));
    $name = basename($name);
    $name = preg_replace('/[^A-Za-z0-9._-]+/', '-', $name) ?: 'release.zip';
    return $name !== '' ? $name : 'release.zip';
}

function wp_release_normalize_archive_path(string $path): ?string {
    $path = str_replace('\\', '/', trim($path));
    $path = ltrim($path, '/');

    while (strpos($path, './') === 0) {
        $path = substr($path, 2);
    }

    if ($path === '' || strpos($path, '../') !== false || $path === '..') {
        return null;
    }

    if (strpos($path, '__MACOSX/') === 0 || substr($path, -1) === '/') {
        return null;
    }

    $segments = array_values(array_filter(explode('/', $path), static function ($segment) {
        return $segment !== '';
    }));

    foreach ($segments as $segment) {
        if ($segment === '.' || $segment === '..') {
            return null;
        }
    }

    return implode('/', $segments);
}

function wp_release_detect_root_prefix(array $paths): string {
    if (!$paths) {
        return '';
    }

    $firstSegments = [];
    foreach ($paths as $path) {
        $parts = explode('/', $path);
        if (count($parts) < 2) {
            return '';
        }
        $firstSegments[] = $parts[0];
    }

    $unique = array_values(array_unique($firstSegments));
    return count($unique) === 1 ? ($unique[0] . '/') : '';
}

function wp_release_is_excluded_path(string $relativePath): bool {
    $relativePath = ltrim(str_replace('\\', '/', $relativePath), '/');

    if ($relativePath === '' || $relativePath === '.DS_Store') {
        return true;
    }

    $excludedExact = [
        'version_config_store.php',
        'version_history_store.jsonl',
        'install_stats_store.json',
        'push_config_store.php',
        'push_subscriptions_store.json',
        'push_history_store.jsonl',
        'push_queue_store.json',
        'error_log',
    ];

    if (in_array($relativePath, $excludedExact, true)) {
        return true;
    }

    return strpos($relativePath, '_admin_runtime/') === 0;
}

function wp_release_resolve_package_path(string $packageFile): ?string {
    $packageFile = wp_release_sanitize_filename($packageFile);
    $path = WP_RELEASE_PACKAGES_DIR . '/' . $packageFile;
    return is_file($path) ? $path : null;
}

function wp_release_store_uploaded_package(array $file): array {
    if (!wp_release_ensure_runtime_dirs()) {
        return ['ok' => false, 'message' => 'Չհաջողվեց ստեղծել release storage պանակները։'];
    }

    if (empty($file) || !isset($file['error'])) {
        return ['ok' => false, 'message' => 'Update package file չի ընտրվել։'];
    }

    if ((int)$file['error'] !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'message' => 'ZIP upload-ը չհաջողվեց։'];
    }

    $originalName = wp_release_sanitize_filename((string)($file['name'] ?? 'release.zip'));
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if ($extension !== 'zip') {
        return ['ok' => false, 'message' => 'Թույլատրվում է միայն ZIP package։'];
    }

    $stamp = (new DateTimeImmutable('now', wp_version_admin_timezone()))->format('Ymd-His');
    $storedName = $stamp . '-' . $originalName;
    $target = WP_RELEASE_PACKAGES_DIR . '/' . $storedName;
    $tmpName = (string)($file['tmp_name'] ?? '');

    $moved = $tmpName !== '' && @move_uploaded_file($tmpName, $target);
    if (!$moved && $tmpName !== '' && is_file($tmpName)) {
        $moved = @rename($tmpName, $target);
    }

    if (!$moved) {
        return ['ok' => false, 'message' => 'Չհաջողվեց պահպանել ZIP package-ը սերվերի վրա։'];
    }

    return [
        'ok' => true,
        'file' => $storedName,
        'path' => $target,
        'size' => (int)@filesize($target),
    ];
}

function wp_release_copy_stream_to_file($stream, string $destination): bool {
    $dir = dirname($destination);
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        return false;
    }

    $tmpDestination = $destination . '.tmp-' . bin2hex(random_bytes(4));
    $out = @fopen($tmpDestination, 'wb');
    if (!$out) {
        return false;
    }

    stream_copy_to_stream($stream, $out);
    fclose($out);
    fclose($stream);

    if (!@rename($tmpDestination, $destination)) {
        @unlink($tmpDestination);
        return false;
    }

    return true;
}

function wp_release_apply_package(string $packagePath): array {
    if (!class_exists('ZipArchive')) {
        return ['ok' => false, 'message' => 'Սերվերում ZipArchive extension-ը հասանելի չէ։'];
    }

    if (!is_file($packagePath)) {
        return ['ok' => false, 'message' => 'Ընտրված package file-ը չգտնվեց սերվերում։'];
    }

    if (!wp_release_ensure_runtime_dirs()) {
        return ['ok' => false, 'message' => 'Չհաջողվեց պատրաստել release runtime պանակները։'];
    }

    $zip = new ZipArchive();
    if ($zip->open($packagePath) !== true) {
        return ['ok' => false, 'message' => 'Չհաջողվեց բացել ZIP package-ը։'];
    }

    $entries = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $stat = $zip->statIndex($i);
        if (!is_array($stat) || empty($stat['name'])) {
            continue;
        }

        $normalized = wp_release_normalize_archive_path((string)$stat['name']);
        if ($normalized === null) {
            continue;
        }

        $entries[] = [
            'zip_name' => (string)$stat['name'],
            'path' => $normalized,
        ];
    }

    if (!$entries) {
        $zip->close();
        return ['ok' => false, 'message' => 'ZIP package-ի ներսում կիրառելի ֆայլեր չկան։'];
    }

    $rootPrefix = wp_release_detect_root_prefix(array_column($entries, 'path'));
    $backupId = (new DateTimeImmutable('now', wp_version_admin_timezone()))->format('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $backupDir = WP_RELEASE_BACKUPS_DIR . '/' . $backupId;
    $backupFilesDir = $backupDir . '/files';

    if (!@mkdir($backupFilesDir, 0775, true) && !is_dir($backupFilesDir)) {
        $zip->close();
        return ['ok' => false, 'message' => 'Չհաջողվեց ստեղծել backup պանակը։'];
    }

    $appliedFiles = [];
    $addedFiles = [];
    $overwrittenFiles = [];

    foreach ($entries as $entry) {
        $relativePath = $entry['path'];
        if ($rootPrefix !== '' && strpos($relativePath, $rootPrefix) === 0) {
            $relativePath = substr($relativePath, strlen($rootPrefix));
        }

        $relativePath = ltrim($relativePath, '/');
        if ($relativePath === '' || wp_release_is_excluded_path($relativePath)) {
            continue;
        }

        $destination = __DIR__ . '/' . $relativePath;
        $destinationDir = dirname($destination);
        if (!is_dir($destinationDir) && !@mkdir($destinationDir, 0775, true) && !is_dir($destinationDir)) {
            $zip->close();
            return ['ok' => false, 'message' => 'Չհաջողվեց պատրաստել թիրախ պանակը `' . $relativePath . '` ֆայլի համար։'];
        }

        if (is_file($destination)) {
            $backupTarget = $backupFilesDir . '/' . $relativePath;
            $backupTargetDir = dirname($backupTarget);
            if (!is_dir($backupTargetDir) && !@mkdir($backupTargetDir, 0775, true) && !is_dir($backupTargetDir)) {
                $zip->close();
                return ['ok' => false, 'message' => 'Չհաջողվեց backup անել `' . $relativePath . '` ֆայլը։'];
            }
            if (!@copy($destination, $backupTarget)) {
                $zip->close();
                return ['ok' => false, 'message' => 'Չհաջողվեց backup անել `' . $relativePath . '` ֆայլը։'];
            }
            $overwrittenFiles[] = $relativePath;
        } else {
            $addedFiles[] = $relativePath;
        }

        $stream = $zip->getStream($entry['zip_name']);
        if (!$stream) {
            $zip->close();
            return ['ok' => false, 'message' => 'Չհաջողվեց կարդալ ZIP-ի `' . $relativePath . '` ֆայլը։'];
        }

        if (!wp_release_copy_stream_to_file($stream, $destination)) {
            $zip->close();
            return ['ok' => false, 'message' => 'Չհաջողվեց փոխարինել `' . $relativePath . '` ֆայլը։'];
        }

        $appliedFiles[] = $relativePath;
    }

    $zip->close();

    if (!$appliedFiles) {
        return ['ok' => false, 'message' => 'ZIP package-ը բացվեց, բայց կիրառվող ֆայլեր չկային։'];
    }

    @file_put_contents($backupDir . '/manifest.json', json_encode([
        'package_file' => basename($packagePath),
        'applied_at' => wp_version_now_iso(),
        'backup_id' => $backupId,
        'applied_files' => $appliedFiles,
        'overwritten_files' => $overwrittenFiles,
        'added_files' => $addedFiles,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));

    return [
        'ok' => true,
        'backup_id' => $backupId,
        'package_file' => basename($packagePath),
        'applied_count' => count($appliedFiles),
        'overwritten_count' => count($overwrittenFiles),
        'added_count' => count($addedFiles),
        'message' => 'Package-ը հաջողությամբ կիրառվեց սերվերի վրա։',
    ];
}
