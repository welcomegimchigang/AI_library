import { Link } from "react-router-dom";

const links = [
  { label: "서비스 소개", to: "/" },
  { label: "AI 추천 채팅", to: "/chat" },
  { label: "문의", to: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/20 bg-white/60 py-10 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-6">
        <p>© {new Date().getFullYear()} AI Tool Library. All rights reserved.</p>
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link key={link.label} to={link.to} className="transition hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
