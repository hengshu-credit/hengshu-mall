<?php
$root = dirname(__DIR__, 2);
$count = 0;
$failures = [];
foreach (array_slice($argv, 1) as $relative) {
    $file = $root . '/' . $relative;
    if (!is_file($file) || substr($file, -4) !== '.php') continue;
    $output = [];
    exec(PHP_BINARY . ' -l ' . escapeshellarg($file) . ' 2>&1', $output, $code);
    $count++;
    if ($code !== 0) $failures[$relative] = $output;
}
echo json_encode(['php' => PHP_VERSION, 'files_checked' => $count, 'failures' => $failures], JSON_PRETTY_PRINT), "\n";
exit($count > 0 && !$failures ? 0 : 1);
