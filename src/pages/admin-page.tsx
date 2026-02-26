import { useEffect, useState } from "react";
import { LineChart, Search, AlertCircle, Database, MessageSquare, Trash2, RefreshCw } from "lucide-react";

export function AdminPage() {
  const [secret, setSecret] = useState(
    localStorage.getItem("admin_secret") || "",
  );
  const [metrics, setMetrics] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAllData = async (currentSecret: string) => {
    if (!currentSecret) return;
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Metrics (D1)
      const resMetrics = await fetch(`/api/admin/metrics?secret=${currentSecret}`);
      if (!resMetrics.ok)
        throw new Error(
          resMetrics.status === 401 ? "비밀번호가 틀렸습니다." : "데이터 로드 실패",
        );
      const dataMetrics = await resMetrics.json();
      setMetrics(dataMetrics.data);

      // 2. Fetch Feedbacks (KV)
      const resFeedbacks = await fetch(`/api/feedback?action=list&secret=${currentSecret}`);
      if (resFeedbacks.ok) {
        const dataFeedbacks = await resFeedbacks.json();
        setFeedbacks(dataFeedbacks.data || []);
      }

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
      fetchAllData(secret);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAllData(secret);
  };

  const handleDeleteFeedback = async (key: string) => {
    if (!confirm("이 피드백을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/feedback?action=delete&secret=${secret}&key=${key}`);
      if (res.ok) {
        setFeedbacks(prev => prev.filter(f => f.key !== key));
      }
    } catch (err) {
      alert("삭제 실패");
    }
  };

  const handleExportCSV = () => {
    if (feedbacks.length === 0) return;

    // CSV Header
    const headers = ["ID", "유형", "내용", "연락처", "시간"];
    const rows = feedbacks.map(f => [
      f.key,
      f.data.type,
      `"${f.data.message.replace(/"/g, '""')}"`, // Handle quotes and commas
      f.data.contact,
      f.data.timestamp
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `loominai_feedback_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!metrics && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 pt-20">
        <Database className="w-12 h-12 text-blue-500 mb-4" />
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          LoominAI 관리자
        </h1>
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm flex flex-col gap-4"
        >
          <input
            type="password"
            placeholder="KV_API_SECRET 입력"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition shadow-lg shadow-blue-500/20"
          >
            접속하기
          </button>
          {error && <p className="text-red-500 text-sm mt-2 font-medium">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="w-7 h-7 text-blue-600" />
          LoominAI Dashboard
        </h1>
        <button
          onClick={() => fetchAllData(secret)}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-xl transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "로딩 중..." : "새로고침"}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-1">
            Total Queries
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white">
            {metrics?.stats?.total_queries || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-1">
            Success Rate
          </p>
          <p className="text-3xl font-black text-emerald-500">
            {metrics?.stats?.success_rate || "0%"}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-1">
            Missing Needs
          </p>
          <p className="text-3xl font-black text-red-500">
            {(metrics?.stats?.total_queries - metrics?.stats?.successful_queries) || 0}
          </p>
        </div>
      </div>

      {/* Persona Demand Analysis (New) */}
      <div className="mt-10 mb-10">
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <LineChart className="w-6 h-6 text-purple-600" />
          페르소나별 수요 분석
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gender Table */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 font-bold text-sm">
              성별 인기 카테고리
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {metrics?.persona_metrics?.gender?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-gray-500">{item.user_gender}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{item.gpt_intent}</td>
                    <td className="px-4 py-3 text-right text-purple-600 font-black">{item.count}회</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Age Table */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 font-bold text-sm">
              연령대별 인기 카테고리
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {metrics?.persona_metrics?.age?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-gray-500">{item.age_range}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{item.gpt_intent}</td>
                    <td className="px-4 py-3 text-right text-purple-600 font-black">{item.count}회</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Job Table */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 font-bold text-sm">
              직업별 인기 카테고리
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {metrics?.persona_metrics?.job?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-gray-500">{item.user_job}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{item.gpt_intent}</td>
                    <td className="px-4 py-3 text-right text-purple-600 font-black">{item.count}회</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* User Feedbacks (New) */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              유저 건의사항 ({feedbacks.length})
            </h2>
            {feedbacks.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition"
              >
                엑셀(CSV) 추출
              </button>
            )}
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {feedbacks.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {feedbacks.sort((a, b) => b.key.localeCompare(a.key)).map((f: any) => (
                  <li key={f.key} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${f.data.type === 'bug' ? 'bg-red-100 text-red-600' :
                          f.data.type === 'suggestion' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                          {f.data.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(f.data.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteFeedback(f.key)}
                        className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-3">
                      {f.data.message}
                    </p>
                    <div className="text-[10px] text-gray-400 font-medium">
                      Contact: {f.data.contact}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-20 text-center text-gray-400 font-medium">
                아직 유저 피드백이 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-10">
          {/* Missing Queries */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                결핍 키워드
              </h2>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[300px] overflow-y-auto">
              {metrics?.missing_queries?.map((mq: any, idx: number) => (
                <li key={idx} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-900 dark:text-white">"{mq.user_query}"</span>
                    <span className="text-[10px] text-gray-400">{new Date(mq.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 w-fit px-2 py-0.5 rounded">
                    Intent: {mq.gpt_intent}
                  </div>
                </li>
              ))}
              {(!metrics?.missing_queries || metrics.missing_queries.length === 0) && (
                <li className="p-10 text-center text-gray-400">키워드가 없습니다. ✨</li>
              )}
            </ul>
          </div>

          {/* Top Intents */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
                <Search className="w-5 h-5 text-blue-500" />
                인기 분야 (최근 7일)
              </h2>
            </div>
            <div className="p-2">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {metrics?.top_intents?.map((intent: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                      <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">{intent.gpt_intent}</td>
                      <td className="px-4 py-3 text-right font-black text-blue-600">{intent.count}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
