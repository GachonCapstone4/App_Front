import { type Dispatch, type SetStateAction, useDeferredValue, useMemo } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { searchIndex } from "../model/search-data";
import { EmptyState } from "../../../shared/ui/primitives/EmptyState";
import type { SearchIndexItem, SearchSectionKey } from "../../../shared/types";

function getSearchContext(pathname: string): { key: SearchSectionKey; title: string } {
  if (pathname.includes("/inbox")) {
    return { key: "inbox", title: "이메일 검색" };
  }
  if (pathname.includes("/calendar")) {
    return { key: "calendar", title: "일정 검색" };
  }
  if (pathname.includes("/templates")) {
    return { key: "templates", title: "템플릿 검색" };
  }

  return { key: "inbox", title: "검색" };
}

interface GlobalSearchPanelProps {
  open: boolean;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  onToggle: () => void;
  onClose: () => void;
}

const typedSearchIndex = searchIndex as Record<SearchSectionKey, SearchIndexItem[]>;

export function GlobalSearchPanel({
  open,
  query,
  setQuery,
  onToggle,
  onClose,
}: GlobalSearchPanelProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const deferredQuery = useDeferredValue(query);
  const searchContext = getSearchContext(location.pathname);

  const results = useMemo(() => {
    const items = typedSearchIndex[searchContext.key] || [];
    const keyword = deferredQuery.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item: SearchIndexItem) =>
      `${item.title} ${item.subtitle} ${item.meta}`.toLowerCase().includes(keyword)
    );
  }, [deferredQuery, searchContext.key]);

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        className="flex h-11 min-w-[180px] items-center gap-2 rounded-xl bg-[#F1F5F9] px-4 text-sm text-[#94A3B8] transition hover:bg-[#E2E8F0] dark:bg-[#1E293B] dark:text-muted-foreground dark:hover:bg-[#182235] sm:min-w-[320px]"
        onClick={onToggle}
      >
        <Search className="h-4 w-4 text-[#94A3B8] dark:text-muted-foreground" />
        <span className="truncate">검색...</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-[min(92vw,420px)] rounded-2xl border border-border bg-card p-4 shadow-xl">
          <p className="mb-3 text-sm font-semibold text-foreground">{searchContext.title}</p>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="검색어를 입력하세요"
              className="app-form-input h-11 w-full rounded-xl pl-10 pr-3 text-sm"
            />
          </div>

          <div className="max-h-[360px] space-y-2 overflow-y-auto">
            {results.length ? (
              results.map((item: SearchIndexItem) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-xl border border-border px-3 py-3 text-left transition hover:border-[#2DD4BF] hover:bg-[#F8FFFE] dark:hover:bg-[#0F2F2D]"
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                >
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
                </button>
              ))
            ) : (
              <EmptyState title="검색 결과가 없습니다" description="다른 키워드로 다시 시도해보세요." />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
