import {
  defaultQuickReplies,
  loadTools,
  rankTools,
  matchBudget,
  matchPlatform,
  matchLocation,
  matchQ,
  text,
  parseMessageToFilters
} from "../_lib/tools.js";
import { getEmbedding, generateRagResponse, generateAdminActionWithGpt, contextualizeQuery } from "../_lib/openai.js";

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

    // [NEW] 관리자 수동 툴 수집/삭제/변경 슬래시 커맨드 (/adminsupernova)
    if (message.startsWith("/adminsupernova")) {
      const adminCommand = message.replace("/adminsupernova", "").trim();

      if (!adminCommand) {
        return Response.json({
          reply: { text: "명령어 오류: 수행하실 작업을 자연어로 입력해주세요. (예: /adminsupernova Vrew 툴 내 DB에서 없애놔라)" },
          state: "collecting", missing: [], quickReplies: [], filters: prevFilters, tools: [],
        });
      }

      // 1. GPT에게 관리자 명령어 분석 요청
      const adminGpt = await generateAdminActionWithGpt(env, adminCommand);
      const action = adminGpt?.action || "add"; // 기본값
      const targetTool = adminGpt?.targetTool || adminCommand;

      const actionTextKr = action === "delete" ? "삭제" : action === "update" ? "수정" : "수집/추가";
      const kvStatus = action === "delete" ? "pending_delete" : action === "update" ? "pending_update" : "pending";
      const kvIntent = action === "delete" ? "admin_delete" : action === "update" ? "admin_update" : "manual_admin_insert";

      // 2. KV DB에 다이렉트 푸시
      if (env.MISSING_TOOLS_KV) {
        const queryKey = `admin_${action}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        context.waitUntil(
          env.MISSING_TOOLS_KV.put(queryKey, JSON.stringify({
            query: targetTool,
            intent: kvIntent,
            filters: { q: targetTool },
            status: kvStatus,
            original_command: adminCommand,
            timestamp: Date.now()
          })).catch(console.error)
        );
      }

      // 3. 디스코드 알림
      if (env.DISCORD_WEBHOOK_URL) {
        context.waitUntil(
          fetch(env.DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `🛠️ **관리자 ${actionTextKr} 지시 접수됨**\n- 대상 툴: \`${targetTool}\`\n- 액션: \`${action}\`\n- 원본 지시: "${adminCommand}"\n- 설명: 새벽 깃헙 액션 봇이 해당 지시를 처리합니다.`
            })
          }).catch(undefined)
        );
      }

      return Response.json({
        reply: { text: `[관리자 모드] 접수 완료✨\n'${targetTool}' 도구에 대한 ${actionTextKr} 지시가 정상적으로 봇 대기열에 들어갔습니다!` },
        state: "collecting", missing: [], quickReplies: [], filters: prevFilters, tools: [],
      });
    }

    // 1. 문맥 파악 및 검색 최적화 (대화 내역 반영)
    let searchQuery = await contextualizeQuery(env, { message, history });
    if (!searchQuery) searchQuery = message;

    // 2. 질문 임베딩 생성
    let vector = await getEmbedding(env, searchQuery);

    // [Fallback] 재작성된 쿼리로 임베딩 실패 시 원본 메시지로 재시도
    if (!vector && searchQuery !== message) {
      vector = await getEmbedding(env, message);
    }

    let contextDocs = "";
    let matchedToolsIds = [];

    // 3. Vectorize DB 쿼리
    if (vector && env.VECTORIZE) {
      try {
        let queryRes = await env.VECTORIZE.query(vector, { topK: 10, returnMetadata: "all" });

        // 검색 결과가 너무 없으면 원본 메시지로 다시 한번 시도 (문맥화 노이즈 대비)
        if ((!queryRes.matches || queryRes.matches.length === 0) && searchQuery !== message) {
          const originalVector = await getEmbedding(env, message);
          if (originalVector) {
            queryRes = await env.VECTORIZE.query(originalVector, { topK: 10, returnMetadata: "all" });
          }
        }

        // ---- DEBUG LOGS (원인 확정용) ----
        const matches = queryRes?.matches || [];
        console.log("[RAG] message:", message);
        console.log("[RAG] searchQuery:", searchQuery);
        console.log("[RAG] embedding len:", Array.isArray(vector) ? vector.length : null);
        console.log("[Vectorize] matchCount:", matches.length);
        console.log("[Vectorize] topScore:", matches[0]?.score);
        console.log(
          "[Vectorize] top1 metaKeys:",
          matches[0]?.metadata ? Object.keys(matches[0].metadata) : null
        );

        // ---- metadata key compatibility ----
        const pick = (meta, keys) => {
          for (const k of keys) {
            const v = meta?.[k];
            if (typeof v === "string" && v.trim()) return v.trim();
          }
          return "";
        };

        // ---- score threshold (서버에서 판단) ----
        const topScore = matches[0]?.score ?? 0;
        const SCORE_THRESHOLD = 0.15; // 기존 0.22에서 0.15로 완화하여 더 유연한 대답 유도
        const hasGoodMatch = matches.length > 0 && topScore >= SCORE_THRESHOLD;

        if (hasGoodMatch) {
          matchedToolsIds = matches
            .map((m) => {
              const n = Number(m.id);
              return Number.isFinite(n) ? n : null;
            })
            .filter(Boolean);

          contextDocs = matches
            .map((m, idx) => {
              const meta = m.metadata || {};
              const name = pick(meta, ["name", "serviceName", "title"]);
              const category = pick(meta, ["category", "serviceType", "type"]);
              const description = pick(meta, ["description", "desc", "summary"]);
              const url = pick(meta, ["url", "website", "link"]);

              return `[도구 ${idx + 1}]
이름: ${name || "알 수 없음"}
카테고리: ${category || "unknown"}
설명: ${description || "설명 없음"}
URL: ${url || "URL 없음"}`;
            })
            .join("\n\n");
        } else {
          // [Hybrid Fallback] 벡터 검색 결과가 좋지 않을 때, 기존 키워드 기반 rankTools를 병행하여 보완
          console.log("[RAG] Vectorize score too low. Falling back to rankTools...");
          const allTools = await loadTools(request, env);
          // [Fix] rankTools에 필터를 명시적으로 파싱하여 전달해야 검색이 작동함
          const parsedFilters = parseMessageToFilters(message);
          const legacyResults = rankTools(allTools, parsedFilters, message, 5);

          if (legacyResults.length > 0) {
            matchedToolsIds = legacyResults.map(t => t.damoa_id);
            contextDocs = legacyResults.map((t, idx) => {
              return `[도구 ${idx + 1}]
이름: ${t.serviceName}
카테고리: ${t.serviceType}
설명: ${t.description || t.keyFeatures_list?.[0] || ""}
URL: ${t.website}`;
            }).join("\n\n");
          } else {
            matchedToolsIds = [];
            contextDocs = "";
          }
        }

        console.log("[RAG] contextDocs length:", contextDocs?.length || 0);
      } catch (e) {
        console.error("Vectorize query failed:", e);
      }
    }

    // 3. RAG 기반 생성 요청
    const rag = await generateRagResponse(env, { message, history }, contextDocs);

    const hasContext = typeof contextDocs === "string" && contextDocs.trim().length > 80;

    // GPT가 보수적으로 has_matching_tools=false를 주더라도,
    // 서버가 컨텍스트가 있으면 추천 플로우를 타게 한다.
    const effectiveHasMatchingTools = hasContext ? true : !!rag.has_matching_tools;

    // 4. (Case A) AI 툴 관련 질문이 아닌 경우 (1줄 내외 짧은 답변)
    if (!rag.is_ai_related) {
      return Response.json({
        reply: {
          text: rag.reply || "저는 AI 툴 추천 챗봇입니다. AI 관련 질문을 해주시면 감사하겠습니다!",
        },
        state: "collecting",
        missing: [],
        quickReplies: [],
        filters: prevFilters,
        tools: [],
      });
    }

    const persona = body?.persona || {}; // { gender, birthYear, job }

    // 5. [NEW] D1에 유저 검색 로그 저장 (비동기로 백그라운드 처리)
    if (env.DB) {
      context.waitUntil(
        env.DB.prepare(`
          INSERT INTO search_logs (user_query, gpt_intent, gpt_filters, matched_count, user_gender, user_birth_year, user_job, session_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            message.slice(0, 500),
            searchQuery.slice(0, 500), // gpt_intent 필드에 재작성된 쿼리를 저장하여 디버깅 용이하게 함
            JSON.stringify(prevFilters || {}),
            matchedToolsIds.length,
            persona.gender || null,
            persona.birthYear || null,
            persona.job || null,
            body?.session_id || null
          )
          .run()
          .catch(e => console.error("Failed to log search query to D1:", e))
      );
    }

    // 6. (Case B) 조건에 맞는 툴이 없는 경우 (GPT가 생성한 유연한 피드백 전달)
    if (!effectiveHasMatchingTools) {
      if (env.MISSING_TOOLS_KV) {
        const queryKey = `missing_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        context.waitUntil(
          env.MISSING_TOOLS_KV.put(queryKey, JSON.stringify({
            query: message,
            intent: "rag_missing",
            missing_criteria: rag.missing_criteria,
            filters: prevFilters,
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
              content: `🚨 **AI 툴 검색 실패 건 발생 (RAG 기반)**\n- 유저 입력: \`${message}\`\n- 누락된 핵심 조건: \`${rag.missing_criteria}\`\n- 설명: Cloudflare D1 \`search_logs\` 및 KV DB에 적재되었습니다.`
            })
          }).catch(undefined)
        );
      }

      return Response.json({
        reply: { text: rag.reply || "죄송합니다. 현재 해당 조건에 딱 맞는 도구는 찾지 못했습니다. 곧 추가하겠습니다!" },
        state: "refining", missing: [], quickReplies: defaultQuickReplies(prevFilters, []), filters: prevFilters, tools: [],
      });
    }

    // 7. (Case C) 조건에 맞는 툴 추천
    const allTools = await loadTools(request, env);
    let recommendedTools = [];
    // Vectorize에서 반환된 상위 ID 순서대로 매칭
    for (const id of matchedToolsIds) {
      const found = allTools.find(t => t.damoa_id === id);
      if (found) recommendedTools.push(found);
    }

    // UI에 보여줄 최대 5개 추출
    recommendedTools = recommendedTools.slice(0, 5);

    const toolsOut = recommendedTools.map((t) => ({
      id: t.damoa_id,
      name: t.serviceName,
      url: t.website,
      category: t.serviceType,
      isFree: t.price_bucket === "free",
      thumbnail: t.thumbnail,
      why: t.description || t.keyFeatures_list?.[0] || `${t.serviceType || "관련"} 작업에 유용한 AI 툴입니다.`,
    }));

    return Response.json({
      reply: { text: rag.reply },
      state: "recommended",
      missing: [],
      quickReplies: defaultQuickReplies(prevFilters, []),
      filters: prevFilters,
      tools: toolsOut,
    });
  } catch (error) {
    return Response.json({ error: "Invalid request", detail: String(error?.message || error) }, { status: 400 });
  }
}
