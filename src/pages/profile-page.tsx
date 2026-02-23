import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  MessageSquare,
  ExternalLink,
  LogOut,
  Star,
} from "lucide-react";
import { getUserSession, logout } from "@/lib/auth";
import { useTools, Tool } from "@/contexts/tool-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"bookmarks" | "reviews">(
    "bookmarks",
  );
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { tools } = useTools();
  const navigate = useNavigate();

  useEffect(() => {
    const session = getUserSession();
    if (!session) {
      alert("로그인이 필요한 페이지입니다.");
      navigate("/");
      return;
    }
    setUser(session);
    fetchUserData(session.email || session.sub);
  }, [navigate]);

  const fetchUserData = async (email: string) => {
    setLoading(true);
    try {
      // 1. Fetch Bookmarks
      const bmRes = await fetch(
        `/api/db/bookmarks?user_email=${encodeURIComponent(email)}`,
      );
      if (bmRes.ok) {
        const bmData = await bmRes.json();
        if (bmData.success) setBookmarkedIds(bmData.bookmarks);
      }

      // 2. Fetch Reviews
      const revRes = await fetch(
        `/api/db/reviews?user_email=${encodeURIComponent(email)}`,
      );
      if (revRes.ok) {
        const revData = await revRes.json();
        if (revData.success) setReviews(revData.reviews);
      }
    } catch (e) {
      console.error("Failed to fetch user data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) return null;

  const myTools = bookmarkedIds
    .map((id) => tools.find((t) => t.id === id))
    .filter(Boolean) as Tool[];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/30 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            <ArrowLeft size={16} />
            홈으로
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-500"
          >
            <LogOut size={16} className="mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        {/* Profile Card */}
        <div className="flex flex-col md:flex-row items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
          <img
            src={user.picture}
            alt={user.name}
            className="w-24 h-24 rounded-full border-4 border-slate-50 dark:border-slate-700 shadow-md"
            referrerPolicy="no-referrer"
          />
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {user.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {user.email}
            </p>
            <div className="flex gap-4 mt-4 justify-center md:justify-start">
              <div className="bg-blue-50 dark:bg-slate-700/50 px-4 py-2 rounded-xl text-sm">
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {bookmarkedIds.length}
                </span>{" "}
                북마크
              </div>
              <div className="bg-purple-50 dark:bg-slate-700/50 px-4 py-2 rounded-xl text-sm">
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {reviews.length}
                </span>{" "}
                작성 리뷰
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-px">
          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors border-b-2 ${activeTab === "bookmarks" ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-700"}`}
          >
            <Bookmark size={18} />내 북마크
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors border-b-2 ${activeTab === "reviews" ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-700"}`}
          >
            <MessageSquare size={18} />
            작성한 리뷰
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse text-slate-400">
            데이터를 불러오는 중입니다...
          </div>
        ) : (
          <div className="min-h-[50vh]">
            {/* Bookmarks Tab */}
            {activeTab === "bookmarks" && (
              <div className="grid gap-4 md:grid-cols-2">
                {myTools.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    아직 등록된 북마크가 없습니다.
                    <br />
                    <Link
                      to="/"
                      className="text-blue-600 font-medium mt-2 inline-block"
                    >
                      AI 도구 탐색하러 가기
                    </Link>
                  </div>
                ) : (
                  myTools.map((tool) => {
                    let host = "";
                    try {
                      host = new URL(tool.url).hostname;
                    } catch {}
                    return (
                      <Card
                        key={tool.id}
                        className="p-5 flex gap-4 hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      >
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center p-2 flex-shrink-0">
                          {host ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="font-bold text-slate-400">
                              {tool.name[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/tool/${tool.id}`}
                            className="font-bold text-lg text-slate-900 dark:text-white hover:text-blue-600 truncate block"
                          >
                            {tool.name}
                          </Link>
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded mt-1 inline-block">
                            {tool.category}
                          </span>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                            {tool.description}
                          </p>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    작성하신 리뷰가 없습니다.
                  </div>
                ) : (
                  reviews.map((review) => {
                    const tool = tools.find((t) => t.id === review.tool_id);
                    return (
                      <Card
                        key={review.id}
                        className="p-5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {tool?.name || "알 수 없는 도구"}
                          </span>
                          <Link
                            to={`/tool/${review.tool_id}`}
                            className="text-xs text-blue-500 flex items-center gap-1 hover:underline"
                          >
                            도구 보기 <ExternalLink size={12} />
                          </Link>
                          <span className="ml-auto text-xs text-slate-400">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i < review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-slate-100 text-slate-200"
                              }
                            />
                          ))}
                          {review.is_anonymous === 1 && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded ml-2">
                              익명 리뷰
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {review.content}
                        </p>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
