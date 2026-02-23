import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function AboutPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#dbeafe_0%,#e9d5ff_40%,#fce7f3_75%,#f8fafc_100%)] text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-16 md:px-6">
        <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-xl backdrop-blur md:p-12">
          <h1 className="text-3xl font-black md:text-4xl">서비스 소개</h1>

          <div className="mt-8 space-y-6 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold">AI Tool Library란?</h2>
              <p>
                AI Tool Library는 전 세계에 흩어져 있는 수백 가지의 AI 도구들을
                한 곳에 모아, 사용자의 목적에 맞는 최적의 도구를 빠르게 찾아주는
                AI 기반 추천 플랫폼입니다.
              </p>
              <p className="mt-2">
                다양한 AI 도구가 등록되어 있으며, 매일 자동으로 새로운 도구가
                추가되고 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">주요 기능</h2>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                <li>
                  <strong>AI 챗봇 추천</strong> — 자연어로 질문하면 ChatGPT가
                  의도를 분석하여 최적의 도구를 추천합니다.
                </li>
                <li>
                  <strong>자동 데이터 수집</strong> — GitHub 오픈소스 목록에서
                  매일 새로운 AI 도구를 자동 수집합니다.
                </li>
                <li>
                  <strong>수요 기반 자동 추가</strong> — 사용자가 검색했으나
                  없는 도구는 AI 에이전트가 자동으로 찾아 등록합니다.
                </li>
                <li>
                  <strong>한국어 지원</strong> — 모든 도구 설명이 한국어로
                  번역되어 제공됩니다.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">운영자 정보</h2>
              <div className="mt-2 rounded-xl bg-white/80 p-4">
                <p>
                  <strong>서비스명:</strong> AI Tool Library
                </p>
                <p>
                  <strong>운영자:</strong> AI Tool Library Team
                </p>
                <p>
                  <strong>이메일:</strong> contact@ai-tool-library.com
                </p>
                <p>
                  <strong>사이트:</strong> ai-library-dhm.pages.dev
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">문의하기</h2>
              <p>
                서비스 이용 중 불편한 점이나 제안 사항이 있으시면 아래 이메일로
                연락해 주세요.
              </p>
              <p className="mt-1 font-semibold">
                📧 contact@ai-tool-library.com
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
