const CATEGORY_RULES = [
  { id: "글쓰기/컨텐츠", keywords: ["글", "블로그", "카피", "콘텐츠", "컨텐츠", "작문", "요약", "문서", "writing", "content"] },
  { id: "디자인/아트", keywords: ["디자인", "이미지", "아트", "포스터", "브랜딩", "일러스트", "design", "art"] },
  { id: "비디오/오디오", keywords: ["영상", "비디오", "쇼츠", "릴스", "편집", "음악", "오디오", "voice", "video", "audio"] },
  { id: "개발/프로그래밍", keywords: ["개발", "코드", "프로그래밍", "디버깅", "깃", "github", "api", "coding", "dev"] },
  { id: "검색/데이터", keywords: ["검색", "리서치", "조사", "데이터", "분석", "크롤링", "search", "research", "data"] },
  { id: "생산성/협업도구", keywords: ["생산성", "협업", "회의", "정리", "노트", "프로젝트", "task", "collab", "productivity"] },
  { id: "비즈니스/마케팅", keywords: ["마케팅", "광고", "리드", "세일즈", "사업", "비즈니스", "브랜드", "campaign", "marketing"] },
  { id: "교육/학습", keywords: ["학습", "교육", "공부", "튜터", "문제", "퀴즈", "learning", "education", "study"] },
  { id: "게임", keywords: ["게임", "game", "npc", "맵", "레벨"] },
  { id: "엔터테인먼트/기타", keywords: ["재미", "엔터", "취미", "기타", "entertainment"] },
];

const WORKFLOW_TEMPLATES = {
  "비디오/오디오": [
    { goal: "콘셉트와 레퍼런스 수집", keywords: ["search", "research", "script", "아이디어"] },
    { goal: "스크립트/스토리보드 작성", keywords: ["script", "writing", "text", "story"] },
    { goal: "영상/음원 생성", keywords: ["video", "audio", "music", "voice"] },
    { goal: "편집 및 자막/썸네일 제작", keywords: ["edit", "subtitle", "thumbnail", "design"] },
    { goal: "배포용 포맷 변환", keywords: ["export", "platform", "publish"] },
  ],
  "글쓰기/컨텐츠": [
    { goal: "주제 조사와 키워드 정리", keywords: ["search", "research", "data"] },
    { goal: "아웃라인과 초안 생성", keywords: ["writing", "draft", "text"] },
    { goal: "톤/문체 보정", keywords: ["rewrite", "grammar", "copy"] },
    { goal: "썸네일/이미지 보강", keywords: ["image", "design", "art"] },
  ],
  "디자인/아트": [
    { goal: "무드보드와 레퍼런스 정리", keywords: ["search", "image", "art"] },
    { goal: "시안 생성", keywords: ["design", "image", "generate"] },
    { goal: "디테일 수정/업스케일", keywords: ["edit", "enhance", "upscale"] },
    { goal: "파일 내보내기/공유", keywords: ["export", "share", "collab"] },
  ],
  "개발/프로그래밍": [
    { goal: "요구사항 정리", keywords: ["plan", "docs", "task"] },
    { goal: "코드 초안/보일러플레이트 생성", keywords: ["code", "api", "programming"] },
    { goal: "리뷰/디버깅", keywords: ["debug", "review", "test"] },
    { goal: "배포 자동화", keywords: ["deploy", "ci", "ops"] },
  ],
  "검색/데이터": [
    { goal: "질문 정의", keywords: ["query", "search", "research"] },
    { goal: "자료 수집", keywords: ["crawl", "search", "data"] },
    { goal: "요약/인사이트 도출", keywords: ["summary", "analysis", "report"] },
    { goal: "결과 공유", keywords: ["docs", "presentation", "collab"] },
  ],
  "비즈니스/마케팅": [
    { goal: "타깃 고객 정의", keywords: ["persona", "crm", "audience"] },
    { goal: "캠페인 문구/소재 제작", keywords: ["copy", "design", "ad"] },
    { goal: "채널별 배포", keywords: ["social", "email", "publish"] },
    { goal: "성과 분석", keywords: ["analytics", "report", "data"] },
  ],
  "교육/학습": [
    { goal: "학습 목표 설정", keywords: ["study", "learning", "plan"] },
    { goal: "강의/자료 요약", keywords: ["summary", "notes", "text"] },
    { goal: "문제 생성/복습", keywords: ["quiz", "practice", "tutor"] },
    { goal: "진도 점검", keywords: ["tracker", "progress", "task"] },
  ],
  "생산성/협업도구": [
    { goal: "업무 입력/분류", keywords: ["task", "project", "management"] },
    { goal: "회의 기록 자동화", keywords: ["meeting", "notes", "audio"] },
    { goal: "우선순위/일정 조정", keywords: ["calendar", "priority", "schedule"] },
    { goal: "팀 공유/피드백", keywords: ["collab", "share", "review"] },
  ],
  "고객지원 챗봇": [
    { goal: "FAQ/지식베이스 수집", keywords: ["docs", "help", "knowledge"] },
    { goal: "응답 시나리오 설계", keywords: ["chatbot", "flow", "support"] },
    { goal: "웹/앱 채널 연결", keywords: ["api", "web", "mobile"] },
    { goal: "응대 품질 모니터링", keywords: ["analytics", "report", "quality"] },
  ],
  "음악/오디오 제작": [
    { goal: "장르/레퍼런스 선정", keywords: ["music", "audio", "style"] },
    { goal: "멜로디/보컬 생성", keywords: ["song", "voice", "generate"] },
    { goal: "믹싱/마스터링", keywords: ["mix", "master", "edit"] },
    { goal: "배포 포맷 출력", keywords: ["publish", "export", "platform"] },
  ],
};

let toolsPromise = null;
const chatCache = new Map();
const PLATFORM_ALIASES = {
  web: ["웹", "web", "browser"],
  mobile: ["모바일", "mobile", "android", "ios"],
  windows: ["윈도우", "windows", "win", "pc"],
  mac: ["맥", "mac", "macos"],
};

function text(v) {
  return String(v ?? "").toLowerCase();
}

function normPlatform(value = "") {
  const v = text(value);
  if (!v) return "";
  if (PLATFORM_ALIASES.web.some((k) => v.includes(k))) return "web";
  if (PLATFORM_ALIASES.mobile.some((k) => v.includes(k))) return "mobile";
  if (PLATFORM_ALIASES.windows.some((k) => v.includes(k))) return "windows";
  if (PLATFORM_ALIASES.mac.some((k) => v.includes(k))) return "mac";
  return v;
}

function normalizeFilters(filters = {}) {
  return {
    category: filters.category || "",
    budget: filters.budget || "",
    location: filters.location || "",
    platform: normPlatform(filters.platform || ""),
    use_case: filters.use_case || "",
    q: filters.q || "",
  };
}

function scoreByQuery(tool, q) {
  if (!q) return 0;
  const words = text(q).split(/\s+/).filter(Boolean);
  const base = [tool.serviceName, tool.serviceType, ...(tool.keyFeatures_list || [])].map(text).join(" ");
  let score = 0;
  for (const w of words) {
    if (base.includes(w)) score += 1;
  }
  return score;
}

function matchCategory(tool, category) {
  if (!category) return true;
  const c = text(category);
  const hay = [tool.serviceType, ...(tool.keyFeatures_list || []), tool.serviceName].map(text).join(" ");
  if (hay.includes(c)) return true;
  const rule = CATEGORY_RULES.find((r) => text(r.id) === c);
  if (!rule) return false;
  return rule.keywords.some((kw) => hay.includes(text(kw)));
}

function matchBudget(tool, budget) {
  if (!budget) return true;
  const b = text(budget);
  const p = text(tool.price_bucket);
  if (b.includes("무료") || b === "free") return p === "free" || p === "freemium/paid";
  if (b.includes("유료") || b === "paid") return p === "paid" || p === "freemium/paid";
  return true;
}

function matchLocation(tool, location) {
  if (!location) return true;
  const l = text(location);
  const v = text(tool.location);
  if (l.includes("국내") || l.includes("korea")) return v.includes("국내") || v.includes("한국") || v.includes("korea");
  if (l.includes("해외") || l.includes("global")) return v.includes("해외") || v.includes("global") || v.includes("외");
  return v.includes(l);
}

function matchPlatform(tool, platform) {
  if (!platform) return true;
  const p = normPlatform(platform);
  const v = text(tool.supportedPlatforms);
  const keys = PLATFORM_ALIASES[p] || [p];
  return keys.some((k) => v.includes(k));
}

function matchQ(tool, q) {
  if (!q) return true;
  const words = text(q).split(/\s+/).filter(Boolean);
  const hay = [tool.serviceName, tool.serviceType, ...(tool.keyFeatures_list || [])].map(text).join(" ");
  return words.some((w) => hay.includes(w));
}

export function filterTools(tools, filters = {}, limit = 5) {
  const normalized = normalizeFilters(filters);
  const max = Math.min(Math.max(Number(limit) || 5, 1), 20);

  const filtered = tools
    .filter((tool) => matchCategory(tool, normalized.category))
    .filter((tool) => matchBudget(tool, normalized.budget))
    .filter((tool) => matchLocation(tool, normalized.location))
    .filter((tool) => matchPlatform(tool, normalized.platform))
    .filter((tool) => matchQ(tool, normalized.q));

  const sorted = filtered.sort((a, b) => {
    const scoreDiff = scoreByQuery(b, normalized.q) - scoreByQuery(a, normalized.q);
    if (scoreDiff !== 0) return scoreDiff;
    return text(b.releaseDate).localeCompare(text(a.releaseDate));
  });

  return sorted.slice(0, max);
}

export function parseMessageToFilters(message) {
  const m = text(message);
  const filters = {};

  const categoryRule = CATEGORY_RULES.find((rule) => rule.keywords.some((kw) => m.includes(text(kw))));
  if (categoryRule) filters.category = categoryRule.id;

  if (/(무료|공짜|free)/.test(m)) filters.budget = "free";
  else if (/(유료|paid|결제|구독)/.test(m)) filters.budget = "paid";

  if (/(국내|한국|korea)/.test(m)) filters.location = "국내";
  else if (/(해외|global|미국|일본|유럽)/.test(m)) filters.location = "해외";

  if (/(웹|web|브라우저)/.test(m)) filters.platform = "web";
  else if (/(모바일|mobile|ios|android)/.test(m)) filters.platform = "mobile";
  else if (/(윈도우|windows|pc)/.test(m)) filters.platform = "windows";
  else if (/(맥|mac|macos)/.test(m)) filters.platform = "mac";

  if (/(쇼츠|짧은|shorts|릴스)/.test(m)) filters.use_case = "쇼츠";
  else if (/(롱폼|긴 영상|장편|long)/.test(m)) filters.use_case = "롱폼";
  else if (/(블로그|뉴스레터|카피|콘텐츠)/.test(m)) filters.use_case = "콘텐츠 제작";
  else if (/(코딩|코드|개발|디버깅)/.test(m)) filters.use_case = "개발 생산성";

  const queryTokens = (message || "")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2)
    .slice(0, 5);

  if (queryTokens.length > 0) filters.q = queryTokens.join(" ");

  return filters;
}

function categoryKeywords(category = "") {
  const found = CATEGORY_RULES.find((x) => x.id === category);
  return found ? found.keywords : [];
}

function matchedKeywordCount(hay, words) {
  let count = 0;
  for (const w of words) {
    if (w && hay.includes(text(w))) count += 1;
  }
  return count;
}

function scoreTool(tool, filters, message) {
  const f = normalizeFilters(filters);
  const msgWords = String(message || "")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2)
    .slice(0, 8);
  const type = text(tool.serviceType);
  const name = text(tool.serviceName);
  const features = (tool.keyFeatures_list || []).map(text).join(" ");
  const all = `${name} ${type} ${features}`;

  let score = 0;

  if (f.category) {
    const kws = categoryKeywords(f.category);
    if (type.includes(text(f.category)) || kws.some((k) => type.includes(text(k)))) score += 3;
  }
  for (const w of msgWords) {
    if (name.includes(text(w))) score += 2;
    if (type.includes(text(w))) score += 3;
    if (features.includes(text(w))) score += 2;
  }
  if (f.use_case && all.includes(text(f.use_case))) score += 2;
  if (f.budget && matchBudget(tool, f.budget)) score += 2;
  if (f.platform && matchPlatform(tool, f.platform)) score += 2;
  if (f.location && matchLocation(tool, f.location)) score += 1;
  score += matchedKeywordCount(all, categoryKeywords(f.category)) > 0 ? 1 : 0;

  return score;
}

export function rankTools(tools, filters = {}, message = "", limit = 8) {
  const f = normalizeFilters(filters);
  const max = Math.min(Math.max(Number(limit) || 8, 3), 10);

  const strict = tools
    .filter((tool) => (!f.budget ? true : matchBudget(tool, f.budget)))
    .filter((tool) => (!f.platform ? true : matchPlatform(tool, f.platform)))
    .filter((tool) => (!f.location ? true : matchLocation(tool, f.location)))
    .map((tool) => ({ tool, score: scoreTool(tool, f, message) }))
    .sort((a, b) => b.score - a.score || text(b.tool.releaseDate).localeCompare(text(a.tool.releaseDate)))
    .map((x) => x.tool);

  if (strict.length >= 3) return strict.slice(0, max);

  const broad = tools
    .map((tool) => ({ tool, score: scoreTool(tool, f, message) }))
    .sort((a, b) => b.score - a.score || text(b.tool.releaseDate).localeCompare(text(a.tool.releaseDate)))
    .map((x) => x.tool);

  return broad.slice(0, max);
}

export function computeState(prevState, message, filters, toolCount) {
  const m = text(message);
  const hasRefineWord = /(무료만|유료만|모바일|웹|비슷한|더 보여|다시|재추천|다른)/.test(m);
  if (hasRefineWord || prevState === "recommended") return "refining";
  if (!filters.category || !filters.use_case) return "collecting";
  return toolCount > 0 ? "recommended" : "collecting";
}

export function computeMissingSlots(filters = {}) {
  const missing = [];
  if (!filters.category) missing.push("category");
  if (!filters.use_case) missing.push("use_case");
  return missing.slice(0, 1);
}

export function defaultQuickReplies(filters = {}, missing = []) {
  if (missing[0] === "use_case") return ["쇼츠", "긴 영상", "둘 다"];
  if (missing[0] === "category") return ["영상 편집", "디자인", "개발"];
  const platform = filters.platform || "";
  const budget = filters.budget || "";
  return [
    budget === "free" ? "유료 포함 보기" : "무료만 다시 보기",
    platform === "mobile" ? "웹 위주로 보기" : "모바일 위주로 보기",
    "비슷한 툴 더 보기",
  ];
}

function chooseTemplateKey(category = "") {
  if (WORKFLOW_TEMPLATES[category]) return category;
  return "검색/데이터";
}

function matchToolForStep(step, tools, usedIds) {
  const keywords = (step.keywords || []).map(text);
  for (const tool of tools) {
    if (usedIds.has(tool.damoa_id)) continue;
    const hay = [tool.serviceName, tool.serviceType, ...(tool.keyFeatures_list || [])].map(text).join(" ");
    if (keywords.some((k) => hay.includes(k))) {
      usedIds.add(tool.damoa_id);
      return tool;
    }
  }
  for (const tool of tools) {
    if (!usedIds.has(tool.damoa_id)) {
      usedIds.add(tool.damoa_id);
      return tool;
    }
  }
  return null;
}

export function buildWorkflow(category, tools) {
  const key = chooseTemplateKey(category);
  const template = WORKFLOW_TEMPLATES[key] || WORKFLOW_TEMPLATES["검색/데이터"];
  const used = new Set();

  return template.slice(0, 5).map((step, idx) => {
    const matched = matchToolForStep(step, tools, used);
    return {
      step: idx + 1,
      goal: step.goal,
      tool: matched
        ? {
            damoa_id: matched.damoa_id,
            serviceName: matched.serviceName,
            website: matched.website,
          }
        : null,
    };
  });
}

export function getChatCache(key) {
  return chatCache.get(key) || null;
}

export function setChatCache(key, value) {
  if (chatCache.size >= 200) {
    const firstKey = chatCache.keys().next().value;
    chatCache.delete(firstKey);
  }
  chatCache.set(key, value);
}

export async function loadTools(request, env) {
  if (!toolsPromise) {
    toolsPromise = (async () => {
      if (!env?.ASSETS) throw new Error("ASSETS binding unavailable");
      const url = new URL("/data/tools.json", request.url);
      const res = await env.ASSETS.fetch(url);
      if (!res.ok) throw new Error(`Failed to load tools.json: ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("tools.json is not an array");
      return data;
    })();
  }
  return toolsPromise;
}
