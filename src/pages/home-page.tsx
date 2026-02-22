import { ArrowRight, Sparkles, Search, Zap, Globe, Shield, BarChart3, Bot } from "lucide-react";
import { Link } from "react-router-dom";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ToolLibrary } from "@/components/tool-library";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: <Bot size={28} className="text-blue-500" />,
    title: "AI 기반 맞춤 추천",
    desc: "AI가 질문의 의도를 분석하여, 데이터베이스에서 최적의 도구를 즉시 선별합니다.",
  },
  {
    icon: <Zap size={28} className="text-amber-500" />,
    title: "실시간 업데이트",
    desc: "엄선된 최고의 AI 도구를 업데이트합니다.",
  },
  {
    icon: <Globe size={28} className="text-emerald-500" />,
    title: "완전 한국어 지원",
    desc: "전 세계 AI 도구의 이름과 설명을 모두 한국어로 번역하여 제공합니다.",
  },
  {
    icon: <Shield size={28} className="text-purple-500" />,
    title: "무료/유료 한눈에 비교",
    desc: "가격 정보와 카테고리 태그로 필요한 조건에 맞는 도구를 빠르게 필터링할 수 있습니다.",
  },
  {
    icon: <Search size={28} className="text-cyan-500" />,
    title: "수요 기반 자동 추가",
    desc: "오늘 찾는 도구가 없다면 AI가 자동으로 다음 날 등록해 드립니다.",
  },
];

const steps = [
  {
    num: "01",
    title: "요구사항 입력",
    desc: "원하는 작업이나 조건을 채팅창에 자연어로 입력합니다. 예: \"영상 편집용 무료 AI 추천해줘\"",
  },
  {
    num: "02",
    title: "AI 분석 및 추천",
    desc: "AI가 의도를 분석하고, 데이터베이스에서 조건에 맞는 최적의 도구를 필터링합니다.",
  },
  {
    num: "03",
    title: "비교 후 바로 실행",
    desc: "추천된 도구의 기능, 가격, 리뷰를 비교한 뒤 공식 사이트로 바로 이동하여 사용을 시작합니다.",
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#dbeafe_0%,#e9d5ff_40%,#fce7f3_75%,#f8fafc_100%)] text-slate-900">
      <Header />

      <main>
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-20 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
              <Sparkles size={14} />
              AI Tool Library
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight md:text-6xl">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                필요한 AI 도구를
              </span>
              <br />
              가장 빠르게 추천받으세요
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 md:text-lg">
              질문 한 번이면 목적에 맞는 AI 도구를 추천하고, 바로 실행까지 연결해주는 채팅형 탐색 경험입니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/chat">
                <Button size="lg" className="min-w-40 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25">지금 시작하기</Button>
              </Link>
              <a href="#library">
                <Button size="lg" variant="secondary" className="min-w-40">도구 탐색하기</Button>
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold md:text-3xl">왜 AI Tool Library인가요?</h2>
            <p className="mt-2 text-slate-500">다른 AI 도구 사이트와 차별화되는 핵심 기능</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/40 bg-white/75 p-6 shadow-sm backdrop-blur hover:shadow-md transition-shadow">
                <div className="mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tool Library Section */}
        <section id="library" className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <ToolLibrary />
        </section>

        {/* How to Use */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-xl backdrop-blur md:p-12">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold md:text-3xl">이용 가이드</h2>
              <p className="mt-2 text-slate-500">3단계로 완성되는 AI 도구 탐색</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.num} className="relative rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="text-4xl font-black text-blue-100 mb-3">{step.num}</div>
                  <h3 className="text-lg font-bold text-slate-900 -mt-2">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-6">
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-8 text-white md:p-10">
            <h3 className="text-2xl font-bold md:text-3xl">AI 도구 탐색, 지금 시작할까요?</h3>
            <p className="mt-3 text-white/90">질문만 하면 상황 맞춤 추천을 바로 보여드립니다.</p>
            <Link to="/chat" className="mt-6 inline-block">
              <Button variant="outline" size="lg" className="border-white/50 bg-white/10 text-white hover:bg-white/20">
                채팅으로 추천 받기
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
