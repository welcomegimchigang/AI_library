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
import { useTranslation } from "react-i18next";
import { useTools, Tool } from "@/contexts/tool-context";

export function ToolDetailPage() {
  const { t, i18n } = useTranslation();
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
        .catch(() => { });

      // D1에서 북마크 상태 로드
      const session = getUserSession();
      if (session) {
        const email = session.email || session.sub || "";
        fetch(`/api/db/bookmarks?user_email=${encodeURIComponent(email)}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setIsBookmarked(d.bookmarks.includes(found.id));
          })
          .catch(() => { });
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
  } catch { }

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
          <p className="text-lg text-slate-500">{t("library.noTool")}</p>
          <Link
            to="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            {t("library.goHome")}
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
          <ArrowLeft size={16} /> {t("library.backToList")}
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
                <h1 className="text-2xl font-bold">
                  {i18n.language === 'en' && tool.name_en ? tool.name_en : tool.name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${tool.isFree ? "bg-emerald-500" : "bg-rose-500"}`}
                >
                  {tool.isFree ? t("library.free") : t("library.paid")}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                  {tool.category}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{hostname}</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            <h2 className="text-lg font-bold mb-2">{t("library.intro")}</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {i18n.language === 'en' && tool.description_en ? tool.description_en : tool.description}
            </p>

            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">{t("library.compareCategory")}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{tool.category}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">{t("library.comparePricing")}</p>
                <p className={`text-sm font-bold ${tool.isFree ? "text-emerald-600" : "text-rose-600"}`}>{tool.isFree ? t("library.free") : t("library.paid")}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">{t("library.platform")}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("library.webBased")}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">{t("library.website")}</p>
                <a href={tool.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline truncate block">{hostname}</a>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="mt-8">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2 dark:text-white">
                <Star size={18} className="text-amber-500" /> {t("library.features")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {tool.description.split(/[.,!。]/).filter(s => s.trim().length > 5).slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 bg-blue-50/50 rounded-lg p-3">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{feature.trim()}</span>
                  </div>
                ))}
              </div>
            </div>

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
                className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              >
                <ThumbsUp size={16} className="mr-2" /> {t("library.upvote")} {upvotes}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={toggleBookmark}
                className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              >
                {isBookmarked ? (
                  <BookmarkCheck size={16} className="mr-2 text-blue-600" />
                ) : (
                  <Bookmark size={16} className="mr-2" />
                )}
                {isBookmarked ? t("library.bookmarked") : t("library.bookmark")}
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
                className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              >
                <MessageSquare size={16} className="mr-2" /> {t("library.reviews")}
              </Button>
            </div>
          </div>
        </div>

        {/* Related / Alternative Tools */}
        {relatedTools.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
              🔄 {t("library.alternatives")}
              <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{relatedTools.length}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedTools.map((rt) => {
                let rh = "";
                try {
                  rh = new URL(rt.url).hostname;
                } catch { }
                return (
                  <Link
                    key={rt.id}
                    to={`/tool/${rt.id}`}
                    className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-3"
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
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {i18n.language === 'en' && rt.name_en ? rt.name_en : rt.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {i18n.language === 'en' && rt.description_en ? rt.description_en : rt.description}
                      </p>
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${rt.isFree ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {rt.isFree ? "무료" : "유료"}
                      </span>
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
