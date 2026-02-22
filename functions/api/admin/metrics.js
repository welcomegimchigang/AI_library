export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");

    // Simple secret-based protection
    if (secret !== env.KV_API_SECRET) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!env.DB) {
        return Response.json({ error: "D1 not bound" }, { status: 500 });
    }

    try {
        // 1. Get recent missing queries (matched_count = 0)
        const missingQueriesResult = await env.DB.prepare(`
      SELECT user_query, gpt_intent, gpt_filters, created_at
      FROM search_logs
      WHERE matched_count = 0
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

        // 2. Get top search intents (last 7 days)
        const topIntentsResult = await env.DB.prepare(`
      SELECT gpt_intent, COUNT(*) as count
      FROM search_logs
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY gpt_intent
      ORDER BY count DESC
      LIMIT 10
    `).all();

        // 3. Overall success rate
        const totalLogsResult = await env.DB.prepare(`SELECT COUNT(*) as calc_total FROM search_logs`).first();
        const missedLogsResult = await env.DB.prepare(`SELECT COUNT(*) as calc_missed FROM search_logs WHERE matched_count = 0`).first();

        const calcTotal = totalLogsResult?.calc_total || 0;
        const calcMissed = missedLogsResult?.calc_missed || 0;
        const calcSuccess = calcTotal - calcMissed;
        const successRate = calcTotal > 0 ? ((calcSuccess / calcTotal) * 100).toFixed(1) : 0;

        return Response.json({
            success: true,
            data: {
                missing_queries: missingQueriesResult.results || [],
                top_intents: topIntentsResult.results || [],
                stats: {
                    total_queries: calcTotal,
                    successful_queries: calcSuccess,
                    success_rate: `${successRate}%`
                }
            }
        });

    } catch (e) {
        return Response.json({ error: String(e.message || e) }, { status: 500 });
    }
}
