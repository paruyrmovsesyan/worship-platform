<?php
require_once __DIR__ . '/runtime_config.php';
$conn = wp_runtime_open_mysqli();
$res = $conn->query("SELECT at, title FROM push_history WHERE at LIKE '2026-06%' ORDER BY at DESC");
while ($row = $res->fetch_assoc()) {
    echo "[$row[at]] $row[title]\n";
}
