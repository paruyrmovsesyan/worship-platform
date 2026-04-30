<?php
session_start();
$conn = new PDO(
    "mysql:host=localhost;dbname=pmstudio_wolarm;charset=utf8mb4",
    "pmstudio_wolarm",
    "wolarm2026",
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]
);

$user_logged_in = false;

// 1️⃣ Եթե session կա → login-ված է
if(!empty($_SESSION['user_id'])){
    $user_logged_in = true;
}
// 2️⃣ Եթե session չկա, բայց remember_me cookie կա → ստուգել DB
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
<!doctype html>
<html lang="hy">
<head>
<meta charset="utf-8">
<meta name="description" content="WolYouth Worship — փառաբանություն և երկրպագություն">
<meta property="og:title" content="WolYouth Worship — փառաբանություն և երկրպագություն">
  <meta property="og:description" content="Այս կայքը հնարավորություն է տալիս գտնել և պահպանել բոլոր երգերի ակորդները և 
  բառերը միարժամանակ տրասպոզիցիա անել յուրաքանչյուր տոնայնության մեջ։">
  <meta property="og:image" content="https://worship.pmstudio.am/wolarmyouth.jpg">
  <meta property="og:url" content="https://worship.pmstudio.am/">
  <meta property="og:type" content="website">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
<title>Wolarm Youth</title>
<script>
(function(){
    // Ստուգում բրաուզերը
    var isOld = false;
    try { new Function("let a=1;"); } catch(e){ isOld=true; }
    if(typeof fetch === "undefined") isOld=true;
    if(typeof Promise === "undefined") isOld=true;
    var ua = navigator.userAgent || "";
    if(ua.match(/CPU OS 5_|iPad;.*CPU OS 5/)) isOld=true;

    // Հին բրաուզեր → old.html
    if(isOld){
        window.location.replace("old.html");
        return;
    }

    // PHP-ից ստացված login ստատուս
    var userLoggedIn = <?php echo $user_logged_in ? 'true' : 'false'; ?>;

    // Ուղղորդում ըստ login վիճակի
    if(userLoggedIn){
        window.location.replace("main_users.php"); // login-ված user
    } else {
        window.location.replace("main.html"); // սովորական գլխավոր
    }
})();
</script>
</head>
<body>
<h3 style="font-family:sans-serif;text-align:center;padding-top:40px;">Բեռնվում է...</h3>
</body>
</html>