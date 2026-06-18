<?php
require 'runtime_config.php';
require 'version_config.php';

try {
    $conn = wp_runtime_open_mysqli();
    
    // Fetch all history items ordered by time
    $res = $conn->query("SELECT id, at, actor FROM version_history ORDER BY at DESC");
    
    if (!$res) {
        die("Տվյալների բազայի սխալ։");
    }

    $items = [];
    while ($row = $res->fetch_assoc()) {
        $items[] = $row;
    }

    $toDelete = [];
    $lastKeptAt = null;
    $lastKeptActor = null;

    foreach ($items as $item) {
        $time = strtotime($item['at']);
        if ($lastKeptAt !== null && $item['actor'] === $lastKeptActor) {
            $diff = $lastKeptAt - $time;
            // If the item is within 5 minutes (300 seconds) of a NEWER item, we merge (delete) it
            if ($diff <= 300 && $diff >= 0) {
                $toDelete[] = $item['id'];
                continue;
            }
        }
        $lastKeptAt = $time;
        $lastKeptActor = $item['actor'];
    }

    if (!empty($toDelete)) {
        $in = implode("','", $toDelete);
        $conn->query("DELETE FROM version_history WHERE id IN ('$in')");
        echo "<h2 style='color: green; font-family: sans-serif;'>Հաջողությամբ մաքրվեց և միավորվեց " . count($toDelete) . " կրկնվող պատմության կետ։</h2>";
    } else {
        echo "<h2 style='font-family: sans-serif;'>Մաքրելու կամ միավորելու ենթակա կրկնօրինակներ չկան։</h2>";
    }
    
    echo "<p style='font-family: sans-serif;'>Կարող եք ջնջել այս ֆայլը (cleanup.php) սերվերից ապահովության համար:</p>";
    
} catch (Throwable $e) {
    echo "Սխալ առաջացավ: " . $e->getMessage();
}
