import {
  buildWorkflow,
  filterTools,
  getChatCache,
  loadTools,
  parseMessageToFilters,
  setChatCache,
} from "../_lib/tools.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const message = String(body?.message || "").trim();
    const parsed = parseMessageToFilters(message);
    const hasFilter = Object.values(parsed).some(Boolean);

    const filters = hasFilter ? parsed : {};
    const cacheKey = JSON.stringify(filters);
    const cached = getChatCache(cacheKey);
    if (cached) return Response.json(cached);

    const tools = await loadTools(request, env);
    let picked = filterTools(tools, filters, 5);

    if (picked.length < 3) {
      const relaxed = { ...filters, q: "" };
      picked = filterTools(tools, relaxed, 5);
    }

    if (picked.length < 3) {
      picked = filterTools(tools, { q: filters.q || "" }, 5);
    }

    if (picked.length < 3) {
      picked = filterTools(tools, {}, 5);
    }

    const category = filters.category || "검색/데이터";
    const workflow = buildWorkflow(category, picked);

    const payload = {
      filters,
      tools: picked.slice(0, 5),
      workflow,
    };

    setChatCache(cacheKey, payload);
    return Response.json(payload);
  } catch (error) {
    return Response.json({ error: "Invalid request", detail: String(error?.message || error) }, { status: 400 });
  }
}
