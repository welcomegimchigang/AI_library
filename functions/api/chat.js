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

const GUEST_LIMIT = 10;
const USER_LIMIT = 30;
const RATE_WINDOW = 86400; // 24시간

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. 기초적인 봇 감지 (User-Agent 검사)
  const ua = request.headers.get("User-Agent") || "";
  const isBot = /bot|spider|crawl|headless|selenium|puppeteer/i.test(ua);

  if (isBot) {
    return Response.json({ error: "Access denied for bots" }, { status: 403 });
  }

  const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
  const body = await request.json().catch(() => ({}));
  const email = body?.userEmail || ""; // 프론트에서 보내줄 수 있음
  const message = String(body?.message || "").trim();

  // Rate limiting (IP 또는 이메일 기반)
  const identifier = email ? `user_${email}` : `ip_${clientIP}`;
  const kstOffset = 9 * 60 * 60 * 1000;
  const dayBucket = Math.floor((Date.now() + kstOffset) / (86400 * 1000));
  const rateLimitKey = `usage_${identifier}_${dayBucket}`;

  // [NEW] 토큰 리셋 슬래시 커맨드 (/adminsupernovatoken)
  if (message === "/adminsupernovatoken") {
    if (env.MISSING_TOOLS_KV) {
      context.waitUntil(env.MISSING_TOOLS_KV.delete(rateLimitKey));
    }
    return Response.json({
      reply: { text: "[관리자 모드] 뾰로롱✨\n사용자님의 일일 대화 토큰이 0으로 초기화되었습니다! 이제 다시 마음껏 질문하실 수 있습니다." },
      state: "collecting", missing: [], quickReplies: [], filters: {}, tools: [],
    });
  }

  let currentUsage = 0;
  if (env.MISSING_TOOLS_KV) {
    try {
      currentUsage = parseInt(await env.MISSING_TOOLS_KV.get(rateLimitKey) || "0");
      const limit = email ? USER_LIMIT : GUEST_LIMIT;

      if (currentUsage >= limit) {
        return Response.json({
          reply: { text: "일일 대화 한도에 도달했습니다. 내일 다시 시도해주세요!" },
          state: "collecting", tools: [],
        }, { status: 429 });
      }

      // 사용량 증가 (백그라운드)
      context.waitUntil(
        env.MISSING_TOOLS_KV.put(rateLimitKey, String(currentUsage + 1), { expirationTtl: RATE_WINDOW })
      );
    } catch (e) {
      console.error("Rate limit check failed:", e);
    }
  }

  try {
    const prevFilters = body?.filters && typeof body.filters === "object" ? body.filters : {};
    const history = Array.isArray(body?.history) ? body.history : [];

    // [NEW] 관리자 수동 툴 수집 슬래시 커맨드 (/adminsupernova)
    if (message.startsWith("/adminsupernova")) {
      const toolName = message.replace("/adminsupernova", "").trim();

      if (!toolName) {
        return Response.json({
          reply: { text: "명령어 오류: 수집할 AI 툴 이름을 함께 입력해주세요. (예: /adminsupernova Vrew)" },
          state: "collecting", missing: [], quickReplies: [], filters: prevFilters, tools: [],
        });
      }

      // KV DB에 다이렉트 푸시 (pending 상태)
      if (env.MISSING_TOOLS_KV) {
        const queryKey = `missing_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        context.waitUntil(
          env.MISSING_TOOLS_KV.put(queryKey, JSON.stringify({
            query: toolName,
            intent: "manual_admin_insert",
            filters: { q: toolName },
            status: "pending",
            timestamp: Date.now()
          })).catch(console.error)
        );
      }

      // 디스코드 알림
      if (env.DISCORD_WEBHOOK_URL) {
        context.waitUntil(
          fetch(env.DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `🛠️ **관리자 수동 툴 수집 요청 추가됨**\n- 툴 이름: \`${toolName}\`\n- 설명: \`/adminsupernova\` 커맨드에 의해 새벽 깃헙 액션 수집 봇 대기열에 다이렉트로 추가되었습니다.`
            })
          }).catch(undefined)
        );
      }

      return Response.json({
        reply: { text: `[관리자 모드] 성공✨\n'${toolName}' 도구를 스크래핑 대기열에 수동으로 추가했습니다. 새벽에 GitHub Actions 봇이 수집합니다.` },
        state: "collecting", missing: [], quickReplies: [], filters: prevFilters, tools: [],
      });
    }

    // 1. AI에게 의도(Intent) 파악 및 필터 추출 요청
    const gpt = await generateChatLayerWithGpt(env, { message, history });

    // 2. Case A: 무관한 질문이거나 프롬프트 응답 실패
    if (!gpt || gpt.intent === "off_topic") {
      return Response.json({
        reply: {
          text: gpt?.reply || "안녕하세요! 저는 AI 툴 추천 챗봇입니다. 무엇을 도와드릴까요?",
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

    const persona = body?.persona || {}; // { gender, birthYear, job }

    // 4. [NEW] D1에 유저 검색 로그 저장 (비동기로 백그라운드 처리)
    if (env.DB) {
      context.waitUntil(
        env.DB.prepare(`
          INSERT INTO search_logs (user_query, gpt_intent, gpt_filters, matched_count, user_gender, user_birth_year, user_job, session_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            message.slice(0, 500),
            gpt.intent || "unknown",
            JSON.stringify(gpt.filters || {}),
            matchedCount,
            persona.gender || null,
            persona.birthYear || null,
            persona.job || null,
            body?.session_id || null
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
      id: t.damoa_id,
      name: t.serviceName,
      url: t.website,
      category: t.serviceType,
      isFree: t.price_bucket === "free",
      thumbnail: t.thumbnail,
      why: t.description || t.keyFeatures_list?.[0] || `${t.serviceType || "관련"} 작업에 유용한 AI 툴입니다.`,
    }));

    return Response.json({
      reply: {
        text: `조건에 맞는 AI 툴 ${toolsOut.length}개를 찾았습니다. 아래 카드를 확인해보세요!`,
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
