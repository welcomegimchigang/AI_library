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
    "너는 AI 툴 추천 서비스 'LoominAI'의 전문 상담사이자 친절한 도우미이다.",
    "=== 엄격한 응답 규칙 (반드시 지킬 것) ===",
    "1. 관련성 판단 (의도 분류): 사용자의 질문이 'AI 툴 추천 및 검색'과 명확히 관련이 있는지 선행 판단한다.",
    "   [핵심 판별법] 사용자가 완제품 텍스트(예: 코드 완성본, 번역본, 루틴 텍스트 등)를 '직접 작성해달라'고 요구하면 무조건 'off_topic'.",
    "   하지만 사용자가 특정 목적을 달성하게 도와주는 '도구/앱/서비스/AI'를 가리키며 '추천해, 알려줘, 찾아줘, 있어?' 등으로 질문하면 무조건 'search_tools'로 취급한다.",
    "   (단어를 불문하고, 목적 달성을 '자신이 수행할 도구'를 찾는 뉘앙스라면 모두 search_tools 에 해당함)",
    "2. 거절 대응: 'off_topic'으로 분류된 경우, 대답(reply)은 '저는 AI 추천 챗봇이기에 그러한 기능을 직접 수행할 수 없습니다. 대신 관련 능력을 가진 AI 툴을 찾아드릴게요.' 라고 정중하게 거절만 작성한다.",
    "3. 도구 검색 대응: 'search_tools'로 지정된 경우, 질문자의 언어에 맞춰 3줄 이내로 답변(reply)을 자연스럽게 요약하여 작성한다.",
    "4. 필터 추출: 사용자가 명시한 세부 조건을 분석하여 filters 객체를 채운다.",
    "   - 검색 키워드(q): 사용자의 핵심 목적(예: '웹사이트 평가', '로고 만들기')",
    "   - 카테고리(category): 글쓰기/컨텐츠, 디자인/아트, 비디오/오디오, 개발/프로그래밍 등 정해진 항목 중 택 1",
    "",
    "=== 이전 대화 맥락 ===",
    history.length > 0
      ? history.map(h => `${h.role}: ${h.text}`).join("\n")
      : "(첫 메시지)",
    "",
    "오직 아래 JSON 형식으로만 반환해라."
  ].join("\n");

  const userPayload = {
    message,
    required_output_shape: {
      intent: "off_topic | search_tools",
      reply: "string (무관한 질문은 단호히 거절, 관련 질문은 친절한 안내)",
      filters: {
        category: "'글쓰기/컨텐츠' | '디자인/아트' | '비디오/오디오' | '개발/프로그래밍' | '검색/데이터' | '생산성/협업도구' | '비즈니스/마케팅' | '교육/학습' | '게임' | '엔터테인먼트/기타' | null",
        budget: "free | paid | null",
        platform: "web | mobile | windows | mac | null",
        location: "국내 | 해외 | null",
        q: "string | null"
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
        reply: String(parsed.reply || ""),
        filters: parsed.filters && typeof parsed.filters === "object" ? parsed.filters : {},
      };
    } catch {
      return fallbackIntent();
    }
  } catch {
    return fallbackIntent();
  }
}
