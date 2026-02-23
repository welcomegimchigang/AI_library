import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle, AlertCircle } from "lucide-react";

export function SubmitToolPage() {
    const [form, setForm] = useState({
        name: "",
        url: "",
        description: "",
        category: "기타",
        isFree: true,
    });
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const categories = [
        "이미지/아트", "텍스트/문서", "개발/코드", "비디오/오디오",
        "교육/학습", "건강/피트니스", "비즈니스/마케팅", "생산성/협업", "금융/투자", "기타",
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.url.trim()) {
            setErrorMsg("도구 이름과 URL은 필수 항목입니다.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        try {
            const res = await fetch("/api/submit-tool", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setStatus("success");
                setForm({ name: "", url: "", description: "", category: "기타", isFree: true });
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
        <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#dbeafe_0%,#e9d5ff_40%,#fce7f3_75%,#f8fafc_100%)] text-slate-900">
            <Header />
            <main className="mx-auto w-full max-w-2xl px-4 py-16 md:px-6">
                <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-xl backdrop-blur md:p-12">
                    <h1 className="text-3xl font-black md:text-4xl">AI 도구 등록하기</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        새로운 AI 도구를 제안해주세요. 검토 후 데이터베이스에 추가됩니다.
                    </p>

                    {status === "success" ? (
                        <div className="mt-8 flex flex-col items-center text-center py-10">
                            <CheckCircle size={48} className="text-emerald-500 mb-4" />
                            <h2 className="text-xl font-bold text-slate-800">제출 완료!</h2>
                            <p className="mt-2 text-slate-500">
                                도구가 성공적으로 제출되었습니다. 검토 후 등록됩니다.
                            </p>
                            <Button
                                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => setStatus("idle")}
                            >
                                다른 도구 등록하기
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
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    도구 이름 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    placeholder="예: ChatGPT, Midjourney"
                                    value={form.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                                    className="h-12 rounded-xl bg-white border-slate-300"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    공식 웹사이트 URL <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="url"
                                    placeholder="https://example.com"
                                    value={form.url}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, url: e.target.value })}
                                    className="h-12 rounded-xl bg-white border-slate-300"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    도구 설명
                                </label>
                                <textarea
                                    placeholder="이 AI 도구가 어떤 기능을 하는지 간단히 설명해주세요."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full h-28 rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">카테고리</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full h-12 rounded-xl bg-white border border-slate-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {categories.map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">가격 모델</label>
                                    <select
                                        value={form.isFree ? "free" : "paid"}
                                        onChange={(e) => setForm({ ...form, isFree: e.target.value === "free" })}
                                        className="w-full h-12 rounded-xl bg-white border border-slate-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="free">무료</option>
                                        <option value="paid">유료</option>
                                    </select>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={status === "loading"}
                                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-500/25"
                            >
                                {status === "loading" ? (
                                    <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block mr-2" />
                                ) : (
                                    <Send size={16} className="mr-2" />
                                )}
                                {status === "loading" ? "제출 중..." : "도구 제출하기"}
                            </Button>
                        </form>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
