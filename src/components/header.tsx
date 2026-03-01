import { Sparkles, LogOut, Globe, Moon, Sun } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getUserSession, logout } from "@/lib/auth";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { Button } from "@/components/ui/button";

// A simple local theme hook 
function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };
  return { theme, toggleTheme };
}

export function Header() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const session = getUserSession();
    if (session) setUser(session);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith("ko") ? "en" : "ko";
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { label: t("nav.home"), to: "/" },
    { label: t("nav.chat"), to: "/chat" },
    { label: t("nav.features"), to: "/#features" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/20 bg-white/65 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Sparkles size={18} />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
            LoominAI
          </span>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-amber-400 px-2 sm:px-3 rounded-full flex items-center gap-2"
            title={theme === "light" ? "개발자 모드(다크) 켜기" : "라이트 모드 켜기"}
          >
            {theme === "light" ? (
              <>
                <Moon size={16} />
                <span className="text-[10px] font-bold hidden sm:block">개발자 모드</span>
              </>
            ) : (
              <>
                <Sun size={16} />
                <span className="text-[10px] font-bold hidden sm:block text-amber-500">일반 모드</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-slate-500 hover:text-slate-900 px-2"
            title={
              i18n.language.startsWith("ko")
                ? t("nav.switchToEnglish")
                : t("nav.switchToKorean")
            }
          >
            <Globe size={16} className="mr-1" />
            <span className="text-xs font-bold">
              {i18n.language.startsWith("ko") ? "EN" : "KO"}
            </span>
          </Button>

          <Link to="/chat" className="hidden sm:block">
            <Button size="sm">{t("nav.startChat")}</Button>
          </Link>

          {/* User Auth Section */}
          <div className="flex items-center gap-3 sm:border-l border-slate-200 sm:pl-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 hover:bg-slate-50 rounded-full pr-2 transition-colors"
                >
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm font-medium text-slate-700 hidden lg:block">
                    {user.name}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-red-500 rounded-full h-8 w-8 p-0"
                  title={t("nav.logout")}
                >
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
