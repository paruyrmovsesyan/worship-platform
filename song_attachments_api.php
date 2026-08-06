<?php
declare(strict_types=1);

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/admin_access.php';

header('Content-Type: application/json; charset=utf-8');

function wp_song_material_out(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function wp_song_material_require_song(PDO $pdo, int $songId): void {
    if ($songId <= 0) {
        wp_song_material_out(['error' => 'Սխալ երգի համար'], 400);
    }

    $statement = $pdo->prepare('SELECT id FROM songs WHERE id = ? LIMIT 1');
    $statement->execute([$songId]);
    if (!$statement->fetchColumn()) {
        wp_song_material_out(['error' => 'Երգը չի գտնվել'], 404);
    }
}

function wp_song_material_type(string $type): string {
    $type = strtolower(trim($type));
    return in_array($type, ['link', 'video', 'audio', 'image', 'document'], true) ? $type : 'link';
}

function wp_song_material_text_length(string $value): int {
    return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
}

function wp_song_material_ensure_table(PDO $pdo): void {
    static $ensured = false;
    if ($ensured) return;

    try {
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS song_attachments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                song_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'link',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS song_attachments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                song_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                url TEXT NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'link',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_song_attachments_song_id (song_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }
    } catch (Throwable $e) {
        // Ignore if already created
    }

    $ensured = true;
}

function wp_song_material_can_manage(
    PDO $pdo,
    ?array $adminUser,
    int $sessionUserId
): bool {
    // Check admin authorization
    if ($adminUser) {
        $config = wp_version_load();
        if (wp_admin_is_authorized($adminUser, $config)) {
            return true;
        }
    }

    // Check DB user role
    $userIdToCheck = (int)($adminUser['id'] ?? $sessionUserId);
    if ($userIdToCheck > 0) {
        try {
            $statement = $pdo->prepare('SELECT role, is_admin FROM users WHERE id = ? LIMIT 1');
            $statement->execute([$userIdToCheck]);
            $userRow = $statement->fetch(PDO::FETCH_ASSOC);
            if ($userRow) {
                $role = strtolower(trim((string)($userRow['role'] ?? '')));
                $isAdmin = !empty($userRow['is_admin']);
                if ($isAdmin || in_array($role, ['admin', 'owner', 'superadmin', 'super_admin'], true)) {
                    return true;
                }
            }
        } catch (Throwable $error) {
            // fallthrough
        }
    }

    return false;
}

function wp_song_material_insert(
    PDO $pdo,
    int $songId,
    string $title,
    string $url,
    string $type
): array {
    $statement = $pdo->prepare(
        'INSERT INTO song_attachments (song_id, title, url, type) VALUES (?, ?, ?, ?)'
    );
    $statement->execute([$songId, $title, $url, $type]);

    return [
        'id' => (int)$pdo->lastInsertId(),
        'song_id' => $songId,
        'title' => $title,
        'url' => $url,
        'type' => $type,
    ];
}

function wp_song_material_upload_error(int $error): string {
    return match ($error) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Ֆայլը գերազանցում է սերվերի թույլատրելի չափը',
        UPLOAD_ERR_PARTIAL => 'Ֆայլը ամբողջությամբ չի վերբեռնվել',
        UPLOAD_ERR_NO_FILE => 'Ֆայլ ընտրված չէ',
        UPLOAD_ERR_NO_TMP_DIR => 'Սերվերում ժամանակավոր պանակը բացակայում է',
        UPLOAD_ERR_CANT_WRITE => 'Սերվերը չկարողացավ պահպանել ֆայլը',
        UPLOAD_ERR_EXTENSION => 'Սերվերը դադարեցրել է ֆայլի վերբեռնումը',
        default => 'Ֆայլը վերբեռնել չհաջողվեց',
    };
}

function wp_song_material_detect_type(string $extension): string {
    if (in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) return 'image';
    if (in_array($extension, ['mp3', 'm4a', 'wav', 'ogg'], true)) return 'audio';
    if (in_array($extension, ['mp4', 'webm', 'mov'], true)) return 'video';
    return 'document';
}

function wp_song_material_safe_name(string $originalName, string $extension): string {
    $stem = pathinfo($originalName, PATHINFO_FILENAME);
    $stem = preg_replace('/[^\pL\pN_-]+/u', '-', $stem) ?: 'material';
    $stem = trim($stem, '-_');
    if ($stem === '') $stem = 'material';
    $stem = function_exists('mb_substr') ? mb_substr($stem, 0, 80) : substr($stem, 0, 80);

    return bin2hex(random_bytes(8)) . '-' . $stem . '.' . $extension;
}

function wp_song_material_delete_local_file(string $url): void {
    $path = (string)(parse_url($url, PHP_URL_PATH) ?? '');
    $prefix = '/uploads/song_materials/';
    if (!str_starts_with($path, $prefix) || str_contains($path, '..')) {
        return;
    }

    $relative = rawurldecode(ltrim(substr($path, strlen($prefix)), '/'));
    $base = realpath(__DIR__ . '/uploads/song_materials');
    if ($base === false || $relative === '') {
        return;
    }

    $file = realpath($base . DIRECTORY_SEPARATOR . $relative);
    if ($file !== false && str_starts_with($file, $base . DIRECTORY_SEPARATOR) && is_file($file)) {
        @unlink($file);
    }
}

try {
    $pdo = wp_runtime_open_pdo();
    wp_song_material_ensure_table($pdo);
} catch (Throwable $error) {
    wp_song_material_out(['error' => 'Տվյալների բազային միանալ չհաջողվեց'], 500);
}

$adminUser = wp_admin_get_current_user();
$sessionUserId = (int)($_SESSION['user_id'] ?? 0);
if (!$adminUser && $sessionUserId <= 0) {
    wp_song_material_out(['error' => 'Մուտք գործեք համակարգ'], 401);
}
if (!wp_song_material_can_manage($pdo, $adminUser, $sessionUserId)) {
    wp_song_material_out(['error' => 'Երգի նյութերը փոխելու թույլտվություն չկա'], 403);
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = strtolower(trim((string)($_GET['action'] ?? '')));

if ($action === 'add' && $method === 'POST') {
    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        wp_song_material_out(['error' => 'Սխալ տվյալներ են ուղարկվել'], 400);
    }

    $songId = (int)($payload['song_id'] ?? 0);
    $title = trim((string)($payload['title'] ?? ''));
    $url = trim((string)($payload['url'] ?? ''));
    $type = wp_song_material_type((string)($payload['type'] ?? 'link'));

    if ($title === '' || $url === '') {
        wp_song_material_out(['error' => 'Լրացրեք նյութի անվանումը և հղումը'], 400);
    }
    if (wp_song_material_text_length($title) > 255) {
        wp_song_material_out(['error' => 'Նյութի անվանումը չափազանց երկար է'], 400);
    }

    // Auto-prefix https:// if scheme is missing
    if (!preg_match('~^https?://~i', $url)) {
        $url = 'https://' . ltrim($url, '/');
    }

    $scheme = strtolower((string)(parse_url($url, PHP_URL_SCHEME) ?? ''));
    if (!in_array($scheme, ['http', 'https'], true) || strlen($url) < 8) {
        wp_song_material_out(['error' => 'Գրեք գործող http կամ https հղում'], 400);
    }

    try {
        wp_song_material_require_song($pdo, $songId);
        $attachment = wp_song_material_insert($pdo, $songId, $title, $url, $type);
        wp_song_material_out(['ok' => true, 'id' => $attachment['id'], 'attachment' => $attachment]);
    } catch (Throwable $error) {
        wp_song_material_out(['error' => 'Նյութի հղումը պահպանել չհաջողվեց'], 500);
    }
}

if ($action === 'upload' && $method === 'POST') {
    $songId = (int)($_POST['song_id'] ?? 0);
    $title = trim((string)($_POST['title'] ?? ''));
    $requestedType = wp_song_material_type((string)($_POST['type'] ?? 'link'));
    $file = $_FILES['file'] ?? null;

    if (!is_array($file)) {
        wp_song_material_out(['error' => 'Ֆայլ ընտրված չէ'], 400);
    }
    $uploadError = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($uploadError !== UPLOAD_ERR_OK) {
        wp_song_material_out(['error' => wp_song_material_upload_error($uploadError)], 400);
    }

    $size = (int)($file['size'] ?? 0);
    if ($size <= 0 || $size > 40 * 1024 * 1024) {
        wp_song_material_out(['error' => 'Ֆայլը պետք է լինի առավելագույնը 40 ՄԲ'], 400);
    }

    $originalName = trim((string)($file['name'] ?? ''));
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowedExtensions = [
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'mp3', 'm4a', 'wav', 'ogg',
        'mp4', 'webm', 'mov',
        'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt',
    ];
    if (!in_array($extension, $allowedExtensions, true)) {
        wp_song_material_out(['error' => 'Այս ֆայլի տեսակը թույլատրված չէ'], 400);
    }

    $detectedType = wp_song_material_detect_type($extension);
    $type = $requestedType === 'link' ? $detectedType : $requestedType;
    if ($type !== $detectedType && $detectedType !== 'document') {
        $type = $detectedType;
    }
    if ($title === '') {
        $title = pathinfo($originalName, PATHINFO_FILENAME) ?: 'Նյութ';
    }
    if (wp_song_material_text_length($title) > 255) {
        wp_song_material_out(['error' => 'Նյութի անվանումը չափազանց երկար է'], 400);
    }

    try {
        wp_song_material_require_song($pdo, $songId);
        $directory = __DIR__ . '/uploads/song_materials/' . $songId;
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new RuntimeException('Upload directory could not be created');
        }

        $storedName = wp_song_material_safe_name($originalName, $extension);
        $destination = $directory . '/' . $storedName;
        if (!move_uploaded_file((string)$file['tmp_name'], $destination)) {
            throw new RuntimeException('Uploaded file could not be moved');
        }
        @chmod($destination, 0640);

        $url = '/uploads/song_materials/' . $songId . '/' . rawurlencode($storedName);
        try {
            $attachment = wp_song_material_insert($pdo, $songId, $title, $url, $type);
        } catch (Throwable $error) {
            @unlink($destination);
            throw $error;
        }

        wp_song_material_out(['ok' => true, 'attachment' => $attachment]);
    } catch (Throwable $error) {
        wp_song_material_out(['error' => 'Ֆայլը պահպանել չհաջողվեց'], 500);
    }
}

if ($action === 'remove' && $method === 'POST') {
    $payload = json_decode((string)file_get_contents('php://input'), true);
    $id = is_array($payload) ? (int)($payload['id'] ?? 0) : 0;
    if ($id <= 0) {
        wp_song_material_out(['error' => 'Սխալ նյութի համար'], 400);
    }

    try {
        $statement = $pdo->prepare('SELECT id, url FROM song_attachments WHERE id = ? LIMIT 1');
        $statement->execute([$id]);
        $attachment = $statement->fetch(PDO::FETCH_ASSOC);
        if (!$attachment) {
            wp_song_material_out(['error' => 'Նյութը չի գտնվել'], 404);
        }

        $statement = $pdo->prepare('DELETE FROM song_attachments WHERE id = ?');
        $statement->execute([$id]);
        wp_song_material_delete_local_file((string)$attachment['url']);
        wp_song_material_out(['ok' => true]);
    } catch (Throwable $error) {
        wp_song_material_out(['error' => 'Նյութը հեռացնել չհաջողվեց'], 500);
    }
}

wp_song_material_out(['error' => 'Չճանաչված գործողություն'], 404);
