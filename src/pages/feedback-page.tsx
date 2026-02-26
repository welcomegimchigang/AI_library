import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";

export function FeedbackPage() {
    const [form, setForm] = useState({
        type: "suggestion",
        message: "",
        contact: "",
    });
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const feedbackTypes = [
        { id: "suggestion", label: "기능 제안" },
        { id: "bug", label: "버그 제보" },
        { id: "content", label: "데이터 수정/추가 요청" },
        { id: "other", label: "기타 문의" },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.message.trim() || form.message.length < 5) {
            setErrorMsg("내용을 5자 이상 입력해주세요.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setStatus("success");
                setForm({ type: "suggestion", message: "", contact: "" });
            } else {
                setErrorMsg(data.error || "제출에 실패했습니다.");
                setStatus("error");
            }
        } catch {
            setErrorMsg("네트워크 오류가 발생했습니다.");
            setStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#f0fdf4_0%,#f0f9ff_40%,#faf5ff_75%,#f8fafc_100%)] text-slate-900">
            <Header />
            <main className="mx-auto w-full max-w-2xl px-4 py-16 md:px-6">
                <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-xl backdrop-blur md:p-12">
                    <h1 className="text-3xl font-black md:text-4xl flex items-center gap-3">
                        <MessageSquare className="text-emerald-500" size={32} />
                        건의 및 피드백
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        LoominAI를 더 좋게 만들기 위한 소중한 의견을 들려주세요.
                    </p>

                    {status === "success" ? (
                        <div className="mt-8 flex flex-col items-center text-center py-10">
                            <CheckCircle size={48} className="text-emerald-500 mb-4" />
                            <h2 className="text-xl font-bold text-slate-800">소중한 의견 감사합니다!</h2>
                            <p className="mt-2 text-slate-500">
                                보내주신 피드백을 바탕으로 더 발전하는 LoominAI가 되겠습니다.
                            </p>
                            <Button
                                className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setStatus("idle")}
                            >
                                추가로 의견 보내기
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                            {status === "error" && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                                    <AlertCircle size={16} /> {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">항목 선택</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {feedbackTypes.map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setForm({ ...form, type: type.id })}
                                            className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${form.type === type.id
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    내용 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    placeholder="개선 제안, 버그, 아이디어 등 자유롭게 적어주세요."
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    className="w-full h-40 rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    연락처 (선택 사항)
                                </label>
                                <Input
                                    placeholder="이메일이나 SNS 아이디를 남겨주시면 답변을 드릴 수 있습니다."
                                    value={form.contact}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, contact: e.target.value })}
                                    className="h-12 rounded-xl bg-white border-slate-300"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={status === "loading"}
                                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-500/25"
                            >
                                {status === "loading" ? (
                                    <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block mr-2" />
                                ) : (
                                    <Send size={16} className="mr-2" />
                                )}
                                {status === "loading" ? "제출 중..." : "피드백 보내기"}
                            </Button>
                        </form>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
