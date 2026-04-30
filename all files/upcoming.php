<?php
// upcoming.php
header('Content-Type: application/json; charset=utf-8');

// --- Բազայի կոնֆիգուրացիա ---
$host = 'localhost';       // կամ քո DB սերվերի IP/hostname
$db   = 'paruyr2005_wolarm';       // քո DB անունը
$user = 'paruyr2005_wolarm';         // DB օգտվող
$pass = 'wolarm2025';         // DB գաղտնաբառ
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// --- Շուտով երգերի հարցում ---
// assuming table `upcoming_songs` ունի fields: id, title, release_date
$stmt = $pdo->prepare("SELECT id, title FROM upcoming_songs WHERE release_date >= CURDATE() ORDER BY release_date ASC");
$stmt->execute();
$upcomingSongs = $stmt->fetchAll();

// --- JSON output ---
echo json_encode($upcomingSongs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
