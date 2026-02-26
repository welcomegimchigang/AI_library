export async function onRequestPost({ request, env }) {
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

        // 1. Save to KV
        if (env.MISSING_TOOLS_KV) {
            await env.MISSING_TOOLS_KV.put(feedbackId, JSON.stringify(feedbackData));
        }

        // 2. Notify Discord
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
