<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
try {
    require_once 'songs.php';
} catch (Throwable $e) {
    echo "Error in songs.php: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " on line " . $e->getLine() . "\n";
}
