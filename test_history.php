<?php
require_once __DIR__ . '/runtime_config.php';
$conn = wp_runtime_open_mysqli();
$res = $conn->query("SELECT * FROM version_history ORDER BY at DESC LIMIT 5");
while ($row = $res->fetch_assoc()) {
    echo "[$row[at]] Action: $row[action]\n";
    echo "Snapshot App Version: " . json_decode($row['snapshot'])->app_version . "\n";
    echo "Changed fields: " . $row['changed_fields'] . "\n\n";
}
