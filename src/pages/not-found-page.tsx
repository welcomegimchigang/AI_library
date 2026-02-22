import { Link } from "react-router-dom";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
    return (
        <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#dbeafe_0%,#e9d5ff_40%,#fce7f3_75%,#f8fafc_100%)] text-slate-900">
            <Header />
            <main className="mx-auto w-full max-w-4xl px-4 py-20 md:px-6 text-center">
                <div className="text-8xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    404
                </div>
                <h1 className="mt-4 text-2xl font-bold text-slate-800">페이지를 찾을 수 없습니다</h1>
                <p className="mt-2 text-slate-500">요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.</p>
                <div className="mt-8 flex justify-center gap-3">
                    <Link to="/">
                        <Button size="lg">홈으로 돌아가기</Button>
                    </Link>
                    <Link to="/chat">
                        <Button size="lg" variant="secondary">AI 추천 받기</Button>
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}
