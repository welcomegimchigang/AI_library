// POST /api/db/clicks
// 툴 공식 사이트 방문 클릭을 D1에 기록합니다.
export async function onRequestPost(context) {
    const { request, env } = context;

    if (!env.DB) {
        return Response.json({ error: "D1 not bound" }, { status: 500 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const tool_id = parseInt(body?.tool_id);
        const tool_name = String(body?.tool_name || "").trim();
        const tool_url = String(body?.tool_url || "").trim();
        const category = String(body?.category || "").trim();

        const session_id = String(body?.session_id || "").trim();

        if (!tool_id || !tool_name) {
            return Response.json({ error: "tool_id and tool_name are required" }, { status: 400 });
        }

        await env.DB.prepare(`
      INSERT INTO tool_clicks (tool_id, tool_name, tool_url, category, session_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(tool_id, tool_name, tool_url, category, session_id).run();

        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ error: String(e.message || e) }, { status: 500 });
    }
}
