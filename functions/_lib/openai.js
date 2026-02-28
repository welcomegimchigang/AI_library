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
    "   - 사용자가 직접 코딩을 해달라거나, 번역을 해달라거나, 헬스 루틴을 직접 텍스트로 완성해달라는 등의 '직접적인 업무 수행 지시'나 일상 대화는 무조건 intent를 'off_topic'으로 지정한다.",
    "   - 단, 사용자가 '~하는 AI 알려줘', '무엇을 짜주는 툴 추천해줘' 와 같이 AI '도구'나 '서비스'를 찾아달라고 요청하는 경우, 이는 코딩 지시가 아니므로 반드시 intent를 'search_tools'로 지정해야 한다.",
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
