import {
  computeMissingSlots,
  computeState,
  defaultQuickReplies,
  getChatCache,
  loadTools,
  parseMessageToFilters,
  rankTools,
  setChatCache,
} from "../_lib/tools.js";
import { generateChatLayerWithGpt } from "../_lib/openai.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const message = String(body?.message || "").trim();
    const prevState = String(body?.state || "");
    const prevFilters = body?.filters && typeof body.filters === "object" ? body.filters : {};
    const history = Array.isArray(body?.history) ? body.history : [];

    const parsed = parseMessageToFilters(message);
    const filters = {
      ...prevFilters,
      ...parsed,
    };

    const cacheKey = JSON.stringify({ message, state: prevState, filters });
    const cached = getChatCache(cacheKey);
    if (cached) return Response.json(cached);

    const tools = await loadTools(request, env);
    const candidates = rankTools(tools, filters, message, 8);
    const chosenTools = candidates.slice(0, 5);

    const initialState = computeState(prevState, message, filters, chosenTools.length);
    const missing = computeMissingSlots(filters);
    const state = missing.length > 0 ? "collecting" : initialState;

    const gpt = await generateChatLayerWithGpt(env, {
      message,
      state,
      missing,
      filters,
      candidates,
      history,
    });

    const selectedSet = new Set((gpt?.selectedIds || []).map((x) => Number(x)));
    const finalTools = gpt?.isOffTopic
      ? []
      : selectedSet.size
        ? chosenTools.filter((t) => selectedSet.has(Number(t.damoa_id))).slice(0, 5)
        : chosenTools;

    const whyMap = new Map(
      (gpt?.toolReasons || [])
        .filter((x) => finalTools.some((t) => Number(t.damoa_id) === Number(x.damoa_id)))
        .map((x) => [Number(x.damoa_id), x.why])
    );

    const toolsOut = finalTools.map((t) => ({
      damoa_id: t.damoa_id,
      serviceName: t.serviceName,
      website: t.website,
      serviceType: t.serviceType,
      price_bucket: t.price_bucket,
      location: t.location,
      supportedPlatforms: t.supportedPlatforms,
      thumbnail: t.thumbnail,
      why: whyMap.get(Number(t.damoa_id)) || `${t.serviceType || "관련"} 작업에 맞는 핵심 기능이 있습니다.`,
    }));

    const hasAnyFilter = Boolean(filters.category || filters.use_case || filters.budget || filters.platform || filters.location);
    const fallbackText =
      state === "collecting"
        ? hasAnyFilter
          ? "좋아요, 요청하신 조건의 일부를 확인했어요. 추천 정확도를 높이기 위해 한 가지만 더 여쭤볼게요."
          : "안녕하세요! 저는 AI 툴 추천 챗봇입니다. 어떤 작업(예: 영상 편집, 디자인, 코딩 등)을 위한 툴을 찾고 계신가요?"
        : `요청하신 조건에 맞춰 ${toolsOut.length}개의 툴을 골라봤어요. 카드에서 자세히 확인해보세요.`;

    // 만약 필터가 전혀 없고 GPT 응답도 실패했다면, 무관한 질문으로 간주하고 툴 추천을 비움
    if (!gpt && !hasAnyFilter) {
      finalTools.length = 0;
      toolsOut.length = 0;
    }

    const payload = {
      reply: {
        text: gpt?.replyText || fallbackText,
      },
      state,
      missing: gpt?.missing?.length ? gpt.missing : missing,
      quickReplies: gpt?.quickReplies?.length ? gpt.quickReplies : defaultQuickReplies(filters, missing),
      filters,
      tools: toolsOut,
    };

    setChatCache(cacheKey, payload);
    return Response.json(payload);
  } catch (error) {
    return Response.json({ error: "Invalid request", detail: String(error?.message || error) }, { status: 400 });
  }
}
