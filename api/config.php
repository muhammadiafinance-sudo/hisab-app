<?php
// =====================================================================
//  ব্যাকএন্ড কনফিগারেশন / Backend configuration
//  সাধারণত কিছু পরিবর্তন করতে হয় না। (Usually nothing needs changing.)
// =====================================================================
return [
    // Database. Default: a SQLite file inside api/data/ (no setup needed).
    // For extra safety you may move it outside public_html, e.g.
    //   'dsn' => 'sqlite:/home/USERNAME/madrasha-data/madrasha.sqlite',
    // MySQL is also supported:
    //   'dsn' => 'mysql:host=localhost;dbname=DBNAME;charset=utf8mb4', 'db_user' => '...', 'db_pass' => '...',
    'dsn'     => 'sqlite:' . __DIR__ . '/data/madrasha.sqlite',
    'db_user' => null,
    'db_pass' => null,

    // Uploaded files (notice PDFs, photos…) are stored here and served from 'upload_url'.
    'upload_dir' => __DIR__ . '/uploads',
    'upload_url' => 'api/uploads',
    'max_upload_mb' => 15,
    'allowed_ext' => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'],

    // Login protection: max failed attempts per IP within the window.
    'login_max_attempts' => 8,
    'login_window_min'   => 15,

    // Session lifetime for admins (hours).
    'session_hours' => 12,
];
