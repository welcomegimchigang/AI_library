import { useEffect, useState, useMemo } from "react";
import { LineChart, Search, AlertCircle, Database, MessageSquare, Trash2, RefreshCw, ExternalLink, Moon, Sun, Sparkles } from "lucide-react";
import { useTools } from "@/contexts/tool-context";

export function AdminPage() {
  const [secret, setSecret] = useState(
    localStorage.getItem("admin_secret") || "",
  );
  const [metrics, setMetrics] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { tools } = useTools();

  // --- Dynamic Filters State ---
  // 1. Persona Dimension Toggles
  const [activeDimensions, setActiveDimensions] = useState({
    gender: true,
    age: false,
    job: false
  });

  // 1.5. Persona Matcher Filters
  const [filterGender, setFilterGender] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [filterJob, setFilterJob] = useState("");

  // 2. Top Clicks Category Filter
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [rankingMode, setRankingMode] = useState<"global" | "local">("global");

  const displayedCategories = useMemo(() => {
    let source = rankingMode === "global" ? tools : (metrics?.top_clicks || []);
    return Array.from(new Set(source.map((item: any) => item.category || "기타")));
  }, [rankingMode, tools, metrics]);

  const rankingDataList = useMemo(() => {
    let data = [];
    if (rankingMode === "global") {
      data = tools.map((t: any) => ({ name: t.name, url: t.url, category: t.category, count: t.monthly_visits || 0 })).sort((a: any, b: any) => b.count - a.count).slice(0, 50);
    } else {
      data = (metrics?.top_clicks || []).map((t: any) => ({ name: t.tool_name, url: t.tool_url, category: t.category, count: t.click_count }));
    }
    if (selectedCategory !== "전체") {
      data = data.filter((item: any) => (item.category || "기타") === selectedCategory);
    }
    return data;
  }, [rankingMode, tools, metrics, selectedCategory]);

  // --- Theme State (Admin) ---
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("theme") || "light";
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  const fetchAllData = async (currentSecret: string, gender = filterGender, age = filterAge, job = filterJob) => {
    if (!currentSecret) return;
    setLoading(true);
    setError("");
    try {
      let metricsUrl = `/api/admin/metrics?secret=${currentSecret}`;
      if (gender) metricsUrl += `&gender=${encodeURIComponent(gender)}`;
      if (age) metricsUrl += `&age_group=${encodeURIComponent(age)}`;
      if (job) metricsUrl += `&job=${encodeURIComponent(job)}`;

      // 1. Fetch Metrics (D1)
      const resMetrics = await fetch(metricsUrl);
      if (!resMetrics.ok) {
        const errorData = await resMetrics.json().catch(() => ({}));
        throw new Error(
          errorData.error || (resMetrics.status === 401 ? "비밀번호가 틀렸습니다." : "데이터 로드 실패")
        );
      }
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
      fetchAllData(secret, filterGender, filterAge, filterJob);
    }
  }, [filterGender, filterAge, filterJob]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAllData(secret);
  };

  const handleExportAudienceData = () => {
    // API 엔드포인트 직접 호출하여 다운로드 유도
    const exportUrl = `/api/admin/metrics?secret=${secret}&action=export_csv`;
    window.location.href = exportUrl;
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
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 dark:hover:text-amber-400 rounded-md transition-all shadow-sm"
              title={theme === "light" ? "개발자 모드(다크) 켜기" : "라이트 모드 켜기"}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => fetchAllData(secret)}
              className="flex items-center gap-2 text-xs font-bold px-4 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "데이터 갱신 중" : "새로고침"}
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

        {/* --- Monetization (BM 2) Dashboard Section --- */}
        <div className="mb-10 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 shadow-2xl border border-indigo-500/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <LineChart className="w-48 h-48 text-white rotate-12" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3" />
                Premium Revenue Asset
              </div>
              <h2 className="text-2xl font-black text-white mb-2">실시간 오디언스 트렌드 리포트 (B2B 판매용)</h2>
              <p className="text-indigo-200/70 text-sm leading-relaxed">
                사용자의 <b>성별, 연령, 직업</b>과 그들이 실제로 <b>어떤 AI 도구를 클릭했는지</b>를 결합한 고부가 가치 데이터입니다. 이 원본 데이터를 마케팅 리서치 기업이나 기업 고객에게 리포트 형태로 판매할 수 있습니다.
              </p>
            </div>
            <button
              onClick={handleExportAudienceData}
              className="whitespace-nowrap px-8 py-4 bg-white hover:bg-indigo-50 text-indigo-900 font-black rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-3 group"
            >
              <Database className="w-5 h-5 group-hover:scale-110 transition-transform" />
              데이터 원본 추출 (CSV)
            </button>
          </div>
        </div>

        {/* Persona Demand Analysis (Dynamic Filters) */}
        <div className="mb-10">
          <div className="flex flex-col mb-6 gap-4">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold">인구통계별 수요 분석 (다이내믹 페르소나)</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm">
              <span className="text-sm font-bold text-slate-500">분석 차원 선택:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'gender', label: '성별' },
                  { id: 'age', label: '연령' },
                  { id: 'job', label: '직업' }
                ].map(dim => (
                  <button
                    key={dim.id}
                    onClick={() => {
                      const newDims = { ...activeDimensions, [dim.id]: !(activeDimensions as any)[dim.id] };
                      // 최소 1개는 켜져있어야 함
                      if (!Object.values(newDims).some(Boolean)) return;
                      setActiveDimensions(newDims);
                    }}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors border ${(activeDimensions as any)[dim.id]
                      ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    {dim.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-400">
                {['단일 (3C1)', '교차 (3C2)', '심층 (3C3)'][Object.values(activeDimensions).filter(Boolean).length - 1]} 모드
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">선택된 타겟 그룹 수요</h3>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {(() => {
                let currentData = [];
                let labelMaker: (item: any) => string = () => "";

                const { gender, age, job } = activeDimensions;

                // 3C3
                if (gender && age && job) {
                  currentData = metrics?.cross_metrics?.age_gender_job || [];
                  labelMaker = (item: any) => `${item.age_range} • ${item.user_gender} • ${item.user_job}`;
                }
                // 3C2
                else if (gender && age) {
                  currentData = metrics?.cross_metrics?.age_gender || [];
                  labelMaker = (item: any) => `${item.age_range} • ${item.user_gender}`;
                } else if (gender && job) {
                  currentData = metrics?.cross_metrics?.job_gender || [];
                  labelMaker = (item: any) => `${item.user_job} • ${item.user_gender}`;
                } else if (age && job) {
                  currentData = metrics?.cross_metrics?.age_job || [];
                  labelMaker = (item: any) => `${item.age_range} • ${item.user_job}`;
                }
                // 3C1
                else if (gender) {
                  currentData = metrics?.persona_metrics?.gender || [];
                  labelMaker = (item: any) => `${item.user_gender}`;
                } else if (age) {
                  currentData = metrics?.persona_metrics?.age || [];
                  labelMaker = (item: any) => `${item.age_range}`;
                } else if (job) {
                  currentData = metrics?.persona_metrics?.job || [];
                  labelMaker = (item: any) => `${item.user_job}`;
                }

                if (!currentData || currentData.length === 0) {
                  return <div className="p-10 text-center text-sm text-slate-400">데이터가 존재하지 않거나 부족합니다.</div>;
                }

                return (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentData.map((item: any, i: number) => (
                      <div key={i} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">{labelMaker(item)}</span>
                          <span className="text-base font-black text-slate-800 dark:text-slate-200">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
                            {item.count}회 검색
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Top Clicked/Visited Tools (Enhanced) */}
          <div id="ranking-table" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm flex flex-col md:col-span-2 xl:col-span-1">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-md font-bold text-blue-900 dark:text-blue-100 flex items-center gap-3">
                    🔗 AI 툴 종합 방문 순위 (TOP 20)
                  </h2>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400 mt-1 font-medium">카테고리별 사이트 수요 및 플랫폼 자체 클릭 분석</p>
                </div>

                <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setRankingMode("global")}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${rankingMode === "global" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    웹사이트 전체 방문자
                  </button>
                  <button
                    onClick={() => setRankingMode("local")}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${rankingMode === "local" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    플랫폼 내 클릭
                  </button>
                </div>
              </div>

              {/* Persona Dynamic Filters */}
              {rankingMode === "local" && (
                <div className="mt-4 flex flex-wrap gap-2 items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 ml-1 mr-2">🎯 페르소나 클릭 매칭:</span>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                  >
                    <option value="">성별 전체</option>
                    <option value="남성">남성</option>
                    <option value="여성">여성</option>
                  </select>
                  <select
                    value={filterAge}
                    onChange={(e) => setFilterAge(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                  >
                    <option value="">연령 전체</option>
                    <option value="10대 이하">10대 이하</option>
                    <option value="20대">20대</option>
                    <option value="30대">30대</option>
                    <option value="40대">40대</option>
                    <option value="50대 이상">50대 이상</option>
                  </select>
                  <select
                    value={filterJob}
                    onChange={(e) => setFilterJob(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                  >
                    <option value="">직업 전체</option>
                    <option value="학생/취준생">학생/취준생</option>
                    <option value="개발자">개발자</option>
                    <option value="사업가/창업가">사업가/창업가</option>
                    <option value="마케터/콘텐츠">마케터/콘텐츠</option>
                    <option value="일반 회사원">일반 회사원</option>
                  </select>
                </div>
              )}

              {/* Category Filter Chips */}
              {displayedCategories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("전체")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all border ${selectedCategory === "전체"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                  >
                    전체보기
                  </button>
                  {displayedCategories.map((cat: any) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all border ${selectedCategory === cat
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {rankingDataList.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-8">#</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">툴 이름</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">카테고리</th>
                      <th className="text-right px-4 py-3 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        {rankingMode === "global" ? "월 방문자수" : "클릭 수"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rankingDataList
                      .map((item: any, i: number) => {
                        return (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-400">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[120px] sm:max-w-[200px] block" title={item.name}>{item.name}</span>
                                <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 transition flex-shrink-0">
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
                                {rankingMode === "global"
                                  ? (item.count >= 1000000 ? (item.count / 1000000).toFixed(1) + 'M' : item.count >= 1000 ? (item.count / 1000).toFixed(1) + 'K' : item.count)
                                  : item.count}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-10">
                  <p className="text-sm font-bold">아직 조회할 데이터가 없습니다.</p>
                  <p className="text-[10px]">클릭 또는 수집된 방문 지표가 모자랍니다.</p>
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
                      <tr
                        key={idx}
                        onClick={() => {
                          setSelectedCategory(intent.category);
                          document.getElementById("ranking-table")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
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
