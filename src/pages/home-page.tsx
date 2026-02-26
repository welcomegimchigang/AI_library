import {
  ArrowRight,
  Sparkles,
  Search,
  Zap,
  Globe,
  Shield,
  BarChart3,
  Bot,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ToolLibrary } from "@/components/tool-library";
import { Button } from "@/components/ui/button";

// Features and Steps will be handled inside the component to use translation hooks

// Steps moved inside HomePage

export function HomePage() {
  const { t } = useTranslation();
  const features = [
    {
      icon: <Bot size={28} className="text-blue-500" />,
      title: t("home.features.recommend.title"),
      desc: t("home.features.recommend.desc"),
    },
    {
      icon: <Zap size={28} className="text-amber-500" />,
      title: t("home.features.update.title"),
      desc: t("home.features.update.desc"),
    },
    {
      icon: <Globe size={28} className="text-emerald-500" />,
      title: t("home.features.korean.title"),
      desc: t("home.features.korean.desc"),
    },
    {
      icon: <Shield size={28} className="text-purple-500" />,
      title: t("home.features.compare.title"),
      desc: t("home.features.compare.desc"),
    },
    {
      icon: <Search size={28} className="text-cyan-500" />,
      title: t("home.features.demand.title"),
      desc: t("home.features.demand.desc"),
    },
  ];

  const steps = [
    {
      num: "01",
      title: t("home.steps.01.title"),
      desc: t("home.steps.01.desc"),
    },
    {
      num: "02",
      title: t("home.steps.02.title"),
      desc: t("home.steps.02.desc"),
    },
    {
      num: "03",
      title: t("home.steps.03.title"),
      desc: t("home.steps.03.desc"),
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_10%_0%,#dbeafe_0%,#e9d5ff_40%,#fce7f3_75%,#f8fafc_100%)] dark:bg-slate-950 dark:bg-none text-slate-900 dark:text-slate-100 transition-colors duration-500">
      <Header />

      <main>
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-20 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 backdrop-blur">
              <Sparkles size={14} />
              {t("home.heroBadge")}
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight md:text-6xl">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {t("home.heroTitle1")}
              </span>
              <br />
              {t("home.heroTitle2")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 dark:text-slate-400 md:text-lg">
              {t("home.heroDesc")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/chat">
                <Button
                  size="lg"
                  className="min-w-40 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25"
                >
                  {t("home.ctaStart")}
                </Button>
              </Link>
              <a href="#library">
                <Button size="lg" variant="secondary" className="min-w-40">
                  {t("home.ctaExplore")}
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6"
        >
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              {t("home.whyTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              {t("home.whyDesc")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/40 dark:border-slate-800 bg-white/75 dark:bg-slate-900/75 p-6 shadow-sm backdrop-blur hover:shadow-md transition-shadow"
              >
                <div className="mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Tool Library Section */}
        <section
          id="library"
          className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 transition-colors duration-300"
        >
          <ToolLibrary />
        </section>

        {/* How to Use */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <div className="rounded-3xl border border-white/40 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-8 shadow-xl backdrop-blur md:p-12">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold md:text-3xl text-slate-900 dark:text-white">{t("home.guideTitle")}</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                {t("home.guideDesc")}
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="relative rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow"
                >
                  <div className="text-4xl font-black text-blue-100 dark:text-blue-900/30 mb-3">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white -mt-2">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-6">
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-8 text-white md:p-10">
            <h3 className="text-2xl font-bold md:text-3xl">
              {t("home.ctaStart")}
            </h3>
            <p className="mt-3 text-white/90">{t("home.heroDesc")}</p>
            <Link to="/chat" className="mt-6 inline-block">
              <Button
                variant="outline"
                size="lg"
                className="border-white/50 bg-white/10 text-white hover:bg-white/20"
              >
                {t("nav.startChat")}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
