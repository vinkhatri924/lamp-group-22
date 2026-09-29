<?php
// api/index.php - Contacts App auth API
// working endpoints: ping, register, login, contacts CRUD, admin management

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

// categories a contact is allowed to have, matches the Contacts.Category enum in resetdb.sql
define('VALID_CATEGORIES', ['Family', 'Friends', 'Work', 'School', 'Services', 'Emergency', 'Other']);

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

// LOGIN: username + password -> look up by Username, verify hash, return user + role
// 401 for bad username or bad password, 403 if the account is disabled
if ($method === 'POST' && !isset($_GET['action'])) {
    $body = getRequestBody();

    if (isset($body['login']) && isset($body['password'])) {
        $login    = clean($body['login']);
        $password = $body['password']; // don't clean a password

        if (!$login || !$password) {
            respond(400, ['error' => 'Login and password are required']);
        }

        $stmt = $db->prepare(
            'SELECT ID, FirstName, LastName, Password, Role, IsDisabled
            FROM Users
            WHERE Username = :login
            LIMIT 1'
        );
        $stmt->execute([':login' => $login]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['Password'])) {
            respond(401, [
                'id'        => 0,
                'firstName' => '',
                'lastName'  => '',
                'error'     => 'No Records Found'
            ]);
        }

        // credentials are correct, now check if the account is disabled
        if ((int) $user['IsDisabled'] === 1) {
            respond(403, [
                'id'        => 0,
                'firstName' => '',
                'lastName'  => '',
                'error'     => 'Account Disabled'
            ]);
        }

        respond(200, [
            'id'        => (int) $user['ID'],
            'firstName' => $user['FirstName'],
            'lastName'  => $user['LastName'],
            'role'      => $user['Role'],
            'token'     => (string) $user['ID'],
            'error'     => ''
        ]);
    }
}

// LIST/SEARCH CONTACTS: GET, scoped to the logged-in user (needs Authorization: Bearer <token>)
// optional ?q= partial name match, optional ?category= filter
if ($method === 'GET' && ($_GET['action'] ?? '') === 'contacts') {
    $userId = requireAuth();

    $q        = clean($_GET['q'] ?? '');
    $category = clean($_GET['category'] ?? '');

    $sql    = 'SELECT ID, Name, EmailAddress, PhoneNumber, Category FROM Contacts WHERE UserID = :userId';
    $params = [':userId' => $userId];

    if ($q !== '') {
        $sql .= ' AND Name LIKE :q';
        $params[':q'] = '%' . $q . '%';
    }

    if ($category !== '' && $category !== 'All Contacts') {
        $sql .= ' AND Category = :category';
        $params[':category'] = $category;
    }

    $sql .= ' ORDER BY Name ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $contacts = array_map(function ($row) {
        return [
            'id'       => (int) $row['ID'],
            'name'     => $row['Name'],
            'email'    => $row['EmailAddress'],
            'phone'    => $row['PhoneNumber'],
            'category' => $row['Category']
        ];
    }, $rows);

    respond(200, ['contacts' => $contacts]);
}

// ADD CONTACT: name required, phone/email/category optional -> insert, scoped to logged-in user
if ($method === 'POST' && ($_GET['action'] ?? '') === 'addContact') {
    $userId = requireAuth();
    $body   = getRequestBody();

    $name     = clean($body['name'] ?? '');
    $phone    = clean($body['phone'] ?? '');
    $email    = clean($body['email'] ?? '');
    $category = clean($body['category'] ?? 'Other');

    if (!$name) {
        respond(400, ['error' => 'Contact name is required']);
    }

    if (!in_array($category, VALID_CATEGORIES, true)) {
        respond(400, ['error' => 'Invalid category']);
    }

    $stmt = $db->prepare(
        'INSERT INTO Contacts (Name, PhoneNumber, EmailAddress, Category, UserID)
        VALUES (:name, :phone, :email, :category, :userId)'
    );
    $stmt->execute([
        ':name'     => $name,
        ':phone'    => $phone ?: null,
        ':email'    => $email ?: null,
        ':category' => $category,
        ':userId'   => $userId
    ]);

    respond(201, ['id' => (int) $db->lastInsertId(), 'error' => '']);
}

// UPDATE CONTACT: id required -> update name/phone/email/category, only if it belongs to this user
if ($method === 'POST' && ($_GET['action'] ?? '') === 'updateContact') {
    $userId = requireAuth();
    $body   = getRequestBody();

    $id       = (int) ($body['id'] ?? 0);
    $name     = clean($body['name'] ?? '');
    $phone    = clean($body['phone'] ?? '');
    $email    = clean($body['email'] ?? '');
    $category = clean($body['category'] ?? 'Other');

    if (!$id || !$name) {
        respond(400, ['error' => 'Contact id and name are required']);
    }

    if (!in_array($category, VALID_CATEGORIES, true)) {
        respond(400, ['error' => 'Invalid category']);
    }

    // WHERE clause checks UserID too, so nobody can edit a contact they don't own
    $stmt = $db->prepare(
        'UPDATE Contacts
        SET Name = :name, PhoneNumber = :phone, EmailAddress = :email, Category = :category
        WHERE ID = :id AND UserID = :userId'
    );
    $stmt->execute([
        ':name'     => $name,
        ':phone'    => $phone ?: null,
        ':email'    => $email ?: null,
        ':category' => $category,
        ':id'       => $id,
        ':userId'   => $userId
    ]);

    if ($stmt->rowCount() === 0) {
        respond(404, ['error' => 'Contact not found']);
    }

    respond(200, ['error' => '']);
}

// DELETE CONTACT: id required -> delete, only if it belongs to this user
if ($method === 'POST' && ($_GET['action'] ?? '') === 'deleteContact') {
    $userId = requireAuth();
    $body   = getRequestBody();

    $id = (int) ($body['id'] ?? 0);

    if (!$id) {
        respond(400, ['error' => 'Contact id is required']);
    }

    $stmt = $db->prepare('DELETE FROM Contacts WHERE ID = :id AND UserID = :userId');
    $stmt->execute([':id' => $id, ':userId' => $userId]);

    if ($stmt->rowCount() === 0) {
        respond(404, ['error' => 'Contact not found']);
    }

    respond(200, ['error' => '']);
}

// ADMIN: LIST/SEARCH ALL USERS, optional ?q= partial match on name/username
if ($method === 'GET' && ($_GET['action'] ?? '') === 'adminUsers') {
    requireAdmin($db);

    $q = clean($_GET['q'] ?? '');

    $sql    = 'SELECT ID, FirstName, LastName, Username, Role, IsDisabled FROM Users';
    $params = [];

    if ($q !== '') {
        $sql .= ' WHERE Username LIKE :q OR FirstName LIKE :q OR LastName LIKE :q';
        $params[':q'] = '%' . $q . '%';
    }

    $sql .= ' ORDER BY Username ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $users = array_map(function ($row) {
        return [
            'id'         => (int) $row['ID'],
            'firstName'  => $row['FirstName'],
            'lastName'   => $row['LastName'],
            'username'   => $row['Username'],
            'role'       => $row['Role'],
            'isDisabled' => (bool) $row['IsDisabled']
        ];
    }, $rows);

    respond(200, ['users' => $users]);
}

// ADMIN: VIEW ONE USER'S CONTACTS, ?userId= required
if ($method === 'GET' && ($_GET['action'] ?? '') === 'adminUserContacts') {
    requireAdmin($db);

    $userId = (int) ($_GET['userId'] ?? 0);

    if (!$userId) {
        respond(400, ['error' => 'userId is required']);
    }

    $stmt = $db->prepare(
        'SELECT ID, Name, EmailAddress, PhoneNumber, Category
        FROM Contacts
        WHERE UserID = :userId
        ORDER BY Name ASC'
    );
    $stmt->execute([':userId' => $userId]);
    $rows = $stmt->fetchAll();

    $contacts = array_map(function ($row) {
        return [
            'id'       => (int) $row['ID'],
            'name'     => $row['Name'],
            'email'    => $row['EmailAddress'],
            'phone'    => $row['PhoneNumber'],
            'category' => $row['Category']
        ];
    }, $rows);

    respond(200, ['contacts' => $contacts]);
}

// ADMIN: SEARCH ALL CONTACTS ACROSS EVERY USER, optional ?q=, includes the owner's username
if ($method === 'GET' && ($_GET['action'] ?? '') === 'adminContacts') {
    requireAdmin($db);

    $q = clean($_GET['q'] ?? '');

    $sql = 'SELECT c.ID, c.Name, c.EmailAddress, c.PhoneNumber, c.Category, u.Username
        FROM Contacts c
        JOIN Users u ON u.ID = c.UserID';
    $params = [];

    if ($q !== '') {
        $sql .= ' WHERE c.Name LIKE :q';
        $params[':q'] = '%' . $q . '%';
    }

    $sql .= ' ORDER BY c.Name ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $contacts = array_map(function ($row) {
        return [
            'id'       => (int) $row['ID'],
            'name'     => $row['Name'],
            'email'    => $row['EmailAddress'],
            'phone'    => $row['PhoneNumber'],
            'category' => $row['Category'],
            'owner'    => $row['Username']
        ];
    }, $rows);

    respond(200, ['contacts' => $contacts]);
}

// ADMIN: DISABLE / RE-ENABLE A USER, userId + isDisabled required
if ($method === 'POST' && ($_GET['action'] ?? '') === 'adminDisableUser') {
    requireAdmin($db);

    $body       = getRequestBody();
    $userId     = (int) ($body['userId'] ?? 0);
    $isDisabled = !empty($body['isDisabled']) ? 1 : 0;

    if (!$userId) {
        respond(400, ['error' => 'userId is required']);
    }

    $stmt = $db->prepare('UPDATE Users SET IsDisabled = :isDisabled WHERE ID = :id');
    $stmt->execute([':isDisabled' => $isDisabled, ':id' => $userId]);

    if ($stmt->rowCount() === 0) {
        respond(404, ['error' => 'User not found']);
    }

    respond(200, ['error' => '']);
}

// ADMIN: CHANGE A USER'S PASSWORD, userId + newPassword required
if ($method === 'POST' && ($_GET['action'] ?? '') === 'adminChangePassword') {
    requireAdmin($db);

    $body        = getRequestBody();
    $userId      = (int) ($body['userId'] ?? 0);
    $newPassword = $body['newPassword'] ?? ''; // don't clean a password

    if (!$userId || !$newPassword) {
        respond(400, ['error' => 'userId and newPassword are required']);
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $db->prepare('UPDATE Users SET Password = :pass WHERE ID = :id');
    $stmt->execute([':pass' => $hash, ':id' => $userId]);

    if ($stmt->rowCount() === 0) {
        respond(404, ['error' => 'User not found']);
    }

    respond(200, ['error' => '']);
}

// ADMIN: CREATE A NEW ACCOUNT, defaults to role User, pass role: "Admin" to create an admin
// 400 if missing fields, 409 if username taken
if ($method === 'POST' && ($_GET['action'] ?? '') === 'adminCreateAccount') {
    requireAdmin($db);

    $body      = getRequestBody();
    $firstName = clean($body['firstName'] ?? '');
    $lastName  = clean($body['lastName'] ?? '');
    $username  = clean($body['username'] ?? '');
    $password  = $body['password'] ?? ''; // don't clean a password
    $role      = clean($body['role'] ?? 'User');

    if (!$firstName || !$lastName || !$username || !$password) {
        respond(400, ['error' => 'firstName, lastName, username, and password are required']);
    }

    if (!in_array($role, ['Admin', 'User'], true)) {
        respond(400, ['error' => 'Role must be Admin or User']);
    }

    $check = $db->prepare('SELECT ID FROM Users WHERE Username = :username LIMIT 1');
    $check->execute([':username' => $username]);
    if ($check->fetch()) {
        respond(409, ['error' => 'Username already exists']);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare(
        'INSERT INTO Users (FirstName, LastName, Username, Password, Role)
        VALUES (:first, :last, :username, :pass, :role)'
    );
    $stmt->execute([
        ':first'    => $firstName,
        ':last'     => $lastName,
        ':username' => $username,
        ':pass'     => $hash,
        ':role'     => $role
    ]);

    respond(201, ['id' => (int) $db->lastInsertId(), 'error' => '']);
}

// Route Admin requests to admin.php
$action = $_GET['action'] ?? '';

$adminActions = [
    'adminSearchUsers',
    'adminUserContacts',
    'adminSearchContacts',
    'adminSetDisabled',
    'adminChangePassword',
    'adminCreate'
];

if (in_array($action, $adminActions, true))
{
    require __DIR__ . '/admin.php';
    exit;
}

// ERROR: if here, no other endpoints matched, return 404
respond(404, ['error' => 'Endpoint not found']);