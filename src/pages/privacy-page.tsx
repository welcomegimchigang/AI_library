import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#dbeafe_0%,#e9d5ff_40%,#fce7f3_75%,#f8fafc_100%)] text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-16 md:px-6">
        <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-xl backdrop-blur md:p-12">
          <h1 className="text-3xl font-black md:text-4xl">개인정보처리방침</h1>
          <p className="mt-2 text-sm text-slate-500">
            최종 수정일: 2026년 2월 22일
          </p>

          <div className="mt-8 space-y-6 text-slate-700 leading-relaxed">
            <section>
              <div className="prose prose-slate max-w-none text-slate-600">
                <p>
                  LoominAI(이하 "서비스")는 서비스 이용 과정에서 다음과 같은 최소한의 개인정보를 수집합니다.
                </p>
                <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">1. 수집하는 개인정보 항목</h3>
              </div>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                <li>Google 로그인 시: 이름, 이메일 주소, 프로필 사진</li>
                <li>서비스 이용 기록: 검색 키워드, 페이지 방문 기록, 쿠키</li>
                <li>기기 및 브라우저 정보: IP 주소, 브라우저 종류, OS 정보</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">
                2. 개인정보의 수집 및 이용 목적
              </h2>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                <li>맞춤형 AI 도구 추천 서비스 제공</li>
                <li>서비스 개선 및 신규 기능 개발을 위한 통계 분석</li>
                <li>이용자 문의 대응 및 불만 처리</li>
                <li>Google AdSense를 통한 맞춤형 광고 제공</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">
                3. 개인정보의 보유 및 이용 기간
              </h2>
              <p>
                이용자의 개인정보는 서비스 이용 기간 동안 보유하며, 회원 탈퇴
                또는 수집 목적 달성 시 즉시 파기합니다. 단, 관련 법령에 의해
                보존이 필요한 경우 해당 기간 동안 보관합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">4. 제3자 제공</h2>
              <p>
                서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만,
                다음의 경우에는 예외로 합니다.
              </p>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령의 규정에 의한 경우</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">5. 쿠키 및 광고</h2>
              <p>
                본 서비스는 Google AdSense 및 Google Analytics를 사용하며, 이를
                위해 쿠키가 사용될 수 있습니다. 이용자는 브라우저 설정을 통해
                쿠키 수집을 거부할 수 있으나, 이 경우 일부 서비스 이용에 제한이
                있을 수 있습니다.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">6. 문의처</h3>
              <p>개인정보 관련 문의는 아래 이메일로 연락해 주시기 바랍니다.</p>
              <p className="font-medium text-slate-800">foryouai@ai-library-dhm.pages.dev</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
