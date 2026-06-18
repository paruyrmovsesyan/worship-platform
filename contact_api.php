<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

function out(array $data, int $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out(["error" => "Method not allowed"], 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$name = trim((string)($input['name'] ?? ''));
$email = trim((string)($input['email'] ?? ''));
$message = trim((string)($input['message'] ?? ''));

if ($name === '' || $email === '' || $message === '') {
    out(["error" => "All fields are required"], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    out(["error" => "Invalid email format"], 400);
}

try {
    $db = wp_runtime_open_mysqli();

    // Auto-create table if it doesn't exist
    $db->query("CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_name VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_replied TINYINT(1) DEFAULT 0,
        reply_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        replied_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $stmt = $db->prepare("INSERT INTO contact_messages (user_name, user_email, message) VALUES (?, ?, ?)");
    if (!$stmt) throw new Exception($db->error);
    
    $stmt->bind_param('sss', $name, $email, $message);
    if (!$stmt->execute()) throw new Exception($stmt->error);
    
    out(["ok" => true]);
} catch (Exception $e) {
    error_log("Contact API error: " . $e->getMessage());
    out(["error" => "Internal Server Error"], 500);
}
