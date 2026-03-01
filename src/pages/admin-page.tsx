import { useEffect, useState } from "react";
import { LineChart, Search, AlertCircle, Database, MessageSquare, Trash2, RefreshCw, ExternalLink } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-xl">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg mb-6 mx-auto">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-center text-slate-900 dark:text-slate-100">
            LoominAI 관리자
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">액세스 권한이 필요합니다.</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="KV_API_SECRET 입력"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all shadow-md active:scale-[0.98]"
            >
              로그인
            </button>
            {error && <p className="text-red-500 text-xs mt-2 font-medium text-center">{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              LoominAI 관리 콘솔
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">실시간 서비스 지표 및 유저 피드백 통합 관리</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAllData(secret)}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "데이터 갱신 중" : "데이터 새로고침"}
            </button>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-2">전체 검색 쿼리</p>
            <p className="text-2xl font-black">{metrics?.stats?.total_queries?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-widest mb-2">검색 성공률</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics?.stats?.success_rate || "0%"}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] text-rose-600 dark:text-rose-500 font-black uppercase tracking-widest mb-2">미충족 수요 (결과 없음)</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {(metrics?.stats?.total_queries - metrics?.stats?.successful_queries) || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] text-blue-600 dark:text-blue-500 font-black uppercase tracking-widest mb-2">활성 피드백 건수</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{feedbacks.length}</p>
          </div>
        </div>

        {/* Persona Demand Analysis (Multi-dimensional) */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold">인구통계별 수요 분석 (다차원 페르소나)</h2>
            </div>
            {/* Dimension Selectors */}
            <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-lg">
              {['3C1 (단일)', '3C2 (교차)', '3C3 (심층)'].map((label, idx) => {
                const views = ['1d', '2d', '3d'];
                const viewKey = views[idx];
                return (
                  <button
                    key={viewKey}
                    onClick={() => {
                      // We will use a local state to toggle views or just default to 1d/2d/3d if requested.
                      // To avoid breaking existing hooks without adding more useState, 
                      // we'll implement a simple inline state technique or just render all for now to keep it simple,
                      // but let's assume we render them in a unified view below.
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${idx === 0 ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* 3C1: Gender */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">3C1: 성별</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[250px] overflow-y-auto hide-scrollbar">
                {metrics?.persona_metrics?.gender?.map((item: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold">{item.user_gender}</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.category}</span>
                    </div>
                    <span className="text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3C2: Age + Gender */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/20 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50">
                <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-tight">3C2: 연령 + 성별</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[250px] overflow-y-auto hide-scrollbar">
                {metrics?.cross_metrics?.age_gender?.map((item: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-blue-500/70 dark:text-blue-400/70 font-bold">
                        {item.age_range} • {item.user_gender}
                      </span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.category}</span>
                    </div>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3C3: Age + Gender + Job */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm md:col-span-2 xl:col-span-1">
              <div className="px-4 py-3 bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50">
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">3C3: 연령 + 성별 + 직업</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[250px] overflow-y-auto hide-scrollbar">
                {metrics?.cross_metrics?.age_gender_job?.map((item: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-indigo-500/70 dark:text-indigo-400/70 font-bold">
                        {item.age_range} • {item.user_gender} • {item.user_job}
                      </span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.category}</span>
                    </div>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">{item.count}</span>
                  </div>
                ))}
                {(!metrics?.cross_metrics?.age_gender_job || metrics.cross_metrics.age_gender_job.length === 0) && (
                  <div className="p-4 text-center text-xs text-slate-400">데이터가 충분하지 않습니다.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Top Clicked Tools (Enhanced) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm flex flex-col md:col-span-2 xl:col-span-1">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850">
              <h2 className="text-md font-bold text-blue-900 dark:text-blue-100 flex items-center gap-3">
                🔗 카테고리별 사이트 방문 순위 (TOP 20)
              </h2>
              <p className="text-[10px] text-blue-600/70 dark:text-blue-400 mt-1 font-medium">유저가 "공식 사이트 방문" 버튼을 실제로 클릭한 횟수 기준</p>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {metrics?.top_clicks && metrics.top_clicks.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-8">#</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">툴 이름</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">카테고리</th>
                      <th className="text-right px-4 py-3 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">클릭 수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {metrics.top_clicks.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-400">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[120px] sm:max-w-[200px] block" title={item.tool_name}>{item.tool_name}</span>
                            <a href={item.tool_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 transition flex-shrink-0">
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full inline-block truncate max-w-[100px]">
                            {item.category || "기타"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {item.click_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <p className="text-sm">아직 클릭 데이터가 없습니다.</p>
                  <p className="text-[10px]">툴 상세 페이지에서 "공식 사이트 방문" 클릭시 수집됩니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm flex flex-col h-[600px]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <h2 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                유저 피드백 파이프라인
              </h2>
              {feedbacks.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="text-[10px] font-black tracking-tight text-white bg-slate-900 dark:bg-blue-600 hover:opacity-90 px-3 py-1.5 rounded-md uppercase transition-all"
                >
                  CSV 추출
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {feedbacks.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {feedbacks.sort((a, b) => b.key.localeCompare(a.key)).map((f: any) => (
                    <div key={f.key} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${f.data.type === 'bug' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' :
                            f.data.type === 'suggestion' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                            }`}>
                            {f.data.type}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {new Date(f.data.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteFeedback(f.key)}
                          className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4 font-medium">
                        {f.data.message}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-500 border-t border-slate-50 dark:border-slate-800 pt-3">
                        <span className="font-bold">요청자:</span>
                        <span>{f.data.contact || "익명"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-20 text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
                  <p className="text-sm font-medium">아직 접수된 피드백이 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {/* Missing Queries Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <h2 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  미충족 검색 요구 (결과 없음)
                </h2>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3">검색 키워드</th>
                      <th className="px-6 py-3">의도</th>
                      <th className="px-6 py-3 text-right">날짜</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {metrics?.missing_queries?.map((mq: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-200 truncate max-w-[150px]">"{mq.user_query}"</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {mq.gpt_intent}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-[10px] text-slate-400">{new Date(mq.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {(!metrics?.missing_queries || metrics.missing_queries.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center text-slate-400">매칭 실패 쿼리가 없습니다. ✨</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Trending Intents -> Categories */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <h2 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                  <Search className="w-5 h-5 text-blue-500" />
                  실시간 인기 관심 분야 (최근 7일)
                </h2>
              </div>
              <div>
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {metrics?.top_intents?.map((intent: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-700 dark:text-slate-300">{intent.category}</td>
                        <td className="px-6 py-3.5 text-right font-black text-blue-600 dark:text-blue-400">{intent.count}회 검색</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
