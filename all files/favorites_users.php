<?php
session_start();
header('Content-Type: application/json');

if(empty($_SESSION['user_id'])){ 
    echo json_encode([]); 
    exit; 
}
$user_id = $_SESSION['user_id'];

$conn = new PDO(
    "mysql:host=localhost;dbname=paruyr2005_wolarm;charset=utf8mb4",
    "paruyr2005_wolarm",
    "wolarm2025",
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]
);

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

/* Վերցնել user-ի favorites */
if($action === 'get_favorites'){
    $stmt = $conn->prepare("
        SELECT s.* 
        FROM favoritesuser f
        JOIN songs s ON s.id = f.song_id
        WHERE f.user_id = ?
    ");
    $stmt->execute([$user_id]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

/* Toggle favorite */
if($action === 'toggle_favorite' && isset($data['song_id'])){
    $song_id = (int)$data['song_id'];

    // ստուգել արդյոք արդեն ավելացված է
    $stmt = $conn->prepare("SELECT * FROM favoritesuser WHERE user_id = ? AND song_id = ?");
    $stmt->execute([$user_id, $song_id]);

    if($stmt->fetch()){
        // Եթե կա → ջնջել
        $stmt = $conn->prepare("DELETE FROM favoritesuser WHERE user_id = ? AND song_id = ?");
        $stmt->execute([$user_id, $song_id]);
        echo json_encode(['success'=>true, 'favorite'=>false]);
    } else {
        // Եթե չկա → ավելացնել
        $stmt = $conn->prepare("INSERT INTO favoritesuser(user_id, song_id) VALUES(?, ?)");
        $stmt->execute([$user_id, $song_id]);
        echo json_encode(['success'=>true, 'favorite'=>true]);
    }
}
