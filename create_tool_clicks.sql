CREATE TABLE IF NOT EXISTS tool_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id INTEGER NOT NULL,
    tool_name TEXT NOT NULL,
    tool_url TEXT,
    category TEXT,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
