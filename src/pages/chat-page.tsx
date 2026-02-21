import { ArrowLeft, Loader2, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { AIToolCard } from "@/components/ai-tool-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { chatExamples } from "@/lib/mock-data";
import type { ToolItem } from "@/lib/types";

type Msg = { id: string; role: "assistant" | "user" | "system"; text: string };
type ChatState = "collecting" | "recommended" | "refining" | "";

export function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { id: "a1", role: "assistant", text: "안녕하세요. 어떤 작업용 AI 툴을 찾고 계신가요?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedTools, setRecommendedTools] = useState<ToolItem[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [chatState, setChatState] = useState<ChatState>("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const send = async (textToSubmit = input) => {
    const trimmed = textToSubmit.trim();
    if (!trimmed || isLoading) return;

    // Add user message
    const newMessage: Msg = { id: String(Date.now()), role: "user", text: trimmed };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.slice(-5).map(m => ({ role: m.role, text: m.text }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          state: chatState,
          filters: filters,
          history: history,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Update state from API response
      if (data.reply?.text) {
        setMessages((prev) => [...prev, { id: String(Date.now()), role: "assistant", text: data.reply.text }]);
      }

      if (data.state) setChatState(data.state);
      if (data.filters) setFilters(data.filters);
      if (Array.isArray(data.quickReplies)) setQuickReplies(data.quickReplies);

      // Map API tools to our ToolItem format
      if (Array.isArray(data.tools)) {
        const mappedTools: ToolItem[] = data.tools.map((t: any) => ({
          id: String(t.damoa_id),
          name: t.serviceName || "Unknown Tool",
          description: t.why || t.serviceType || "",
          features: t.supportedPlatforms ? t.supportedPlatforms.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          price: t.price_bucket === "free" ? "Free" : t.price_bucket === "paid" ? "Paid" : "Freemium",
          score: Math.random() * (5.0 - 4.2) + 4.2, // API currently doesn't provide a numerical score
          image: t.thumbnail || "https://images.unsplash.com/photo-1611532736579-6b16e2b50449?q=80&w=1200&auto=format&fit=crop",
          url: t.website || "#",
        }));
        setRecommendedTools(mappedTools);
      }
    } catch (error) {
      console.error("Chat API Error:", error);
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), role: "system", text: "서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(100%_100%_at_0%_0%,#dbeafe_0%,#e9d5ff_45%,#fce7f3_80%,#f8fafc_100%)]">
      <header className="sticky top-0 z-30 border-b border-white/30 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ArrowLeft size={16} />
            홈으로
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/75 px-3 py-1 text-sm text-slate-700">
            <User size={14} />
            Guest User
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-6">
        <Card className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden bg-white/80">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5 scroll-smooth">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm flex flex-col gap-1
                  ${m.role === "assistant" ? "bg-white text-slate-800 shadow-sm border border-slate-100" :
                    m.role === "system" ? "mx-auto bg-red-50 text-red-600 border border-red-100 text-xs" :
                      "ml-auto bg-[color:var(--primary)] text-white shadow-md"}
                `}
              >
                {m.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Sparkles size={12} className="text-[color:var(--accent)]" />
                    <span className="text-[10px] font-bold text-slate-500">AI Assistant</span>
                  </div>
                )}
                <span>{m.text}</span>
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white text-slate-800 shadow-sm border border-slate-100 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-slate-400" />
                <span className="text-slate-500">답변을 생성하고 있습니다...</span>
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
                className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/50 focus:border-transparent transition-all"
                placeholder="예: 쇼츠 편집용 무료 AI 툴 추천해줘"
              />
              <Button
                className="h-12 px-5 min-w-[80px]"
                onClick={() => send()}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : "전송"}
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
                대화 조건에 맞춰 <b>{recommendedTools.length}개</b>의 툴을 찾았습니다.
              </div>
            ) : (
              <div className="grid gap-2 mb-2">
                {chatExamples.map((example) => (
                  <button
                    key={example}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    onClick={() => {
                      setInput(example);
                      // focus output automatically when clicked if we wanted to
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-3 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 pb-4">
              {recommendedTools.map((tool) => (
                <AIToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
