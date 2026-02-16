import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ai_tool_chat_history_v1";
const defaultFilters = {
  category: "",
  budget: "",
  location: "",
  platform: "",
  q: "",
};

const categoryOptions = [
  "",
  "글쓰기/컨텐츠",
  "디자인/아트",
  "비디오/오디오",
  "개발/프로그래밍",
  "검색/데이터",
  "생산성/협업도구",
  "비즈니스/마케팅",
  "교육/학습",
  "게임",
  "엔터테인먼트/기타",
];

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 10)));
}

export default function App() {
  const [filters, setFilters] = useState(defaultFilters);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthOk, setHealthOk] = useState(false);
  const [result, setResult] = useState({ filters: {}, tools: [], workflow: [] });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(loadHistory());
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHealthOk(Boolean(d?.ok)))
      .catch(() => setHealthOk(false));
  }, []);

  const summaryText = useMemo(() => {
    const toolCount = result.tools?.length || 0;
    const wfCount = result.workflow?.length || 0;
    return `추천 ${toolCount}개, 워크플로우 ${wfCount}단계`;
  }, [result]);

  async function runFilterSearch() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    params.set("limit", "5");

    setLoading(true);
    try {
      const res = await fetch(`/api/tools?${params.toString()}`);
      const data = await res.json();
      setResult({ filters: data.filters || {}, tools: data.tools || [], workflow: [] });
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitChat(e) {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setResult({ filters: data.filters || {}, tools: data.tools || [], workflow: data.workflow || [] });

      const nextHistory = [
        {
          id: Date.now(),
          message,
          summary: `도구 ${data.tools?.length || 0}개 / 단계 ${data.workflow?.length || 0}개`,
          createdAt: new Date().toISOString(),
        },
        ...history,
      ].slice(0, 10);

      setHistory(nextHistory);
      saveHistory(nextHistory);
      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="panel filter-panel">
        <h2>필터</h2>
        <label>
          카테고리
          <select value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}>
            {categoryOptions.map((opt) => (
              <option key={opt || "all"} value={opt}>
                {opt || "전체"}
              </option>
            ))}
          </select>
        </label>
        <label>
          예산
          <select value={filters.budget} onChange={(e) => setFilters((p) => ({ ...p, budget: e.target.value }))}>
            <option value="">전체</option>
            <option value="free">무료</option>
            <option value="paid">유료</option>
          </select>
        </label>
        <label>
          국내/해외
          <select value={filters.location} onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))}>
            <option value="">전체</option>
            <option value="국내">국내</option>
            <option value="해외">해외</option>
          </select>
        </label>
        <label>
          플랫폼
          <select value={filters.platform} onChange={(e) => setFilters((p) => ({ ...p, platform: e.target.value }))}>
            <option value="">전체</option>
            <option value="웹">웹</option>
            <option value="모바일">모바일</option>
            <option value="윈도우">윈도우</option>
            <option value="맥">맥</option>
          </select>
        </label>
        <label>
          키워드
          <input
            placeholder="예: 블로그 자동화"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
          />
        </label>
        <button onClick={runFilterSearch} disabled={loading}>
          필터 검색
        </button>
        <p className="health">API 상태: {healthOk ? "정상" : "확인 필요"}</p>
      </aside>

      <main className="panel chat-panel">
        <h2>채팅</h2>
        <p className="hint">입력 예시: 무료 영상 제작 툴 추천해줘, 해외 웹 기반으로</p>
        <form onSubmit={onSubmitChat} className="chat-form">
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="요구사항을 입력하세요"
          />
          <button type="submit" disabled={loading}>
            추천 받기
          </button>
        </form>

        <div className="history">
          <h3>최근 대화(10개)</h3>
          {history.length === 0 ? (
            <p className="muted">저장된 대화가 없습니다.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="history-item">
                <div>{item.message}</div>
                <small>{item.summary}</small>
              </div>
            ))
          )}
        </div>
      </main>

      <section className="panel result-panel">
        <h2>추천 결과</h2>
        <p className="summary">{summaryText}</p>
        <div className="cards">
          {(result.tools || []).map((tool) => (
            <article className="card" key={tool.damoa_id || tool.serviceName}>
              <h3>{tool.serviceName}</h3>
              <p>{tool.serviceType}</p>
              <p>요금: {tool.price_bucket || "unknown"}</p>
              <p>지역: {tool.location || "unknown"}</p>
              <p>플랫폼: {tool.supportedPlatforms || "unknown"}</p>
              <a href={tool.website} target="_blank" rel="noreferrer">
                공식 링크
              </a>
            </article>
          ))}
        </div>

        <div className="workflow">
          <h3>워크플로우</h3>
          {(result.workflow || []).map((step) => (
            <div key={step.step} className="wf-item">
              <strong>{step.step}. {step.goal}</strong>
              <div>추천 툴: {step.tool?.serviceName || "-"}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
