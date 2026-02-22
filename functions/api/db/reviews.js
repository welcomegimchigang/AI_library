// 리뷰 CRUD API
// GET /api/db/reviews?tool_id=123 → 해당 도구의 리뷰 목록
// POST /api/db/reviews → 새 리뷰 작성
// DELETE /api/db/reviews?id=1&user_email=xxx → 본인 리뷰 삭제

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
        // GET: 특정 도구의 리뷰 목록
        if (request.method === "GET") {
            const toolId = url.searchParams.get("tool_id");
            if (!toolId) return Response.json({ error: "tool_id required" }, { status: 400, headers: CORS_HEADERS });

            const { results } = await env.DB.prepare(
                "SELECT id, tool_id, user_name, user_picture, rating, content, is_anonymous, created_at FROM reviews WHERE tool_id = ? ORDER BY created_at DESC"
            ).bind(Number(toolId)).all();

            // 익명 리뷰는 이름/사진 마스킹
            const masked = results.map(r => ({
                ...r,
                user_name: r.is_anonymous ? "익명" : r.user_name,
                user_picture: r.is_anonymous ? "" : r.user_picture,
            }));

            return Response.json({ success: true, reviews: masked }, { headers: CORS_HEADERS });
        }

        // POST: 리뷰 작성
        if (request.method === "POST") {
            const body = await request.json();
            const { tool_id, user_email, user_name, user_picture, rating, content, is_anonymous } = body;

            if (!tool_id || !user_email || !content) {
                return Response.json({ error: "tool_id, user_email, content required" }, { status: 400, headers: CORS_HEADERS });
            }

            const result = await env.DB.prepare(
                "INSERT INTO reviews (tool_id, user_email, user_name, user_picture, rating, content, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).bind(
                Number(tool_id),
                user_email,
                user_name || "사용자",
                user_picture || "",
                Number(rating) || 5,
                content,
                is_anonymous ? 1 : 0
            ).run();

            return Response.json({ success: true, id: result.meta.last_row_id }, { headers: CORS_HEADERS });
        }

        // DELETE: 본인 리뷰 삭제
        if (request.method === "DELETE") {
            const id = url.searchParams.get("id");
            const userEmail = url.searchParams.get("user_email");

            if (!id || !userEmail) {
                return Response.json({ error: "id, user_email required" }, { status: 400, headers: CORS_HEADERS });
            }

            await env.DB.prepare(
                "DELETE FROM reviews WHERE id = ? AND user_email = ?"
            ).bind(Number(id), userEmail).run();

            return Response.json({ success: true }, { headers: CORS_HEADERS });
        }

        return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
    }
}
