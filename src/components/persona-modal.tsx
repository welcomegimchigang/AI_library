import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User, Briefcase, Calendar, CheckCircle2 } from "lucide-react";

interface PersonaData {
    gender: string;
    birthYear: number;
    job: string;
}

interface PersonaModalProps {
    onSave: (data: PersonaData) => void;
    initialData?: PersonaData | null;
}

export function PersonaModal({ onSave, initialData }: PersonaModalProps) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<PersonaData>({
        gender: initialData?.gender || "",
        birthYear: initialData?.birthYear || 1995,
        job: initialData?.job || "",
    });

    const jobs = [
        "학생", "취준생", "직장인", "전문직", "자영업/사업가", "프리랜서", "주부", "기타"
    ];

    const years = Array.from({ length: 66 }, (_, i) => 2015 - i); // 2015 ~ 1950

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else onSave(data);
    };

    const isStepValid = () => {
        if (step === 1) return data.gender !== "";
        if (step === 2) return data.birthYear > 0;
        if (step === 3) return data.job !== "";
        return false;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-white/20 overflow-hidden transform animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
                                {step === 1 ? <User size={18} /> : step === 2 ? <Calendar size={18} /> : <Briefcase size={18} />}
                            </span>
                            나만의 추천 프로필 설정
                        </h2>
                        <div className="text-xs font-bold text-slate-400">Step {step} / 3</div>
                    </div>

                    <div className="space-y-6 min-h-[240px]">
                        {step === 1 && (
                            <div className="animate-in slide-in-from-right-4 duration-300">
                                <p className="text-sm text-slate-500 mb-4 font-medium">성별을 선택해주세요.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {["남성", "여성"].map((g) => (
                                        <button
                                            key={g}
                                            onClick={() => setData({ ...data, gender: g })}
                                            className={`h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-bold ${data.gender === g
                                                    ? "border-blue-500 bg-blue-50 text-blue-600 shadow-md"
                                                    : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                                                }`}
                                        >
                                            <User size={24} className={data.gender === g ? "text-blue-500" : "text-slate-300"} />
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-in slide-in-from-right-4 duration-300">
                                <p className="text-sm text-slate-500 mb-4 font-medium">태어난 연도를 알려주세요.</p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <select
                                        value={data.birthYear}
                                        onChange={(e) => setData({ ...data, birthYear: parseInt(e.target.value) })}
                                        className="w-full bg-transparent text-lg font-black text-center focus:outline-none"
                                    >
                                        {years.map(y => <option key={y} value={y}>{y}년생 ({(new Date().getFullYear() - y) + 1}세)</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="animate-in slide-in-from-right-4 duration-300">
                                <p className="text-sm text-slate-500 mb-4 font-medium">현재 하고 계신 일은 무엇인가요?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {jobs.map((j) => (
                                        <button
                                            key={j}
                                            onClick={() => setData({ ...data, job: j })}
                                            className={`py-3 px-4 rounded-xl text-sm font-bold border transition-all ${data.job === j
                                                    ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm"
                                                    : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                                                }`}
                                        >
                                            {j}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex gap-3">
                        {step > 1 && (
                            <Button
                                variant="outline"
                                onClick={() => setStep(step - 1)}
                                className="flex-1 h-12 rounded-xl text-slate-500 font-bold"
                            >
                                이전
                            </Button>
                        )}
                        <Button
                            disabled={!isStepValid()}
                            onClick={handleNext}
                            className={`flex-[2] h-12 rounded-xl font-bold shadow-lg transition-all ${isStepValid()
                                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
                                    : "bg-slate-200 text-slate-400"
                                }`}
                        >
                            {step === 3 ? "시작하기" : "다음 단계"}
                            {step === 3 && <CheckCircle2 size={16} className="ml-2" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
