<?php
require_once __DIR__ . '/runtime_config.php';
$conn = wp_runtime_open_mysqli();
$res = $conn->query("SELECT * FROM push_history WHERE body LIKE '%3.2.0%' OR title LIKE '%3.2.0%' ORDER BY at DESC LIMIT 5");
while ($row = $res->fetch_assoc()) {
    echo "[$row[at]] $row[title] - $row[body]\n";
}
