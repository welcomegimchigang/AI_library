import { useState, useEffect } from "react";
import { X, Star, MessageSquare, Trash2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserSession } from "@/lib/auth";

interface Review {
    id: string;
    userName: string;
    userPicture: string;
    userEmail: string;
    rating: number;
    content: string;
    date: string;
    isAnonymous: boolean;
}

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    toolId: number;
    toolName: string;
}

export function ReviewModal({ isOpen, onClose, toolId, toolName }: ReviewModalProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [newReview, setNewReview] = useState("");
    const [newRating, setNewRating] = useState(5);
    const [isAnonymous, setIsAnonymous] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem(`reviews_${toolId}`);
            if (stored) {
                setReviews(JSON.parse(stored));
            } else {
                setReviews([]);
            }
        }
    }, [isOpen, toolId]);

    if (!isOpen) return null;

    const currentUser = getUserSession();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReview.trim() || !currentUser) return;

        const review: Review = {
            id: Date.now().toString(),
            userName: isAnonymous ? "익명" : currentUser.name,
            userPicture: isAnonymous ? "" : currentUser.picture,
            userEmail: currentUser.email || currentUser.sub || "",
            rating: newRating,
            content: newReview,
            date: new Date().toLocaleDateString(),
            isAnonymous,
        };

        const updated = [review, ...reviews];
        setReviews(updated);
        localStorage.setItem(`reviews_${toolId}`, JSON.stringify(updated));
        setNewReview("");
        setNewRating(5);
        setIsAnonymous(false);
    };

    const handleDelete = (reviewId: string) => {
        if (!confirm("이 리뷰를 삭제하시겠습니까?")) return;
        const updated = reviews.filter(r => r.id !== reviewId);
        setReviews(updated);
        localStorage.setItem(`reviews_${toolId}`, JSON.stringify(updated));
    };

    const isOwnReview = (review: Review) => {
        if (!currentUser) return false;
        const userIdentifier = currentUser.email || currentUser.sub || "";
        return review.userEmail === userIdentifier;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageSquare size={20} className="text-blue-500" />
                        {toolName} 리뷰
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
                    {reviews.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            아직 작성된 리뷰가 없습니다. 첫 리뷰를 남겨주세요!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((r) => (
                                <div key={r.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            {r.isAnonymous || !r.userPicture ? (
                                                <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                                                    <EyeOff size={12} className="text-slate-500 dark:text-slate-400" />
                                                </div>
                                            ) : (
                                                <img src={r.userPicture} alt={r.userName} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                                            )}
                                            <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{r.userName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">{r.date}</span>
                                            {isOwnReview(r) && (
                                                <button
                                                    onClick={() => handleDelete(r.id)}
                                                    className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors"
                                                    title="리뷰 삭제"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex mb-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} size={14} className={star <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 dark:text-slate-700"} />
                                        ))}
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{r.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer (Write Review) */}
                <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">별점:</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button type="button" key={star} onClick={() => setNewRating(star)}>
                                            <Star size={20} className={star <= newRating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 dark:text-slate-700"} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isAnonymous}
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <EyeOff size={12} /> 익명
                                </span>
                            </label>
                        </div>
                        <textarea
                            value={newReview}
                            onChange={(e) => setNewReview(e.target.value)}
                            placeholder={`${isAnonymous ? "익명" : (currentUser?.name || "사용자")}님, 이 도구에 대한 리뷰를 남겨주세요.`}
                            className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            rows={3}
                            required
                        />
                        <div className="flex justify-end mt-2">
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                                등록하기
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
