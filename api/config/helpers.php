<?php
// api/config/helpers.php - shared helper functions for the API

// LOAD ENV: reads .env into putenv/$_ENV/$_SERVER so db.php can read the DB credentials
function loadEnv($path = null) {
    static $loaded = false;
    if ($loaded) {
        return;
    }

    if ($path === null) {
        $possiblePaths = [
            __DIR__ . '/../../.env',
            __DIR__ . '/../.env',
            __DIR__ . '/.env',
            (defined('ROOT_PATH') ? ROOT_PATH . '/.env' : null),
        ];
        foreach ($possiblePaths as $p) {
            if ($p && file_exists($p)) {
                $path = $p;
                break;
            }
        }
    }

    if ($path && file_exists($path)) {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || str_starts_with($line, '#')) {
                continue;
            }
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name  = trim($name);
                $value = trim($value);

                // strip surrounding quotes
                if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                    (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                    $value = substr($value, 1, -1);
                }

                if (getenv($name) === false) {
                    putenv("{$name}={$value}");
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }
    }
    $loaded = true;
}

loadEnv();

// CORS: allow the frontend to call the API, exit early on a preflight OPTIONS request
function setCORSHeaders() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-User-Id");

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// RESPOND: send a JSON response with the given status code and stop execution
function respond($statusCode, $data) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

// REQUEST BODY: decode the JSON body, fall back to $_POST
function getRequestBody() {
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $decoded = json_decode($rawInput, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST ?? [];
}

// CLEAN: trim whitespace and strip HTML tags from user input
function clean($data) {
    if (is_string($data)) {
        return trim(strip_tags($data));
    }
    return $data;
}

// REQUIRE AUTH: pull a user ID out of the request (header, cookie, session, query, or body)
// 401s if none of those give a valid numeric ID
function requireAuth() {
    $userId = null;

    // 1. Authorization header (Bearer token, raw ID, or JWT) - this is what the app actually uses
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? (function_exists('apache_request_headers') ? (apache_request_headers()['Authorization'] ?? null) : null);

    if ($authHeader) {
        $token = trim(preg_replace('/^Bearer\s+/i', '', $authHeader));
        if (is_numeric($token) && (int)$token > 0) {
            $userId = (int)$token;
        } else {
            // check if a JWT payload contains userId, user_id, or sub
            $parts = explode('.', $token);
            if (count($parts) === 3) {
                $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
                if (is_array($payload)) {
                    $userId = $payload['userId'] ?? $payload['user_id'] ?? $payload['id'] ?? $payload['sub'] ?? null;
                }
            }
        }
    }

    // 2. X-User-Id / User-Id header
    if (!$userId) {
        $xUserId = $_SERVER['HTTP_X_USER_ID'] ?? $_SERVER['HTTP_USER_ID'] ?? null;
        if ($xUserId && is_numeric($xUserId) && (int)$xUserId > 0) {
            $userId = (int)$xUserId;
        }
    }

    // 3. cookie
    if (!$userId && isset($_COOKIE['userId']) && is_numeric($_COOKIE['userId'])) {
        $userId = (int)$_COOKIE['userId'];
    } elseif (!$userId && isset($_COOKIE['user_id']) && is_numeric($_COOKIE['user_id'])) {
        $userId = (int)$_COOKIE['user_id'];
    }

    // 4. session
    if (!$userId) {
        if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
            @session_start();
        }
        if (isset($_SESSION['userId']) && is_numeric($_SESSION['userId'])) {
            $userId = (int)$_SESSION['userId'];
        } elseif (isset($_SESSION['user_id']) && is_numeric($_SESSION['user_id'])) {
            $userId = (int)$_SESSION['user_id'];
        }
    }

    // 5. query params (?userId= / ?user_id= / ?uid=)
    if (!$userId) {
        $qUserId = $_GET['userId'] ?? $_GET['user_id'] ?? $_GET['uid'] ?? null;
        if ($qUserId && is_numeric($qUserId) && (int)$qUserId > 0) {
            $userId = (int)$qUserId;
        }
    }

    // 6. request body (userId / user_id / uid)
    if (!$userId) {
        $body = getRequestBody();
        $bUserId = $body['userId'] ?? $body['user_id'] ?? $body['uid'] ?? null;
        if ($bUserId && is_numeric($bUserId) && (int)$bUserId > 0) {
            $userId = (int)$bUserId;
        }
    }

    if (!$userId || (int)$userId <= 0) {
        respond(401, ['error' => 'Unauthorized']);
    }

    return (int)$userId;
}

// REQUIRE ADMIN: same as requireAuth() but also checks Role = Admin and not disabled
// 403s if the caller isn't an active admin
function requireAdmin($db) {
    $userId = requireAuth();

    $stmt = $db->prepare('SELECT Role, IsDisabled FROM Users WHERE ID = :id LIMIT 1');
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    if (!$user || (int) $user['IsDisabled'] === 1 || $user['Role'] !== 'Admin') {
        respond(403, ['error' => 'Admin access required']);
    }

    return $userId;
}