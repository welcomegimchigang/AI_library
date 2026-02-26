export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (!env.DB) return Response.json({ error: "DB not bound" }, { status: 500 });
    if (!email) return Response.json({ error: "Email required" }, { status: 400 });

    // GET: 프로필 조회
    if (request.method === "GET") {
        try {
            const profile = await env.DB.prepare("SELECT * FROM user_profiles WHERE email = ?")
                .bind(email)
                .first();
            return Response.json({ success: true, profile });
        } catch (e) {
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    }

    // POST: 프로필 저장/수정
    if (request.method === "POST") {
        try {
            const body = await request.json();
            const { gender, birthYear, job } = body;

            await env.DB.prepare(`
        INSERT INTO user_profiles (email, gender, birth_year, job, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(email) DO UPDATE SET
          gender = excluded.gender,
          birth_year = excluded.birth_year,
          job = excluded.job,
          updated_at = excluded.updated_at
      `)
                .bind(email, gender, birthYear, job)
                .run();

            return Response.json({ success: true });
        } catch (e) {
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    }

    return new Response("Method not allowed", { status: 405 });
}
