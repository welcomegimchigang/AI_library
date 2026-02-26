import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  const links = [
    { label: t("footer.about"), to: "/about" },
    { label: t("footer.chat"), to: "/chat" },
    { label: t("footer.submit"), to: "/submit" },
    { label: t("footer.feedback"), to: "/feedback" },
    { label: t("footer.privacy"), to: "/privacy" },
    { label: t("footer.terms"), to: "/terms" },
  ];

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 py-10 backdrop-blur transition-colors">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-slate-600 dark:text-slate-400 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="text-sm">
          {t("footer.allRightsReserved").replace("2024", new Date().getFullYear().toString())}
        </div>
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="transition hover:text-slate-900 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
