export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const action = url.searchParams.get("action"); // 'list' or 'delete'
    const key = url.searchParams.get("key");

    // POST: 피드백 제출
    if (request.method === "POST") {
        try {
            const body = await request.json();
            const { type, message, contact } = body;

            if (!message || message.trim().length < 5) {
                return Response.json({ success: false, error: "내용을 5자 이상 입력해주세요." }, { status: 400 });
            }

            const timestamp = Date.now();
            const feedbackId = `feedback_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;

            const feedbackData = {
                id: feedbackId,
                type: type || "general",
                message: message.trim(),
                contact: contact || "anonymous",
                timestamp: new Date(timestamp).toISOString(),
            };

            if (env.MISSING_TOOLS_KV) {
                await env.MISSING_TOOLS_KV.put(feedbackId, JSON.stringify(feedbackData));
            }

            if (env.DISCORD_WEBHOOK_URL) {
                const discordPayload = {
                    content: `📝 **새로운 유저 건의/피드백 접수**\n- 유형: \`${feedbackData.type}\`\n- 내용: \`${feedbackData.message}\`\n- 연락처: \`${feedbackData.contact}\`\n- 시간: \`${feedbackData.timestamp}\``
                };
                await fetch(env.DISCORD_WEBHOOK_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(discordPayload)
                }).catch(() => { });
            }

            return Response.json({ success: true, id: feedbackId });
        } catch (err) {
            return Response.json({ success: false, error: err.message }, { status: 500 });
        }
    }

    // GET: 건의사항 관리 (조회/삭제) - Secret 필수
    if (secret !== env.KV_API_SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (action === "list") {
        try {
            // 중요: 'feedback_' 접두사가 붙은 데이터만 가져옴
            const listed = await env.MISSING_TOOLS_KV.list({ prefix: "feedback_" });
            let results = [];
            for (const k of listed.keys) {
                const val = await env.MISSING_TOOLS_KV.get(k.name);
                if (val) results.push({ key: k.name, data: JSON.parse(val) });
            }
            return Response.json({ success: true, count: results.length, data: results });
        } catch (err) {
            return Response.json({ success: false, error: err.message }, { status: 500 });
        }
    }

    if (action === "delete") {
        if (!key || !key.startsWith("feedback_")) {
            return new Response("Invalid key", { status: 400 });
        }
        await env.MISSING_TOOLS_KV.delete(key);
        return Response.json({ success: true, deleted: key });
    }

    return new Response("Method Not Allowed", { status: 405 });
}
