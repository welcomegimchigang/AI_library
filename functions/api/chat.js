import {
  defaultQuickReplies,
  loadTools,
  rankTools,
  matchBudget,
  matchPlatform,
  matchLocation,
  matchQ,
  text
} from "../_lib/tools.js";
import { generateChatLayerWithGpt } from "../_lib/openai.js";

const RATE_LIMIT = 30; // 시간당 최대 요청 수
const RATE_WINDOW = 3600; // 1시간 (초)

export async function onRequestPost(context) {
  const { request, env } = context;

  // Rate limiting (IP 기반, KV 사용)
  const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateLimitKey = `rate_${clientIP}_${Math.floor(Date.now() / (RATE_WINDOW * 1000))}`;

  if (env.MISSING_TOOLS_KV) {
    try {
      const current = parseInt(await env.MISSING_TOOLS_KV.get(rateLimitKey) || "0");
      if (current >= RATE_LIMIT) {
        return Response.json({
          reply: { text: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
          state: "collecting", missing: [], quickReplies: [], filters: {}, tools: [],
        }, { status: 429 });
      }
      context.waitUntil(
        env.MISSING_TOOLS_KV.put(rateLimitKey, String(current + 1), { expirationTtl: RATE_WINDOW })
      );
    } catch { }
  }

  try {
    const body = await request.json();
    const message = String(body?.message || "").trim();
    const prevFilters = body?.filters && typeof body.filters === "object" ? body.filters : {};
    const history = Array.isArray(body?.history) ? body.history : [];

    // 1. AI에게 의도(Intent) 파악 및 필터 추출 요청
    const gpt = await generateChatLayerWithGpt(env, { message, history });

    // 2. Case A: 무관한 질문이거나 프롬프트 응답 실패 (매크로 1)
    if (!gpt || gpt.intent === "off_topic") {
      return Response.json({
        reply: {
          text: "안녕하세요! 저는 AI 툴 추천 챗봇이기에 해당 문의에 대해선 답변할 수 없습니다.",
        },
        state: "collecting",
        missing: [],
        quickReplies: [],
        filters: prevFilters,
        tools: [],
      });
    }

    // 3. Case B: 툴 검색 요청 (search_tools)
    const filters = {
      ...prevFilters,
      ...(gpt.filters || {}),
    };

    const tools = await loadTools(request, env);
    const rankedTools = rankTools(tools, filters, message, 5);
    const matchedCount = rankedTools.length;

    // 4. [NEW] D1에 유저 검색 로그 저장 (비동기로 백그라운드 처리)
    if (env.DB) {
      context.waitUntil(
        env.DB.prepare(`
          INSERT INTO search_logs (user_query, gpt_intent, gpt_filters, matched_count)
          VALUES (?, ?, ?, ?)
        `)
          .bind(
            message.slice(0, 500),
            gpt.intent || "unknown",
            JSON.stringify(gpt.filters || {}),
            matchedCount
          )
          .run()
          .catch(e => console.error("Failed to log search query to D1:", e))
      );
    }

    // 5. Case B-1: 매칭되는 툴이 없는 경우
    if (matchedCount === 0) {
      // (기존) KV DB에 실패한 검색어 저장 및 Discord 알림 로직 유지
      if (env.MISSING_TOOLS_KV) {
        const queryKey = `missing_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        context.waitUntil(
          env.MISSING_TOOLS_KV.put(queryKey, JSON.stringify({
            query: message,
            intent: gpt?.intent,
            filters: gpt?.filters || {},
            status: "pending",
            timestamp: Date.now()
          })).catch(console.error)
        );
      }

      if (env.DISCORD_WEBHOOK_URL) {
        context.waitUntil(
          fetch(env.DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `🚨 **AI 툴 검색 실패 건 발생**\n- 유저 입력: \`${message}\`\n- GPT 분석 의도: \`${gpt?.intent}\`\n- 설명: Cloudflare D1 \`search_logs\` 및 KV DB에 적재되었습니다.`
            })
          }).catch(undefined)
        );
      }

      return Response.json({
        reply: { text: "죄송합니다. 요청하신 자료는 찾지 못했습니다. 빠른 시일 내에 추가하겠습니다." },
        state: "refining", missing: [], quickReplies: defaultQuickReplies(filters, []), filters, tools: [],
      });
    }

    // 6. Case B-2: 매칭되는 툴이 있는 경우
    const toolsOut = rankedTools.map((t) => ({
      damoa_id: t.damoa_id,
      serviceName: t.serviceName,
      website: t.website,
      serviceType: t.serviceType,
      price_bucket: t.price_bucket,
      location: t.location,
      supportedPlatforms: t.supportedPlatforms,
      thumbnail: t.thumbnail,
      why: `${t.serviceType || "관련"} 작업에 유용한 AI 툴입니다.`,
    }));

    return Response.json({
      reply: {
        text: "요청하신 조건에 맞는 AI 툴을 추천해 드립니다. 아래 카드를 확인해보세요!",
      },
      state: "recommended",
      missing: [],
      quickReplies: defaultQuickReplies(filters, []),
      filters,
      tools: toolsOut,
    });
  } catch (error) {
    return Response.json({ error: "Invalid request", detail: String(error?.message || error) }, { status: 400 });
  }
}
