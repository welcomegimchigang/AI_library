import { Link } from "react-router-dom";

const links = [
  { label: "서비스 소개", to: "/about" },
  { label: "AI 추천 채팅", to: "/chat" },
  { label: "개인정보처리방침", to: "/privacy" },
  { label: "이용약관", to: "/terms" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/20 bg-white/60 py-10 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="text-sm text-slate-400">
          © {new Date().getFullYear()} foryou.ai. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="transition hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
