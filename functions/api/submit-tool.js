export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { name, url, description, category, isFree } = body;

        if (!name || !url) {
            return Response.json({ success: false, error: "이름과 URL은 필수 항목입니다." }, { status: 400 });
        }

        // Validate URL format
        try {
            new URL(url);
        } catch {
            return Response.json({ success: false, error: "올바른 URL 형식이 아닙니다." }, { status: 400 });
        }

        // Store submission in KV for admin review
        const submissionId = `submit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const submission = {
            id: submissionId,
            name: name.trim(),
            url: url.trim(),
            description: (description || "").trim(),
            category: category || "기타",
            isFree: isFree !== false,
            submittedAt: new Date().toISOString(),
            status: "pending", // pending -> approved -> rejected
        };

        // Store in MISSING_TOOLS_KV (reusing existing KV binding)
        if (env.MISSING_TOOLS_KV) {
            await env.MISSING_TOOLS_KV.put(submissionId, JSON.stringify(submission));
        }

        return Response.json({ success: true, message: "도구가 성공적으로 제출되었습니다." });
    } catch (e) {
        return Response.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
