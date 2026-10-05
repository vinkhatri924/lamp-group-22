<?php
// api/admin.php
// Handles Admin-only functions for the Contacts App.

// ------------------------------------------------------------
// VERIFY ADMIN
// ------------------------------------------------------------

// Reads the token sent by admin.js.
// Current login system uses the user's ID as the token.
function getAdminToken()
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if ($header === '' && function_exists('getallheaders'))
    {
        $headers = getallheaders();
        $header = $headers['Authorization']
            ?? $headers['authorization']
            ?? '';
    }

    if (preg_match('/Bearer\s+(.+)/i', $header, $matches))
    {
        return trim($matches[1]);
    }

    return '';
}


// Makes sure the request comes from an active Admin.
function requireAdmin($db)
{
    $token = getAdminToken();
    $adminId = (int) $token;

    if ($adminId <= 0)
    {
        respond(401, ['error' => 'Authentication required']);
    }

    $stmt = $db->prepare(
        'SELECT ID, Role, IsDisabled
         FROM Users
         WHERE ID = :id
         LIMIT 1'
    );

    $stmt->execute([
        ':id' => $adminId
    ]);

    $admin = $stmt->fetch();

    if (!$admin)
    {
        respond(401, ['error' => 'Invalid user']);
    }

    if ((int) $admin['IsDisabled'] === 1)
    {
        respond(403, ['error' => 'Account is disabled']);
    }

    if ($admin['Role'] !== 'Admin')
    {
        respond(403, ['error' => 'Admin access required']);
    }

    return $admin;
}


// Every endpoint in this file requires Admin access.
requireAdmin($db);

$action = $_GET['action'] ?? '';


// ------------------------------------------------------------
// SEARCH USERS
//
// GET:
// ?action=adminSearchUsers&q=smith
//
// Blank q returns all users.
// ------------------------------------------------------------

if ($method === 'GET' && $action === 'adminSearchUsers')
{
    $search = clean($_GET['q'] ?? '');

    if ($search === '')
    {
        $stmt = $db->prepare(
            'SELECT
                ID AS id,
                FirstName AS firstName,
                LastName AS lastName,
                Username AS username,
                Role AS role,
                IsDisabled AS isDisabled
             FROM Users
             ORDER BY LastName, FirstName'
        );

        $stmt->execute();
    }
    else
    {
        $value = '%' . $search . '%';

        $stmt = $db->prepare(
            'SELECT
                ID AS id,
                FirstName AS firstName,
                LastName AS lastName,
                Username AS username,
                Role AS role,
                IsDisabled AS isDisabled
             FROM Users
             WHERE FirstName LIKE :q1
                OR LastName LIKE :q2
                OR Username LIKE :q3
             ORDER BY LastName, FirstName'
        );

        $stmt->execute([
            ':q1' => $value,
            ':q2' => $value,
            ':q3' => $value
        ]);
    }

    respond(200, [
        'users' => $stmt->fetchAll(),
        'error' => ''
    ]);
}


// ------------------------------------------------------------
// VIEW ONE USER'S CONTACTS
//
// GET:
// ?action=adminUserContacts&userId=5
// ------------------------------------------------------------

if ($method === 'GET' && $action === 'adminUserContacts')
{
    $userId = (int) ($_GET['userId'] ?? 0);

    if ($userId <= 0)
    {
        respond(400, ['error' => 'Valid userId is required']);
    }

    $stmt = $db->prepare(
        'SELECT
            ID AS id,
            Name AS name,
            EmailAddress AS emailAddress,
            PhoneNumber AS phoneNumber,
            Category AS category,
            UserID AS userId
         FROM Contacts
         WHERE UserID = :userId
         ORDER BY Name'
    );

    $stmt->execute([
        ':userId' => $userId
    ]);

    respond(200, [
        'contacts' => $stmt->fetchAll(),
        'error' => ''
    ]);
}


// ------------------------------------------------------------
// SEARCH ALL CONTACTS
//
// GET:
// ?action=adminSearchContacts&q=jane
//
// Blank q returns all contacts.
// ------------------------------------------------------------

if ($method === 'GET' && $action === 'adminSearchContacts')
{
    $search = clean($_GET['q'] ?? '');

    $baseSql =
        'SELECT
            c.ID AS id,
            c.Name AS name,
            c.EmailAddress AS emailAddress,
            c.PhoneNumber AS phoneNumber,
            c.Category AS category,
            c.UserID AS userId,
            u.Username AS ownerUsername,
            CONCAT(u.FirstName, " ", u.LastName) AS ownerName
         FROM Contacts c
         INNER JOIN Users u ON c.UserID = u.ID';

    if ($search === '')
    {
        $stmt = $db->prepare(
            $baseSql . ' ORDER BY c.Name'
        );

        $stmt->execute();
    }
    else
    {
        $value = '%' . $search . '%';

        $stmt = $db->prepare(
            $baseSql .
            ' WHERE c.Name LIKE :q1
               OR c.EmailAddress LIKE :q2
               OR c.PhoneNumber LIKE :q3
               OR c.Category LIKE :q4
               OR u.Username LIKE :q5
               OR u.FirstName LIKE :q6
               OR u.LastName LIKE :q7
             ORDER BY c.Name'
        );

        $stmt->execute([
            ':q1' => $value,
            ':q2' => $value,
            ':q3' => $value,
            ':q4' => $value,
            ':q5' => $value,
            ':q6' => $value,
            ':q7' => $value
        ]);
    }

    respond(200, [
        'contacts' => $stmt->fetchAll(),
        'error' => ''
    ]);
}


// ------------------------------------------------------------
// DISABLE OR ENABLE USER
//
// POST:
// ?action=adminSetDisabled
//
// {
//     "userId": 5,
//     "isDisabled": 1
// }
// ------------------------------------------------------------

if ($method === 'POST' && $action === 'adminSetDisabled')
{
    $body = getRequestBody();

    $userId = (int) ($body['userId'] ?? 0);
    $isDisabled = (int) ($body['isDisabled'] ?? -1);

    if ($userId <= 0)
    {
        respond(400, ['error' => 'Valid userId is required']);
    }

    if ($isDisabled !== 0 && $isDisabled !== 1)
    {
        respond(400, ['error' => 'isDisabled must be 0 or 1']);
    }

    $stmt = $db->prepare(
        'UPDATE Users
         SET IsDisabled = :disabled
         WHERE ID = :id'
    );

    $stmt->execute([
        ':disabled' => $isDisabled,
        ':id' => $userId
    ]);

    respond(200, [
        'message' => $isDisabled === 1
            ? 'User disabled successfully'
            : 'User enabled successfully',
        'error' => ''
    ]);
}


// ------------------------------------------------------------
// CHANGE USER PASSWORD
//
// POST:
// ?action=adminChangePassword
//
// {
//     "userId": 5,
//     "password": "NewPassword123!"
// }
// ------------------------------------------------------------

if ($method === 'POST' && $action === 'adminChangePassword')
{
    $body = getRequestBody();

    $userId = (int) ($body['userId'] ?? 0);
    $password = $body['password'] ?? '';

    if ($userId <= 0 || $password === '')
    {
        respond(400, [
            'error' => 'userId and password are required'
        ]);
    }

    $hash = password_hash(
        $password,
        PASSWORD_DEFAULT
    );

    $stmt = $db->prepare(
        'UPDATE Users
         SET Password = :password
         WHERE ID = :id'
    );

    $stmt->execute([
        ':password' => $hash,
        ':id' => $userId
    ]);

    respond(200, [
        'message' => 'Password changed successfully',
        'error' => ''
    ]);
}


// ------------------------------------------------------------
// CREATE ADMIN ACCOUNT
//
// POST:
// ?action=adminCreate
//
// {
//     "firstName": "Jane",
//     "lastName": "Smith",
//     "username": "jsmith",
//     "password": "Password123!"
// }
// ------------------------------------------------------------

if ($method === 'POST' && $action === 'adminCreate')
{
    $body = getRequestBody();

    $firstName = clean($body['firstName'] ?? '');
    $lastName = clean($body['lastName'] ?? '');
    $username = clean($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (!$firstName || !$lastName || !$username || !$password)
    {
        respond(400, [
            'error' =>
                'First name, last name, username, and password are required'
        ]);
    }

    // Do not allow duplicate usernames.
    $check = $db->prepare(
        'SELECT ID
         FROM Users
         WHERE Username = :username
         LIMIT 1'
    );

    $check->execute([
        ':username' => $username
    ]);

    if ($check->fetch())
    {
        respond(409, [
            'error' => 'Username already exists'
        ]);
    }

    $hash = password_hash(
        $password,
        PASSWORD_DEFAULT
    );

    $stmt = $db->prepare(
        'INSERT INTO Users
            (
                FirstName,
                LastName,
                Username,
                Password,
                Role,
                IsDisabled
            )
         VALUES
            (
                :first,
                :last,
                :username,
                :password,
                "Admin",
                0
            )'
    );

    $stmt->execute([
        ':first' => $firstName,
        ':last' => $lastName,
        ':username' => $username,
        ':password' => $hash
    ]);

    respond(201, [
        'message' => 'Admin account created successfully',
        'id' => (int) $db->lastInsertId(),
        'error' => ''
    ]);
}


// ------------------------------------------------------------
// UNKNOWN ADMIN ACTION
// ------------------------------------------------------------

respond(404, [
    'error' => 'Admin endpoint not found'
]);