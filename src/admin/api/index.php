<?php

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


function getUsers($db) {

    // 🔥 FIX: بدل global نقرأ مباشرة
    $search = $_GET['search'] ?? null;
    $sort   = $_GET['sort'] ?? null;
    $order  = $_GET['order'] ?? null;

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

    sendResponse($stmt->fetchAll(PDO::FETCH_ASSOC), 200);
}


function getUserById($db, $id) {

    if (!$id) sendResponse("Missing id", 400);

    $stmt = $db->prepare("SELECT id, name, email, is_admin, created_at FROM users WHERE id = :id");
    $stmt->execute([':id' => $id]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) sendResponse("User not found", 404);

    sendResponse($row, 200);
}

function createUser($db, $data) {

    if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
        sendResponse("Missing required fields", 400);
    }

    $name = sanitizeInput($data['name']);
    $email = sanitizeInput($data['email']);
    $password = trim($data['password']);

    if (!validateEmail($email)) sendResponse("Invalid email", 400);
    if (strlen($password) < 8) sendResponse("Password too short", 400);

    $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->execute([':email' => $email]);

    if ($stmt->fetch()) sendResponse("Email already exists", 409);

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $db->prepare("
        INSERT INTO users (name,email,password,is_admin)
        VALUES (:name,:email,:password,:is_admin)
    ");

    $ok = $stmt->execute([
        ':name' => $name,
        ':email' => $email,
        ':password' => $hash,
        ':is_admin' => $data['is_admin'] ?? 0
    ]);

    if ($ok) {
        sendResponse(["id" => $db->lastInsertId()], 201);
    }

    sendResponse("Failed to create user", 500);
}


function updateUser($db, $data) {

    if (empty($data['id'])) sendResponse("Missing id", 400);

    $stmt = $db->prepare("SELECT id FROM users WHERE id = :id");
    $stmt->execute([':id' => $data['id']]);

    if (!$stmt->fetch()) sendResponse("User not found", 404);

    $fields = [];
    $params = [':id' => $data['id']];

    if (!empty($data['name'])) {
        $fields[] = "name = :name";
        $params[':name'] = sanitizeInput($data['name']);
    }

    if (!empty($data['email'])) {
        if (!validateEmail($data['email'])) sendResponse("Invalid email", 400);

        $check = $db->prepare("SELECT id FROM users WHERE email = :email AND id != :id");
        $check->execute([':email' => $data['email'], ':id' => $data['id']]);

        if ($check->fetch()) sendResponse("Email already exists", 409);

        $fields[] = "email = :email";
        $params[':email'] = sanitizeInput($data['email']);
    }

    if (isset($data['is_admin'])) {
        $fields[] = "is_admin = :is_admin";
        $params[':is_admin'] = $data['is_admin'] == 1 ? 1 : 0;
    }

    if (!$fields) sendResponse("No fields to update", 200);

    $sql = "UPDATE users SET " . implode(",", $fields) . " WHERE id = :id";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    sendResponse("User updated", 200);
}


function deleteUser($db, $id) {

    if (!$id) sendResponse("Missing id", 400);

    $stmt = $db->prepare("SELECT id FROM users WHERE id = :id");
    $stmt->execute([':id' => $id]);

    if (!$stmt->fetch()) sendResponse("User not found", 404);

    $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
    $stmt->execute([':id' => $id]);

    sendResponse("User deleted", 200);
}

function changePassword($db, $data) {

    if (empty($data['id']) || empty($data['current_password']) || empty($data['new_password'])) {
        sendResponse("Missing fields", 400);
    }

    if (strlen($data['new_password']) < 8) {
        sendResponse("New password too short", 400);
    }

    $stmt = $db->prepare("SELECT password FROM users WHERE id = :id");
    $stmt->execute([':id' => $data['id']]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) sendResponse("User not found", 404);

    if (!password_verify($data['current_password'], $row['password'])) {
        sendResponse("Unauthorized", 401);
    }

    $hash = password_hash($data['new_password'], PASSWORD_DEFAULT);

    $stmt = $db->prepare("UPDATE users SET password = :password WHERE id = :id");
    $stmt->execute([
        ':password' => $hash,
        ':id' => $data['id']
    ]);

    sendResponse("Password changed", 200);
}


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
    sendResponse("Server error", 500);
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header("Content-Type: application/json");

    if ($statusCode < 400) {
        echo json_encode(["success" => true, "data" => $data]);
    } else {
        echo json_encode(["success" => false, "message" => $data]);
    }

    exit;
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

?>
