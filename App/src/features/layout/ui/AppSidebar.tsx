import { NavLink } from "react-router";
import { ChevronLeft, ChevronRight, Mail, X, type LucideIcon } from "lucide-react";
import { navigationGroups } from "../model/navigation";

interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  end?: boolean;
}

interface NavigationGroup {
  id: string;
  items: NavigationItem[];
}

interface AppSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

const typedNavigationGroups = navigationGroups as NavigationGroup[];
const primaryGroup = typedNavigationGroups.find((group) => group.id === "primary");
const secondaryGroup = typedNavigationGroups.find((group) => group.id === "secondary");

export function AppSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: AppSidebarProps) {
  const itemBaseClass = collapsed
    ? "justify-center px-2"
    : "gap-3 px-3";

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="모바일 메뉴 닫기"
          className="fixed inset-0 z-30 bg-[#0F172A]/50 lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[270px] flex-col bg-[#1E2A3A] px-3 py-4 text-white transition-[width,transform] duration-300 lg:translate-x-0 ${
          collapsed ? "lg:w-[88px]" : "lg:w-[270px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`mb-5 flex items-center border-b border-[#334155] px-2 pb-4 ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DD4BF] text-[#083344]">
            <Mail className="h-5 w-5" />
          </div>

          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">업무용 이메일 자동화</p>
            </div>
          ) : null}

          <button
            type="button"
            className="rounded-lg p-2 text-[#94A3B8] transition hover:bg-white/5 hover:text-white lg:hidden"
            onClick={onCloseMobile}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1">
            {primaryGroup?.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center rounded-xl py-2.5 text-sm transition ${itemBaseClass} ${
                    isActive
                      ? "bg-[#2DD4BF]/15 text-[#2DD4BF]"
                      : "text-[#CBD5E1] hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span className="flex-1">{item.label}</span> : null}
                {!collapsed && item.badge ? (
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#F59E0B] px-1.5 py-0.5 text-[10px] font-semibold text-[#1E2A3A]">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-[#334155] pt-4">
          <div className="space-y-1">
            {secondaryGroup?.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center rounded-xl py-2.5 text-sm transition ${itemBaseClass} ${
                    isActive
                      ? "bg-[#2DD4BF]/15 text-[#2DD4BF]"
                      : "text-[#CBD5E1] hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span className="flex-1">{item.label}</span> : null}
              </NavLink>
            ))}
          </div>

          <div className="mt-4 hidden justify-center lg:flex">
            <button
              type="button"
              aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-[#94A3B8] transition hover:bg-white/5 hover:text-white"
              onClick={onToggleCollapse}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
