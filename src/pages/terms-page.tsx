import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function TermsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#dbeafe_0%,#e9d5ff_40%,#fce7f3_75%,#f8fafc_100%)] text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-16 md:px-6">
        <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-xl backdrop-blur md:p-12">
          <h1 className="text-3xl font-black md:text-4xl">이용약관</h1>
          <p className="mt-2 text-sm text-slate-500">
            최종 수정일: 2026년 2월 22일
          </p>

          <div className="mt-8 space-y-6 text-slate-700 leading-relaxed">
            <section>
              <div className="prose prose-slate max-w-none text-slate-600">
                <p>
                  본 약관은 foryou.ai(이하 "서비스")가 제공하는 AI 도구 추천 및 탐색 서비스의 이용 조건 및 절차에 관한 사항을 규정합니다.
                </p>
                <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">1. 서비스의 제공 및 변경</h3>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">제2조 (서비스의 내용)</h2>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                <li>AI 도구 데이터베이스 검색 및 열람</li>
                <li>AI 챗봇을 통한 맞춤형 도구 추천</li>
                <li>AI 도구 리뷰 및 평점 작성</li>
                <li>기타 서비스가 정하는 부가 서비스</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">제3조 (이용자의 의무)</h2>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위 금지</li>
                <li>서비스의 정상적인 운영을 방해하는 행위 금지</li>
                <li>서비스를 이용하여 법령 또는 공서양속에 반하는 행위 금지</li>
                <li>
                  서비스 내 게시된 정보를 무단으로 복제, 배포하는 행위 금지
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">제4조 (면책 사항)</h2>
              <p>
                서비스는 AI 도구에 대한 정보를 제공할 뿐이며, 해당 도구의 품질,
                안전성, 적합성에 대해 보증하지 않습니다. 이용자는 추천된 AI
                도구의 사용에 따른 결과에 대해 스스로 판단하고 책임을
                부담합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">제5조 (서비스 변경 및 중단)</h2>
              <p>
                서비스는 운영상, 기술상의 필요에 의해 제공하는 서비스의 전부
                또는 일부를 변경하거나 중단할 수 있으며, 이에 대해 별도의 보상을
                하지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">제6조 (저작권)</h2>
              <p>
                서비스에 의해 작성된 저작물에 대한 저작권 및 기타 지적재산권은
                서비스에 귀속됩니다. 다만, 데이터베이스에 등록된 개별 AI 도구의
                상표 및 로고는 각 도구의 소유자에게 귀속됩니다.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
