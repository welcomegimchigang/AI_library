import { useEffect, useState } from "react";
import { LineChart, Search, AlertCircle, Database } from "lucide-react";

export function AdminPage() {
    const [secret, setSecret] = useState(localStorage.getItem("admin_secret") || "");
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchMetrics = async (currentSecret: string) => {
        if (!currentSecret) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/metrics?secret=${currentSecret}`);
            if (!res.ok) throw new Error(res.status === 401 ? "비밀번호가 틀렸습니다." : "데이터 로드 실패");
            const data = await res.json();
            setMetrics(data.data);
            localStorage.setItem("admin_secret", currentSecret);
        } catch (err: any) {
            setError(err.message);
            setMetrics(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (secret) {
            fetchMetrics(secret);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMetrics(secret);
    };

    if (!metrics && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <Database className="w-12 h-12 text-blue-500 mb-4" />
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">AI Library 관리자</h1>
                <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
                    <input
                        type="password"
                        placeholder="KV_API_SECRET 입력"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                    >
                        접속하기
                    </button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-10 px-4">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <LineChart className="w-6 h-6 text-blue-500" />
                    수요 분석 대시보드
                </h1>
                <button
                    onClick={() => fetchMetrics(secret)}
                    className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition"
                >
                    {loading ? "로딩 중..." : "새로고침"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">총 검색 횟수</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metrics?.stats?.total_queries || 0}회</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">추천 성공률</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metrics?.stats?.success_rate || "0%"}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">실패(결핍) 횟수</p>
                    <p className="text-3xl font-bold text-red-500 mt-2">{metrics?.stats?.total_queries - metrics?.stats?.successful_queries || 0}회</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Intents */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Search className="w-5 h-5 text-gray-400" />
                            최근 7일 인기 분야
                        </h2>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">의도 (Intent)</th>
                                    <th className="px-6 py-3 font-medium">검색량</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {metrics?.top_intents?.map((intent: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4">{intent.gpt_intent}</td>
                                        <td className="px-6 py-4">{intent.count}</td>
                                    </tr>
                                ))}
                                {(!metrics?.top_intents || metrics.top_intents.length === 0) && (
                                    <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-400">데이터가 없습니다.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Missing Queries */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            최근 결핍 키워드 (실패 건)
                        </h2>
                    </div>
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                        {metrics?.missing_queries?.map((mq: any, idx: number) => {
                            const filters = mq.gpt_filters ? JSON.parse(mq.gpt_filters) : {};
                            const filterKeys = Object.entries(filters).filter(([_, v]) => v).map(([k, v]) => `${k}:${v}`).join(", ");
                            return (
                                <li key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-gray-900 dark:text-white">"{mq.user_query}"</span>
                                        <span className="text-xs text-gray-400">{new Date(mq.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-2 mt-2">
                                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{mq.gpt_intent}</span>
                                        {filterKeys && <span className="text-xs text-gray-400">필터: {filterKeys}</span>}
                                    </div>
                                </li>
                            );
                        })}
                        {(!metrics?.missing_queries || metrics.missing_queries.length === 0) && (
                            <li className="p-8 text-center text-gray-400">결핍 키워드가 없습니다. 훌륭합니다!</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
