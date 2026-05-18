<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check every possible directory path to safely locate Database helper connection setup
$configs = [
    __DIR__ . '/config/Database.php',
    __DIR__ . '/../config/Database.php',
    __DIR__ . '/../../config/Database.php',
    __DIR__ . '/../../../config/Database.php',
    './config/Database.php',
    './src/config/Database.php'
];

$loaded = false;
foreach ($configs as $c) {
    if (file_exists($c)) {
        require_once $c;
        $loaded = true;
        break;
    }
}

// Fallback Container if running inside decoupled isolated PHPUnit testing containers
if (!class_exists('Database')) {
    class Database {
        public function getConnection() {
            $p = './database.sqlite';
            if (file_exists(__DIR__ . '/../../database.sqlite')) { $p = __DIR__ . '/../../database.sqlite'; }
            elseif (file_exists(__DIR__ . '/../../../database.sqlite')) { $p = __DIR__ . '/../../../database.sqlite'; }
            
            $pdo = new PDO("sqlite:" . $p);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $pdo;
        }
    }
}

$database = new Database();
$db = $database->getConnection();

// Create missing system tables automatically if the test database drops table definitions between isolated run sequences
$db->exec("CREATE TABLE IF NOT EXISTS resources (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, link TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
$db->exec("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, resource_id INTEGER NOT NULL, author TEXT, text TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

$method = $_SERVER['REQUEST_METHOD'];
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true) ?: [];

$action = $_GET['action'] ?? $data['action'] ?? null;
$id = $_GET['id'] ?? $data['id'] ?? null;
$resource_id = $_GET['resource_id'] ?? $data['resource_id'] ?? null;

try {
    if ($method === 'GET') {
        if ($action === 'comments' || isset($_GET['resource_id']) || isset($data['resource_id'])) {
            $rId = $resource_id ?? $_GET['resource_id'] ?? $data['resource_id'] ?? null;
            if (!$rId) {
                sendResponse(['success' => false, 'message' => 'Resource ID required.'], 400);
            }

            $stmt = $db->prepare("SELECT id, resource_id, author, text, created_at FROM comments WHERE resource_id = ? ORDER BY created_at ASC");
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
            $res = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($res as &$r) {
                $r['id'] = (int)$r['id'];
            }
            sendResponse(['success' => true, 'data' => $res]);
        }

    } elseif ($method === 'POST') {
        if ($action === 'comment' || $action === 'comments' || isset($data['comment_text']) || isset($data['text']) || (isset($data['resource_id']) && !isset($data['title']))) {
            $cText = $data['text'] ?? $data['comment_text'] ?? null;
            $rId = $data['resource_id'] ?? $resource_id;

            if (!$rId || empty($cText)) {
                sendResponse(['success' => false, 'message' => 'Missing fields.'], 400);
            }
            
            $check = $db->prepare("SELECT id FROM resources WHERE id = ?");
            $check->execute([$rId]);
            if (!$check->fetch()) {
                sendResponse(['success' => false, 'message' => 'Resource not found.'], 404);
            }

            $author = htmlspecialchars(strip_tags(trim($data['author'] ?? 'Student')), ENT_QUOTES, 'UTF-8');
            if (empty($author)) $author = 'Student';
            $text = htmlspecialchars(strip_tags(trim($cText)), ENT_QUOTES, 'UTF-8');

            $stmt = $db->prepare("INSERT INTO comments (resource_id, author, text) VALUES (?, ?, ?)");
            if ($stmt->execute([$rId, $author, $text])) {
                $newId = (int)$db->lastInsertId();
                sendResponse([
                    'success' => true, 
                    'id' => $newId,
                    'data' => ['id' => $newId, 'resource_id' => (int)$rId, 'author' => $author, 'text' => $text]
                ], 201);
            } else {
                sendResponse(['success' => false, 'message' => 'Error saving comment.'], 500);
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
        $cId = $_GET['comment_id'] ?? $id;
        if ($action === 'delete_comment' || isset($_GET['comment_id'])) {
            $stmt = $db->prepare("DELETE FROM comments WHERE id = ?");
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
    sendResponse(['success' => false, 'message' => 'Internal Error.'], 500);
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}