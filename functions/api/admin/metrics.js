export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const pGender = url.searchParams.get("gender");
  const pAgeGroup = url.searchParams.get("age_group");
  const pJob = url.searchParams.get("job");

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

    // 2. Get top search intents (last 7 days) -> Now extracted as 'Category'
    const topIntentsResult = await env.DB.prepare(`
      SELECT 
        COALESCE(json_extract(gpt_filters, '$.category'), '기타/미분류') as category, 
        COUNT(*) as count
      FROM search_logs
      WHERE created_at > datetime('now', '-7 days')
        AND gpt_intent = 'search_tools'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // 3. Demographic Analysis (New)
    let persona_metrics = { gender: [], age: [], job: [] };

    try {
      // 3-1. Top categories by Gender
      const genderDemand = await env.DB.prepare(`
            SELECT user_gender, 
                   COALESCE(json_extract(gpt_filters, '$.category'), '기타/미분류') as category, 
                   COUNT(*) as count
            FROM search_logs
            WHERE user_gender IS NOT NULL AND gpt_intent = 'search_tools'
            GROUP BY user_gender, category
            ORDER BY count DESC
            LIMIT 20
          `).all();
      persona_metrics.gender = genderDemand.results || [];
    } catch (e) { console.error("Gender metrics failed:", e); }

    try {
      // 3-2. Top categories by Age Group
      const ageDemand = await env.DB.prepare(`
            SELECT 
              CASE 
                WHEN (2026 - user_birth_year + 1) < 20 THEN '10대 이하'
                WHEN (2026 - user_birth_year + 1) BETWEEN 20 AND 29 THEN '20대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 30 AND 39 THEN '30대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 40 AND 49 THEN '40대'
                ELSE '50대 이상'
              END AS age_range,
              COALESCE(json_extract(gpt_filters, '$.category'), '기타/미분류') as category, 
              COUNT(*) as count
            FROM search_logs
            WHERE user_birth_year IS NOT NULL AND gpt_intent = 'search_tools'
            GROUP BY age_range, category
            ORDER BY count DESC
            LIMIT 20
          `).all();
      persona_metrics.age = ageDemand.results || [];
    } catch (e) { console.error("Age metrics failed:", e); }

    try {
      // 3-3. Top categories by Job
      const jobDemand = await env.DB.prepare(`
            SELECT user_job, 
                   COALESCE(json_extract(gpt_filters, '$.category'), '기타/미분류') as category, 
                   COUNT(*) as count
            FROM search_logs
            WHERE user_job IS NOT NULL AND gpt_intent = 'search_tools'
            GROUP BY user_job, category
            ORDER BY count DESC
            LIMIT 20
          `).all();
      persona_metrics.job = jobDemand.results || [];
    } catch (e) { console.error("Job metrics failed:", e); }

    // 3C2 & 3C3 Cross-tabulation Analysis (New)
    let cross_metrics = {
      age_gender: [],
      job_gender: [],
      age_job: [],
      age_gender_job: []
    };

    try {
      // Age + Gender (3C2)
      const ageGenderDemand = await env.DB.prepare(`
            SELECT 
              CASE 
                WHEN (2026 - user_birth_year + 1) < 20 THEN '10대 이하'
                WHEN (2026 - user_birth_year + 1) BETWEEN 20 AND 29 THEN '20대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 30 AND 39 THEN '30대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 40 AND 49 THEN '40대'
                ELSE '50대 이상'
              END AS age_range,
              user_gender,
              COALESCE(json_extract(gpt_filters, '$.category'), '기타/미분류') as category, 
              COUNT(*) as count
            FROM search_logs
            WHERE user_birth_year IS NOT NULL AND user_gender IS NOT NULL AND gpt_intent = 'search_tools'
            GROUP BY age_range, user_gender, category
            ORDER BY count DESC
            LIMIT 30
          `).all();
      cross_metrics.age_gender = ageGenderDemand.results || [];
    } catch (e) { console.error("Age+Gender metrics failed:", e); }

    try {
      // Job + Gender (3C2)
      const jobGenderDemand = await env.DB.prepare(`
            SELECT user_job, user_gender,
                   COALESCE(json_extract(gpt_filters, '$.category'), '기타/미분류') as category, 
                   COUNT(*) as count
            FROM search_logs
            WHERE user_job IS NOT NULL AND user_gender IS NOT NULL AND gpt_intent = 'search_tools'
            GROUP BY user_job, user_gender, category
            ORDER BY count DESC
            LIMIT 30
          `).all();
      cross_metrics.job_gender = jobGenderDemand.results || [];
    } catch (e) { console.error("Job+Gender metrics failed:", e); }

    try {
      // Age + Job (3C2)
      const ageJobDemand = await env.DB.prepare(`
            SELECT 
              CASE 
                WHEN (2026 - user_birth_year + 1) < 20 THEN '10대 이하'
                WHEN (2026 - user_birth_year + 1) BETWEEN 20 AND 29 THEN '20대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 30 AND 39 THEN '30대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 40 AND 49 THEN '40대'
                ELSE '50대 이상'
              END AS age_range,
              user_job,
              COALESCE(json_extract(gpt_filters, '$.category'), '기타/미분류') as category, 
              COUNT(*) as count
            FROM search_logs
            WHERE user_birth_year IS NOT NULL AND user_job IS NOT NULL AND gpt_intent = 'search_tools'
            GROUP BY age_range, user_job, category
            ORDER BY count DESC
            LIMIT 30
          `).all();
      cross_metrics.age_job = ageJobDemand.results || [];
    } catch (e) { console.error("Age+Job metrics failed:", e); }

    try {
      // Age + Gender + Job (3C3)
      const ageGenderJobDemand = await env.DB.prepare(`
            SELECT 
              CASE 
                WHEN (2026 - user_birth_year + 1) < 20 THEN '10대 이하'
                WHEN (2026 - user_birth_year + 1) BETWEEN 20 AND 29 THEN '20대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 30 AND 39 THEN '30대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 40 AND 49 THEN '40대'
                ELSE '50대 이상'
              END AS age_range,
              user_gender,
              user_job,
              COALESCE(json_extract(gpt_filters, '$.category'), '기타/미분류') as category, 
              COUNT(*) as count
            FROM search_logs
            WHERE user_birth_year IS NOT NULL AND user_gender IS NOT NULL AND user_job IS NOT NULL AND gpt_intent = 'search_tools'
            GROUP BY age_range, user_gender, user_job, category
            ORDER BY count DESC
            LIMIT 30
          `).all();
      cross_metrics.age_gender_job = ageGenderJobDemand.results || [];
    } catch (e) { console.error("Age+Gender+Job metrics failed:", e); }

    // 4. Overall success rate
    const totalLogsResult = await env.DB.prepare(`SELECT COUNT(*) as calc_total FROM search_logs`).first();
    const missedLogsResult = await env.DB.prepare(`SELECT COUNT(*) as calc_missed FROM search_logs WHERE matched_count = 0`).first();

    const calcTotal = totalLogsResult?.calc_total || 0;
    const calcMissed = missedLogsResult?.calc_missed || 0;
    const calcSuccess = calcTotal - calcMissed;
    const successRate = calcTotal > 0 ? ((calcSuccess / calcTotal) * 100).toFixed(1) : 0;

    // 5. 툴 클릭 (공식 사이트 방문) 통계
    let top_clicks = [];
    try {
      let query = `
        SELECT c.tool_id, c.tool_name, c.tool_url, c.category, COUNT(*) as click_count
        FROM tool_clicks c
      `;
      let conditions = [];
      let params = [];

      if (pGender || pAgeGroup || pJob) {
        query += `
          LEFT JOIN (
            SELECT session_id, user_gender, user_job, 
              CASE 
                WHEN (2026 - user_birth_year + 1) < 20 THEN '10대 이하'
                WHEN (2026 - user_birth_year + 1) BETWEEN 20 AND 29 THEN '20대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 30 AND 39 THEN '30대'
                WHEN (2026 - user_birth_year + 1) BETWEEN 40 AND 49 THEN '40대'
                ELSE '50대 이상'
              END AS age_range
            FROM search_logs 
            WHERE session_id IS NOT NULL 
            GROUP BY session_id
          ) s ON c.session_id = s.session_id
        `;

        if (pGender) { conditions.push(`s.user_gender = ?`); params.push(pGender); }
        if (pJob) { conditions.push(`s.user_job = ?`); params.push(pJob); }
        if (pAgeGroup) { conditions.push(`s.age_range = ?`); params.push(pAgeGroup); }
      }

      if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
      }

      query += ` GROUP BY c.tool_id ORDER BY click_count DESC LIMIT 50`;

      const clicksResult = await env.DB.prepare(query).bind(...params).all();
      top_clicks = clicksResult.results || [];
    } catch (e) { console.error("top_clicks query failed (table may not exist yet - run /api/db/init):", e); }

    return Response.json({
      success: true,
      data: {
        missing_queries: missingQueriesResult.results || [],
        top_intents: topIntentsResult.results || [],
        top_clicks: top_clicks,
        persona_metrics: persona_metrics,
        cross_metrics: cross_metrics,
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
