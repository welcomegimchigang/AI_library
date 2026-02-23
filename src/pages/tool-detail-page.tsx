import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  ThumbsUp,
  Star,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { getUserSession } from "@/lib/auth";
import { ReviewModal } from "@/components/reviews/review-modal";
import { useTools, Tool } from "@/contexts/tool-context";

export function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tools, loading: toolsLoading } = useTools();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [upvotes, setUpvotes] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [relatedTools, setRelatedTools] = useState<Tool[]>([]);

  useEffect(() => {
    if (toolsLoading) return;

    const found = tools.find((t) => String(t.id) === id);
    setTool(found || null);

    if (found) {
      const related = tools
        .filter((t) => t.category === found.category && t.id !== found.id)
        .slice(0, 6);
      setRelatedTools(related);

      // D1에서 추천 수 로드
      fetch(`/api/db/upvotes?tool_id=${found.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setUpvotes(d.count || 0);
        })
        .catch(() => {});

      // D1에서 북마크 상태 로드
      const session = getUserSession();
      if (session) {
        const email = session.email || session.sub || "";
        fetch(`/api/db/bookmarks?user_email=${encodeURIComponent(email)}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setIsBookmarked(d.bookmarks.includes(found.id));
          })
          .catch(() => {});
      }
    }
    setLoading(false);
  }, [id, tools, toolsLoading]);

  const handleUpvote = async () => {
    if (!tool) return;
    const session = getUserSession();
    if (!session) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const res = await fetch("/api/db/upvotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_id: tool.id,
          user_email: session.email || session.sub || "",
        }),
      });
      const data = await res.json();
      if (data.already) {
        alert("하루에 한 번만 추천할 수 있습니다.");
        return;
      }
      if (data.success) setUpvotes(data.count);
    } catch {
      setUpvotes((prev) => prev + 1);
    }
  };

  const toggleBookmark = async () => {
    if (!tool) return;
    const session = getUserSession();
    if (!session) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const res = await fetch("/api/db/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_id: tool.id,
          user_email: session.email || session.sub || "",
        }),
      });
      const data = await res.json();
      if (data.success) setIsBookmarked(data.bookmarked);
    } catch {
      setIsBookmarked((prev) => !prev);
    }
  };

  let hostname = "";
  try {
    if (tool) hostname = new URL(tool.url).hostname;
  } catch {}

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="text-center py-20">
          <p className="text-lg text-slate-500">도구를 찾을 수 없습니다.</p>
          <Link
            to="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#dbeafe_0%,#e9d5ff_40%,#fce7f3_75%,#f8fafc_100%)] text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
        <Link
          to="/#library"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft size={16} /> 도구 목록으로
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 p-8 flex items-center gap-6 border-b border-slate-100">
            <div className="w-20 h-20 rounded-2xl border border-slate-200 bg-white p-2 flex items-center justify-center overflow-hidden shadow-sm">
              {hostname ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`}
                  alt={tool.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-3xl font-black text-slate-300">
                  {tool.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{tool.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${tool.isFree ? "bg-emerald-500" : "bg-rose-500"}`}
                >
                  {tool.isFree ? "무료" : "유료"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-600 bg-slate-100">
                  {tool.category}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{hostname}</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            <h2 className="text-lg font-bold mb-2">소개</h2>
            <p className="text-slate-600 leading-relaxed">{tool.description}</p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-8">
              <a href={tool.url} target="_blank" rel="noreferrer">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  공식 사이트 방문 <ExternalLink size={16} className="ml-2" />
                </Button>
              </a>
              <Button
                size="lg"
                variant="outline"
                onClick={handleUpvote}
                className="text-slate-700 border-slate-300"
              >
                <ThumbsUp size={16} className="mr-2" /> 추천 {upvotes}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={toggleBookmark}
                className="text-slate-700 border-slate-300"
              >
                {isBookmarked ? (
                  <BookmarkCheck size={16} className="mr-2 text-blue-600" />
                ) : (
                  <Bookmark size={16} className="mr-2" />
                )}
                {isBookmarked ? "저장됨" : "북마크"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  if (!getUserSession()) {
                    alert("로그인이 필요합니다.");
                    return;
                  }
                  setShowReview(true);
                }}
                className="text-slate-700 border-slate-300"
              >
                <MessageSquare size={16} className="mr-2" /> 리뷰
              </Button>
            </div>
          </div>
        </div>

        {/* Related Tools */}
        {relatedTools.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">비슷한 도구</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedTools.map((rt) => {
                let rh = "";
                try {
                  rh = new URL(rt.url).hostname;
                } catch {}
                return (
                  <Link
                    key={rt.id}
                    to={`/tool/${rt.id}`}
                    className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {rh ? (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${rh}&sz=64`}
                          alt={rt.name}
                          className="w-7 h-7"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-400">
                          {rt.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {rt.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {rt.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <Footer />

      <ReviewModal
        isOpen={showReview}
        onClose={() => setShowReview(false)}
        toolId={tool.id}
        toolName={tool.name}
      />
    </div>
  );
}
