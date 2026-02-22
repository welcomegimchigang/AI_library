import React, { useEffect, useState, useMemo } from "react";
import { Search, ExternalLink, ThumbsUp, Moon, Sun, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUserSession } from "@/lib/auth";
import { ReviewModal } from "@/components/reviews/review-modal";

interface Tool {
    id: number;
    name: string;
    description: string;
    category: string;
    url: string;
    isFree: boolean;
    thumbnail: string;
}

const ITEMS_PER_PAGE = 30;

const LOGO_COLORS = [
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-cyan-500 to-blue-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-violet-500 to-purple-600",
];

function getLogoColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}

function LogoFallback({ name }: { name: string }) {
    return (
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getLogoColor(name)} rounded-lg`}>
            <span className="text-white text-3xl font-black drop-shadow-md">{name.charAt(0).toUpperCase()}</span>
        </div>
    );
}

function ToolLogo({ url, name }: { url: string; name: string }) {
    const [level, setLevel] = useState(0); // 0=google, 1=clearbit, 2=fallback
    let hostname = "";
    try { hostname = new URL(url).hostname; } catch { }

    if (!hostname || level >= 2) return <LogoFallback name={name} />;

    const srcs = [
        `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
        `https://logo.clearbit.com/${hostname}`,
    ];

    return (
        <img
            src={srcs[level]}
            alt={name}
            loading="lazy"
            className="max-w-full max-h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-500"
            onError={() => setLevel(prev => prev + 1)}
        />
    );
}

export function ToolLibrary() {
    const [tools, setTools] = useState<Tool[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("전체");
    const [upvotes, setUpvotes] = useState<Record<number, number>>({});
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [user, setUser] = useState<any>(null);
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, activeCategory]);

    useEffect(() => {
        const session = getUserSession();
        setUser(session);

        fetch("/data/tools.jsonl")
            .then((res) => res.text())
            .then((text) => {
                const lines = text.split("\n").filter((line: string) => line.trim() !== "");
                const parsedTools: Tool[] = lines.map((line: string) => {
                    try { return JSON.parse(line); } catch { return null; }
                }).filter(Boolean);
                setTools(parsedTools);
            })
            .catch((err) => console.error("Error loading tools jsonl:", err));

        const savedUpvotes = localStorage.getItem("ai_library_upvotes");
        if (savedUpvotes) setUpvotes(JSON.parse(savedUpvotes));

        const isDark = localStorage.getItem("theme") === "dark" || document.documentElement.classList.contains("dark");
        setIsDarkMode(isDark);
    }, []);

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const handleUpvote = (id: number) => {
        const session = getUserSession();
        if (!session) {
            alert("로그인이 필요한 기능입니다. 우측 상단의 구글 로그인을 진행해주세요.");
            return;
        }
        const today = new Date().toLocaleDateString();
        const historyKey = `upvote_${session.sub || session.email}_${id}`;
        if (localStorage.getItem(historyKey) === today) {
            alert("해당 AI 툴은 하루에 한 번만 추천할 수 있습니다. 내일 다시 시도해주세요!");
            return;
        }
        const newUpvotes = { ...upvotes, [id]: (upvotes[id] || 0) + 1 };
        setUpvotes(newUpvotes);
        localStorage.setItem("ai_library_upvotes", JSON.stringify(newUpvotes));
        localStorage.setItem(historyKey, today);
    };

    const categories = ["전체", "이미지/아트", "텍스트/문서", "개발/코드", "비디오/오디오", "기타"];

    const filteredTools = useMemo(() => {
        return tools.filter((tool) => {
            const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === "전체" || tool.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [tools, searchQuery, activeCategory]);

    const totalPages = Math.ceil(filteredTools.length / ITEMS_PER_PAGE);
    const paginatedTools = filteredTools.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const trendingTools = useMemo(() => {
        return [...tools].sort((a, b) => (upvotes[b.id] || 0) - (upvotes[a.id] || 0)).slice(0, 5);
    }, [tools, upvotes]);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push("...");
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    const scrollToLibrary = () => {
        document.getElementById("library")?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="w-full max-w-6xl mx-auto py-12 px-4 transition-colors duration-300">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">AI 툴 탐색기</h2>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">총 {filteredTools.length}개</span>
                    <Button variant="outline" onClick={toggleDarkMode} className="rounded-full w-10 h-10 p-0 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </Button>
                </div>
            </div>

            {/* Trending Top 5 */}
            {trendingTools.length > 0 && (
                <div className="mb-12">
                    <h3 className="text-xl font-bold mb-4 flex items-center text-slate-800 dark:text-slate-100">
                        <span className="text-2xl mr-2">🔥</span> 이번 주 핫한 AI 툴 TOP 5
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                        {trendingTools.map((tool, idx) => (
                            <div key={tool.id} className="min-w-[280px] sm:min-w-[320px] bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl flex-shrink-0 snap-center hover:shadow-lg transition-all cursor-pointer">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-950 p-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                            <ToolLogo url={tool.url} name={tool.name} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{tool.name}</h4>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{tool.category}</span>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-indigo-500/20 italic">#{idx + 1}</div>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-2">{tool.description}</p>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">추천 {upvotes[tool.id] || 0}</div>
                                    <a href={tool.url} target="_blank" rel="noreferrer">
                                        <Button size="sm" variant="ghost" className="h-8 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">방문하기 →</Button>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <Input
                        placeholder="원하는 AI 툴을 검색해 보세요 (예: 미드저니, 챗봇...)"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 rounded-full bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            variant={activeCategory === cat ? "default" : "outline"}
                            onClick={() => setActiveCategory(cat)}
                            className={`rounded-full ${activeCategory === cat ? 'bg-blue-600 text-white' : 'text-slate-700 border-slate-300 dark:text-slate-200 dark:border-slate-600'}`}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {filteredTools.length === 0 ? (
                <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                    <p className="text-lg">해당하는 툴이 없습니다.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedTools.map((tool) => (
                            <div
                                key={tool.id}
                                className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <Link to={`/tool/${tool.id}`} className="h-48 flex items-center justify-center bg-slate-100 dark:bg-slate-900 relative p-8 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors duration-300 cursor-pointer">
                                    <ToolLogo url={tool.url} name={tool.name} />
                                    <div className="absolute top-3 left-3 flex gap-2 z-10">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm backdrop-blur-md ${tool.isFree ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
                                            {tool.isFree ? '무료' : '유료'}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium text-slate-700 bg-white/90 shadow-sm backdrop-blur-md dark:text-slate-800">
                                            {tool.category}
                                        </span>
                                    </div>
                                </Link>
                                <div className="p-5 flex flex-col flex-1">
                                    <Link to={`/tool/${tool.id}`} className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 hover:text-blue-600 transition-colors">{tool.name}</Link>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 flex-1">
                                        {tool.description}
                                    </p>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <Button variant="ghost" size="sm" onClick={() => handleUpvote(tool.id)} className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">
                                            <ThumbsUp size={16} className="mr-2" />
                                            추천 {upvotes[tool.id] || 0}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            if (!getUserSession()) { alert("로그인이 필요한 기능입니다. 우측 상단에서 로그인해주세요."); return; }
                                            setSelectedTool(tool);
                                        }} className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">
                                            <MessageSquare size={16} className="mr-2" />
                                            리뷰
                                        </Button>
                                        <a href={tool.url} target="_blank" rel="noreferrer">
                                            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500">
                                                방문하기
                                                <ExternalLink size={14} className="ml-2" />
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-10">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => { setCurrentPage(p => p - 1); scrollToLibrary(); }}
                                className="rounded-full border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            {getPageNumbers().map((page, i) =>
                                typeof page === "string" ? (
                                    <span key={`dots-${i}`} className="px-2 text-slate-400 dark:text-slate-500">...</span>
                                ) : (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => { setCurrentPage(page); scrollToLibrary(); }}
                                        className={`rounded-full min-w-[36px] ${currentPage === page ? 'bg-blue-600 text-white' : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'}`}
                                    >
                                        {page}
                                    </Button>
                                )
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => { setCurrentPage(p => p + 1); scrollToLibrary(); }}
                                className="rounded-full border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Review Modal */}
            <ReviewModal
                isOpen={selectedTool !== null}
                onClose={() => setSelectedTool(null)}
                toolId={selectedTool?.id || 0}
                toolName={selectedTool?.name || ""}
            />
        </div>
    );
}
