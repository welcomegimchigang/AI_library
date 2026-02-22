export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const action = url.searchParams.get("action"); // 'list' or 'delete'
    const key = url.searchParams.get("key");

    // 아주 간단한 보안: 내 파이썬 스크립트만 접근할 수 있게 암호화 키 확인
    if (!env.KV_API_SECRET || secret !== env.KV_API_SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!env.MISSING_TOOLS_KV) {
        return new Response("KV not bound", { status: 500 });
    }

    if (action === "list") {
        try {
            // prefix 'missing_'인 키들을 가져옵니다.
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
