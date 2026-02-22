import {
  defaultQuickReplies,
  loadTools,
  rankTools,
} from "../_lib/tools.js";
import { generateChatLayerWithGpt } from "../_lib/openai.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const message = String(body?.message || "").trim();
    const prevFilters = body?.filters && typeof body.filters === "object" ? body.filters : {};

    // 1. AI에게 의도(Intent) 파악 및 필터 추출 요청
    const gpt = await generateChatLayerWithGpt(env, { message });

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
    // 기존 필터와 GPT가 새로 뽑아준 필터 병합
    const filters = {
      ...prevFilters,
      ...(gpt.filters || {}),
    };

    // DB 로드 및 검색
    const tools = await loadTools(request, env);
    const rankedTools = rankTools(tools, filters, message, 5);

    // 4. Case B-1: 매칭되는 툴이 없는 경우 (매크로 2)
    if (rankedTools.length === 0) {
      // Send a silent background notification to Discord Webhook if configured
      if (env.DISCORD_WEBHOOK_URL) {
        context.waitUntil(
          fetch(env.DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `🚨 **AI 툴 검색 실패 건 발생**\n- 유저 입력: \`${message}\`\n- GPT 분석 의도: \`${gpt?.intent}\`\n- GPT 추출 필터: \`${JSON.stringify(gpt?.filters || {})}\`\n- 설명: 일치하는 데이터가 DB에 없어 답변을 제공하지 못했습니다. 빠른 시일 내에 해당 분야의 AI 툴을 긁어와주세요!`
            })
          }).catch(undefined) // Ignore any errors silently
        );
      }

      return Response.json({
        reply: {
          text: "죄송합니다. 요청하신 자료는 찾지 못했습니다. 빠른 시일 내에 추가하겠습니다.",
        },
        state: "refining",
        missing: [],
        quickReplies: defaultQuickReplies(filters, []),
        filters,
        tools: [],
      });
    }

    // 5. Case B-2: 매칭되는 툴이 있는 경우 (매크로 3)
    const toolsOut = rankedTools.map((t) => ({
      damoa_id: t.damoa_id,
      serviceName: t.serviceName,
      website: t.website,
      serviceType: t.serviceType,
      price_bucket: t.price_bucket,
      location: t.location,
      supportedPlatforms: t.supportedPlatforms,
      thumbnail: t.thumbnail,
      // GPT가 더이상 이유(why)를 생성하지 않으므로 고정 문구 제공
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
