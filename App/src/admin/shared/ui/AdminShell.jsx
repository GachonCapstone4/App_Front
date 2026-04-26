import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useTheme } from "next-themes";
import { Activity, Bot, LayoutGrid, LogOut, MessageSquare, Moon, Sun, Terminal, Users } from "lucide-react";
import { clearAppSession, getAppSession } from "../../../shared/lib/app-session";

const navItems = [
  { to: "/admin", label: "운영 대시보드", icon: LayoutGrid },
  { to: "/admin/users", label: "사용자 관리", icon: Users },
  { to: "/admin/template-automation", label: "템플릿 / 자동화 관리", icon: Bot },
  { to: "/admin/inquiries", label: "사용자 문의 대응", icon: MessageSquare },
  { to: "/admin/monitoring", label: "시스템 운영 모니터링", icon: Activity },
  { to: "/admin/internal-monitoring", label: "시스템 내부 모니터링", icon: Terminal },
];

export function AdminShell() {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [session, setSession] = useState(() => getAppSession());
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    const syncSession = () => setSession(getAppSession());

    window.addEventListener("emailassist-session-updated", syncSession);
    return () => window.removeEventListener("emailassist-session-updated", syncSession);
  }, []);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo-wrap">
          <div className="admin-logo-mark">EA</div>
          <div>
            <p className="admin-logo-title">EmailAssist Admin</p>
            <p className="admin-logo-sub">운영 콘솔</p>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                isActive ? "admin-nav-item admin-nav-item--active" : "admin-nav-item"
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-theme-toggle"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === "dark" ? "라이트 모드" : "다크 모드"}</span>
          </button>
          <div className="admin-session-card">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">관리자 세션</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {session.userName || "운영 관리자"}
            </p>
            <p className="mt-1 text-xs text-white/65">
              {session.userEmail || "admin@admin"}
            </p>
            <div className="mt-3 space-y-1 text-[11px] text-white/55">
              <p>권한: {session.role === "ADMIN" ? "관리자" : "일반 사용자"}</p>
            </div>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/12"
              onClick={() => {
                clearAppSession();
                navigate("/");
              }}
            >
              <LogOut size={15} />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
