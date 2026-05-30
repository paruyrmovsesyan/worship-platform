<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/translation_runtime.php';

if (empty($_SESSION['user_id'])) {
  http_response_code(401);
  echo json_encode(["error" => "Unauthorized"], JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  $conn = wp_runtime_open_mysqli();
  wp_runtime_ensure_song_title_columns_mysqli($conn);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["error" => "DB connection failed"], JSON_UNESCAPED_UNICODE);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';
$user_id = (int)$_SESSION['user_id'];
$lang = wp_translation_requested_lang();

function norm_key($k){
  if ($k === null) return null;
  $k = trim((string)$k);
  if ($k === '') return null;
  $k = str_replace("♭", "b", $k);
  return $k;
}

// ✅ այստեղ ենք պահում user-ի անձնական պահվածները
$TABLE = "user_favorites";

switch($action){

  // ✅ Heart: պահել/հանել favorite-ը (միշտ հիմնական տոն)
  case 'toggle_favorite':
    if($method !== "POST"){ http_response_code(405); exit; }

    $data = json_decode(file_get_contents("php://input"), true) ?: [];
    $song_id = intval($data['song_id'] ?? 0);
    if(!$song_id){
      http_response_code(400);
      echo json_encode(["error"=>"song_id required"]);
      exit;
    }

    $stmt = $conn->prepare("SELECT id FROM {$TABLE} WHERE user_id=? AND song_id=?");
    $stmt->bind_param("ii", $user_id, $song_id);
    $stmt->execute();
    $res = $stmt->get_result();

    if($row = $res->fetch_assoc()){
      $del = $conn->prepare("DELETE FROM {$TABLE} WHERE id=?");
      $del->bind_param("i", $row['id']);
      $del->execute();
      echo json_encode(["favorite"=>false]);
    } else {
      // target_key = NULL => հիմնական տոն
      $ins = $conn->prepare("INSERT INTO {$TABLE} (user_id, song_id, target_key) VALUES (?,?,NULL)");
      $ins->bind_param("ii", $user_id, $song_id);
      $ins->execute();
      echo json_encode(["favorite"=>true]);
    }
    break;

  // ✅ Favorites-ից ներսում՝ “Պահպանել այս տոնայնությամբ”
  case 'update_favorite_key':
    if($method !== "POST"){ http_response_code(405); exit; }

    $data = json_decode(file_get_contents("php://input"), true) ?: [];
    $song_id = intval($data['song_id'] ?? 0);
    $target_key = norm_key($data['target_key'] ?? null);

    if(!$song_id){
      http_response_code(400);
      echo json_encode(["error"=>"song_id required"]);
      exit;
    }

    // update only existing favorite
    $upd = $conn->prepare("UPDATE {$TABLE} SET target_key=? WHERE user_id=? AND song_id=?");
    $upd->bind_param("sii", $target_key, $user_id, $song_id);
    $upd->execute();

    echo json_encode(["ok"=>true, "target_key"=>$target_key]);
    break;

  // ✅ list favorites: վերադարձնել երգի ամբողջ տվյալները + target_key
  case 'get_favorites':
    $sql = "SELECT s.*, f.target_key
            FROM {$TABLE} f
            JOIN songs s ON f.song_id = s.id
            WHERE f.user_id = ?
            ORDER BY f.created_at ASC, f.id ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $out = [];
    while($r = $res->fetch_assoc()) $out[] = $r;
    $out = wp_translation_translate_rows($out, [
      'title' => 'api.song.title',
      'artist' => 'api.song.artist',
      'tags' => 'api.song.tags',
    ], $lang);
    $out = wp_translation_localize_row_fields($out, [
      'title' => 'api.song.title',
    ], $lang);
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    break;

  // ✅ view էջում ցույց տալ՝ տվյալ երգը favorite՞ է + ինչ key-ով
  case 'get_favorite':
    $song_id = intval($_GET['song_id'] ?? 0);
    if(!$song_id){ http_response_code(400); echo json_encode(["error"=>"song_id required"]); exit; }

    $stmt = $conn->prepare("SELECT target_key FROM {$TABLE} WHERE user_id=? AND song_id=? LIMIT 1");
    $stmt->bind_param("ii", $user_id, $song_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if($row = $res->fetch_assoc()){
      echo json_encode(["favorite"=>true, "target_key"=>$row["target_key"]]);
    } else {
      echo json_encode(["favorite"=>false, "target_key"=>null]);
    }
    break;

  // ✅ song_view.html-ում “save key” անելուց առաջ ensure
  case 'ensure_favorite':
    if($method !== "POST"){ http_response_code(405); exit; }

    $data = json_decode(file_get_contents("php://input"), true) ?: [];
    $song_id = intval($data['song_id'] ?? 0);

    if(!$song_id){
      http_response_code(400);
      echo json_encode(["error"=>"song_id required"]);
      exit;
    }

    // already exists?
    $stmt = $conn->prepare("SELECT id, target_key FROM {$TABLE} WHERE user_id=? AND song_id=? LIMIT 1");
    $stmt->bind_param("ii", $user_id, $song_id);
    $stmt->execute();
    $res = $stmt->get_result();

    if($row = $res->fetch_assoc()){
      echo json_encode(["favorite"=>true, "target_key"=>$row["target_key"]]);
    } else {
      $ins = $conn->prepare("INSERT INTO {$TABLE} (user_id, song_id, target_key) VALUES (?,?,NULL)");
      $ins->bind_param("ii", $user_id, $song_id);
      $ins->execute();
      echo json_encode(["favorite"=>true, "target_key"=>null]);
    }
    break;

  default:
    echo json_encode(["error"=>"No valid action"]);
}
?>
