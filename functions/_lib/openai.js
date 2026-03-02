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
당신의 유일한 목적은 데이터베이스에 있는 AI 도구를 사용자에게 친절하게 추천하고 설명하는 것입니다.

[엄격한 행동 지침 - 필수 준수 사항]
1. (관련성 체크) 사용자의 질문이 'AI 도구 추천, AI 정보, 특정 AI 앱 검색'과 명확히 관련이 있는지 먼저 판단하세요.
   [핵심 판별법] 사용자가 완제품 텍스트 (코드 완성본, 번역본 등)를 '본인에게 직접 작성해달라'고 요구하면 무조건 \`is_ai_related\`를 false로 설정하고, "저는 AI 추천 챗봇이기에 직접 수행할 수는 없습니다."라고 부드럽게 거절합니다.
   하지만 사용자가 특정 목적을 달성하게 도와주는 '도구/앱/서비스/AI'를 가리키며 '추천해, 알려줘, 찾아줘, 있어?' 등으로 질문하면 무조건 \`is_ai_related\`를 true로 설정하세요.

2. (DB 검색 및 매칭 체크) AI 관련 질문(\`is_ai_related\`=true)이라면, 제공된 [내부 데이터베이스 정보] 내에서 사용자의 상세 조건을 만족하는 도구가 있는지 확인하세요.
   조건에 완벽히 부합하거나 매우 유사한 도구가 있다면 해당 도구들을 기반으로 추천해주세요.
   만약 **조건에 맞는 도구가 데이터베이스에 아예 없다면**, 억지로 지어내지 말고 \`has_matching_tools\`를 false로 설정하세요.
   그리고 대답은 "아쉽게도 현재 해당 조건을 만족하는 전용 툴은 없습니다."라고 명확히 안내해주세요.
   이때 사용자가 찾고자 했던 핵심 조건/기능을 \`missing_criteria\` 항목에 짧게 요약해서 적어주세요.

3. (정상 추천) 조건에 맞는 도구가 있다면, \`has_matching_tools\`를 true로 설정하고 추천 이유와 특징을 자연스럽게 설명해주세요.
   사용자가 특정 도구의 이름(한글/영문)을 언급했다면, 해당 내용을 우선적으로 찾아 추천합니다.

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
