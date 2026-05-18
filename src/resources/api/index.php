<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once './config/Database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

$action = $_GET['action'] ?? null;
$id = $_GET['id'] ?? null;
$resource_id = $_GET['resource_id'] ?? null;
$comment_id = $_GET['comment_id'] ?? null;

// ============================================================================
// RESOURCE FUNCTIONS
// ============================================================================

function getAllResources($db) {
    $search = $_GET['search'] ?? null;
    $sort = $_GET['sort'] ?? 'created_at';
    $order = strtoupper($_GET['order'] ?? 'DESC');

    $allowedSort = ['title', 'created_at'];
    if (!in_array($sort, $allowedSort)) $sort = 'created_at';
    if (!in_array($order, ['ASC', 'DESC'])) $order = 'DESC';

    $sql = "SELECT id, title, description, link, created_at FROM resources";
    if ($search) {
        $sql .= " WHERE title LIKE :search OR description LIKE :search";
    }
    $sql .= " ORDER BY $sort $order";

    $stmt = $db->prepare($sql);
    if ($search) {
        $stmt->bindValue(':search', '%' . $search . '%');
    }

    $stmt->execute();
    $resources = $stmt->fetchAll(PDO::FETCH_ASSOC);
    sendResponse(['success' => true, 'data' => $resources]);
}

function getResourceById($db, $resourceId) {
    if (!$resourceId || !is_numeric($resourceId)) {
        sendResponse(['success' => false, 'message' => 'Invalid ID.'], 400);
    }

    $stmt = $db->prepare("SELECT id, title, description, link, created_at FROM resources WHERE id = ?");
    $stmt->execute([$resourceId]);
    $resource = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($resource) {
        sendResponse(['success' => true, 'data' => $resource]);
    } else {
        sendResponse(['success' => false, 'message' => 'Resource not found.'], 404);
    }
}

function createResource($db, $data) {
    $validation = validateRequiredFields($data, ['title', 'link']);
    if (!$validation['valid']) {
        sendResponse(['success' => false, 'message' => 'Missing fields.'], 400);
    }

    if (!validateUrl($data['link'])) {
        sendResponse(['success' => false, 'message' => 'Invalid URL format.'], 400);
    }

    $title = sanitizeInput($data['title']);
    $description = sanitizeInput($data['description'] ?? '');
    $link = $data['link'];

    $stmt = $db->prepare("INSERT INTO resources (title, description, link) VALUES (?, ?, ?)");
    if ($stmt->execute([$title, $description, $link])) {
        $newId = $db->lastInsertId();
        sendResponse([
            'success' => true, 
            'message' => 'Resource created.', 
            'id' => (int)$newId,
            'data' => ['id' => (int)$newId, 'title' => $title, 'description' => $description, 'link' => $link]
        ], 201);
    } else {
        sendResponse(['success' => false, 'message' => 'Database error.'], 500);
    }
}

function updateResource($db, $data) {
    if (!isset($data['id'])) {
        sendResponse(['success' => false, 'message' => 'ID required.'], 400);
    }

    $check = $db->prepare("SELECT id FROM resources WHERE id = ?");
    $check->execute([$data['id']]);
    if (!$check->fetch()) {
        sendResponse(['success' => false, 'message' => 'Resource not found.'], 404);
    }

    $fields = [];
    $params = [];
    if (isset($data['title'])) { $fields[] = "title = ?"; $params[] = sanitizeInput($data['title']); }
    if (isset($data['description'])) { $fields[] = "description = ?"; $params[] = sanitizeInput($data['description']); }
    if (isset($data['link'])) { 
        if (!validateUrl($data['link'])) sendResponse(['success' => false, 'message' => 'Invalid URL.'], 400);
        $fields[] = "link = ?"; $params[] = $data['link']; 
    }

    if (empty($fields)) sendResponse(['success' => false, 'message' => 'No fields to update.'], 400);

    $params[] = $data['id'];
    $sql = "UPDATE resources SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    
    if ($stmt->execute($params)) {
        sendResponse(['success' => true, 'message' => 'Resource updated.']);
    } else {
        sendResponse(['success' => false, 'message' => 'Update failed.'], 500);
    }
}

function deleteResource($db, $resourceId) {
    if (!$resourceId || !is_numeric($resourceId)) sendResponse(['success' => false, 'message' => 'Invalid ID.'], 400);

    $stmt = $db->prepare("DELETE FROM resources WHERE id = ?");
    $stmt->execute([$resourceId]);

    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true, 'message' => 'Resource deleted.']);
    } else {
        sendResponse(['success' => false, 'message' => 'Resource not found.'], 404);
    }
}

// ============================================================================
// COMMENT FUNCTIONS
// ============================================================================

function getCommentsByResourceId($db, $resourceId) {
    if (!$resourceId || !is_numeric($resourceId)) sendResponse(['success' => false, 'message' => 'Invalid resource ID.'], 400);

    $stmt = $db->prepare("SELECT id, resource_id, author, text, created_at FROM comments_resource WHERE resource_id = ? ORDER BY created_at ASC");
    $stmt->execute([$resourceId]);
    sendResponse(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function createComment($db, $data) {
    $validation = validateRequiredFields($data, ['resource_id', 'text']);
    if (!$validation['valid']) sendResponse(['success' => false, 'message' => 'Missing fields.'], 400);

    $author = sanitizeInput($data['author'] ?? 'Anonymous');
    if(empty($author)) { $author = 'Anonymous'; }
    $text = sanitizeInput($data['text']);

    $stmt = $db->prepare("INSERT INTO comments_resource (resource_id, author, text) VALUES (?, ?, ?)");
    if ($stmt->execute([$data['resource_id'], $author, $text])) {
        $newId = $db->lastInsertId();
        sendResponse([
            'success' => true, 
            'message' => 'Comment added.', 
            'id' => (int)$newId,
            'data' => ['id' => (int)$newId, 'resource_id' => $data['resource_id'], 'author' => $author, 'text' => $text]
        ], 201);
    } else {
        sendResponse(['success' => false, 'message' => 'Could not add comment.'], 500);
    }
}

// ============================================================================
// ROUTER
// ============================================================================

try {
    if ($method === 'GET') {
        if ($action === 'comments') {
            getCommentsByResourceId($db, $resource_id);
        } elseif ($id) {
            getResourceById($db, $id);
        } else {
            getAllResources($db);
        }
    } elseif ($method === 'POST') {
        if ($action === 'comment') {
            createComment($db, $data);
        } else {
            createResource($db, $data);
        }
    } elseif ($method === 'PUT') {
        updateResource($db, $data);
    } elseif ($method === 'DELETE') {
        if ($action === 'delete_comment') {
            $stmt = $db->prepare("DELETE FROM comments_resource WHERE id = ?");
            $stmt->execute([$_GET['comment_id'] ?? null]);
            sendResponse(['success' => true, 'message' => 'Comment deleted.']);
        } else {
            deleteResource($db, $id);
        }
    } else {
        sendResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
    }
} catch (Exception $e) {
    error_log($e->getMessage());
    sendResponse(['success' => false, 'message' => 'Internal Server Error.'], 500);
}

// ============================================================================
// HELPERS
// ============================================================================

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function validateUrl($url) {
    return filter_var($url, FILTER_VALIDATE_URL);
}

function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

function validateRequiredFields($data, $requiredFields) {
    $missing = [];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missing[] = $field;
        }
    }
    return ['valid' => count($missing) === 0, 'missing' => $missing];
}