export async function getEmbedding(env, text) {
  const apiKey = env?.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data[0].embedding;
  } catch (e) {
    console.error("Embedding API Error:", e);
    return null;
  }
}

export async function generateRagResponse(env, input, contextDocs) {
  const apiKey = env?.OPENAI_API_KEY;
  if (!apiKey) return { is_ai_related: true, has_matching_tools: true, reply: "API 키가 없습니다." };

  const { message, history } = input;

  const system = `당신은 AI 도구 추천 전문가입니다. [데이터베이스 정보]를 바탕으로 성실히 답변하세요.

[응답 규칙 - 필수]
1. (관련성) 질문이 AI 도구 추천/정보와 무관(예: 일상 대화, 코딩 요청)하면 \`is_ai_related\`를 false로 하고 1줄로 거절하세요.
2. (DB 검색 및 추천) 질문과 조금이라도 관련 있는 도구가 [데이터베이스 정보]에 있다면 \`has_matching_tools\`를 true로 하고, 해당 도구들을 적극적으로 추천하고 설명하세요.
3. (부재 시 사과) 질문의 의도와 관련 있는 도구가 [데이터베이스 정보]에 **정말로 단 하나도 없을 때만** \`has_matching_tools\`를 false로 설정하세요. 이때 답변은 반드시 "죄송합니다. 빠른 시일 내에 추가하겠습니다."라고만 출력하세요.

[데이터베이스 정보]
${contextDocs}`;

  const userPayload = {
    message,
    history,
    required_output_shape: {
      is_ai_related: "boolean",
      has_matching_tools: "boolean",
      reply: "string (자연스러운 챗봇의 답변 텍스트)",
      missing_criteria: "string (조건에 맞는 도구가 없을 경우 사용자가 원한 기능 요약, 찾았다면 빈 문자열)"
    }
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
        max_tokens: 300,
        temperature: 0.2,
      }),
    });

    if (!res.ok) return { is_ai_related: true, has_matching_tools: false, reply: "OpenAI API 호출 에러 발생." };

    const payload = await res.json();
    const text = payload.choices?.[0]?.message?.content;
    const parsed = JSON.parse(text || "{}");

    return {
      is_ai_related: parsed.is_ai_related !== false,
      has_matching_tools: parsed.has_matching_tools !== false,
      reply: parsed.reply || "추천 정보를 가져왔습니다.",
      missing_criteria: parsed.missing_criteria || ""
    };
  } catch (e) {
    console.error("RAG GPT Error:", e);
    return { is_ai_related: true, has_matching_tools: false, reply: "알 수 없는 에러가 발생했습니다." };
  }
}

export async function generateAdminActionWithGpt(env, adminCommand) {
  const apiKey = env?.OPENAI_API_KEY;
  if (!apiKey) {
    return { action: "add", targetTool: adminCommand, reason: "No API Key" };
  }

  const system = [
    "당신은 AI 도구 데이터베이스 관리자 비서입니다.",
    "사용자가 입력한 관리자 명령어를 분석하여 의도를 파악하세요.",
    "=== 응답 규칙 ===",
    "1. 명령어에서 사용자가 지시하는 작업(action)을 파악합니다. (추가, 삭제, 수정 중 하나)",
    "   - '지워', '없애', '삭제', '빼' 등 -> 'delete'",
    "   - '수정', '바꿔', '변경' 등 -> 'update'",
    "   - '넣어', '추가', '수집', '찾아' 또는 그 외 기본 요청 -> 'add'",
    "2. 명령어가 가리키는 대상 AI 툴의 이름(targetTool)을 추출하세요.",
    "   - 예: 'Vrew 툴 내 DB에서 없애놔라' -> targetTool: 'Vrew'",
    "   - 예: 'ChatGPT 추가해줘' -> targetTool: 'ChatGPT'",
    "3. 기타 참고사항이나 이유(reason)를 짧게 요약하세요.",
    "4. 반드시 아래 JSON 형식으로만 반환하세요."
  ].join("\n");

  const userPayload = {
    command: adminCommand,
    required_output_shape: {
      action: "add | delete | update",
      targetTool: "string (툴 이름만)",
      reason: "string"
    }
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
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      return { action: "add", targetTool: adminCommand, reason: "API Error" };
    }

    const payload = await res.json();
    const text = payload.choices?.[0]?.message?.content;
    if (!text) {
      return { action: "add", targetTool: adminCommand, reason: "Empty Response" };
    }

    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") {
        return { action: "add", targetTool: adminCommand, reason: "Parse Error" };
      }
      return {
        action: String(parsed.action || "add"),
        targetTool: String(parsed.targetTool || adminCommand),
        reason: String(parsed.reason || "")
      };
    } catch {
      return { action: "add", targetTool: adminCommand, reason: "Parse Exception" };
    }
  } catch {
    return { action: "add", targetTool: adminCommand, reason: "Fetch Exception" };
  }
}

/**
 * 대화 내역(history)과 현재 질문을 분석하여, 검색에 최적화된 독립적인 질문(Standalone Query)을 생성합니다.
 * 문맥 유지를 위해 필수적인 단계입니다.
 */
export async function contextualizeQuery(env, input) {
  const apiKey = env?.OPENAI_API_KEY;
  const { message, history } = input;

  // 이전 대화 내역이 없으면 문맥화가 필요 없음
  if (!history || history.length === 0) return message;

  // 히스토리가 너무 길면 최근 3개만 반영 (노이즈 감소)
  const recentHistory = history.slice(-3);

  const system = `사용자의 질문을 검색에 최적화된 독립적인 문장으로 재작성하세요.
핵심 키워드 위주로 재작성하되, 질문의 원래 의도(예: '영상 편집', '디자인')를 반드시 유지하세요.
답변하지 말고 오직 검색용 문장만 출력하세요.`;

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
          { role: "user", content: `대화 내역:\n${JSON.stringify(recentHistory)}\n\n현재 질문: ${message}\n\n재작성된 검색어:` },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!res.ok) return message;
    const json = await res.json();
    const rewritten = json.choices?.[0]?.message?.content?.trim() || message;
    console.log(`[RAG] Rewritten Query: ${rewritten}`);
    return rewritten;
  } catch (e) {
    console.error("Contextualize Query Error:", e);
    return message;
  }
}
