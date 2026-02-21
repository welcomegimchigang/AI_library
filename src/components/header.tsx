import { Sparkles, LogOut } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

import { getUserSession, logout } from "@/lib/auth";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "홈", to: "/" },
  { label: "채팅", to: "/chat" },
  { label: "기능", to: "/#features" },
];

export function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const session = getUserSession();
    if (session) setUser(session);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/20 bg-white/65 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 text-slate-900 shadow-sm">
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
                `text-sm font-medium transition ${isActive ? "text-[color:var(--primary)] font-bold" : "text-slate-600 hover:text-slate-900"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/chat" className="hidden sm:block">
            <Button size="sm">채팅 시작</Button>
          </Link>

          {/* User Auth Section */}
          <div className="flex items-center gap-3 sm:border-l border-slate-200 sm:pl-3">
            {user ? (
              <div className="flex items-center gap-2">
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                <span className="text-sm font-medium text-slate-700 hidden lg:block">{user.name}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-500 rounded-full h-8 w-8 p-0">
                  <LogOut size={16} />
                </Button>
              </div>
            ) : (
              <GoogleLoginButton onSuccess={(payload) => setUser(payload)} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
