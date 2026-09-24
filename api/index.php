<?php
// api/index.php - Contacts App auth API
// working endpoints: ping, register, login
// contacts CRUD (list/search/add/edit/delete) not built yet
 
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';
 
setCORSHeaders();
 
$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();
 
// HEALTH CHECK, no auth needed
if ($method === 'GET' && isset($_GET['ping'])) {
    respond(200, ['status' => 'OK', 'timestamp' => time()]);
}
 
// REGISTER: firstName, lastName, username, password -> hash password, insert, return 201
// 400 if missing fields, 409 if username taken
if ($method === 'POST' && ($_GET['action'] ?? '') === 'register') {
    $body      = getRequestBody();
    $firstName = clean($body['firstName'] ?? '');
    $lastName  = clean($body['lastName'] ?? '');
    $username  = clean($body['username'] ?? $body['login'] ?? '');
    $password  = $body['password'] ?? ''; // don't clean a password
 
    if (!$firstName || !$lastName || !$username || !$password) {
        respond(400, ['error' => 'firstName, lastName, username, and password are required']);
    }
 
    $check = $db->prepare('SELECT ID FROM Users WHERE Username = :username LIMIT 1');
    $check->execute([':username' => $username]);
    if ($check->fetch()) {
        respond(409, ['error' => 'Username already exists']);
    }
 
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare('INSERT INTO Users (FirstName, LastName, Username, Password) VALUES (:first, :last, :username, :pass)');
    $stmt->execute([':first' => $firstName, ':last' => $lastName, ':username' => $username, ':pass' => $hash]);
 
    respond(201, [
        'message' => 'Registration successful',
        'id'      => (int) $db->lastInsertId(),
        'error'   => ''
    ]);
}
 
// LOGIN: username + password -> look up by Username, verify hash, return user + token
// 401 for bad username or bad password, same error either way
if ($method === 'POST' && !isset($_GET['action'])) {
    $body = getRequestBody();
 
    if (isset($body['login']) && isset($body['password'])) {
        $login    = clean($body['login']);
        $password = $body['password']; // don't clean a password
 
        if (!$login || !$password) {
            respond(400, ['error' => 'Login and password are required']);
        }
 
        $stmt = $db->prepare('SELECT ID, FirstName, LastName, Password FROM Users WHERE Username = :login LIMIT 1');
        $stmt->execute([':login' => $login]);
        $user = $stmt->fetch();
 
        if ($user && password_verify($password, $user['Password'])) {
            respond(200, [
                'id'        => (int) $user['ID'],
                'firstName' => $user['FirstName'],
                'lastName'  => $user['LastName'],
                'token'     => (string) $user['ID'],
                'error'     => ''
            ]);
        } else {
            respond(401, [
                'id'        => 0,
                'firstName' => '',
                'lastName'  => '',
                'error'     => 'No Records Found'
            ]);
        }
    }
}
 
// ERROR: if here, no other endpoints matched, return 404
// nothing else built yet, contacts endpoints go here later
respond(404, ['error' => 'Endpoint not found']);