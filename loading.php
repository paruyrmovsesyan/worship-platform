<?php
require_once __DIR__ . '/runtime_config.php';
session_start();
$conn = wp_runtime_open_pdo();

$user_logged_in = false;

// 1️⃣ Եթե session կա → login-ված է
if(!empty($_SESSION['user_id'])){
    $user_logged_in = true;
}
// 2️⃣ Եթե session չկա, բայց cookie կա → ստուգել DB
elseif(!empty($_COOKIE['remember_me'])){
    $token = $_COOKIE['remember_me'];
    $stmt = $conn->prepare("SELECT * FROM users WHERE remember_token=?");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if($user){
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $user_logged_in = true;
    }
}
?>
<script>
(function(){
    var userLoggedIn = <?php echo $user_logged_in ? 'true' : 'false'; ?>;
    if(userLoggedIn){
        window.location.replace("main_users.php");
    } else {
        window.location.replace("main.html");
    }
})();
</script>
