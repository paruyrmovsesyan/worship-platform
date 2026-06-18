<?php
include 'new_i18n_keys.php';
$keys = array_keys($new_keys);
$chunks = array_chunk($keys, 100);
foreach ($chunks as $i => $chunk) {
    file_put_contents("chunk_$i.json", json_encode($chunk, JSON_UNESCAPED_UNICODE));
    echo "chunk_$i.json created\n";
}
