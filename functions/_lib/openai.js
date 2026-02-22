export async function generateChatLayerWithGpt(env, input) {
  const m = String(input?.message || "");
  const history = input?.history || [];
  const fallbackIntent = () => {
    const isSearchWord = /(추천|알려|찾아|있어|뭐가|뭘까|도구|툴|ai|어떤|만드는|설계|다시 보기|위주로 보기|더 보기|포함 보기|보여|보여줘|만|빼고|위주로|버전|공부|직업|하려고|할려고|위해|평가|분석|검사|테스트|진단|점검|무료|유료|pc|모바일|사용할)/i.test(m);
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
    "",
    "=== 핵심 규칙 ===",
    "1. 사용자의 핵심 '목적'을 정확히 파악해라. '웹사이트 평가'와 '웹사이트 제작'은 완전히 다른 목적이다. 사용자가 말한 동사(평가, 만들기, 분석, 편집, 생성, 검사 등)를 정확히 반영해라.",
    "2. 검색 키워드(q)에는 사용자가 실제로 원하는 작업을 그대로 넣어라. 예: '웹사이트 평가해주는 AI' → q: '웹사이트 평가 분석'",
    "3. '무료만 보여줘', 'PC에서 사용할 거야', '모바일 위주로 보기' 같은 조건 변경/추가 요청은 이전 대화의 맥락을 이어가는 search_tools이다.",
    "4. '반도체 회로설계 AI 알려줘' 같은 희귀한 분야도 반드시 search_tools로 분류해라.",
    "5. '나 영어 공부할려고', '영상 편집이 직업이야' 같은 상황 서술도 그 목적에 맞는 AI 도구를 찾는 것이므로 search_tools이다.",
    "",
    "=== 이전 대화 맥락 ===",
    history.length > 0
      ? history.map(h => `${h.role}: ${h.text}`).join("\n")
      : "(첫 메시지)",
    "",
    "오직 JSON 형식으로만 반환하고 다른 텍스트는 출력하지 마라."
  ].join("\n");

  const userPayload = {
    message,
    required_output_shape: {
      intent: "off_topic | search_tools",
      filters: {
        category: "string | null",
        budget: "free | paid | null",
        platform: "web | mobile | windows | mac | null",
        location: "국내 | 해외 | null",
        q: "string | null (단순 명사가 아닌, 사용자가 원하는 작업을 정확히 반영한 핵심 검색 키워드)"
      }
    },
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
      }),
    });

    if (!res.ok) return fallbackIntent();

    const payload = await res.json();
    const text = payload.choices?.[0]?.message?.content;
    if (!text) return fallbackIntent();

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
