import React, { useEffect, useState, useMemo, useRef } from "react";
import { Search, ExternalLink, ThumbsUp, Moon, Sun, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUserSession } from "@/lib/auth";
import { ReviewModal } from "@/components/reviews/review-modal";

interface OriginalTool {
    damoa_id: number;
    serviceName: string;
    website: string;
    serviceType: string;
    keyFeatures_list: string[];
    price_bucket: string;
    supportedPlatforms: string;
    thumbnail: string;
}

interface Tool {
    id: number;
    name: string;
    description: string;
    category: string;
    url: string;
    isFree: boolean;
    thumbnail: string;
}

const CATEGORY_MAP: Record<string, string> = {
    "비디오/오디오": "비디오/오디오",
    "글쓰기/컨텐츠": "텍스트/문서",
    "디자인/아트": "이미지/아트",
    "개발/프로그래밍": "개발/코드",
};

export function ToolLibrary() {
    const [tools, setTools] = useState<Tool[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("전체");
    const [upvotes, setUpvotes] = useState<Record<number, number>>({});
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [user, setUser] = useState<any>(null);
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

    const [displayCount, setDisplayCount] = useState(30);
    const observerTarget = useRef<HTMLDivElement>(null);

    // 검색이나 카테고리가 바뀌면 무한 스크롤 렌더링 개수를 초기화 (Phase 9)
    useEffect(() => {
        setDisplayCount(30);
    }, [searchQuery, activeCategory]);

    // 무한 스크롤 옵저버 설정 (Phase 9)
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setDisplayCount(prev => prev + 30);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, []);

    useEffect(() => {
        // 유저 세션 주기적 체크 (헤더 연동용)
        const session = getUserSession();
        setUser(session);

        // Phase 9: Fetch JSONL data dynamically
        fetch("/data/tools.jsonl")
            .then((res) => res.text())
            .then((text) => {
                const lines = text.split("\n").filter((line: string) => line.trim() !== "");
                const parsedTools: Tool[] = lines.map((line: string) => {
                    try {
                        return JSON.parse(line);
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);

                setTools(parsedTools);
            })
            .catch((err) => console.error("Error loading tools jsonl:", err));

        // Load upvotes from localStorage
        const savedUpvotes = localStorage.getItem("ai_library_upvotes");
        if (savedUpvotes) {
            setUpvotes(JSON.parse(savedUpvotes));
        }

        // Check dark mode
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
        // 로그인 체크 (Phase 7)
        const session = getUserSession();
        if (!session) {
            alert("로그인이 필요한 기능입니다. 우측 상단의 구글 로그인을 진행해주세요.");
            return;
        }

        // 하루 제한 로직 (Phase 8)
        const today = new Date().toLocaleDateString();
        const historyKey = `upvote_${session.sub || session.email}_${id}`;
        const lastUpvoteDate = localStorage.getItem(historyKey);

        if (lastUpvoteDate === today) {
            alert("해당 AI 툴은 하루에 한 번만 추천할 수 있습니다. 내일 다시 시도해주세요!");
            return;
        }

        // 업데이트 처리
        const newUpvotes = { ...upvotes, [id]: (upvotes[id] || 0) + 1 };
        setUpvotes(newUpvotes);
        localStorage.setItem("ai_library_upvotes", JSON.stringify(newUpvotes));
        localStorage.setItem(historyKey, today);
    };

    const categories = ["전체", "이미지/아트", "텍스트/문서", "개발/코드", "비디오/오디오", "기타"];

    function inferCategory(type: string = ""): string {
        const t = type.toLowerCase();
        if (t.includes("이미지") || t.includes("디자인") || t.includes("아트")) return "이미지/아트";
        if (t.includes("글") || t.includes("텍스트") || t.includes("문서") || t.includes("요약")) return "텍스트/문서";
        if (t.includes("코드") || t.includes("개발") || t.includes("프로그래밍")) return "개발/코드";
        if (t.includes("영상") || t.includes("비디오") || t.includes("음악") || t.includes("오디오")) return "비디오/오디오";
        return "기타";
    }

    // Phase 2: Search & Filter Logic
    const filteredTools = useMemo(() => {
        return tools.filter((tool) => {
            const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === "전체" || tool.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [tools, searchQuery, activeCategory]);

    // Phase 11: Trending Carousel Logic
    const trendingTools = useMemo(() => {
        // Sort by upvotes, if no upvotes, fall back to some random stable sort or top items
        return [...tools].sort((a, b) => {
            const upvotesA = upvotes[a.id] || 0;
            const upvotesB = upvotes[b.id] || 0;
            return upvotesB - upvotesA;
        }).slice(0, 5);
    }, [tools, upvotes]);

    return (
        <div className="w-full max-w-6xl mx-auto py-12 px-4 transition-colors duration-300">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold dark:text-white">AI 툴 탐색기</h2>
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={toggleDarkMode} className="rounded-full w-10 h-10 p-0 border-slate-200 dark:border-slate-700 dark:text-white">
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </Button>
                </div>
            </div>

            {/* Phase 11: Trending Top 5 AI Tools */}
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
                                        <div className="w-12 h-12 bg-white dark:bg-slate-950 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                                            <img
                                                src={`https://logo.clearbit.com/${new URL(tool.url).hostname}`}
                                                alt={tool.name}
                                                className="w-full h-full object-contain"
                                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = tool.name.charAt(0) }}
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                {tool.name}
                                            </h4>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{tool.category}</span>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-indigo-500/20 italic">#{idx + 1}</div>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-2">{tool.description}</p>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">추천 {upvotes[tool.id] || 0}</div>
                                    <a href={tool.url} target="_blank" rel="noreferrer">
                                        <Button size="sm" variant="ghost" className="h-8 hover:bg-slate-100 dark:hover:bg-slate-700">방문하기 →</Button>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search Bar & Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <Input
                        placeholder="원하는 AI 툴을 검색해 보세요 (예: 미드저니, 챗봇...)"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 rounded-full dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            variant={activeCategory === cat ? "default" : "outline"}
                            onClick={() => setActiveCategory(cat)}
                            className={`rounded-full ${activeCategory === cat ? 'bg-blue-600' : 'dark:text-slate-300 dark:border-slate-700'}`}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid rendering Phase 3 UI */}
            {filteredTools.length === 0 ? (
                <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                    <p className="text-lg">해당하는 툴이 없습니다.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTools.slice(0, displayCount).map((tool) => ( // Render based on infinite scroll state
                            <div
                                key={tool.id}
                                className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="h-48 flex items-center justify-center bg-slate-100 dark:bg-slate-900 relative p-8 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors duration-300">
                                    <img
                                        src={`https://logo.clearbit.com/${new URL(tool.url).hostname}`}
                                        alt={tool.name}
                                        loading="lazy" // Phase 5 Optimization
                                        className="max-w-full max-h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-500"
                                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = 'https://www.damoa.ai/default-0.png' }}
                                    />
                                    <div className="absolute top-3 left-3 flex gap-2 z-10">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm backdrop-blur-md ${tool.isFree ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
                                            {tool.isFree ? '무료' : '유료'}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium text-slate-700 bg-white/90 shadow-sm backdrop-blur-md">
                                            {tool.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{tool.name}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 flex-1">
                                        {tool.description}
                                    </p>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUpvote(tool.id)}
                                            className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                        >
                                            <ThumbsUp size={16} className="mr-2" />
                                            추천 {upvotes[tool.id] || 0}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (!getUserSession()) {
                                                    alert("로그인이 필요한 기능입니다. 우측 상단에서 로그인해주세요.");
                                                    return;
                                                }
                                                setSelectedTool(tool);
                                            }}
                                            className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                        >
                                            <MessageSquare size={16} className="mr-2" />
                                            리뷰
                                        </Button>
                                        <a href={tool.url} target="_blank" rel="noreferrer">
                                            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600">
                                                방문하기
                                                <ExternalLink size={14} className="ml-2" />
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Infinite Scroll target (Phase 9) */}
                    {displayCount < filteredTools.length && (
                        <div ref={observerTarget} className="h-20 mt-8 flex items-center justify-center">
                            <div className="animate-pulse text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
                                더 불러오는 중...
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Review Modal (Phase 7 & 8) */}
            <ReviewModal
                isOpen={selectedTool !== null}
                onClose={() => setSelectedTool(null)}
                toolId={selectedTool?.id || 0}
                toolName={selectedTool?.name || ""}
            />
        </div>
    );
}
