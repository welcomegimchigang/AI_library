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
  const m = String(input?.message || "");
  const fallbackIntent = () => {
    // 퀵 리플라이 문구들 포함 ("다시 보기", "위주로 보기", "비슷한 툴")
    const isSearchWord = /(추천|알려|찾아|있어|뭐가|뭘까|도구|툴|ai|어떤|만드는|설계|다시 보기|위주로 보기|더 보기|포함 보기)/i.test(m);
    return {
      intent: isSearchWord ? "search_tools" : "off_topic",
      filters: { q: m.length > 2 ? m : null }
    };
  };

  const apiKey = env?.OPENAI_API_KEY;
  if (!apiKey) return fallbackIntent();

  const { message } = input;

  const system = [
    "너는 AI 툴 추천 챗봇의 자연어 의도 분석기(Intent Classifier)이다.",
    "사용자의 메시지가 인사말 등 툴 추천과 전혀 무관한 일상 대화인지, 아니면 특정 AI 툴에 대한 추천/검색 요청인지 판단해라.",
    "주의: '무료만 다시 보기', '모바일 위주로 보기', '비슷한 툴 더 보기', '유료 포함 보기' 등은 UI에서 제공한 버튼 클릭(Quick Reply)이므로, 이전 결과를 재정렬하기 위한 명백한 툴 추천/검색 요청(search_tools)이다.",
    "주의2: '반도체 회로설계 AI 알려줘' 처럼 매우 구체적이거나 희귀한 분야를 묻더라도 반드시 'search_tools'로 분류해라.",
    "추천 요청으로 분류했다면, 사용자가 찾고자 하는 핵심 검색 키워드를 추출해라.",
    "오직 JSON 형식으로만 반환하고 다른 텍스트는 출력하지 마라."
  ].join(" ");

  const userPayload = {
    message,
    required_output_shape: {
      intent: "off_topic | search_tools",
      filters: {
        category: "string | null",
        budget: "free | paid | null",
        platform: "web | mobile | windows | mac | null",
        location: "국내 | 해외 | null",
        q: "string | null (핵심 검색 키워드)"
      }
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
        max_output_tokens: 150,
      }),
    });

    if (!res.ok) return fallbackIntent();

    const payload = await res.json();
    let text = extractTextFromResponsesPayload(payload);
    if (!text) return fallbackIntent();

    text = text.replace(/```json\n?/ig, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") return fallbackIntent();

      return {
        intent: String(parsed.intent || "off_topic"),
        filters: parsed.filters && typeof parsed.filters === "object" ? parsed.filters : {},
      };
    } catch {
      return fallbackIntent();
    }
  } catch {
    return fallbackIntent();
  }
}
