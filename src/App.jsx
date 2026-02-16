import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "ai_tool_chat_history_v2";
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

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.slice(-20) : [];
  } catch {
    return [];
  }
}

function saveMessages(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-20)));
}

function formatFilters(filters = {}) {
  const map = {
    category: "카테고리",
    budget: "예산",
    location: "지역",
    platform: "플랫폼",
    q: "키워드",
  };
  const parts = Object.entries(filters)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${map[key] || key}:${value}`);
  return parts.length ? parts.join(" · ") : "조건 자동 추출 없음";
}

function makeAssistantText(payload) {
  const toolCount = payload?.tools?.length || 0;
  const wfCount = payload?.workflow?.length || 0;
  return `조건 ${formatFilters(payload?.filters)} | 추천 ${toolCount}개 | 실행 ${wfCount}단계`;
}

export default function App() {
  const [filters, setFilters] = useState(defaultFilters);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthOk, setHealthOk] = useState(false);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages(loadMessages());
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHealthOk(Boolean(d?.ok)))
      .catch(() => setHealthOk(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const recentPrompts = useMemo(() => {
    const list = messages.filter((m) => m.role === "user").slice(-10).reverse();
    return list;
  }, [messages]);

  function appendMessages(newItems) {
    setMessages((prev) => {
      const next = [...prev, ...newItems].slice(-20);
      saveMessages(next);
      return next;
    });
  }

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
      const payload = { filters: data.filters || {}, tools: data.tools || [], workflow: [] };
      appendMessages([
        {
          id: Date.now(),
          role: "assistant",
          text: `필터 검색 결과 | ${makeAssistantText(payload)}`,
          payload,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitChat(e) {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      text: message.trim(),
    };

    appendMessages([userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await res.json();

      appendMessages([
        {
          id: Date.now() + 1,
          role: "assistant",
          text: makeAssistantText(data),
          payload: {
            filters: data.filters || {},
            tools: data.tools || [],
            workflow: data.workflow || [],
          },
        },
      ]);

      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="panel">
          <h2>조건 필터</h2>
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
            <input value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} />
          </label>
          <button onClick={runFilterSearch} disabled={loading}>필터로 추천</button>
          <p className="meta">API: {healthOk ? "정상" : "확인 필요"}</p>
        </div>

        <div className="panel">
          <h3>최근 질문 10개</h3>
          {recentPrompts.length === 0 ? (
            <p className="meta">아직 질문이 없습니다.</p>
          ) : (
            <div className="recent-list">
              {recentPrompts.map((item) => (
                <button key={item.id} className="recent-item" onClick={() => setMessage(item.text)}>
                  {item.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="chatbot panel">
        <div className="chat-head">
          <h1>AI 툴 추천 챗봇</h1>
          <p>짧은 답변 + 추천 카드 3~5개 + 워크플로우 3~5단계</p>
        </div>

        <div className="chat-log">
          {messages.length === 0 ? (
            <div className="bubble assistant">
              <p>요청을 입력하면 바로 추천합니다. 예: 무료 웹 기반 영상 편집 툴 추천</p>
            </div>
          ) : (
            messages.map((item) => (
              <div key={item.id} className={`bubble ${item.role}`}>
                <p>{item.text}</p>

                {item.role === "assistant" && item.payload ? (
                  <>
                    <div className="cards">
                      {(item.payload.tools || []).slice(0, 5).map((tool) => (
                        <article className="card" key={tool.damoa_id || tool.serviceName}>
                          <strong>{tool.serviceName}</strong>
                          <span>{tool.price_bucket || "unknown"}</span>
                          <span>{tool.location || "unknown"}</span>
                          <span>{tool.supportedPlatforms || "unknown"}</span>
                          <a href={tool.website} target="_blank" rel="noreferrer">공식 링크</a>
                        </article>
                      ))}
                    </div>

                    <div className="workflow">
                      {(item.payload.workflow || []).slice(0, 5).map((step) => (
                        <div className="wf-item" key={`${item.id}-${step.step}`}>
                          {step.step}. {step.goal} {step.tool?.serviceName ? `(${step.tool.serviceName})` : ""}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ))
          )}

          {loading ? <div className="bubble assistant"><p>추천 계산 중...</p></div> : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmitChat} className="composer">
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="원하는 작업/예산/플랫폼을 입력하세요"
          />
          <button type="submit" disabled={loading}>전송</button>
        </form>
      </main>
    </div>
  );
}
