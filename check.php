<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
function exception_error_handler($errno, $errstr, $errfile, $errline ) {
    throw new ErrorException($errstr, $errno, 0, $errfile, $errline);
}
set_error_handler("exception_error_handler");

echo "<h1>PHP Error Log</h1>";
try {
    require 'songs.php';
} catch (Throwable $e) {
    echo "<h2>Error Caught:</h2>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
    echo "<pre>File: " . htmlspecialchars($e->getFile()) . " Line: " . htmlspecialchars((string)$e->getLine()) . "</pre>";
}
