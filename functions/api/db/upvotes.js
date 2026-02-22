// 추천(업보트) API
// GET /api/db/upvotes?tool_id=123 → 해당 도구 추천 수
// GET /api/db/upvotes?all=true → 전체 도구 추천 수 (한 번에 로드)
// POST /api/db/upvotes → 추천하기 (하루 1회 제한)

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
            // 전체 추천 수 한 번에 로드
            if (url.searchParams.get("all") === "true") {
                const { results } = await env.DB.prepare(
                    "SELECT tool_id, COUNT(*) as count FROM upvotes GROUP BY tool_id"
                ).all();

                const upvoteMap = {};
                for (const row of results) {
                    upvoteMap[row.tool_id] = row.count;
                }
                return Response.json({ success: true, upvotes: upvoteMap }, { headers: CORS_HEADERS });
            }

            // 특정 도구 추천 수
            const toolId = url.searchParams.get("tool_id");
            if (!toolId) return Response.json({ error: "tool_id required" }, { status: 400, headers: CORS_HEADERS });

            const row = await env.DB.prepare(
                "SELECT COUNT(*) as count FROM upvotes WHERE tool_id = ?"
            ).bind(Number(toolId)).first();

            return Response.json({ success: true, count: row?.count || 0 }, { headers: CORS_HEADERS });
        }

        if (request.method === "POST") {
            const body = await request.json();
            const { tool_id, user_email } = body;

            if (!tool_id || !user_email) {
                return Response.json({ error: "tool_id, user_email required" }, { status: 400, headers: CORS_HEADERS });
            }

            const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

            // 하루 1회 제한 체크
            const existing = await env.DB.prepare(
                "SELECT id FROM upvotes WHERE tool_id = ? AND user_email = ? AND voted_date = ?"
            ).bind(Number(tool_id), user_email, today).first();

            if (existing) {
                return Response.json({ error: "이미 오늘 추천하셨습니다.", already: true }, { status: 409, headers: CORS_HEADERS });
            }

            await env.DB.prepare(
                "INSERT INTO upvotes (tool_id, user_email, voted_date) VALUES (?, ?, ?)"
            ).bind(Number(tool_id), user_email, today).run();

            // 새 총 추천 수 반환
            const row = await env.DB.prepare(
                "SELECT COUNT(*) as count FROM upvotes WHERE tool_id = ?"
            ).bind(Number(tool_id)).first();

            return Response.json({ success: true, count: row?.count || 0 }, { headers: CORS_HEADERS });
        }

        return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
    }
}
