<?php
session_start();

// Եթե արդեն մուտք է գործած, ուղղում ենք դեպի songs.php
if(isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true){
    header("Location: songs.html");
    exit;
}

// Օրինակային տվյալներ
$USERNAME = "wolarm";
$PASSWORD = "wolarmyouth.2025";

$error = "";

if($_SERVER["REQUEST_METHOD"] === "POST"){
    $user = isset($_POST['username']) ? $_POST['username'] : '';
    $pass = isset($_POST['password']) ? $_POST['password'] : '';

    if($user === $USERNAME && $pass === $PASSWORD){
        $_SESSION['logged_in'] = true;
        header("Location: songs.html");
        exit;
    } else {
        $error = "Մուտքանունը կամ գաղտնաբառը սխալ է։";
    }
}
?>
<!doctype html>
<html lang="hy">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/wolarmyouth.jpg" type="image/jpeg">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Worship Platform">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#070910">
<script src="/pwa-init.js" defer></script>
<title>Մուտք համակարգ</title>
<style type="text/css">
body {
  font-family: Arial, sans-serif;
  background-color: #4c6ef5;
  background-image: none;
  margin: 0;
  padding: 0;
  text-align: center;
}

.container {
  margin-top: 100px;
  background: #ffffff;
  border-radius: 10px;
  width: 300px;
  margin-left: auto;
  margin-right: auto;
  padding: 20px;
  box-shadow: 0 0 10px #999999;
}

h2 {
  color: #333333;
  margin-bottom: 20px;
}

input[type=text], input[type=password] {
  width: 90%;
  padding: 8px;
  margin: 6px 0;
  border: 1px solid #cccccc;
  border-radius: 6px;
  font-size: 14px;
}

button {
  width: 95%;
  padding: 10px;
  background-color: #4c6ef5;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  margin-top: 10px;
}

button:hover {
  background-color: #364fc7;
}

.error {
  color: #d64545;
  font-size: 13px;
  margin-top: 10px;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: none;
}
.footer p {
  color: white;
  font-size: 11px;
  margin: 3px;
}
</style>
</head>
<body>

<div class="container">
  <h2>Մուտք</h2>
  <form method="post">
    <input type="text" name="username" placeholder="Մուտքանուն" required>
    <input type="password" name="password" placeholder="Գաղտնաբառ" required>
    <button type="submit">Մուտք գործել</button>
  </form>
  <?php if($error): ?>
    <div class="error"><?php echo htmlspecialchars($error); ?></div>
  <?php endif; ?>
</div>

<div class="footer">
  <p><b>Wolarm Youth 2025</b></p>
  <p><b>PM Studio 2025</b></p>
</div>

</body>
</html>
