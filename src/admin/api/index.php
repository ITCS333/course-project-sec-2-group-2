<?php
/**
 * User Management API
 *
 * A RESTful API that handles all CRUD operations for user management
 * and password changes for the Admin Portal.
 * Uses PDO to interact with a MySQL database.
 *
 * Database Table (ground truth: see schema.sql):
 * Table: users
 * Columns:
 *   - id         (INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT)
 *   - name       (VARCHAR(100), NOT NULL)
 *   - email      (VARCHAR(100), NOT NULL, UNIQUE)
 *   - password   (VARCHAR(255), NOT NULL) - bcrypt hash
 *   - is_admin   (TINYINT(1), NOT NULL, DEFAULT 0)
 *   - created_at (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
 *
 * HTTP Methods Supported:
 *   - GET    : Retrieve all users (with optional search/sort query params)
 *   - GET    : Retrieve a single user by id (?id=1)
 *   - POST   : Create a new user
 *   - POST   : Change a user's password (?action=change_password)
 *   - PUT    : Update an existing user's name, email, or is_admin
 *   - DELETE : Delete a user by id (?id=1)
 *
 * Response Format: JSON
 * All responses have the shape:
 *   { "success": true,  "data": ... }
 *   { "success": false, "message": "..." }
 */


header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}


require_once 'db.php';
$db = getDBConnection();

$method = $_SERVER['REQUEST_METHOD'];


$raw = file_get_contents("php://input");
$data = json_decode($raw, true);


$id = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;
$search = $_GET['search'] ?? null;
$sort = $_GET['sort'] ?? null;
$order = $_GET['order'] ?? null;

/**
 * Function: Get all users, or search/filter users.
 * Method: GET (no ?id parameter)
 *
 * Supported query parameters:
 *   - search (string) : filters rows where name LIKE or email LIKE the term
 *   - sort   (string) : column to sort by; allowed values: name, email, is_admin
 *   - order  (string) : sort direction; allowed values: asc, desc (default: asc)
 *
 * Notes:
 *   - Never return the password column in the response.
 *   - Validate the 'sort' value against the whitelist (name, email, is_admin)
 *     to prevent SQL injection before interpolating it into the ORDER BY clause.
 *   - Validate the 'order' value; only accept 'asc' or 'desc'.
 */
function getUsers($db) {
    global $search, $sort, $order;
    $query = "SELECT id, name, email, is_admin, created_at FROM users";
    $params = [];

    if ($search) {
        $query .= " WHERE name LIKE :search OR email LIKE :search";
        $params[':search'] = "%$search%";
    }

    $allowedSort = ['name','email','is_admin'];
    if ($sort && in_array($sort, $allowedSort)) {
        $order = strtolower($order) === 'desc' ? 'DESC' : 'ASC';
        $query .= " ORDER BY $sort $order";
    }

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    sendResponse($rows, 200);
}

/**
 * Function: Get a single user by primary key.
 * Method: GET with ?id=<int>
 *
 * Query parameters:
 *   - id (int, required) : the user's primary key in the users table
 */
function getUserById($db, $id) {
    $stmt = $db->prepare("SELECT id, name, email, is_admin, created_at FROM users WHERE id = :id");
    $stmt->execute([':id'=>$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) sendResponse("User not found", 404);
    sendResponse($row, 200);
}

/**
 * Function: Create a new user.
 * Method: POST (no ?action parameter)
 *
 * Expected JSON body:
 *   - name     (string, required)
 *   - email    (string, required) - must be a valid email address and unique
 *   - password (string, required) - plaintext; will be hashed before storage
 *   - is_admin (int, optional)    - 0 (student) or 1 (admin); defaults to 0
 */
function createUser($db, $data) {
    if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
        sendResponse("Missing required fields", 400);
    }

    $name = sanitizeInput($data['name']);
    $email = sanitizeInput($data['email']);
    $password = trim($data['password']);
    $is_admin = isset($data['is_admin']) && $data['is_admin'] == 1 ? 1 : 0;

    if (!validateEmail($email)) sendResponse("Invalid email", 400);
    if (strlen($password) < 8) sendResponse("Password too short", 400);

    $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->execute([':email'=>$email]);
    if ($stmt->fetch()) sendResponse("Email already exists", 409);

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO users (name,email,password,is_admin) VALUES (:name,:email,:password,:is_admin)");
    $ok = $stmt->execute([':name'=>$name, ':email'=>$email, ':password'=>$hash, ':is_admin'=>$is_admin]);

    if ($ok) sendResponse(["id"=>$db->lastInsertId()], 201);
    sendResponse("Failed to create user", 500);
}

/**
 * Function: Update an existing user.
 * Method: PUT
 *
 * Expected JSON body:
 *   - id       (int, required)    : primary key of the user to update
 *   - name     (string, optional) : new name
 *   - email    (string, optional) : new email (must remain unique)
 *   - is_admin (int, optional)    : 0 or 1
 *
 * Note: password changes are handled by the separate changePassword endpoint.
 */
function updateUser($db, $data) {
    if (empty($data['id'])) sendResponse("Missing user id", 400);

    $stmt = $db->prepare("SELECT id FROM users WHERE id = :id");
    $stmt->execute([':id'=>$data['id']]);
    if (!$stmt->fetch()) sendResponse("User not found", 404);

    $fields = [];
    $params = [':id'=>$data['id']];

    if (!empty($data['name'])) {
        $fields[] = "name = :name";
        $params[':name'] = sanitizeInput($data['name']);
    }
    if (!empty($data['email'])) {
        if (!validateEmail($data['email'])) sendResponse("Invalid email", 400);
        $stmt = $db->prepare("SELECT id FROM users WHERE email = :email AND id != :id");
        $stmt->execute([':email'=>$data['email'], ':id'=>$data['id']]);
        if ($stmt->fetch()) sendResponse("Email already exists", 409);
        $fields[] = "email = :email";
        $params[':email'] = sanitizeInput($data['email']);
    }
    if (isset($data['is_admin'])) {
        $fields[] = "is_admin = :is_admin";
        $params[':is_admin'] = $data['is_admin'] == 1 ? 1 : 0;
    }

    if (!$fields) sendResponse("No fields to update", 200);

    $sql = "UPDATE users SET ".implode(", ",$fields)." WHERE id = :id";
    $stmt = $db->prepare($sql);
    $ok = $stmt->execute($params);

    if ($ok) sendResponse("User updated", 200);
    sendResponse("Failed to update", 500);
}

/**
 * Function: Delete a user by primary key.
 * Method: DELETE
 *
 * Query parameter:
 *   - id (int, required) : primary key of the user to delete
 */
function deleteUser($db, $id) {
    if (!$id) sendResponse("Missing id", 400);

    $stmt = $db->prepare("SELECT id FROM users WHERE id = :id");
    $stmt->execute([':id'=>$id]);
    if (!$stmt->fetch()) sendResponse("User not found", 404);

    $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
    $ok = $stmt->execute([':id'=>$id]);
    if ($ok) sendResponse("User deleted", 200);
    sendResponse("Failed to delete", 500);
}

/**
 * Function: Change a user's password.
 * Method: POST with ?action=change_password
 *
 * Expected JSON body:
 *   - id               (int, required)    : primary key of the user whose password is changing
 *   - current_password (string, required) : must match the stored bcrypt hash
 *   - new_password     (string, required) : plaintext; will be hashed before storage
 */
function changePassword($db, $data) {
    if (empty($data['id']) || empty($data['current_password']) || empty($data['new_password'])) {
        sendResponse("Missing fields", 400);
    }
    if (strlen($data['new_password']) < 8) sendResponse("New password too short", 400);

    $stmt = $db->prepare("SELECT password FROM users WHERE id = :id");
    $stmt->execute([':id'=>$data['id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) sendResponse("User not found", 404);

    if (!password_verify($data['current_password'], $row['password'])) {
        sendResponse("Unauthorized", 401);
    }

    $hash = password_hash($data['new_password'], PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE users SET password = :password WHERE id = :id");
    $ok = $stmt->execute([':password'=>$hash, ':id'=>$data['id']]);
    if ($ok) sendResponse("Password changed", 200);
    sendResponse("Failed to change password", 500);
}


// ============================================================================
// MAIN REQUEST ROUTER
// ============================================================================

try {

    if ($method === 'GET') {
        if ($id) {
            getUserById($db, $id);
        } else {
            getUsers($db);
        }
        
    } elseif ($method === 'POST') {
        if ($action === "change_password") {
            changePassword($db, $data);
        } else {
            createUser($db, $data);
        }

    } elseif ($method === 'PUT') {
        updateUser($db, $data);

    } elseif ($method === 'DELETE') {
        deleteUser($db, $id);

    } else {
        sendResponse("Method not allowed", 405);
    }

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse("Database error", 500);

} catch (Exception $e) {
    sendResponse($e->getMessage(), 500);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sends a JSON response and terminates execution.
 *
 * @param mixed $data       Data to include in the response.
 *                          On success, pass the payload directly.
 *                          On error, pass a string message.
 * @param int   $statusCode HTTP status code (default 200).
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);

    if ($statusCode < 400) {
        echo json_encode(["success" => true, "data" => $data]);
    } else {
        echo json_encode(["success" => false, "message" => $data]);
    }

    exit;
}

/**
 * Validates an email address.
 *
 * @param  string $email
 * @return bool   True if the email passes FILTER_VALIDATE_EMAIL, false otherwise.
 */
function validateEmail($email) {
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

/**
 * Sanitizes a string input value.
 * Use this before inserting user-supplied strings into the database.
 *
 * @param  string $data
 * @return string Trimmed, tag-stripped, and HTML-escaped string.
 */
function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

?>
