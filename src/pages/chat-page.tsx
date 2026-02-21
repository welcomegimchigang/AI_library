import { ArrowLeft, User } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { AIToolCard } from "@/components/ai-tool-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { chatExamples, sampleTools } from "@/lib/mock-data";

type Msg = { id: string; role: "assistant" | "user"; text: string };

export function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { id: "a1", role: "assistant", text: "안녕하세요. 어떤 작업용 AI 툴을 찾고 계신가요?" },
  ]);

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: String(Date.now()), role: "user", text: input.trim() }]);
    setInput("");
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
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === "assistant" ? "bg-white text-slate-800" : "ml-auto bg-[color:var(--primary)] text-white"}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200/70 p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm"
                placeholder="예: 쇼츠 편집용 무료 AI 툴 추천해줘"
              />
              <Button className="h-12 px-5" onClick={send}>전송</Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">예시 질문</h3>
            <div className="grid gap-2">
              {chatExamples.map((example) => (
                <button
                  key={example}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-[color:var(--accent)]"
                  onClick={() => setInput(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </Card>

          <div className="grid gap-3">
            {sampleTools.map((tool) => (
              <AIToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
