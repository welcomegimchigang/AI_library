import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Sparkles,
  User,
  ExternalLink,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { chatExamples } from "@/lib/mock-data";

type Msg = { id: string; role: "assistant" | "user" | "system"; text: string };
type ChatState = "collecting" | "recommended" | "refining" | "";

interface ChatTool {
  id: number | string;
  name: string;
  url: string;
  category: string;
  isFree?: boolean;
  why: string;
  thumbnail?: string;
}

function ChatToolCard({ tool }: { tool: ChatTool }) {
  let hostname = "";
  try {
    hostname = new URL(tool.url).hostname;
  } catch { }

  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
        {hostname ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
            alt={tool.name}
            className="w-7 h-7 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              e.currentTarget.parentElement!.innerHTML = `<span class="text-sm font-bold text-slate-400">${tool.name.charAt(0)}</span>`;
            }}
          />
        ) : (
          <span className="text-sm font-bold text-slate-400">
            {tool.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-sm text-slate-900 truncate">
            {tool.name}
          </h4>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${tool.isFree ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
          >
            {tool.isFree ? "무료" : "유료/부분유료"}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
          {tool.why || tool.category}
        </p>
        <a
          href={tool.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          방문하기 <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

export function ChatPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "a1",
      role: "assistant",
      text:
        t("chat.subtitle") || "안녕하세요. 어떤 작업용 AI 툴을 찾고 계신가요?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedTools, setRecommendedTools] = useState<ChatTool[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [chatState, setChatState] = useState<ChatState>("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showAllTools, setShowAllTools] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const send = async (textToSubmit = input) => {
    const trimmed = textToSubmit.trim();
    if (!trimmed || isLoading) return;

    const newMessage: Msg = {
      id: String(Date.now()),
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);
    setLastQuery(trimmed);
    setShowAllTools(false);

    try {
      const history = messages
        .slice(-5)
        .map((m) => ({ role: m.role, text: m.text }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          state: chatState,
          filters: filters,
          history: history,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();

      if (data.reply?.text) {
        // 추천 결과가 있으면 추가 안내 메시지도 함께
        let replyText = data.reply.text;
        if (Array.isArray(data.tools) && data.tools.length > 0) {
          replyText +=
            "\n\n💡 예산이나 사용 환경(PC/모바일) 등 구체적인 조건을 알려주시면 더 정확한 추천이 가능합니다!";
        }
        setMessages((prev) => [
          ...prev,
          { id: String(Date.now()), role: "assistant", text: replyText },
        ]);
      }

      if (data.state) setChatState(data.state);
      if (data.filters) setFilters(data.filters);
      if (Array.isArray(data.quickReplies)) {
        setQuickReplies(data.quickReplies.slice(0, 6));
      }

      if (Array.isArray(data.tools)) {
        setRecommendedTools(data.tools);
      }
    } catch (error) {
      console.error("Chat API Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: "system",
          text: "서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const visibleTools = showAllTools
    ? recommendedTools
    : recommendedTools.slice(0, 3);

  return (
    <div className="min-h-screen bg-[radial-gradient(100%_100%_at_0%_0%,#dbeafe_0%,#e9d5ff_45%,#fce7f3_80%,#f8fafc_100%)]">
      <header className="sticky top-0 z-30 border-b border-white/30 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
          >
            <ArrowLeft size={16} />
            {t("nav.home") || "홈으로"}
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/75 px-3 py-1 text-sm text-slate-700">
            <User size={14} />
            Guest User
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-6">
        <Card className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden bg-white/80">
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto p-5 scroll-smooth"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm flex flex-col gap-1
                  ${m.role === "assistant"
                    ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                    : m.role === "system"
                      ? "mx-auto bg-red-50 text-red-600 border border-red-100 text-xs"
                      : "ml-auto bg-[color:var(--primary)] text-white shadow-md"
                  }
                `}
              >
                {m.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Sparkles
                      size={12}
                      className="text-[color:var(--accent)]"
                    />
                    <span className="text-[10px] font-bold text-slate-500">
                      AI Assistant
                    </span>
                  </div>
                )}
                <span className="whitespace-pre-line">{m.text}</span>
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white text-slate-800 shadow-sm border border-slate-100 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-slate-400" />
                <span className="text-slate-500">
                  {t("chat.searching") || "답변을 생성하고 있습니다..."}
                </span>
              </div>
            )}
          </div>

          {/* Quick Replies */}
          {quickReplies.length > 0 && !isLoading && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {quickReplies.map((qr) => (
                <button
                  key={qr}
                  onClick={() => send(qr)}
                  className="rounded-full border border-[color:var(--primary)]/30 bg-white/50 px-3 py-1.5 text-xs font-medium text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-slate-200/70 p-4 bg-white/50">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={isLoading}
                className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/50 focus:border-transparent transition-all"
                placeholder={
                  t("chat.inputPlaceholder") || "어떤 툴을 찾으시나요?"
                }
              />
              <Button
                className="h-12 px-5 min-w-[80px]"
                onClick={() => send()}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  t("chat.send") || "전송"
                )}
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4 bg-white/80">
            <h3 className="mb-3 text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles size={14} className="text-[color:var(--accent)]" />
              {recommendedTools.length > 0 ? "추천된 AI 툴" : "예시 질문"}
            </h3>

            {recommendedTools.length > 0 ? (
              <div className="text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                대화 조건에 맞춰 <b>{recommendedTools.length}개</b>의 툴을
                찾았습니다.
                {recommendedTools.length > 3 &&
                  !showAllTools &&
                  " 아래 버튼을 눌러 더 확인하세요."}
              </div>
            ) : (
              <div className="grid gap-2 mb-2">
                {chatExamples.map((example) => (
                  <button
                    key={example}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    onClick={() => setInput(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-3 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1 pb-4">
              {visibleTools.map((tool) => (
                <ChatToolCard key={tool.id} tool={tool} />
              ))}
            </div>

            {/* Show More Button */}
            {recommendedTools.length > 3 && !showAllTools && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllTools(true)}
                className="w-full mt-3 rounded-full text-slate-600 border-slate-200 hover:bg-slate-50"
              >
                <ChevronDown size={16} className="mr-2" />더 많은 AI 툴 보기 (
                {recommendedTools.length - 3}개 더)
              </Button>
            )}

            {/* Budget/Condition Prompt */}
            {recommendedTools.length > 0 && (
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <p className="text-xs text-slate-600 mb-2 font-medium">
                  💬 더 정확한 추천을 원하시면:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "무료 AI만 보여줘",
                    "PC에서 사용할 거야",
                    "1인 창업자용으로 추천해줘",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
