<?php
// Deployment guard: a version string alone cannot prove a 7.4 backport exists.
$expected = '712e60f9edfd03f0960fc4fc3c2c375f42b90aa2';
$marker = '/usr/local/share/php-security/upstream-commit';
if (PHP_VERSION_ID !== 70433 || !is_file($marker) || trim(file_get_contents($marker)) !== $expected) {
    fwrite(STDERR, "The required PHP security build is missing.\n");
    exit(1);
}
foreach (file('/usr/local/share/php-security/binaries.sha256', FILE_IGNORE_NEW_LINES) as $line) {
    list($hash, $file) = explode('  ', $line, 2);
    if (!is_file($file) || !hash_equals($hash, hash_file('sha256', $file))) {
        fwrite(STDERR, "PHP binary checksum mismatch.\n");
        exit(1);
    }
}
if (ini_get('session.upload_progress.enabled') || ini_get('max_multipart_body_parts') === false) {
    fwrite(STDERR, "PHP request parsing security checks failed.\n");
    exit(1);
}
foreach (['bcmath', 'curl', 'dom', 'fileinfo', 'gd', 'mbstring', 'mysqli', 'openssl', 'pcntl', 'pdo_mysql', 'redis', 'SimpleXML', 'sodium', 'zip'] as $extension) {
    if (!extension_loaded($extension)) {
        fwrite(STDERR, "Required PHP extension missing: $extension\n");
        exit(1);
    }
}
echo "PHP 7.4.33 official security backport verified: $expected\n";
