// 북마크 API
// GET /api/db/bookmarks?user_email=xxx → 유저의 북마크 목록
// POST /api/db/bookmarks → 북마크 추가/토글
// DELETE /api/db/bookmarks?tool_id=123&user_email=xxx → 북마크 해제

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    if (!env.DB) {
        return Response.json({ error: "D1 not bound" }, { status: 500, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
        if (request.method === "GET") {
            const userEmail = url.searchParams.get("user_email");
            if (!userEmail) return Response.json({ error: "user_email required" }, { status: 400, headers: CORS_HEADERS });

            const { results } = await env.DB.prepare(
                "SELECT tool_id, created_at FROM bookmarks WHERE user_email = ? ORDER BY created_at DESC"
            ).bind(userEmail).all();

            return Response.json({ success: true, bookmarks: results.map(r => r.tool_id) }, { headers: CORS_HEADERS });
        }

        if (request.method === "POST") {
            const body = await request.json();
            const { tool_id, user_email } = body;

            if (!tool_id || !user_email) {
                return Response.json({ error: "tool_id, user_email required" }, { status: 400, headers: CORS_HEADERS });
            }

            // 토글: 이미 있으면 삭제, 없으면 추가
            const existing = await env.DB.prepare(
                "SELECT id FROM bookmarks WHERE tool_id = ? AND user_email = ?"
            ).bind(Number(tool_id), user_email).first();

            if (existing) {
                await env.DB.prepare(
                    "DELETE FROM bookmarks WHERE tool_id = ? AND user_email = ?"
                ).bind(Number(tool_id), user_email).run();
                return Response.json({ success: true, bookmarked: false }, { headers: CORS_HEADERS });
            } else {
                await env.DB.prepare(
                    "INSERT INTO bookmarks (tool_id, user_email) VALUES (?, ?)"
                ).bind(Number(tool_id), user_email).run();
                return Response.json({ success: true, bookmarked: true }, { headers: CORS_HEADERS });
            }
        }

        if (request.method === "DELETE") {
            const toolId = url.searchParams.get("tool_id");
            const userEmail = url.searchParams.get("user_email");

            if (!toolId || !userEmail) {
                return Response.json({ error: "tool_id, user_email required" }, { status: 400, headers: CORS_HEADERS });
            }

            await env.DB.prepare(
                "DELETE FROM bookmarks WHERE tool_id = ? AND user_email = ?"
            ).bind(Number(toolId), userEmail).run();

            return Response.json({ success: true }, { headers: CORS_HEADERS });
        }

        return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
    }
}
