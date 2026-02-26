import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Sparkles,
  User,
  ExternalLink,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { chatExamples } from "@/lib/mock-data";
import { PersonaModal } from "@/components/persona-modal";
import { getUserSession } from "@/lib/auth";

type Msg = { id: string; role: "assistant" | "user" | "system"; text: string };
type ChatState = "collecting" | "recommended" | "refining" | "";

interface Persona {
  gender: string;
  birthYear: number;
  job: string;
}

interface ChatTool {
  id: number | string;
  name: string;
  url: string;
  category: string;
  isFree?: boolean;
  why: string;
  thumbnail?: string;
  monthly_visits?: number;
}

function ChatToolCard({ tool }: { tool: ChatTool }) {
  const { t } = useTranslation();
  let hostname = "";
  try {
    hostname = new URL(tool.url).hostname;
  } catch { }

  return (
    <Link
      to={`/tool/${tool.id}`}
      className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
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
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {tool.name}
          </h4>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${tool.isFree ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"}`}
          >
            {tool.isFree ? t("library.free") : t("library.paid")}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
          {tool.why || tool.category}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform">
            {t("library.visit")} <ExternalLink size={10} />
          </div>
        </div>
      </div>
    </Link>
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
  const [persona, setPersona] = useState<Persona | null>(null);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const [usageCount, setUsageCount] = useState(0);
  const [maxUsage, setMaxUsage] = useState(10);
  const [isBotProtected, setIsBotProtected] = useState(false);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getUserSession();
    const localPersona = localStorage.getItem("user_persona");
    const lastCheck = localStorage.getItem("persona_last_check");
    const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

    // 현재 시간 기준 체크 필요 여부 (30일 경과 또는 최초 방문)
    const isOverdue = !lastCheck || (Date.now() - parseInt(lastCheck)) > ONE_MONTH;

    if (session) {
      setMaxUsage(30);
      fetch(`/api/user/profile?email=${encodeURIComponent(session.email)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.profile && data.profile.gender) {
            const p = {
              gender: data.profile.gender,
              birthYear: data.profile.birth_year,
              job: data.profile.job
            };
            setPersona(p);
            localStorage.setItem("user_persona", JSON.stringify(p));

            // DB에 데이터가 있더라도 30일이 지났거나 명시적으로 last_check 기준 체크
            if (isOverdue) {
              setShowPersonaModal(true);
            } else {
              // 30일 안 지났으면 last_check 갱신해서 연장
              localStorage.setItem("persona_last_check", Date.now().toString());
            }
          } else {
            // 정보가 아예 없으면 무조건 노출
            setShowPersonaModal(true);
          }
        })
        .catch(() => {
          if (localPersona && !isOverdue) {
            setPersona(JSON.parse(localPersona));
          } else {
            setShowPersonaModal(true);
          }
        });
    } else {
      setMaxUsage(10);
      if (localPersona && !isOverdue) {
        setPersona(JSON.parse(localPersona));
      } else {
        setShowPersonaModal(true);
      }
    }

    // 초기 사용량 로드 (localStorage 사용 및 날짜 기반 초기화)
    const today = new Date().toLocaleDateString();
    const storedUsage = localStorage.getItem("chat_usage") || "0";
    const storedDate = localStorage.getItem("chat_usage_date");

    if (storedDate !== today) {
      setUsageCount(0);
      localStorage.setItem("chat_usage", "0");
      localStorage.setItem("chat_usage_date", today);
    } else {
      setUsageCount(parseInt(storedUsage));
    }
  }, []);

  const handleSavePersona = async (data: Persona) => {
    setPersona(data);
    localStorage.setItem("user_persona", JSON.stringify(data));
    localStorage.setItem("persona_last_check", Date.now().toString());
    setShowPersonaModal(false);

    const session = getUserSession();
    if (session) {
      await fetch(`/api/user/profile?email=${encodeURIComponent(session.email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const send = async (textToSubmit = input) => {
    const trimmed = textToSubmit.trim();
    if (!trimmed || isLoading) return;

    // 만약 프로필이 없다면 모달을 다시 띄우고 중단
    if (!persona) {
      setShowPersonaModal(true);
      return;
    }

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
          persona: persona,
          userEmail: getUserSession()?.email, // 서버의 이메일 기반 한도 적용을 위해 추가
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      localStorage.setItem("chat_usage", String(newCount));
      localStorage.setItem("chat_usage_date", new Date().toLocaleDateString());

      if (data.reply?.text) {
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

      if (data.tools) {
        setRecommendedTools(data.tools);
      }

    } catch (error) {
      console.error("Chat API Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: "system",
          text: "금일 대화 횟수를 초과했습니다. 더 많은 대화를 원하시면 로그인 or 토큰 충전 or 광고보기를 진행해주세요.",
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
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-[radial-gradient(100%_100%_at_0%_0%,#dbeafe_0%,#e9d5ff_45%,#fce7f3_80%,#f8fafc_100%)]'}`}>
      {showPersonaModal && <PersonaModal onSave={handleSavePersona} initialData={persona} />}

      <header className="sticky top-0 z-30 border-b border-white/20 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={16} />
            {t("nav.home") || "홈으로"}
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-3 py-1 text-sm">
              {getUserSession()?.picture ? (
                <img src={getUserSession().picture} className="w-5 h-5 rounded-full" alt="profile" />
              ) : (
                <User size={14} className="text-slate-400" />
              )}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {getUserSession() ? getUserSession().name : "Guest"}
              </span>
            </div>

            {getUserSession() && (
              <button
                onClick={() => {
                  localStorage.removeItem("user_info");
                  localStorage.removeItem("google_token");
                  window.location.reload();
                }}
                className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-6">
        <Card className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden bg-white/80 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">System Online</span>
            </div>
            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
              <span>남은 질문:</span>
              <span className={`px-1.5 py-0.5 rounded ${usageCount >= maxUsage ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                {Math.max(0, maxUsage - usageCount)} / {maxUsage}
              </span>
            </div>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto p-5 scroll-smooth"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm flex flex-col gap-1
                  ${m.role === "assistant"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700"
                    : m.role === "system"
                      ? "mx-auto bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 text-xs"
                      : "ml-auto bg-blue-600 text-white shadow-md"
                  }
                `}
              >
                {m.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Sparkles
                      size={12}
                      className="text-amber-400"
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
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">
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
                  className="rounded-full border border-blue-600/30 dark:border-blue-500/30 bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
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
                className="h-12 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
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
          <Card className="p-4 bg-white/80 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-lg">
            <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
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
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-amber-400 hover:text-amber-600"
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
