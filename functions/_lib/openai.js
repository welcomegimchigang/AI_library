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
    // 퀵 리플라이 문구 및 "무료만 보여줘라" 같은 맥락형 조건 변경사 포함, 상황/목적어('공부', '직업', '하려고' 등) 포함
    const isSearchWord = /(추천|알려|찾아|있어|뭐가|뭘까|도구|툴|ai|어떤|만드는|설계|다시 보기|위주로 보기|더 보기|포함 보기|보여|보여줘|만|빼고|위주로|버전|공부|직업|하려고|할려고|위해)/i.test(m);
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
    "주의1: '무료만 보여줘라', '무료만 다시 보기', '웹 버전 찾아봐' 등 대화 맥락상 검색 조건을 추가/변경하는 요청도 명백한 툴 추천/검색 요청(search_tools)이다.",
    "주의2: '반도체 회로설계 AI 알려줘' 처럼 매우 구체적이거나 희귀한 분야를 묻더라도 반드시 'search_tools'로 분류해라.",
    "주의3: '나 영어 공부할려고', '영상 편집이 직업이야' 처럼 자신의 예비 작업이나 상황, 직업을 서술하는 것도 그 목적에 맞는 AI 도구를 추천해 달라는 의미이므로 반드시 'search_tools'로 분류해라.",
    "추천 요청으로 분류했다면, 사용자가 찾고자 하는 핵심 목적과 검색 키워드를 추출해라. (예: '영어 공부', '영상 편집')",
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
