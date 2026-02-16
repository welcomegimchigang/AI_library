import { filterTools, loadTools } from "../_lib/tools.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const filters = {
    category: url.searchParams.get("category") || "",
    budget: url.searchParams.get("budget") || "",
    location: url.searchParams.get("location") || "",
    platform: url.searchParams.get("platform") || "",
    q: url.searchParams.get("q") || "",
  };
  const limit = Number(url.searchParams.get("limit") || 5);

  try {
    const tools = await loadTools(request, env);
    const result = filterTools(tools, filters, limit);
    return Response.json({ filters, count: result.length, tools: result });
  } catch (error) {
    return Response.json({ error: "Failed to query tools", detail: String(error?.message || error) }, { status: 500 });
  }
}
