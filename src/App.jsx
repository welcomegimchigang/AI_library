import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "ai_tool_chat_history_v3";
const defaultFilters = {
  category: "",
  budget: "",
  location: "",
  platform: "",
  use_case: "",
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

export default function App() {
  const [filters, setFilters] = useState(defaultFilters);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthOk, setHealthOk] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatState, setChatState] = useState("collecting");
  const [activeFilters, setActiveFilters] = useState(defaultFilters);
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

  const recentPrompts = useMemo(() => messages.filter((m) => m.role === "user").slice(-10).reverse(), [messages]);

  function appendMessages(newItems) {
    setMessages((prev) => {
      const next = [...prev, ...newItems].slice(-20);
      saveMessages(next);
      return next;
    });
  }

  function makeAssistantMessage(data, prefix = "") {
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      role: "assistant",
      text: `${prefix}${data?.reply?.text || "추천 결과를 준비했습니다."}`,
      payload: {
        filters: data.filters || {},
        tools: data.tools || [],
        quickReplies: data.quickReplies || [],
      },
    };
  }

  async function callChatApi(textInput) {
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: textInput,
        state: chatState,
        filters: activeFilters,
        history,
      }),
    });
    const data = await res.json();
    setChatState(data.state || "collecting");
    setActiveFilters((prev) => ({ ...prev, ...(data.filters || {}) }));
    appendMessages([makeAssistantMessage(data)]);
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
      const synthetic = {
        reply: { text: `좋아요, 필터 기준으로 ${data.tools?.length || 0}개를 먼저 골라봤어요.` },
        state: "recommended",
        filters: data.filters || filters,
        tools: data.tools || [],
        quickReplies: ["비슷한 툴 더 보기", "무료만 다시 보기", "모바일 위주로 보기"],
      };
      setChatState("recommended");
      setActiveFilters((prev) => ({ ...prev, ...(synthetic.filters || {}) }));
      appendMessages([makeAssistantMessage(synthetic, "필터 검색 | ")]);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitChat(e) {
    e.preventDefault();
    if (!message.trim()) return;

    const userText = message.trim();
    appendMessages([{ id: Date.now(), role: "user", text: userText }]);
    setMessage("");
    setLoading(true);
    try {
      await callChatApi(userText);
    } finally {
      setLoading(false);
    }
  }

  async function onQuickReplyClick(textInput) {
    appendMessages([{ id: Date.now(), role: "user", text: textInput }]);
    setLoading(true);
    try {
      await callChatApi(textInput);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="panel">
          <h2 className="panel-title">조건 필터</h2>
          <label>
            카테고리
            <select value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}>
              {categoryOptions.map((opt) => (
                <option key={opt || "all"} value={opt}>{opt || "전체"}</option>
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
              <option value="web">웹</option>
              <option value="mobile">모바일</option>
              <option value="windows">윈도우</option>
              <option value="mac">맥</option>
            </select>
          </label>
          <label>
            키워드
            <input value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} />
          </label>
          <button onClick={runFilterSearch} disabled={loading}>필터로 추천</button>
          <p className="meta">API 상태: {healthOk ? "정상" : "확인 필요"}</p>
        </div>

        <div className="panel">
          <h3 className="panel-title">최근 질문 10개</h3>
          {recentPrompts.length === 0 ? (
            <p className="meta">아직 질문이 없습니다.</p>
          ) : (
            <div className="recent-list">
              {recentPrompts.map((item) => (
                <button key={item.id} className="recent-item" onClick={() => setMessage(item.text)}>{item.text}</button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="chatbot panel">
        <div className="chat-head">
          <h1 className="chat-title">AI 툴 추천 챗봇</h1>
          <p className="chat-subtitle">원하는 작업을 편하게 말해 주세요. 조건 맞춰 바로 추천해드릴게요.</p>
        </div>

        <div className="chat-log">
          {messages.length === 0 ? (
            <div className="bubble assistant"><p className="bubble-text">원하는 작업을 말해 주세요. 예: 무료 웹 기반 영상 편집 AI 추천</p></div>
          ) : (
            messages.map((item) => (
              <div key={item.id} className={`bubble ${item.role}`}>
                <p className="bubble-text">{item.text}</p>
                {item.role === "assistant" && item.payload ? (
                  <>
                    <div className="cards">
                      {(item.payload.tools || []).slice(0, 5).map((tool) => (
                        <article className="card" key={tool.damoa_id || tool.serviceName}>
                          <strong className="tool-name">{tool.serviceName}</strong>
                          <span className="tool-meta">요금: {tool.price_bucket || "unknown"}</span>
                          <span className="tool-meta">지역: {tool.location || "unknown"}</span>
                          <span className="tool-meta">플랫폼: {tool.supportedPlatforms || "unknown"}</span>
                          <span className="tool-meta">이유: {tool.why || "조건과 기능이 맞습니다."}</span>
                          <a className="tool-link" href={tool.website} target="_blank" rel="noreferrer">공식 링크</a>
                        </article>
                      ))}
                    </div>

                    <div className="recent-list" style={{ marginTop: 8 }}>
                      {(item.payload.quickReplies || []).slice(0, 4).map((qr) => (
                        <button key={`${item.id}-${qr}`} className="recent-item" onClick={() => onQuickReplyClick(qr)}>{qr}</button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ))
          )}
          {loading ? <div className="bubble assistant"><p className="bubble-text">추천 계산 중...</p></div> : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmitChat} className="composer">
          <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="원하는 작업/예산/플랫폼을 입력하세요" />
          <button type="submit" disabled={loading}>전송</button>
        </form>
      </main>
    </div>
  );
}
