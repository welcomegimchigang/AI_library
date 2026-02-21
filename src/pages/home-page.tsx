import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { title: "상황 맞춤 추천", desc: "질문 의도와 조건을 바탕으로 필요한 AI 도구를 빠르게 추천합니다." },
  { title: "비교 쉬운 카드", desc: "핵심 기능, 가격, 점수를 카드로 한눈에 비교할 수 있습니다." },
  { title: "즉시 실행", desc: "추천 결과에서 바로 공식 링크로 이동해 바로 사용을 시작할 수 있습니다." },
];

const steps = [
  { title: "요구사항 입력", desc: "하고 싶은 작업과 조건을 채팅으로 입력" },
  { title: "AI 도구 추천", desc: "조건에 맞는 도구를 빠르게 선별" },
  { title: "바로 실행", desc: "공식 링크로 이동해 즉시 사용" },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#dbeafe_0%,#e9d5ff_40%,#fce7f3_75%,#f8fafc_100%)] text-slate-900">
      <Header />

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-20 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
              <Sparkles size={14} />
              AI Tool Library MVP
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
                <Button size="lg" className="min-w-40">지금 시작하기</Button>
              </Link>
              <Button size="lg" variant="secondary" className="min-w-40">데모 보기</Button>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((item) => (
              <Card key={item.title} className="bg-white/75">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
          <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-xl backdrop-blur">
            <h2 className="text-2xl font-bold md:text-3xl">사용 방법</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {steps.map((step, idx) => (
                <Card key={step.title} className="bg-white/90">
                  <CardHeader>
                    <CardTitle className="text-base">{idx + 1}. {step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{step.desc}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

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
