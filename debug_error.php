<?php
declare(strict_types=1);

// Enable full error reporting for this script
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('html_errors', '1');

echo "<!DOCTYPE html>
<html>
<head>
    <title>Worship Admin Diagnoser</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #cbd5e1; padding: 20px; line-height: 1.5; }
        h1 { color: #f8fafc; border-bottom: 1px solid #334155; padding-bottom: 10px; }
        h2 { color: #38bdf8; margin-top: 30px; }
        pre { background: #1e293b; color: #f1f5f9; padding: 15px; border-radius: 8px; border: 1px solid #475569; overflow-x: auto; font-size: 14px; }
        .success { color: #4ade80; font-weight: bold; }
        .danger { color: #f87171; font-weight: bold; }
        .warning { color: #fbbf24; font-weight: bold; }
        .info { color: #94a3b8; font-style: italic; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #334155; }
        th { background: #1e293b; color: #f8fafc; }
    </style>
</head>
<body>
<h1>Worship Admin Diagnostic Tool</h1>";

// 1. System Info
echo "<h2>System Information</h2>";
echo "PHP Version: " . PHP_VERSION . "<br>";
echo "Server Software: " . htmlspecialchars($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "<br>";
echo "Current File Path: " . htmlspecialchars(__FILE__) . "<br>";
echo "Document Root: " . htmlspecialchars($_SERVER['DOCUMENT_ROOT'] ?? 'Unknown') . "<br>";

// 2. File Check
echo "<h2>Required Files Check</h2>";
$requiredFiles = [
    'admin.php',
    'songs.php',
    'admin_updates.php',
    'admin_access.php',
    'auth_bootstrap.php',
    'runtime_config.php',
    'runtime_local_config.php',
    'version_config.php',
    'version_config_store.php',
    'loginuser.php',
    'registeruser.php'
];

echo "<table>
<tr><th>File Name</th><th>Exists?</th><th>Size</th><th>Permissions</th></tr>";
foreach ($requiredFiles as $file) {
    $path = __DIR__ . '/' . $file;
    if (file_exists($path)) {
        $size = filesize($path);
        $perms = substr(sprintf('%o', fileperms($path)), -4);
        echo "<tr><td>$file</td><td class='success'>YES</td><td>{$size} bytes</td><td>$perms</td></tr>";
    } else {
        echo "<tr><td>$file</td><td class='danger'>NO (Missing!)</td><td>-</td><td>-</td></tr>";
    }
}
echo "</table>";

// 3. Test Includes
echo "<h2>Include Verification Tests</h2>";

$tests = [
    'runtime_config.php',
    'version_config.php',
    'auth_bootstrap.php',
    'admin_access.php'
];

foreach ($tests as $file) {
    echo "Testing include of <strong>$file</strong>... ";
    try {
        if (!file_exists(__DIR__ . '/' . $file)) {
            throw new Exception("File does not exist.");
        }
        ob_start();
        require_once __DIR__ . '/' . $file;
        ob_end_clean();
        echo "<span class='success'>SUCCESS</span><br>";
    } catch (Throwable $e) {
        if (ob_get_level() > 0) ob_end_clean();
        echo "<span class='danger'>FAILED</span><br>";
        echo "<pre>Error: " . htmlspecialchars($e->getMessage()) . "\nFile: " . htmlspecialchars($e->getFile()) . " (Line " . $e->getLine() . ")\n" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    }
}

// 4. Test Database Connection
echo "<h2>Database Connection Test</h2>";
try {
    if (function_exists('wp_runtime_db_config')) {
        $db = wp_runtime_db_config();
        $maskedPass = str_repeat('*', strlen($db['pass'] ?? ''));
        echo "Configured Credentials: Host=<code>" . htmlspecialchars($db['host'] ?? '') . "</code>, Database=<code>" . htmlspecialchars($db['name'] ?? '') . "</code>, User=<code>" . htmlspecialchars($db['user'] ?? '') . "</code>, Pass=<code>" . $maskedPass . "</code><br>";
        
        echo "Testing connection with PDO... ";
        try {
            $pdo = wp_runtime_open_pdo();
            echo "<span class='success'>SUCCESS</span><br>";
        } catch (Throwable $pe) {
            echo "<span class='danger'>FAILED</span>: " . htmlspecialchars($pe->getMessage()) . "<br>";
        }

        echo "Testing connection with MySQLi... ";
        try {
            $mysqli = wp_runtime_open_mysqli();
            echo "<span class='success'>SUCCESS</span><br>";
            $mysqli->close();
        } catch (Throwable $me) {
            echo "<span class='danger'>FAILED</span>: " . htmlspecialchars($me->getMessage()) . "<br>";
        }
    } else {
        echo "<span class='warning'>wp_runtime_db_config() function not loaded. Cannot test connection.</span><br>";
    }
} catch (Throwable $e) {
    echo "<span class='danger'>Database testing failed with fatal error</span><br>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "\n" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
}

// 5. Read server error log
echo "<h2>Server error_log Analysis</h2>";
$logPath = __DIR__ . '/error_log';
if (file_exists($logPath)) {
    echo "Found <code>error_log</code> at " . htmlspecialchars($logPath) . " (" . filesize($logPath) . " bytes).<br>";
    $lines = file($logPath);
    if ($lines) {
        $lastLines = array_slice($lines, -25);
        echo "Showing last 25 lines of error_log:<br>";
        echo "<pre>";
        foreach ($lastLines as $line) {
            echo htmlspecialchars($line);
        }
        echo "</pre>";
    } else {
        echo "<span class='warning'>Could not read error_log lines.</span><br>";
    }
} else {
    echo "<span class='info'>No <code>error_log</code> found at root directory ($logPath). Looking in parent...</span><br>";
    $parentLogPath = dirname(__DIR__) . '/error_log';
    if (file_exists($parentLogPath)) {
        echo "Found <code>error_log</code> in parent directory: " . htmlspecialchars($parentLogPath) . " (" . filesize($parentLogPath) . " bytes).<br>";
        $lines = file($parentLogPath);
        if ($lines) {
            $lastLines = array_slice($lines, -25);
            echo "Showing last 25 lines of parent error_log:<br>";
            echo "<pre>";
            foreach ($lastLines as $line) {
                echo htmlspecialchars($line);
            }
            echo "</pre>";
        }
    } else {
        echo "<span class='warning'>No error_log files found.</span><br>";
    }
}

echo "</body>
</html>";
