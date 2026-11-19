<?php
/**
 * Singchapair Islamia Alim Madrasha — self-hosted backend (PHP 8 + SQLite/MySQL)
 *
 * One JSON endpoint: api/index.php?a=<action>
 * The website's assets/js/store.js talks to it automatically when this file
 * runs as PHP (on GitHub Pages it is served as plain text, so the site falls
 * back to browser-only demo mode).
 */
declare(strict_types=1);

const API_VERSION = '1.0';
const COLLECTIONS = ['notices', 'events', 'results', 'admissions', 'students', 'teachers', 'gallery', 'downloads', 'routines', 'messages', 'settings', 'staffRecords'];
const PRIVATE_DIR = __DIR__ . '/data/private';
function valid_private_name(string $n): bool { return (bool) preg_match('/^\d{8}_[a-f0-9]{16}\.[a-z0-9]{2,5}$/', $n); }
const PUBLISHABLE = ['notices', 'events', 'teachers', 'gallery', 'downloads', 'routines'];
const ADMISSION_FIELDS = ['studentNameBn', 'studentName', 'dob', 'birthReg', 'gender', 'blood', 'className', 'group', 'fatherName', 'motherName', 'guardianPhone', 'guardianJob', 'address', 'permanentAddress', 'prevInstitution', 'prevResult', 'notes', 'photo', 'session'];
const ADMISSION_REQUIRED = ['studentNameBn', 'studentName', 'fatherName', 'motherName', 'className', 'guardianPhone', 'address'];

$CFG = require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

function out($data = null, int $code = 200): never
{
    http_response_code($code);
    echo json_encode(['ok' => $code < 400, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $msg, int $code = 400): never
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}
set_exception_handler(function (Throwable $e) {
    error_log('[madrasha-api] ' . $e);
    fail('সার্ভারে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।', 500);
});

// ===================================================================== Database
function db(): PDO
{
    static $pdo = null;
    global $CFG;
    if ($pdo) return $pdo;
    if (str_starts_with($CFG['dsn'], 'sqlite:')) {
        $dir = dirname(substr($CFG['dsn'], 7));
        if (!is_dir($dir)) mkdir($dir, 0750, true);
    }
    $pdo = new PDO($CFG['dsn'], $CFG['db_user'], $CFG['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $sqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    if ($sqlite) {
        $pdo->exec('PRAGMA journal_mode=WAL');
        $pdo->exec('PRAGMA busy_timeout=5000');
    }
    $text = $sqlite ? 'TEXT' : 'LONGTEXT';
    $auto = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
    $tail = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $pdo->exec("CREATE TABLE IF NOT EXISTS docs (
        col VARCHAR(40) NOT NULL, id VARCHAR(191) NOT NULL, data $text NOT NULL,
        published SMALLINT NOT NULL DEFAULT 0, created_at BIGINT NOT NULL DEFAULT 0, updated_at BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (col, id))$tail");
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id $auto, username VARCHAR(60) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL DEFAULT '',
        password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'admin', created_at BIGINT NOT NULL DEFAULT 0)$tail");
    $pdo->exec("CREATE TABLE IF NOT EXISTS attempts (kind VARCHAR(20) NOT NULL, ip VARCHAR(64) NOT NULL, at BIGINT NOT NULL)$tail");
    return $pdo;
}
function now_ms(): int { return (int) floor(microtime(true) * 1000); }

function doc_get(string $col, string $id): ?array
{
    $s = db()->prepare('SELECT data FROM docs WHERE col = ? AND id = ?');
    $s->execute([$col, $id]);
    $r = $s->fetchColumn();
    if ($r === false) return null;
    $d = json_decode($r, true);
    return is_array($d) ? $d : [];
}
function doc_put(string $col, string $id, array $data): void
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strlen($json) > 3_000_000) fail('তথ্যের আকার অনেক বড় (৩ MB-এর বেশি)।', 413);
    $pub = (isset($data['published']) && $data['published'] === true) ? 1 : 0;
    $created = isset($data['createdAt']) && is_numeric($data['createdAt']) ? (int) $data['createdAt'] : now_ms();
    $pdo = db();
    $u = $pdo->prepare('UPDATE docs SET data = ?, published = ?, created_at = ?, updated_at = ? WHERE col = ? AND id = ?');
    $u->execute([$json, $pub, $created, now_ms(), $col, $id]);
    if ($u->rowCount() === 0 && doc_get($col, $id) === null) {
        $pdo->prepare('INSERT INTO docs (col, id, data, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$col, $id, $json, $pub, $created, now_ms()]);
    }
}
function doc_list(string $col, bool $publishedOnly): array
{
    $sql = 'SELECT id, data FROM docs WHERE col = ?' . ($publishedOnly ? ' AND published = 1' : '') . ' ORDER BY created_at DESC';
    $s = db()->prepare($sql);
    $s->execute([$col]);
    $out = [];
    foreach ($s as $r) {
        $d = json_decode($r['data'], true);
        if (is_array($d)) $out[] = ['id' => $r['id']] + $d;
    }
    return $out;
}

// ===================================================================== Request helpers
function client_ip(): string { return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0'), 0, 64); }
function body(): array
{
    static $b = null;
    if ($b !== null) return $b;
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (!str_starts_with($ct, 'application/json')) fail('Content-Type must be application/json', 415);
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 20_000_000) fail('Request too large', 413);
    $b = json_decode($raw ?: '{}', true);
    if (!is_array($b)) fail('Invalid JSON');
    return $b;
}
function arg(string $k, $default = null) { return body()[$k] ?? $default; }
function col_arg(): string
{
    $c = (string) arg('col', '');
    if (!in_array($c, COLLECTIONS, true)) fail('Unknown collection');
    return $c;
}
function id_arg(string $key = 'id'): string
{
    $id = (string) arg($key, '');
    return valid_id($id) ? $id : fail('Invalid id');
}
function valid_id(string $id): bool
{
    return $id !== '' && strlen($id) <= 191 && !preg_match('/[\/\\\\\x00-\x1f]/', $id) && mb_check_encoding($id, 'UTF-8');
}
function new_id(): string { return base_convert((string) now_ms(), 10, 36) . bin2hex(random_bytes(4)); }

function rate_limited(string $kind, int $max, int $windowSec): bool
{
    $since = now_ms() - $windowSec * 1000;
    db()->prepare('DELETE FROM attempts WHERE at < ?')->execute([now_ms() - 86_400_000]);
    $s = db()->prepare('SELECT COUNT(*) FROM attempts WHERE kind = ? AND ip = ? AND at > ?');
    $s->execute([$kind, client_ip(), $since]);
    return (int) $s->fetchColumn() >= $max;
}
function record_attempt(string $kind): void
{
    db()->prepare('INSERT INTO attempts (kind, ip, at) VALUES (?, ?, ?)')->execute([$kind, client_ip(), now_ms()]);
}

// ===================================================================== Session & auth
function start_session(): void
{
    global $CFG;
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('SIAMSESS');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string) ($CFG['session_hours'] * 3600));
    session_start();
}
function current_user(): ?array
{
    global $CFG;
    start_session();
    if (empty($_SESSION['uid'])) return null;
    if (($_SESSION['login_at'] ?? 0) < time() - $CFG['session_hours'] * 3600) { $_SESSION = []; return null; }
    $s = db()->prepare('SELECT id, username, name, role FROM users WHERE id = ?');
    $s->execute([$_SESSION['uid']]);
    $u = $s->fetch();
    return $u ?: null;
}
function is_admin(): bool
{
    static $r = null;
    if ($r === null) { $u = current_user(); $r = $u !== null && $u['role'] === 'admin'; }
    return $r;
}
/** Admin + CSRF header check (the token is given to the browser at login / me). */
function require_admin(): void
{
    if (!is_admin()) fail('লগইন প্রয়োজন', 401);
    $t = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($t) || !hash_equals((string) ($_SESSION['csrf'] ?? ''), $t)) fail('Invalid CSRF token', 403);
}
function user_count(): int { return (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn(); }
function setup_allowed(): bool { return user_count() === 0 || is_file(__DIR__ . '/data/allow-setup.txt'); }
function begin_login(array $u): array
{
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $u['id'];
    $_SESSION['login_at'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
    return ['user' => ['username' => $u['username'], 'name' => $u['name'], 'role' => $u['role']], 'csrf' => $_SESSION['csrf']];
}
function check_new_user(string $username, string $password): void
{
    if (!preg_match('/^[A-Za-z0-9._@-]{3,60}$/', $username)) fail('ইউজারনেম ৩–৬০ অক্ষরের হতে হবে (ইংরেজি অক্ষর, সংখ্যা, . _ - @)');
    if (strlen($password) < 8) fail('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে');
}

// ===================================================================== Validation of public submissions
function clean_str($v, int $max): string
{
    $v = is_scalar($v) ? trim((string) $v) : '';
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}
function public_admission(string $id, array $in): array
{
    if (!preg_match('/^SIAM\d{2}-[A-Z0-9]{7}$/', $id)) fail('Invalid tracking id');
    $settings = doc_get('settings', 'main') ?? [];
    if (array_key_exists('admissionOpen', $settings) && $settings['admissionOpen'] === false) fail('অনলাইন ভর্তি আবেদন বর্তমানে বন্ধ', 403);
    if (rate_limited('submit', 20, 3600)) fail('অনেকবার চেষ্টা করা হয়েছে। এক ঘণ্টা পরে আবার চেষ্টা করুন।', 429);
    if (doc_get('admissions', $id) !== null) fail('Duplicate', 409);
    $d = [];
    foreach (ADMISSION_FIELDS as $f) $d[$f] = $f === 'photo' ? '' : clean_str($in[$f] ?? '', 600);
    foreach (ADMISSION_REQUIRED as $f) if ($d[$f] === '') fail('প্রয়োজনীয় তথ্য পূরণ করুন');
    $photo = is_string($in['photo'] ?? null) ? $in['photo'] : '';
    if ($photo !== '' && preg_match('#^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$#', $photo) && strlen($photo) <= 200_000) $d['photo'] = $photo;
    $d += ['status' => 'Pending', 'adminNote' => '', 'createdAt' => now_ms()];
    record_attempt('submit');
    return $d;
}
function public_message(array $in): array
{
    if (rate_limited('submit', 20, 3600)) fail('অনেকবার চেষ্টা করা হয়েছে। এক ঘণ্টা পরে আবার চেষ্টা করুন।', 429);
    $d = ['name' => clean_str($in['name'] ?? '', 100), 'contact' => clean_str($in['contact'] ?? '', 120), 'subject' => clean_str($in['subject'] ?? '', 200), 'message' => clean_str($in['message'] ?? '', 2000)];
    if ($d['name'] === '' || $d['contact'] === '' || $d['message'] === '') fail('প্রয়োজনীয় তথ্য পূরণ করুন');
    record_attempt('submit');
    return $d + ['status' => 'New', 'createdAt' => now_ms()];
}

// ===================================================================== Router
$a = (string) ($_GET['a'] ?? '');
if ($a === 'ping') out(['backend' => 'php', 'version' => API_VERSION]);
if ($a === 'file') {
    // Admin-only download of a confidential document (opened in a new tab by the admin panel).
    if (!is_admin()) { header('Content-Type: text/plain; charset=utf-8'); http_response_code(401); exit('লগইন প্রয়োজন'); }
    $n = (string) ($_GET['n'] ?? '');
    if (!valid_private_name($n) || !is_file(PRIVATE_DIR . "/$n")) { header('Content-Type: text/plain; charset=utf-8'); http_response_code(404); exit('ফাইল পাওয়া যায়নি'); }
    $ext = strtolower(pathinfo($n, PATHINFO_EXTENSION));
    $types = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
    header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
    header('Content-Disposition: ' . (isset($types[$ext]) ? 'inline' : 'attachment') . '; filename="' . $n . '"');
    header('Content-Length: ' . filesize(PRIVATE_DIR . "/$n"));
    header('Cache-Control: private, no-store');
    header('Content-Security-Policy: sandbox');
    readfile(PRIVATE_DIR . "/$n");
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method not allowed', 405);

switch ($a) {
    // ----------------------------------------------------------------- data
    case 'list': {
        $col = col_arg();
        $admin = is_admin();
        if ($admin) {
            $t = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
            if (!hash_equals((string) ($_SESSION['csrf'] ?? ''), (string) $t)) $admin = false;
        }
        if (!$admin && !in_array($col, PUBLISHABLE, true)) fail('অনুমতি নেই', 403);
        $rows = doc_list($col, !$admin || (bool) arg('publicOnly', false));
        $where = arg('where', []);
        if (is_array($where) && $where) {
            $rows = array_values(array_filter($rows, function ($r) use ($where) {
                foreach ($where as $k => $v) if (($r[$k] ?? null) !== $v) return false;
                return true;
            }));
        }
        out($rows);
    }
    case 'get': {
        $col = col_arg(); $id = id_arg();
        $d = doc_get($col, $id);
        if ($d === null) out(null);
        if (is_admin()) out(['id' => $id] + $d);
        if ($col === 'settings') out(['id' => $id] + $d);
        if (in_array($col, PUBLISHABLE, true) || $col === 'results') out(($d['published'] ?? false) === true ? ['id' => $id] + $d : null);
        if ($col === 'admissions') out(array_intersect_key(['id' => $id] + $d, array_flip(['id', 'studentNameBn', 'studentName', 'className', 'createdAt', 'status', 'adminNote'])));
        out(null);
    }
    case 'set': {
        $col = col_arg(); $id = id_arg();
        $data = arg('data');
        if (!is_array($data)) fail('Invalid data');
        if (!is_admin()) {
            if ($col !== 'admissions') fail('লগইন প্রয়োজন', 401);
            doc_put('admissions', $id, public_admission($id, $data));
            out($id);
        }
        require_admin();
        if (arg('merge', false)) $data = array_merge(doc_get($col, $id) ?? [], $data);
        doc_put($col, $id, $data);
        out($id);
    }
    case 'add': {
        $col = col_arg();
        $data = arg('data');
        if (!is_array($data)) fail('Invalid data');
        $id = new_id();
        if (!is_admin()) {
            if ($col !== 'messages') fail('লগইন প্রয়োজন', 401);
            doc_put('messages', $id, public_message($data));
            out($id);
        }
        require_admin();
        doc_put($col, $id, $data + ['createdAt' => now_ms()]);
        out($id);
    }
    case 'update': {
        require_admin();
        $col = col_arg(); $id = id_arg();
        $data = arg('data');
        if (!is_array($data)) fail('Invalid data');
        $cur = doc_get($col, $id);
        if ($cur === null) fail('Record not found', 404);
        doc_put($col, $id, array_merge($cur, $data));
        out($id);
    }
    case 'remove': {
        require_admin();
        $col = col_arg(); $id = id_arg();
        db()->prepare('DELETE FROM docs WHERE col = ? AND id = ?')->execute([$col, $id]);
        out(true);
    }
    case 'batch': {
        require_admin();
        $items = arg('items', []);
        if (!is_array($items) || count($items) > 5000) fail('Invalid batch');
        $pdo = db();
        $pdo->beginTransaction();
        try {
            foreach ($items as $it) {
                if (!is_array($it) || !in_array($it['col'] ?? '', COLLECTIONS, true) || !valid_id((string) ($it['id'] ?? '')) || !is_array($it['data'] ?? null)) throw new InvalidArgumentException('bad item');
                doc_put($it['col'], (string) $it['id'], $it['data']);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            if ($e instanceof InvalidArgumentException) fail('Invalid batch item');
            throw $e;
        }
        out(count($items));
    }
    case 'upload': {
        global $CFG;
        if (!is_admin()) fail('লগইন প্রয়োজন', 401);
        $t = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!hash_equals((string) ($_SESSION['csrf'] ?? ''), (string) $t)) fail('Invalid CSRF token', 403);
        $f = $_FILES['file'] ?? null;
        if (!$f || !is_array($f) || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) fail('ফাইল আপলোড হয়নি (সার্ভারের আপলোড সীমা দেখুন)');
        if ($f['size'] > $CFG['max_upload_mb'] * 1024 * 1024) fail("ফাইল {$CFG['max_upload_mb']} MB-এর বেশি", 413);
        $ext = strtolower(pathinfo((string) $f['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $CFG['allowed_ext'], true)) fail('এই ধরনের ফাইল অনুমোদিত নয়');
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true) && @getimagesize($f['tmp_name']) === false) fail('ছবিটি সঠিক নয়');
        if (($_POST['private'] ?? '') === '1') {
            // Confidential documents (NID, appointment letters…): kept in api/data/private,
            // which the web server never serves directly; only admins can fetch them via ?a=file.
            if (!is_dir(PRIVATE_DIR) && !mkdir(PRIVATE_DIR, 0750, true)) fail('আপলোড ফোল্ডার তৈরি করা যায়নি', 500);
            $name = date('Ymd') . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
            if (!move_uploaded_file($f['tmp_name'], PRIVATE_DIR . "/$name")) fail('ফাইল সংরক্ষণ করা যায়নি', 500);
            @chmod(PRIVATE_DIR . "/$name", 0640);
            out("private:$name");
        }
        $folder = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($_POST['folder'] ?? 'files'))) ?: 'files';
        $dir = $CFG['upload_dir'] . '/' . $folder;
        if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail('আপলোড ফোল্ডার তৈরি করা যায়নি', 500);
        $name = date('Ymd') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        if (!move_uploaded_file($f['tmp_name'], "$dir/$name")) fail('ফাইল সংরক্ষণ করা যায়নি', 500);
        @chmod("$dir/$name", 0644);
        out($CFG['upload_url'] . "/$folder/$name");
    }
    case 'removeFile': {
        require_admin();
        $n = (string) arg('n', '');
        if (!valid_private_name($n)) fail('Invalid file');
        @unlink(PRIVATE_DIR . "/$n");
        out(true);
    }

    // ----------------------------------------------------------------- auth
    case 'me': {
        $u = current_user();
        out([
            'user' => $u ? ['username' => $u['username'], 'name' => $u['name'], 'role' => $u['role']] : null,
            'csrf' => $u ? ($_SESSION['csrf'] ?? null) : null,
            'needsSetup' => setup_allowed(),
        ]);
    }
    case 'setup': {
        if (!setup_allowed()) fail('সেটআপ ইতোমধ্যে সম্পন্ন হয়েছে', 403);
        $username = trim((string) arg('username', '')); $password = (string) arg('password', '');
        check_new_user($username, $password);
        $pdo = db();
        $ex = $pdo->prepare('SELECT id FROM users WHERE username = ?'); $ex->execute([$username]);
        if ($id = $ex->fetchColumn()) {
            $pdo->prepare('UPDATE users SET password_hash = ?, role = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), 'admin', $id]);
        } else {
            $pdo->prepare('INSERT INTO users (username, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
                ->execute([$username, clean_str(arg('name', ''), 120), password_hash($password, PASSWORD_DEFAULT), 'admin', now_ms()]);
            $id = (int) $pdo->lastInsertId();
        }
        @unlink(__DIR__ . '/data/allow-setup.txt');
        start_session();
        out(begin_login(['id' => $id, 'username' => $username, 'name' => clean_str(arg('name', ''), 120), 'role' => 'admin']));
    }
    case 'login': {
        global $CFG;
        if (rate_limited('login', $CFG['login_max_attempts'], $CFG['login_window_min'] * 60)) fail("অনেকবার ভুল চেষ্টা। {$CFG['login_window_min']} মিনিট পরে আবার চেষ্টা করুন।", 429);
        $s = db()->prepare('SELECT * FROM users WHERE username = ?');
        $s->execute([trim((string) arg('username', ''))]);
        $u = $s->fetch();
        if (!$u || !password_verify((string) arg('password', ''), $u['password_hash'])) {
            record_attempt('login');
            fail('ইউজারনেম বা পাসওয়ার্ড ভুল', 401);
        }
        if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash((string) arg('password'), PASSWORD_DEFAULT), $u['id']]);
        }
        db()->prepare("DELETE FROM attempts WHERE kind = 'login' AND ip = ?")->execute([client_ip()]);
        start_session();
        out(begin_login($u));
    }
    case 'logout': {
        start_session();
        $_SESSION = [];
        session_destroy();
        out(true);
    }
    case 'changePassword': {
        require_admin();
        $s = db()->prepare('SELECT password_hash FROM users WHERE id = ?'); $s->execute([$_SESSION['uid']]);
        if (!password_verify((string) arg('current', ''), (string) $s->fetchColumn())) fail('বর্তমান পাসওয়ার্ড ভুল', 403);
        $new = (string) arg('password', '');
        if (strlen($new) < 8) fail('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে');
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), $_SESSION['uid']]);
        out(true);
    }
    case 'users': {
        require_admin();
        out(db()->query('SELECT id, username, name, role, created_at FROM users ORDER BY id')->fetchAll());
    }
    case 'addUser': {
        require_admin();
        $username = trim((string) arg('username', '')); $password = (string) arg('password', '');
        check_new_user($username, $password);
        $ex = db()->prepare('SELECT 1 FROM users WHERE username = ?'); $ex->execute([$username]);
        if ($ex->fetchColumn()) fail('এই ইউজারনেম আগে থেকেই আছে', 409);
        db()->prepare('INSERT INTO users (username, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$username, clean_str(arg('name', ''), 120), password_hash($password, PASSWORD_DEFAULT), 'admin', now_ms()]);
        out(true);
    }
    case 'deleteUser': {
        require_admin();
        $id = (int) arg('id', 0);
        if ($id === (int) $_SESSION['uid']) fail('নিজের অ্যাকাউন্ট মুছতে পারবেন না');
        if (user_count() <= 1) fail('কমপক্ষে একজন অ্যাডমিন থাকতে হবে');
        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        out(true);
    }
    case 'resetUserPassword': {
        require_admin();
        $password = (string) arg('password', '');
        if (strlen($password) < 8) fail('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে');
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), (int) arg('id', 0)]);
        out(true);
    }
    default:
        fail('Unknown action', 404);
}
