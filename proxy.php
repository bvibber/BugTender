<?php

// Cross-origin proxy
// Not needed if on same domain, or if have elevated privs (apps)
// Not needed if CORS stuff is set up on the API, but doesn't seem to be avail?

require './config.php';

if (!defined('BUGTENDER_PROXY') || !BUGTENDER_PROXY) {
    header('HTTP/1.x 403 Not Allowed');
    die('Proxy not enabled.');
}

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.x 400 Bad Request');
    die('Invalid method; only POST accepted');
}

if (isset($_SERVER['CONTENT_TYPE']) &&
    preg_match('/^[a-z0-9_\/;= -]+$/i', $_SERVER['CONTENT_TYPE'])) {
    $type = $_SERVER['CONTENT_TYPE'];
} else {
    header('HTTP/1.x 400 Bad Request');
    die('Invalid Content-Type ' . htmlspecialchars($_SERVER['CONTENT_TYPE']));
}

$data = file_get_contents('php://input');
$context = stream_context_create(
    array(
        'http' => array(
            'method' => 'POST',
            'content' => $data,
            'header' => "Content-Type: $type\r\n"
        )
    )
);

$stream = fopen(BUGTENDER_PROXY, "r", false, $context);
if ($stream) {
    header('Content-Type: application/json');
    fpassthru($stream);
    fclose($stream);
} else {
    header('HTTP/1.x 503 Gateway Error');
    die('Invalid Content-Type');
}
