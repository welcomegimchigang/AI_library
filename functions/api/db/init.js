// D1 데이터베이스 초기화 (테이블 생성)
// 한 번만 호출하면 됩니다: GET /api/db/init?secret=YOUR_SECRET

export async function onRequest(context) {
    const { env } = context;
    const url = new URL(context.request.url);
    const secret = url.searchParams.get("secret");

    if (secret !== env.KV_API_SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!env.DB) {
        return Response.json({ error: "D1 database not bound. Add DB binding in Cloudflare Pages settings." }, { status: 500 });
    }

    try {
        await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_picture TEXT DEFAULT '',
        rating INTEGER NOT NULL DEFAULT 5,
        content TEXT NOT NULL,
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS upvotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        voted_date TEXT NOT NULL,
        UNIQUE(tool_id, user_email, voted_date)
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(tool_id, user_email)
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_tool ON reviews(tool_id);
      CREATE INDEX IF NOT EXISTS idx_upvotes_tool ON upvotes(tool_id);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_email);
    `);

        return Response.json({ success: true, message: "Tables created successfully" });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
