<?php
require_once __DIR__ . '/runtime_config.php';
$conn = wp_runtime_open_mysqli();
$res = $conn->query("SELECT * FROM push_queue LIMIT 5");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        echo "Queue item: " . $row['payload'] . "\n";
    }
}
