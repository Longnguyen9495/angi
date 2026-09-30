<?php
$name = preg_replace('/[^a-z0-9-]/', '', $_GET['name'] ?? 'out');
$data = file_get_contents('php://input');
$b64 = substr($data, strpos($data, ',') + 1);
file_put_contents(__DIR__ . "/$name.jpg", base64_decode($b64));
echo 'ok';
