<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

if (!function_exists('wp_song_request_table_name')) {
    function wp_song_request_table_name(): string {
        return 'song_change_requests';
    }
}

if (!function_exists('wp_song_request_ensure_table_mysqli')) {
    function wp_song_request_ensure_table_mysqli(mysqli $conn): bool {
        static $done = false;
        if ($done) {
            return true;
        }

        $sql = "CREATE TABLE IF NOT EXISTS " . wp_song_request_table_name() . " (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            song_id INT UNSIGNED NULL,
            resolved_song_id INT UNSIGNED NULL,
            request_type VARCHAR(20) NOT NULL DEFAULT 'edit',
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            submitted_by_user_id INT UNSIGNED NOT NULL,
            submitted_by_name VARCHAR(191) NULL,
            submitted_by_email VARCHAR(191) NULL,
            submitted_message TEXT NULL,
            title VARCHAR(255) NOT NULL,
            title_hy VARCHAR(255) NULL,
            title_lat VARCHAR(255) NULL,
            title_en VARCHAR(255) NULL,
            title_ru VARCHAR(255) NULL,
            artist VARCHAR(255) NULL,
            song_key VARCHAR(64) NULL,
            bpm SMALLINT UNSIGNED NULL,
            tags VARCHAR(255) NULL,
            chords MEDIUMTEXT NULL,
            lyrics MEDIUMTEXT NULL,
            source_snapshot LONGTEXT NULL,
            review_note TEXT NULL,
            reviewed_by_user_id INT UNSIGNED NULL,
            reviewed_by_name VARCHAR(191) NULL,
            reviewed_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_status_created (status, created_at),
            KEY idx_song_status (song_id, status),
            KEY idx_submitter_status (submitted_by_user_id, status)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB";

        if (!$conn->query($sql)) {
            return false;
        }

        $requiredColumns = [
            'title_hy' => "ALTER TABLE " . wp_song_request_table_name() . " ADD COLUMN title_hy VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER title",
            'title_lat' => "ALTER TABLE " . wp_song_request_table_name() . " ADD COLUMN title_lat VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER title_hy",
            'title_en' => "ALTER TABLE " . wp_song_request_table_name() . " ADD COLUMN title_en VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER title_lat",
            'title_ru' => "ALTER TABLE " . wp_song_request_table_name() . " ADD COLUMN title_ru VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER title_en",
            'artist' => "ALTER TABLE " . wp_song_request_table_name() . " ADD COLUMN artist VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER title_ru",
            'song_key' => "ALTER TABLE " . wp_song_request_table_name() . " ADD COLUMN song_key VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER artist",
            'bpm' => "ALTER TABLE " . wp_song_request_table_name() . " ADD COLUMN bpm SMALLINT UNSIGNED NULL AFTER song_key",
            'tags' => "ALTER TABLE " . wp_song_request_table_name() . " ADD COLUMN tags VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER bpm",
        ];

        foreach ($requiredColumns as $column => $alterSql) {
            $safeColumn = preg_replace('/[^A-Za-z0-9_]+/', '', $column);
            $check = $conn->query("SHOW COLUMNS FROM " . wp_song_request_table_name() . " LIKE '{$safeColumn}'");
            $exists = $check instanceof mysqli_result && $check->num_rows > 0;
            if ($check instanceof mysqli_result) {
                $check->free();
            }
            if (!$exists && !$conn->query($alterSql)) {
                return false;
            }
        }

        $done = true;
        return true;
    }
}

if (!function_exists('wp_song_request_trim')) {
    function wp_song_request_trim($value): string {
        return trim((string)$value);
    }
}

if (!function_exists('wp_song_request_build_combined_title')) {
    function wp_song_request_build_combined_title(array $payload): string {
        $parts = [
            wp_song_request_trim($payload['title_hy'] ?? ''),
            wp_song_request_trim($payload['title_lat'] ?? ''),
            wp_song_request_trim($payload['title_en'] ?? ''),
            wp_song_request_trim($payload['title_ru'] ?? ''),
        ];
        $parts = array_values(array_filter($parts, function($value) { return $value !== ''; }));
        if ($parts) {
            return implode(' / ', $parts);
        }
        return wp_song_request_trim($payload['title'] ?? '');
    }
}

if (!function_exists('wp_song_request_normalize_payload')) {
    function wp_song_request_normalize_payload(array $payload): array {
        $requestType = wp_song_request_trim($payload['request_type'] ?? 'edit');
        if (!in_array($requestType, ['edit', 'new'], true)) {
            $requestType = 'edit';
        }

        $normalized = [
            'song_id' => max(0, (int)($payload['song_id'] ?? 0)),
            'request_type' => $requestType,
            'title_hy' => wp_song_request_trim($payload['title_hy'] ?? ''),
            'title_lat' => wp_song_request_trim($payload['title_lat'] ?? ''),
            'title_en' => wp_song_request_trim($payload['title_en'] ?? ''),
            'title_ru' => wp_song_request_trim($payload['title_ru'] ?? ''),
            'artist' => wp_song_request_trim($payload['artist'] ?? ''),
            'song_key' => wp_song_request_trim($payload['song_key'] ?? ($payload['key'] ?? '')),
            'bpm' => max(0, (int)($payload['bpm'] ?? 0)),
            'tags' => wp_song_request_trim($payload['tags'] ?? ''),
            'chords' => (string)($payload['chords'] ?? ''),
            'lyrics' => (string)($payload['lyrics'] ?? ''),
            'submitted_message' => wp_song_request_trim($payload['submitted_message'] ?? ($payload['message'] ?? '')),
        ];
        $normalized['title'] = wp_song_request_build_combined_title(array_merge($payload, $normalized));
        if ($normalized['title_hy'] === '' && $normalized['title'] !== '') {
            $normalized['title_hy'] = $normalized['title'];
        }
        return $normalized;
    }
}

if (!function_exists('wp_song_request_validate_payload')) {
    function wp_song_request_validate_payload(array $payload): ?string {
        if ($payload['request_type'] === 'edit' && (int)$payload['song_id'] <= 0) {
            return 'Խմբագրման հարցման համար երգը պետք է ընտրված լինի։';
        }
        if ($payload['title'] === '') {
            return 'Լրացրու երգի վերնագիրը։';
        }
        if (!empty($payload['bpm']) && ((int)$payload['bpm'] < 20 || (int)$payload['bpm'] > 400)) {
            return 'BPM-ը գրիր 20-ից 400 միջակայքում։';
        }
        if (trim($payload['chords']) === '' && trim($payload['lyrics']) === '') {
            return 'Լրացրու գոնե ակորդները կամ բառերը։';
        }
        return null;
    }
}

if (!function_exists('wp_song_request_fetch_song_snapshot')) {
    function wp_song_request_fetch_song_snapshot(mysqli $conn, int $songId): ?array {
        if ($songId <= 0) {
            return null;
        }

        if (!wp_runtime_ensure_song_title_columns_mysqli($conn)) {
            return null;
        }

        $stmt = $conn->prepare("SELECT id, title, title_hy, title_lat, title_en, title_ru, artist, song_key, bpm, tags, chords, lyrics FROM songs WHERE id = ? LIMIT 1");
        if (!$stmt) {
            return null;
        }
        $stmt->bind_param("i", $songId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        if ($result instanceof mysqli_result) {
            $result->free();
        }
        $stmt->close();

        return is_array($row) ? $row : null;
    }
}

if (!function_exists('wp_song_request_create')) {
    function wp_song_request_create(array $payload, array $submitter): array {
        $conn = wp_runtime_open_mysqli();
        wp_runtime_ensure_song_title_columns_mysqli($conn);
        if (!wp_song_request_ensure_table_mysqli($conn)) {
            $conn->close();
            return ['ok' => false, 'message' => 'Չհաջողվեց պատրաստել մոդերացիայի հերթը։'];
        }

        $data = wp_song_request_normalize_payload($payload);
        $error = wp_song_request_validate_payload($data);
        if ($error !== null) {
            $conn->close();
            return ['ok' => false, 'message' => $error];
        }

        $snapshot = $data['request_type'] === 'edit'
            ? wp_song_request_fetch_song_snapshot($conn, (int)$data['song_id'])
            : null;

        if ($data['request_type'] === 'edit' && !$snapshot) {
            $conn->close();
            return ['ok' => false, 'message' => 'Ընտրված երգը չգտնվեց։'];
        }

        $submittedByUserId = max(0, (int)($submitter['id'] ?? 0));
        $submittedByName = wp_song_request_trim($submitter['name'] ?? '');
        $submittedByEmail = wp_song_request_trim($submitter['email'] ?? '');
        $snapshotJson = $snapshot ? json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;

        $stmt = $conn->prepare("
            INSERT INTO " . wp_song_request_table_name() . " (
                song_id, request_type, status,
                submitted_by_user_id, submitted_by_name, submitted_by_email, submitted_message,
                title, title_hy, title_lat, title_en, title_ru,
                artist, song_key, bpm, tags, chords, lyrics, source_snapshot
            ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
            $message = 'Չհաջողվեց ստեղծել հարցումը։';
            if ($conn->error !== '') {
                $message .= ' ' . $conn->error;
            }
            $conn->close();
            return ['ok' => false, 'message' => $message];
        }

        $songId = $data['song_id'] > 0 ? $data['song_id'] : null;
        $stmt->bind_param(
            "isissssssssssissss",
            $songId,
            $data['request_type'],
            $submittedByUserId,
            $submittedByName,
            $submittedByEmail,
            $data['submitted_message'],
            $data['title'],
            $data['title_hy'],
            $data['title_lat'],
            $data['title_en'],
            $data['title_ru'],
            $data['artist'],
            $data['song_key'],
            $data['bpm'],
            $data['tags'],
            $data['chords'],
            $data['lyrics'],
            $snapshotJson
        );

        $ok = $stmt->execute();
        $insertId = (int)$conn->insert_id;
        $errorMessage = $stmt->error;
        $stmt->close();
        $conn->close();

        if (!$ok) {
            return ['ok' => false, 'message' => 'Չհաջողվեց ուղարկել հարցումը։ ' . $errorMessage];
        }

        return [
            'ok' => true,
            'message' => $data['request_type'] === 'new'
                ? 'Նոր երգի հարցումը ուղարկվեց մոդերացիայի։'
                : 'Խմբագրման հարցումը ուղարկվեց մոդերացիայի։',
            'id' => $insertId,
        ];
    }
}

if (!function_exists('wp_song_request_counts')) {
    function wp_song_request_counts(): array {
        try {
            $conn = wp_runtime_open_mysqli();
            if (!wp_song_request_ensure_table_mysqli($conn)) {
                $conn->close();
                return ['all' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0];
            }
            $counts = ['all' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0];
            $res = $conn->query("SELECT status, COUNT(*) AS c FROM " . wp_song_request_table_name() . " GROUP BY status");
            if ($res instanceof mysqli_result) {
                while ($row = $res->fetch_assoc()) {
                    $status = (string)($row['status'] ?? '');
                    $count = (int)($row['c'] ?? 0);
                    if (isset($counts[$status])) {
                        $counts[$status] = $count;
                    }
                    $counts['all'] += $count;
                }
                $res->free();
            }
            $conn->close();
            return $counts;
        } catch (Throwable $e) {
            return ['all' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0];
        }
    }
}

if (!function_exists('wp_song_request_list')) {
    function wp_song_request_list(string $status = 'all', int $limit = 80, string $search = ''): array {
        try {
            $conn = wp_runtime_open_mysqli();
            if (!wp_song_request_ensure_table_mysqli($conn)) {
                $conn->close();
                return [];
            }

            $limit = max(1, min($limit, 200));
            $where = [];
            $types = '';
            $params = [];

            if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
                $where[] = "status = ?";
                $types .= 's';
                $params[] = $status;
            }

            $search = trim($search);
            if ($search !== '') {
                $where[] = "(title LIKE ? OR submitted_by_name LIKE ? OR submitted_by_email LIKE ? OR artist LIKE ? OR tags LIKE ?)";
                $types .= 'sssss';
                $needle = '%' . $search . '%';
                array_push($params, $needle, $needle, $needle, $needle, $needle);
            }

            $sql = "SELECT * FROM " . wp_song_request_table_name();
            if ($where) {
                $sql .= " WHERE " . implode(' AND ', $where);
            }
            $sql .= " ORDER BY CASE WHEN status='pending' THEN 0 WHEN status='approved' THEN 1 ELSE 2 END, created_at DESC LIMIT {$limit}";

            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                $conn->close();
                return [];
            }
            if ($types !== '') {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            $rows = [];
            if ($result instanceof mysqli_result) {
                while ($row = $result->fetch_assoc()) {
                    $row['source_snapshot_data'] = [];
                    if (!empty($row['source_snapshot'])) {
                        $decoded = json_decode((string)$row['source_snapshot'], true);
                        if (is_array($decoded)) {
                            $row['source_snapshot_data'] = $decoded;
                        }
                    }
                    $row['change_set'] = wp_song_request_build_change_set($row, is_array($row['source_snapshot_data']) ? $row['source_snapshot_data'] : []);
                    $rows[] = $row;
                }
                $result->free();
            }
            $stmt->close();
            $conn->close();

            return $rows;
        } catch (Throwable $e) {
            return [];
        }
    }
}

if (!function_exists('wp_song_request_list_for_submitter')) {
    function wp_song_request_list_for_submitter(int $userId, int $limit = 20): array {
        if ($userId <= 0) {
            return [];
        }

        try {
            $conn = wp_runtime_open_mysqli();
            if (!wp_song_request_ensure_table_mysqli($conn)) {
                $conn->close();
                return [];
            }

            $limit = max(1, min($limit, 50));
            $sql = "SELECT * FROM " . wp_song_request_table_name() . " WHERE submitted_by_user_id = ? ORDER BY created_at DESC LIMIT {$limit}";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                $conn->close();
                return [];
            }

            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $rows = [];
            if ($result instanceof mysqli_result) {
                while ($row = $result->fetch_assoc()) {
                    $row['source_snapshot_data'] = [];
                    if (!empty($row['source_snapshot'])) {
                        $decoded = json_decode((string)$row['source_snapshot'], true);
                        if (is_array($decoded)) {
                            $row['source_snapshot_data'] = $decoded;
                        }
                    }
                    $row['change_set'] = wp_song_request_build_change_set($row, is_array($row['source_snapshot_data']) ? $row['source_snapshot_data'] : []);
                    $rows[] = $row;
                }
                $result->free();
            }
            $stmt->close();
            $conn->close();

            return $rows;
        } catch (Throwable $e) {
            return [];
        }
    }
}

if (!function_exists('wp_song_request_status_label')) {
    function wp_song_request_status_label(string $status): string {
        switch ($status) {
            case 'pending': return 'Սպասման մեջ';
            case 'approved': return 'Հաստատված';
            case 'rejected': return 'Մերժված';
            default: return $status !== '' ? $status : 'Անհայտ';
        }
    }
}

if (!function_exists('wp_song_request_type_label')) {
    function wp_song_request_type_label(string $type): string {
        switch ($type) {
            case 'new': return 'Նոր երգ';
            case 'edit': return 'Խմբագրման առաջարկ';
            default: return $type !== '' ? $type : 'Հարցում';
        }
    }
}

if (!function_exists('wp_song_request_change_field_labels')) {
    function wp_song_request_change_field_labels(): array {
        return [
            'title_hy' => 'Հայերեն վերնագիր',
            'title_lat' => 'Լատինատառ վերնագիր',
            'title_en' => 'Անգլերեն վերնագիր',
            'title_ru' => 'Ռուսերեն վերնագիր',
            'artist' => 'Հեղինակ',
            'song_key' => 'Տոնայնություն',
            'bpm' => 'BPM',
            'tags' => 'Տեգեր',
            'chords' => 'Ակորդներ',
            'lyrics' => 'Բառեր',
        ];
    }
}

if (!function_exists('wp_song_request_row_payload')) {
    function wp_song_request_row_payload(array $row): array {
        return [
            'title_hy' => wp_song_request_trim($row['title_hy'] ?? ''),
            'title_lat' => wp_song_request_trim($row['title_lat'] ?? ''),
            'title_en' => wp_song_request_trim($row['title_en'] ?? ''),
            'title_ru' => wp_song_request_trim($row['title_ru'] ?? ''),
            'artist' => wp_song_request_trim($row['artist'] ?? ''),
            'song_key' => wp_song_request_trim($row['song_key'] ?? ''),
            'bpm' => max(0, (int)($row['bpm'] ?? 0)),
            'tags' => wp_song_request_trim($row['tags'] ?? ''),
            'chords' => (string)($row['chords'] ?? ''),
            'lyrics' => (string)($row['lyrics'] ?? ''),
        ];
    }
}

if (!function_exists('wp_song_request_build_change_set')) {
    function wp_song_request_build_change_set(array $requestRow, array $sourceSnapshot = []): array {
        $labels = wp_song_request_change_field_labels();
        $requestPayload = wp_song_request_row_payload($requestRow);
        $sourcePayload = wp_song_request_row_payload($sourceSnapshot);
        $changes = [];

        foreach ($labels as $field => $label) {
            $before = $sourcePayload[$field] ?? '';
            $after = $requestPayload[$field] ?? '';

            if (is_int($before) || is_int($after)) {
                $before = (int)$before;
                $after = (int)$after;
                if ($before === $after) {
                    continue;
                }
                $beforeDisplay = $before > 0 ? (string)$before : '—';
                $afterDisplay = $after > 0 ? (string)$after : '—';
            } else {
                $before = trim((string)$before);
                $after = trim((string)$after);
                if ($before === $after) {
                    continue;
                }
                $beforeDisplay = $before !== '' ? $before : '—';
                $afterDisplay = $after !== '' ? $after : '—';
            }

            $kind = 'changed';
            if ($beforeDisplay === '—' && $afterDisplay !== '—') {
                $kind = 'added';
            } elseif ($beforeDisplay !== '—' && $afterDisplay === '—') {
                $kind = 'removed';
            }

            $changes[] = [
                'field' => $field,
                'label' => $label,
                'before' => $beforeDisplay,
                'after' => $afterDisplay,
                'kind' => $kind,
                'is_long' => in_array($field, ['chords', 'lyrics'], true),
            ];
        }

        return $changes;
    }
}

if (!function_exists('wp_song_request_append_history')) {
    function wp_song_request_append_history(array $request, string $decision, array $adminUser, string $reviewNote, int $resolvedSongId, array $changeSet): void {
        if (!function_exists('wp_version_history_append')) {
            require_once __DIR__ . '/version_config.php';
        }
        if (!function_exists('wp_version_history_append') || !function_exists('wp_version_now_iso')) {
            return;
        }

        $actor = wp_song_request_trim($adminUser['name'] ?? ($adminUser['email'] ?? 'admin'));
        $title = wp_song_request_trim($request['title_hy'] ?? ($request['title'] ?? ''));
        $submittedBy = wp_song_request_trim($request['submitted_by_name'] ?? ($request['submitted_by_email'] ?? 'Օգտատեր'));

        wp_version_history_append([
            'id' => bin2hex(random_bytes(8)),
            'at' => wp_version_now_iso(),
            'actor' => $actor !== '' ? $actor : 'admin',
            'ip' => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
            'action' => $decision === 'approved' ? 'approve_song_request' : 'reject_song_request',
            'changed_fields' => array_values(array_unique(array_column($changeSet, 'field'))),
            'snapshot' => [
                'moderation_request_id' => (int)($request['id'] ?? 0),
                'moderation_status' => $decision,
                'moderation_type' => (string)($request['request_type'] ?? 'edit'),
                'moderation_title' => $title,
                'moderation_submitted_by' => $submittedBy,
                'moderation_submitted_email' => (string)($request['submitted_by_email'] ?? ''),
                'moderation_resolved_song_id' => $resolvedSongId,
                'moderation_review_note' => $reviewNote,
                'moderation_change_set' => $changeSet,
            ],
            'note' => $reviewNote !== '' ? $reviewNote : ($title !== '' ? $title : 'Մոդերացիայի հարցում'),
        ]);
    }
}

if (!function_exists('wp_song_request_apply_decision')) {
    function wp_song_request_apply_decision(int $requestId, string $decision, array $adminUser, string $reviewNote = ''): array {
        if ($requestId <= 0) {
            return ['ok' => false, 'message' => 'Հարցումը չի գտնվել։'];
        }
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            return ['ok' => false, 'message' => 'Սխալ որոշում է ընտրված։'];
        }

        $conn = wp_runtime_open_mysqli();
        wp_runtime_ensure_song_title_columns_mysqli($conn);
        if (!wp_song_request_ensure_table_mysqli($conn)) {
            $conn->close();
            return ['ok' => false, 'message' => 'Չհաջողվեց պատրաստել մոդերացիայի հերթը։'];
        }

        try {
            $conn->begin_transaction();

            $stmt = $conn->prepare("SELECT * FROM " . wp_song_request_table_name() . " WHERE id = ? LIMIT 1 FOR UPDATE");
            if (!$stmt) {
                throw new RuntimeException('Չհաջողվեց բացել հարցումը։');
            }
            $stmt->bind_param("i", $requestId);
            $stmt->execute();
            $result = $stmt->get_result();
            $request = $result ? $result->fetch_assoc() : null;
            if ($result instanceof mysqli_result) {
                $result->free();
            }
            $stmt->close();

            if (!is_array($request)) {
                throw new RuntimeException('Հարցումը չի գտնվել։');
            }
            if ((string)($request['status'] ?? '') !== 'pending') {
                throw new RuntimeException('Այս հարցումը արդեն մշակված է։');
            }

            $resolvedSongId = 0;
            $sourceSnapshotData = [];
            if (!empty($request['source_snapshot'])) {
                $decodedSnapshot = json_decode((string)$request['source_snapshot'], true);
                if (is_array($decodedSnapshot)) {
                    $sourceSnapshotData = $decodedSnapshot;
                }
            }
            $changeSet = wp_song_request_build_change_set($request, $sourceSnapshotData);
            if ($decision === 'approved') {
                $title = wp_song_request_trim($request['title'] ?? '');
                $titleHy = wp_song_request_trim($request['title_hy'] ?? '');
                $titleLat = wp_song_request_trim($request['title_lat'] ?? '');
                $titleEn = wp_song_request_trim($request['title_en'] ?? '');
                $titleRu = wp_song_request_trim($request['title_ru'] ?? '');
                $artist = wp_song_request_trim($request['artist'] ?? '');
                $songKey = wp_song_request_trim($request['song_key'] ?? '');
                $bpm = max(0, (int)($request['bpm'] ?? 0));
                $tags = wp_song_request_trim($request['tags'] ?? '');
                $chords = (string)($request['chords'] ?? '');
                $lyrics = (string)($request['lyrics'] ?? '');
                $songId = (int)($request['song_id'] ?? 0);
                $requestType = (string)($request['request_type'] ?? 'edit');

                if ($requestType === 'edit' && $songId > 0) {
                    $update = $conn->prepare("UPDATE songs SET title = ?, title_hy = ?, title_lat = ?, title_en = ?, title_ru = ?, artist = ?, song_key = ?, bpm = ?, tags = ?, chords = ?, lyrics = ? WHERE id = ?");
                    if (!$update) {
                        throw new RuntimeException('Չհաջողվեց թարմացնել երգը։');
                    }
                    $update->bind_param("sssssssisssi", $title, $titleHy, $titleLat, $titleEn, $titleRu, $artist, $songKey, $bpm, $tags, $chords, $lyrics, $songId);
                    if (!$update->execute()) {
                        $error = $update->error;
                        $update->close();
                        throw new RuntimeException('Չհաջողվեց թարմացնել երգը։ ' . $error);
                    }
                    $update->close();
                    $resolvedSongId = $songId;
                } else {
                    $insert = $conn->prepare("INSERT INTO songs (title, title_hy, title_lat, title_en, title_ru, artist, song_key, bpm, tags, chords, lyrics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    if (!$insert) {
                        throw new RuntimeException('Չհաջողվեց ստեղծել նոր երգը։');
                    }
                    $insert->bind_param("sssssssisss", $title, $titleHy, $titleLat, $titleEn, $titleRu, $artist, $songKey, $bpm, $tags, $chords, $lyrics);
                    if (!$insert->execute()) {
                        $error = $insert->error;
                        $insert->close();
                        throw new RuntimeException('Չհաջողվեց ստեղծել նոր երգը։ ' . $error);
                    }
                    $resolvedSongId = (int)$conn->insert_id;
                    $insert->close();
                }
            }

            $reviewedByUserId = max(0, (int)($adminUser['id'] ?? 0));
            $reviewedByName = wp_song_request_trim($adminUser['name'] ?? ($adminUser['email'] ?? 'admin'));
            $updateRequest = $conn->prepare("
                UPDATE " . wp_song_request_table_name() . "
                SET status = ?, review_note = ?, reviewed_by_user_id = ?, reviewed_by_name = ?, reviewed_at = NOW(), resolved_song_id = ?
                WHERE id = ?
            ");
            if (!$updateRequest) {
                throw new RuntimeException('Չհաջողվեց թարմացնել հարցման վիճակը։');
            }
            $updateRequest->bind_param("ssissi", $decision, $reviewNote, $reviewedByUserId, $reviewedByName, $resolvedSongId, $requestId);
            if (!$updateRequest->execute()) {
                $error = $updateRequest->error;
                $updateRequest->close();
                throw new RuntimeException('Չհաջողվեց թարմացնել հարցման վիճակը։ ' . $error);
            }
            $updateRequest->close();

            $conn->commit();
            wp_song_request_append_history($request, $decision, $adminUser, $reviewNote, $resolvedSongId, $changeSet);
            $conn->close();

            return [
                'ok' => true,
                'message' => $decision === 'approved'
                    ? 'Հարցումը հաստատվեց և կիրառվեց։'
                    : 'Հարցումը մերժվեց։',
                'resolved_song_id' => $resolvedSongId,
            ];
        } catch (Throwable $e) {
            $conn->rollback();
            $conn->close();
            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }
}
