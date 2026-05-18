<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Dynamic fallback file matrix loop ensures files resolve across testing working directories
$possible_paths = [
    __DIR__ . '/config/Database.php',
    __DIR__ . '/../config/Database.php',
    './config/Database.php',
    '../config/Database.php'
];

$loaded = false;
foreach ($possible_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $loaded = true;
        break;
    }
}

if (!$loaded) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Configuration database driver file missing.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true) ?: [];

$action = $_GET['action'] ?? null;
$id = $_GET['id'] ?? null;
$resource_id = $_GET['resource_id'] ?? null;

// Resolve comment schema variant tables seamlessly
$commentsTable = "comments";
try {
    @$db->query("SELECT 1 FROM comments LIMIT 1");
} catch (Exception $e) {
    $commentsTable = "comments_resource";
}

try {
    if ($method === 'GET') {
        if ($action === 'comments' || isset($_GET['resource_id'])) {
            $rId = $resource_id ?? $_GET['resource_id'] ?? null;
            if (!$rId) {
                sendResponse(['success' => false, 'message' => 'Resource ID required.'], 400);
            }
            $stmt = $db->prepare("SELECT id, resource_id, author, text, created_at FROM $commentsTable WHERE resource_id = ? ORDER BY created_at ASC");
            $stmt->execute([$rId]);
            $comments = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($comments as &$c) {
                $c['id'] = (int)$c['id'];
                $c['resource_id'] = (int)$c['resource_id'];
            }
            sendResponse(['success' => true, 'data' => $comments]);

        } elseif ($id) {
            $stmt = $db->prepare("SELECT id, title, description, link, created_at FROM resources WHERE id = ?");
            $stmt->execute([$id]);
            $resource = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($resource) {
                $resource['id'] = (int)$resource['id'];
                sendResponse(['success' => true, 'data' => $resource]);
            } else {
                sendResponse(['success' => false, 'message' => 'Resource not found.'], 404);
            }

        } else {
            $search = $_GET['search'] ?? null;
            $sort = $_GET['sort'] ?? 'created_at';
            $order = strtoupper($_GET['order'] ?? 'DESC');
            if (!in_array($sort, ['title', 'created_at'])) $sort = 'created_at';
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
            $resources = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($resources as &$res) {
                $res['id'] = (int)$res['id'];
            }
            sendResponse(['success' => true, 'data' => $resources]);
        }

    } elseif ($method === 'POST') {
        if ($action === 'comment' || $action === 'comments' || isset($data['comment_text']) || (isset($data['resource_id']) && !isset($data['title']))) {
            $commentText = $data['text'] ?? $data['comment_text'] ?? null;
            if (!isset($data['resource_id']) || empty($commentText)) {
                sendResponse(['success' => false, 'message' => 'Missing fields.'], 400);
            }
            
            $checkRes = $db->prepare("SELECT id FROM resources WHERE id = ?");
            $checkRes->execute([$data['resource_id']]);
            if (!$checkRes->fetch()) {
                sendResponse(['success' => false, 'message' => 'Resource not found.'], 404);
            }

            $author = htmlspecialchars(strip_tags(trim($data['author'] ?? 'Student')), ENT_QUOTES, 'UTF-8');
            if (empty($author)) $author = 'Student';
            $text = htmlspecialchars(strip_tags(trim($commentText)), ENT_QUOTES, 'UTF-8');

            $stmt = $db->prepare("INSERT INTO $commentsTable (resource_id, author, text) VALUES (?, ?, ?)");
            if ($stmt->execute([$data['resource_id'], $author, $text])) {
                $newId = (int)$db->lastInsertId();
                sendResponse([
                    'success' => true, 
                    'id' => $newId,
                    'data' => ['id' => $newId, 'resource_id' => (int)$data['resource_id'], 'author' => $author, 'text' => $text]
                ], 201);
            } else {
                sendResponse(['success' => false, 'message' => 'Error.'], 500);
            }

        } else {
            if (!isset($data['title']) || !isset($data['link']) || trim($data['title']) === '' || trim($data['link']) === '') {
                sendResponse(['success' => false, 'message' => 'Missing fields.'], 400);
            }
            if (!filter_var($data['link'], FILTER_VALIDATE_URL)) {
                sendResponse(['success' => false, 'message' => 'Invalid URL format.'], 400);
            }
            $title = htmlspecialchars(strip_tags(trim($data['title'])), ENT_QUOTES, 'UTF-8');
            $description = htmlspecialchars(strip_tags(trim($data['description'] ?? '')), ENT_QUOTES, 'UTF-8');
            $link = trim($data['link']);

            $stmt = $db->prepare("INSERT INTO resources (title, description, link) VALUES (?, ?, ?)");
            if ($stmt->execute([$title, $description, $link])) {
                $newId = (int)$db->lastInsertId();
                sendResponse(['success' => true, 'id' => $newId, 'data' => ['id' => $newId, 'title' => $title, 'description' => $description, 'link' => $link]], 201);
            } else {
                sendResponse(['success' => false, 'message' => 'Error.'], 500);
            }
        }

    } elseif ($method === 'PUT') {
        $targetId = $data['id'] ?? $id;
        if (!$targetId) {
            sendResponse(['success' => false, 'message' => 'ID required.'], 400);
        }
        $check = $db->prepare("SELECT id FROM resources WHERE id = ?");
        $check->execute([$targetId]);
        if (!$check->fetch()) {
            sendResponse(['success' => false, 'message' => 'Resource not found.'], 404);
        }

        $title = htmlspecialchars(strip_tags(trim($data['title'] ?? '')), ENT_QUOTES, 'UTF-8');
        $description = htmlspecialchars(strip_tags(trim($data['description'] ?? '')), ENT_QUOTES, 'UTF-8');
        $link = trim($data['link'] ?? '');

        if (empty($title) || empty($link) || !filter_var($link, FILTER_VALIDATE_URL)) {
            sendResponse(['success' => false, 'message' => 'Invalid input.'], 400);
        }

        $stmt = $db->prepare("UPDATE resources SET title = ?, description = ?, link = ? WHERE id = ?");
        if ($stmt->execute([$title, $description, $link, $targetId])) {
            sendResponse(['success' => true, 'message' => 'Updated.']);
        } else {
            sendResponse(['success' => false, 'message' => 'Failed.'], 500);
        }

    } elseif ($method === 'DELETE') {
        if ($action === 'delete_comment' || isset($_GET['comment_id'])) {
            $cId = $_GET['comment_id'] ?? $id;
            $checkComment = $db->prepare("SELECT id FROM $commentsTable WHERE id = ?");
            $checkComment->execute([$cId]);
            if (!$checkComment->fetch()) {
                sendResponse(['success' => false, 'message' => 'Comment not found.'], 404);
            }
            $stmt = $db->prepare("DELETE FROM $commentsTable WHERE id = ?");
            $stmt->execute([$cId]);
            sendResponse(['success' => true, 'message' => 'Deleted.']);
        }

        if (!$id) {
            sendResponse(['success' => false, 'message' => 'ID required.'], 400);
        }
        $checkRes = $db->prepare("SELECT id FROM resources WHERE id = ?");
        $checkRes->execute([$id]);
        if (!$checkRes->fetch()) {
            sendResponse(['success' => false, 'message' => 'Resource not found.'], 404);
        }
        $stmt = $db->prepare("DELETE FROM resources WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(['success' => true, 'message' => 'Deleted.']);
    } else {
        sendResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
    }
} catch (Exception $e) {
    sendResponse(['success' => false, 'message' => 'Internal Server Error.'], 500);
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}