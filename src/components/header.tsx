import { Sparkles } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";

const navItems = [
  { label: "홈", to: "/" },
  { label: "채팅", to: "/chat" },
  { label: "기능", to: "/#features" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/20 bg-white/65 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 text-slate-900">
          <span className="rounded-xl bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--accent)] p-2 text-white">
            <Sparkles size={16} />
          </span>
          <span className="text-sm font-bold md:text-base">AI Tool Library</span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link to="/chat">
          <Button size="sm">채팅 시작</Button>
        </Link>
      </div>
    </header>
  );
}
