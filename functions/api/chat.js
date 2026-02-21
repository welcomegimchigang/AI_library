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
    const finalTools = selectedSet.size
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

    const fallbackText =
      state === "collecting"
        ? "좋아요, 요청 이해했어요. 더 정확히 맞추려고 한 가지만 여쭤볼게요."
        : `좋아요, 요청에 맞춰 ${toolsOut.length}개를 골라봤어요. 카드에서 바로 비교해보세요.`;

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
