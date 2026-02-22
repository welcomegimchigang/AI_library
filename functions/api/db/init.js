// D1 데이터베이스 초기화 (테이블 생성)
// 한 번만 호출: GET /api/db/init?secret=YOUR_SECRET

export async function onRequest(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const secret = url.searchParams.get("secret");

  if (secret !== env.KV_API_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.DB) {
    return Response.json({ error: "D1 not bound. Add DB binding in Cloudflare Pages > Settings > Bindings" }, { status: 500 });
  }

  try {
    await env.DB.prepare(`
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
      )
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS upvotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        voted_date TEXT NOT NULL,
        UNIQUE(tool_id, user_email, voted_date)
      )
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(tool_id, user_email)
      )
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_query TEXT NOT NULL,
        gpt_intent TEXT NOT NULL,
        gpt_filters TEXT NOT NULL,
        matched_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reviews_tool ON reviews(tool_id)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_upvotes_tool ON upvotes(tool_id)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_email)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_search_logs_created ON search_logs(created_at)").run();

    return Response.json({ success: true, message: "All tables created, including search_logs" });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
