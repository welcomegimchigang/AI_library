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

  const system = `당신은 현존하는 최고의 'AI 도구 큐레이터'입니다.
당신의 유일한 목적은 제공된 [내부 데이터베이스 정보]에 있는 AI 도구를 사용자에게 정확하게 추천하는 것입니다.

[엄격한 행동 지침 - 필수 준수 사항]
1. (정보의 출처) **오직 [내부 데이터베이스 정보]에 포함된 도구만 추천하세요.** 당신이 개인적으로 알고 있는 도구라도 데이터베이스에 없다면 절대 상세히 설명하지 마세요.
2. (매칭 판단) 
   - 사용자가 찾는 도구가 데이터베이스에 있다면: \`has_matching_tools\`를 true로 설정하고 해당 도구의 특징을 설명하세요.
   - 사용자가 찾는 도구가 데이터베이스에 없다면: \`has_matching_tools\`를 false로 설정하고, "현재 데이터베이스에는 해당 조건에 맞는 도구가 없습니다"라고만 답하세요. **절대 데이터베이스에 없는 도구의 URL이나 상세 기능을 당신의 지식으로 지어내지 마세요.**
3. (대화의 연속성) 사용자가 이전 질문과 무관한 새로운 주제(예: 운동 앱 이야기하다가 영어 공부 앱 질문)를 꺼냈다면, 이전 주제는 완전히 무시하고 새로운 주제에 대해서만 데이터베이스를 검색하세요.

[내부 데이터베이스 정보]
${contextDocs}

오직 전달받은 JSON 스키마 형식으로만 반환하세요.`;

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

  const system = `당신은 사용자의 질문을 검색에 최적화된 문장으로 재작성하는 전문가입니다.

[작업 규칙]
1. (문맥 유지) 이전 대화에서 특정 주제(예: "운동")가 진행 중이고 현재 질문이 모호하다면 (예: "모바일 앱은?"), 그 주제를 병합하세요. (예: "운동 관련 모바일 AI 앱 추천")
2. (주제 전환 탐지) **가장 중요**: 현재 질문이 이전 대화 주제와 완전히 다른 새로운 주제(예: 운동 이야기하다가 갑자기 "영어 공부")라면, 이전 문맥을 완전히 삭제하고 현재 질문만 독립적으로 재작성하세요.
3. 절대 질문에 답변하지 마세요. 오직 재작성된 검색어만 출력하세요.`;

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
