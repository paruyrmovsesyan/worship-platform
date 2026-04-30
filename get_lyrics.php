<?php
require_once __DIR__ . '/runtime_config.php';
header('Content-Type: application/json');
$conn = wp_runtime_open_pdo();

$song_id = $_GET['id'] ?? 0;
if(!$song_id){ echo json_encode(['error'=>'Invalid song id']); exit; }

$stmt = $conn->prepare("SELECT lyrics FROM songs WHERE id=? LIMIT 1");
$stmt->execute([$song_id]);
$song = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$song){ echo json_encode(['error'=>'Song not found']); exit; }

$lyrics_lines = explode("\n",$song['lyrics']);
echo json_encode(['lyrics'=>$lyrics_lines]);
