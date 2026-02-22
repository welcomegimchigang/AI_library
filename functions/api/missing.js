export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const action = url.searchParams.get("action"); // 'list' or 'delete'
    const key = url.searchParams.get("key");

    // 디버그: env에 KV_API_SECRET가 설정되어 있는지 확인
    if (!env.KV_API_SECRET) {
        return Response.json({
            error: "KV_API_SECRET not configured",
            hint: "Cloudflare Pages > Settings > Environment Variables 에 KV_API_SECRET 을 추가해주세요.",
            envKeys: Object.keys(env).filter(k => !k.startsWith("__"))
        }, { status: 500 });
    }

    // 비밀번호 대조
    if (secret !== env.KV_API_SECRET) {
        return new Response("Unauthorized: secret mismatch", { status: 401 });
    }

    if (!env.MISSING_TOOLS_KV) {
        return Response.json({
            error: "KV not bound",
            hint: "Cloudflare Pages > Settings > Bindings 에서 MISSING_TOOLS_KV 를 바인딩해주세요.",
            envKeys: Object.keys(env).filter(k => !k.startsWith("__"))
        }, { status: 500 });
    }

    if (action === "list") {
        try {
            const listed = await env.MISSING_TOOLS_KV.list({ prefix: "missing_" });
            let results = [];
            for (const k of listed.keys) {
                const val = await env.MISSING_TOOLS_KV.get(k.name);
                if (val) {
                    results.push({ key: k.name, data: JSON.parse(val) });
                }
            }
            return Response.json({ success: true, count: results.length, data: results });
        } catch (err) {
            return Response.json({ success: false, error: err.message }, { status: 500 });
        }
    }

    if (action === "delete") {
        if (!key) return new Response("Key required", { status: 400 });
        try {
            await env.MISSING_TOOLS_KV.delete(key);
            return Response.json({ success: true, deleted: key });
        } catch (err) {
            return Response.json({ success: false, error: err.message }, { status: 500 });
        }
    }

    return new Response("Invalid action", { status: 400 });
}
