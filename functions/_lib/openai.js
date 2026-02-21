function extractTextFromResponsesPayload(payload) {
  if (!payload) return "";
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (c?.type === "output_text" && typeof c.text === "string") return c.text;
    }
  }
  return "";
}

export async function generateChatLayerWithGpt(env, input) {
  const apiKey = env?.OPENAI_API_KEY;
  if (!apiKey) return null;

  const { message, state, missing, filters, candidates } = input;

  const system = [
    "너는 AI 툴 추천 상담 챗봇이다.",
    "한국어로만 답해라.",
    "장문 금지: 1~3문장.",
    "상담형 톤으로 답해라.",
    "조건이 부족하면 질문은 최대 1개만 한다.",
    "절대 후보 목록 밖 툴을 언급하지 마라.",
    "quickReplies는 짧고 클릭하기 쉽게 3개 제안해라.",
    "JSON만 출력해라.",
  ].join(" ");

  const userPayload = {
    message,
    state,
    missing,
    filters,
    candidates: candidates.map((t) => ({
      damoa_id: t.damoa_id,
      serviceName: t.serviceName,
      serviceType: t.serviceType,
      price_bucket: t.price_bucket,
      location: t.location,
      supportedPlatforms: t.supportedPlatforms,
      keyFeatures_list: t.keyFeatures_list,
    })),
    required_output_shape: {
      replyText: "string",
      quickReplies: ["string"],
      toolReasons: [{ damoa_id: "number", why: "string" }],
      missing: ["string"],
    },
  };

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [
          { role: "system", content: [{ type: "input_text", text: system }] },
          { role: "user", content: [{ type: "input_text", text: JSON.stringify(userPayload) }] },
        ],
        max_output_tokens: 280,
      }),
    });

    if (!res.ok) return null;

    const payload = await res.json();
    const text = extractTextFromResponsesPayload(payload);
    if (!text) return null;

    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      replyText: String(parsed.replyText || "").trim(),
      quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies.map((x) => String(x)).slice(0, 4) : [],
      toolReasons: Array.isArray(parsed.toolReasons)
        ? parsed.toolReasons
            .map((x) => ({ damoa_id: Number(x?.damoa_id), why: String(x?.why || "") }))
            .filter((x) => Number.isFinite(x.damoa_id) && x.why)
        : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing.map((x) => String(x)).slice(0, 1) : [],
    };
  } catch {
    return null;
  }
}
