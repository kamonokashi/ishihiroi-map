<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$box = $_GET['box'] ?? '';
if (!preg_match('/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/', $box)) {
    http_response_code(400);
    echo json_encode(['error' => 'box must be south,west,north,east'], JSON_UNESCAPED_UNICODE);
    exit;
}

$url = 'https://gbank.gsj.jp/seamless/v2/api/1.3/legend.json?box=' . rawurlencode($box);
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 12,
        'header' => "Accept: application/json\r\n",
    ],
]);

$response = @file_get_contents($url, false, $context);
if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'failed to fetch geology API'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo $response;
