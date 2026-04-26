import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router";
import { recommendedCategoryOptions } from "../../shared/config/onboarding-options";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../app/components/ui/select";
import {
  generatedTemplates,
  templateCategoryStats,
  templateSummary,
  userIndustryOptions,
} from "../shared/mock/adminData";
import {
  createAdminCategoryKeyword,
  deleteAdminCategoryKeyword,
  getAdminCategoryKeywords,
  getAdminTemplateCategoryStats,
  getAdminTemplates,
  getAdminTemplateSummary,
  updateAdminCategoryKeyword,
} from "../../shared/api/admin";
import { getErrorMessage } from "../../shared/api/http";
import { MetricCard } from "../shared/ui/MetricCard";
import { PageHeader } from "../shared/ui/PageHeader";
import { AdminModal } from "../shared/ui/AdminModal";
import { AdminStateNotice } from "../shared/ui/AdminStateNotice";
import { AdminStatePage } from "../shared/ui/AdminStatePage";
import { StatusBadge } from "../shared/ui/StatusBadge";

const emptyRuleDraft = {
  categoryName: "",
  color: "#14B8A6",
  keywordsText: "",
};

const presetRuleDraft = {
  categoryName: "미팅/일정 조율",
  color: "#14B8A6",
  keywordsText: "미팅\n일정\n회의\n시간\n장소",
};

const categoryColorMap = new Map(
  recommendedCategoryOptions.map((category) => [category.name, category.color]),
);

const recommendedCategoryStats = recommendedCategoryOptions.map((category) => ({
  id: category.id,
  category: category.name,
  industryLabel:
    userIndustryOptions.find((option) => option.value === category.domain)?.label ?? category.domain,
  color: category.color,
  templateCount: 0,
  usageCount: 0,
}));

const demoCategoryKeywordItems = templateCategoryStats.map((category) => ({
  id: category.category,
  categoryName: category.category,
  color: category.color,
  keywords: [category.category, "문의", "요청"].filter(Boolean),
  categoryCount: 3,
  userCount: 3,
}));

function buildCategoryKeywordRows(categoryKeywords, includeRecommendedBase = false) {
  const categoryMap = new Map();

  if (includeRecommendedBase) {
    recommendedCategoryOptions.forEach((category) => {
      categoryMap.set(category.name, {
        id: category.name,
        categoryName: category.name,
        color: category.color,
        keywords: [],
        categoryCount: 0,
        userCount: 0,
      });
    });
  }

  categoryKeywords.forEach((category) => {
    categoryMap.set(category.categoryName, {
      id: category.categoryKey ?? category.categoryName,
      categoryName: category.categoryName,
      color: category.color || categoryColorMap.get(category.categoryName) || "#64748B",
      keywords: category.keywords ?? [],
      categoryCount: category.categoryCount ?? 0,
      userCount: category.userCount ?? 0,
    });
  });

  return Array.from(categoryMap.values());
}

function parseKeywords(value) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );
}

function formatKeywords(keywords) {
  return (keywords ?? []).join("\n");
}

function mergeCategoryStatsByName(stats, includeRecommendedBase = false) {
  const statMap = new Map();

  if (includeRecommendedBase) {
    recommendedCategoryStats.forEach((stat) => {
      statMap.set(stat.category, stat);
    });
  }

  stats.forEach((stat) => {
    const key = stat.category || "미분류";
    const previous = statMap.get(key);

    if (!previous) {
      statMap.set(key, {
        ...stat,
        id: key,
        category: key,
        color: stat.color || categoryColorMap.get(key) || "#64748B",
      });
      return;
    }

    statMap.set(key, {
      ...previous,
      color: previous.color || stat.color || categoryColorMap.get(key) || "#64748B",
      templateCount: previous.templateCount + stat.templateCount,
      usageCount: previous.usageCount + stat.usageCount,
    });
  });

  return Array.from(statMap.values());
}

export function TemplateAutomationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scenarioId = searchParams.get("scenario");
  const loadErrorScenario =
    scenarioId === "admin-template-automation-load-error" ||
    scenarioId === "admin-templates-load-error";
  const templatesEmptyScenario = scenarioId === "admin-template-automation-templates-empty";
  const rulesEmptyScenario = scenarioId === "admin-template-automation-rules-empty";
  const ruleDialogScenario = scenarioId === "admin-template-automation-rule-dialog-normal";
  const ruleDeleteDialogScenario =
    scenarioId === "admin-template-automation-rule-delete-dialog-normal";
  const ruleSaveErrorScenario = scenarioId === "admin-template-automation-rule-save-error";
  const useDemoDataMode = Boolean(scenarioId?.startsWith("admin-"));
  const activeTab = searchParams.get("tab") === "rules" ? "rules" : "templates";

  const [search, setSearch] = useState("");
  const [ruleSearch, setRuleSearch] = useState("");
  const [showEmptyRulesOnly, setShowEmptyRulesOnly] = useState(false);
  const [industry, setIndustry] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [summaryItems, setSummaryItems] = useState(
    useDemoDataMode ? templateSummary : [],
  );
  const [templateItems, setTemplateItems] = useState(
    useDemoDataMode && !templatesEmptyScenario ? generatedTemplates : [],
  );
  const [categoryStats, setCategoryStats] = useState(
    useDemoDataMode ? mergeCategoryStatsByName(templateCategoryStats, true) : [],
  );
  const [ruleItems, setRuleItems] = useState(
    useDemoDataMode && !rulesEmptyScenario ? buildCategoryKeywordRows(demoCategoryKeywordItems) : [],
  );
  const [ruleDialogOpen, setRuleDialogOpen] = useState(
    ruleDialogScenario || ruleSaveErrorScenario,
  );
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleDraft, setRuleDraft] = useState(
    ruleDialogScenario || ruleSaveErrorScenario ? presetRuleDraft : emptyRuleDraft,
  );
  const [deleteTarget, setDeleteTarget] = useState(
    ruleDeleteDialogScenario ? demoCategoryKeywordItems[0] ?? null : null,
  );
  const [ruleErrorNotice, setRuleErrorNotice] = useState(
    ruleSaveErrorScenario
      ? "운영 규칙 저장 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
      : "",
  );
  const [loading, setLoading] = useState(!useDemoDataMode);
  const [loadError, setLoadError] = useState("");
  const [savingRule, setSavingRule] = useState(false);
  const [deletingRule, setDeletingRule] = useState(false);

  useEffect(() => {
    if (useDemoDataMode) {
      setSummaryItems(templateSummary);
      setTemplateItems(templatesEmptyScenario ? [] : generatedTemplates);
      setCategoryStats(mergeCategoryStatsByName(templateCategoryStats, true));
      setRuleItems(rulesEmptyScenario ? [] : buildCategoryKeywordRows(demoCategoryKeywordItems));
      return;
    }

    let mounted = true;
    setLoading(true);
    setLoadError("");

    void Promise.all([
      getAdminTemplateSummary(),
      getAdminTemplates(100),
      getAdminTemplateCategoryStats(),
      getAdminCategoryKeywords(),
    ])
      .then(([summary, templates, stats, categoryKeywords]) => {
        if (!mounted) {
          return;
        }

        setSummaryItems([
          {
            label: "전체 생성 템플릿",
            value: `${summary.total_templates}개`,
            hint: "백엔드 저장 템플릿 기준",
          },
          {
            label: "가장 많이 쓰인 카테고리",
            value: summary.top_category ?? "없음",
            hint: `총 ${summary.top_category_usage_count}회 사용`,
          },
          {
            label: "운영 카테고리",
            value: `${recommendedCategoryOptions.length}개`,
            hint: "전체 카테고리 기준",
          },
          {
            label: "등록 검색용 키워드",
            value: `${categoryKeywords.reduce((sum, category) => sum + category.keywords.length, 0)}개`,
            hint: "카테고리별 검색 보조어 합계",
          },
        ]);
        setTemplateItems(
          templates.map((template) => ({
            id: template.templateId,
            title: template.title,
            category: template.category,
            industry: template.industry,
            useCount: template.useCount,
            userCount: template.userCount,
            generatedAt: template.generatedAt,
            quality: template.quality,
            userId: template.userId,
            userTemplateNo: template.userTemplateNo,
          })),
        );
        setCategoryStats(
          mergeCategoryStatsByName(
            stats.map((stat, index) => ({
              id: stat.categoryId,
              category: stat.categoryName,
              industryLabel:
                recommendedCategoryStats.find((item) => item.category === stat.categoryName)
                  ?.industryLabel ?? "전체 업종",
              color:
                categoryColorMap.get(stat.categoryName) ??
                ["#3B82F6", "#14B8A6", "#F59E0B", "#EF4444", "#6366F1"][index % 5],
              templateCount: stat.templateCount,
              usageCount: stat.usageCount,
            })),
            true,
          ),
        );
        setRuleItems(
          buildCategoryKeywordRows(categoryKeywords),
        );
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setLoadError(getErrorMessage(error, "템플릿 / 운영 규칙 데이터를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!mounted) {
          return;
        }

        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [rulesEmptyScenario, templatesEmptyScenario, useDemoDataMode]);

  const categories = useMemo(
    () => ["all", ...new Set([...categoryStats.map((item) => item.category), ...templateItems.map((item) => item.category)])],
    [categoryStats, templateItems],
  );

  const filteredTemplates = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return templateItems.filter((item) => {
      const matchesKeyword =
        keyword.length === 0 ||
        [item.title, item.category, item.id].join(" ").toLowerCase().includes(keyword);
      const matchesIndustry = industry === "all" || item.industry === industry;
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      return matchesKeyword && matchesIndustry && matchesCategory;
    });
  }, [categoryFilter, industry, search, templateItems]);

  const filteredCategoryStats = useMemo(
    () =>
      categoryStats.filter((item) => {
        const matchesIndustry =
          industry === "all" ||
          item.industryLabel ===
            userIndustryOptions.find((option) => option.value === industry)?.label;
        const matchesCategory =
          categoryFilter === "all" || item.category === categoryFilter;

        return matchesIndustry && matchesCategory;
      }),
    [categoryFilter, categoryStats, industry],
  );

  const filteredRuleItems = useMemo(() => {
    const keyword = ruleSearch.trim().toLowerCase();

    return ruleItems.filter((rule) => {
      const matchesKeyword =
        keyword.length === 0 ||
        [rule.categoryName, rule.color, ...(rule.keywords ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const matchesEmptyFilter = !showEmptyRulesOnly || rule.keywords.length === 0;

      return matchesKeyword && matchesEmptyFilter;
    });
  }, [ruleItems, ruleSearch, showEmptyRulesOnly]);

  const emptyKeywordCount = useMemo(
    () => ruleItems.filter((rule) => rule.keywords.length === 0).length,
    [ruleItems],
  );

  const ruleCategoryNames = useMemo(
    () => ruleItems.map((rule) => rule.categoryName).sort((first, second) => first.localeCompare(second, "ko")),
    [ruleItems],
  );

  const openEditRule = (rule) => {
    setEditingRuleId(rule.id);
    setRuleDraft({
      categoryName: rule.categoryName,
      color: rule.color ?? "#14B8A6",
      keywordsText: formatKeywords(rule.keywords),
    });
    setRuleErrorNotice("");
    setRuleDialogOpen(true);
  };

  const openCreateRule = () => {
    setEditingRuleId(null);
    setRuleDraft(emptyRuleDraft);
    setRuleErrorNotice("");
    setRuleDialogOpen(true);
  };

  const handleSaveRule = () => {
    const categoryName = ruleDraft.categoryName.trim();

    if (!categoryName) {
      setRuleErrorNotice("카테고리명을 입력해 주세요.");
      return;
    }

    if (!editingRuleId && !ruleCategoryNames.includes(categoryName)) {
      setRuleErrorNotice("현재 DB에 존재하는 카테고리명만 검색용 키워드를 등록할 수 있습니다.");
      return;
    }

    const keywords = parseKeywords(ruleDraft.keywordsText);

    if (ruleSaveErrorScenario) {
      setRuleErrorNotice("운영 규칙 저장 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!useDemoDataMode) {
      setSavingRule(true);
      setRuleErrorNotice("");

      const request = editingRuleId
        ? updateAdminCategoryKeyword(categoryName, {
            color: ruleDraft.color.trim() || null,
            keywords,
          })
        : createAdminCategoryKeyword({
            categoryName,
            color: ruleDraft.color.trim() || null,
            keywords,
          });

      void request
        .then(async () => {
          const categories = await getAdminCategoryKeywords();
          setRuleItems(buildCategoryKeywordRows(categories));
          setRuleDialogOpen(false);
        })
        .catch((error) => {
          setRuleErrorNotice(getErrorMessage(error, "운영 규칙 저장 요청을 처리하지 못했습니다."));
        })
        .finally(() => {
          setSavingRule(false);
        });

      return;
    }

    if (editingRuleId) {
      setRuleItems((current) =>
        current.map((rule) =>
          rule.id === editingRuleId
            ? {
                ...rule,
                categoryName,
                color: ruleDraft.color.trim() || null,
                keywords,
              }
            : rule,
        ),
      );
    } else {
      setRuleItems((current) => [
        {
          id: ruleDraft.categoryName.trim(),
          categoryName,
          color: ruleDraft.color.trim() || null,
          keywords,
          categoryCount: 1,
          userCount: 1,
        },
        ...current,
      ]);
    }

    setRuleErrorNotice("");
    setRuleDialogOpen(false);
  };

  const handleDeleteRule = () => {
    if (!deleteTarget) {
      return;
    }

    if (!useDemoDataMode) {
      setDeletingRule(true);
      setRuleErrorNotice("");

      void deleteAdminCategoryKeyword(deleteTarget.id)
        .then(async () => {
          const categories = await getAdminCategoryKeywords();
          setRuleItems(buildCategoryKeywordRows(categories));
          setDeleteTarget(null);
        })
        .catch((error) => {
          setRuleErrorNotice(getErrorMessage(error, "운영 규칙 초기화 요청을 처리하지 못했습니다."));
        })
        .finally(() => {
          setDeletingRule(false);
        });

      return;
    }

    setRuleItems((current) =>
      current.map((rule) =>
        rule.id === deleteTarget.id
          ? {
              ...rule,
              keywords: [],
            }
          : rule,
      ),
    );
    setDeleteTarget(null);
  };

  const updateTab = (tab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    setSearchParams(nextParams);
  };

  if (loadErrorScenario) {
    return (
      <AdminStatePage
        title="템플릿 / 운영 규칙 관리 화면을 불러오지 못했습니다"
        description="생성 템플릿 통계와 운영 규칙 데이터를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (loadError) {
    return (
      <AdminStatePage
        title="템플릿 / 운영 규칙 관리 화면을 불러오지 못했습니다"
        description={loadError}
      />
    );
  }

  if (loading) {
    return (
      <AdminStatePage
        title="템플릿 / 운영 규칙 관리 화면을 불러오는 중입니다"
        description="생성 템플릿, 카테고리 통계, 운영 규칙을 가져오고 있습니다."
      />
    );
  }

  return (
    <section className="admin-page">
      <PageHeader
        title="템플릿 / 운영 규칙 관리"
        description="생성된 템플릿 사용 현황과 전체 카테고리의 검색용 키워드를 함께 관리합니다. 운영 규칙은 백엔드 카테고리 키워드 기준으로 저장됩니다."
        actions={
          activeTab === "rules" ? (
            <button type="button" className="admin-button" onClick={openCreateRule}>
              <Plus size={16} />
              키워드 등록
            </button>
          ) : null
        }
      />

      <div className="admin-card-grid admin-card-grid--four">
        {summaryItems.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
          />
        ))}
      </div>

      <div className="admin-chip-row">
        <button
          type="button"
          className={activeTab === "templates" ? "admin-chip admin-chip--active" : "admin-chip"}
          onClick={() => updateTab("templates")}
        >
          템플릿 관리
        </button>
        <button
          type="button"
          className={activeTab === "rules" ? "admin-chip admin-chip--active" : "admin-chip"}
          onClick={() => updateTab("rules")}
        >
          운영 규칙 관리
        </button>
      </div>

      {activeTab === "templates" ? (
        <>
          <section className="admin-panel admin-template-list-panel">
            <div className="admin-panel-head">
              <div>
                <h2>생성 템플릿 목록</h2>
                <p className="admin-panel-subtitle">
                  사용자별로 생성된 템플릿 결과와 사용 현황을 조회합니다.
                </p>
              </div>
              <span className="admin-panel-note">{filteredTemplates.length}개 표시</span>
            </div>

            <div className="admin-toolbar">
              <div className="admin-toolbar-group">
                <div className="admin-input-wrap app-input-shell">
                  <Search size={14} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="admin-input admin-input--compact bg-transparent text-sm placeholder:text-muted-foreground"
                    placeholder="템플릿명 / 카테고리 / ID 검색"
                  />
                </div>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="app-form-input h-11 min-w-[148px] rounded-xl px-4 text-sm">
                    <SelectValue placeholder="전체 업종" />
                  </SelectTrigger>
                  <SelectContent className="app-select-content rounded-2xl p-1">
                    <SelectItem value="all" className="app-select-item rounded-xl px-3 py-2.5 text-sm">
                      전체 업종
                    </SelectItem>
                    {userIndustryOptions.map((item) => (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        className="app-select-item rounded-xl px-3 py-2.5 text-sm"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="app-form-input h-11 min-w-[156px] rounded-xl px-4 text-sm">
                    <SelectValue placeholder="전체 카테고리" />
                  </SelectTrigger>
                  <SelectContent className="app-select-content rounded-2xl p-1">
                    <SelectItem value="all" className="app-select-item rounded-xl px-3 py-2.5 text-sm">
                      전체 카테고리
                    </SelectItem>
                    {categories
                      .filter((item) => item !== "all")
                      .map((item) => (
                        <SelectItem
                          key={item}
                          value={item}
                          className="app-select-item rounded-xl px-3 py-2.5 text-sm"
                        >
                          {item}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="admin-toolbar-note">
                LLM이 생성한 템플릿 결과와 사용 횟수를 기준으로 정렬합니다.
              </span>
            </div>

            {templatesEmptyScenario ? (
              <AdminStateNotice
                title="생성 템플릿 결과가 없습니다"
                description="아직 사용자가 생성한 템플릿이 없어 통계와 목록이 비어 있습니다."
                tone="empty"
                compact
              />
            ) : null}

            {filteredTemplates.length > 0 ? (
              <div className="admin-table-wrap admin-template-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>템플릿</th>
                      <th>카테고리</th>
                      <th>업종</th>
                      <th>사용 횟수</th>
                      <th>연결 사용자</th>
                      <th>최근 생성</th>
                      <th>품질</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.map((template) => (
                      <tr key={template.id}>
                        <td>
                          <strong>{template.title}</strong>
                          <div className="admin-table-subcopy">
                            사용자 {template.userId} 템플릿 #{template.userTemplateNo ?? template.id}
                          </div>
                        </td>
                        <td>{template.category}</td>
                        <td>{userIndustryOptions.find((item) => item.value === template.industry)?.label}</td>
                        <td>{template.useCount}회</td>
                        <td>{template.userCount}명</td>
                        <td>{template.generatedAt}</td>
                        <td>
                          <StatusBadge>{template.quality}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminStateNotice
                title="조건에 맞는 템플릿이 없습니다"
                description="검색어나 업종 필터를 조정하면 다른 생성 템플릿 결과를 확인할 수 있습니다."
                tone="empty"
              />
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>카테고리별 사용 현황 통계</h2>
                <p className="admin-panel-subtitle">
                  카테고리별 생성 템플릿 수와 사용 누적 횟수를 비교합니다.
                </p>
              </div>
            </div>

            <div className="admin-card-grid admin-card-grid--four">
              {filteredCategoryStats.map((item) => (
                <article key={item.id} className="admin-list-card">
                  <div className="admin-list-card-row">
                    <div>
                      <h3>{item.category}</h3>
                      <p>{item.industryLabel}</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="admin-color-dot"
                      style={{ background: item.color }}
                    />
                  </div>
                  <div className="admin-inline-stat-row">
                    <span>생성 템플릿 수</span>
                    <strong>{item.templateCount}개</strong>
                  </div>
                  <div className="admin-inline-stat-row">
                    <span>누적 사용 횟수</span>
                    <strong>{item.usageCount}회</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>운영 규칙 목록</h2>
              <p className="admin-panel-subtitle">
                전체 카테고리의 검색용 키워드를 조회하고 수정합니다.
              </p>
            </div>
            <span className="admin-panel-note">
              {filteredRuleItems.length}개 표시 / 미등록 {emptyKeywordCount}개
            </span>
          </div>

          <div className="admin-toolbar">
            <div className="admin-toolbar-group">
              <div className="admin-input-wrap app-input-shell">
                <Search size={14} />
                <input
                  value={ruleSearch}
                  onChange={(event) => setRuleSearch(event.target.value)}
                  className="admin-input admin-input--compact bg-transparent text-sm placeholder:text-muted-foreground"
                  placeholder="카테고리명 / 키워드 / 색상 검색"
                />
              </div>
              <button
                type="button"
                className={showEmptyRulesOnly ? "admin-chip admin-chip--active" : "admin-chip"}
                onClick={() => setShowEmptyRulesOnly((current) => !current)}
              >
                키워드 미등록만
              </button>
            </div>
            <span className="admin-toolbar-note">
              검색용 키워드는 메일 내용과 카테고리를 연결할 때 참고하는 보조어입니다.
            </span>
          </div>

          {ruleErrorNotice ? (
            <AdminStateNotice
              title="운영 규칙 저장에 실패했습니다"
              description={ruleErrorNotice}
              tone="error"
              compact
            />
          ) : null}

          {filteredRuleItems.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>카테고리</th>
                    <th>검색용 키워드</th>
                    <th>색상</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuleItems.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <strong>{rule.categoryName}</strong>
                        <div className="admin-table-subcopy">운영 규칙 기준</div>
                      </td>
                      <td>
                        <div className="admin-button-row">
                          {rule.keywords.length ? (
                            rule.keywords.map((keyword) => (
                              <StatusBadge key={keyword}>{keyword}</StatusBadge>
                            ))
                          ) : (
                            <span className="admin-table-subcopy">등록된 검색용 키워드 없음</span>
                          )}
                        </div>
                        <div className="admin-table-subcopy">{rule.keywords.length}개 등록</div>
                      </td>
                      <td>
                        <div className="admin-color-cell">
                          <span
                            aria-hidden="true"
                            className="admin-color-dot"
                            style={{ background: rule.color || "#64748B" }}
                          />
                          <span>{rule.color || "#64748B"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-button-row">
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => openEditRule(rule)}
                            aria-label={`${rule.categoryName} 수정`}
                            title="검색용 키워드 수정"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button admin-icon-button--danger"
                            onClick={() => setDeleteTarget(rule)}
                            aria-label={`${rule.categoryName} 키워드 초기화`}
                            disabled={rule.keywords.length === 0}
                            title={rule.keywords.length === 0 ? "초기화할 검색용 키워드가 없습니다" : "검색용 키워드 초기화"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminStateNotice
              title={ruleItems.length ? "조건에 맞는 운영 규칙이 없습니다" : "등록된 운영 규칙이 없습니다"}
              description={
                ruleItems.length
                  ? "검색어나 미등록 필터를 조정하면 다른 카테고리 키워드를 확인할 수 있습니다."
                  : "키워드 등록 버튼으로 카테고리별 검색용 키워드를 추가할 수 있습니다."
              }
              tone="empty"
            />
          )}
        </section>
      )}

      <AdminModal
        open={ruleDialogOpen}
        title="검색용 키워드 편집"
        description="저장한 키워드는 같은 카테고리명에 공통으로 반영됩니다."
        onClose={() => setRuleDialogOpen(false)}
        width={680}
        footer={
          <>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onClick={() => setRuleDialogOpen(false)}
            >
              취소
            </button>
            <button type="button" className="admin-button" onClick={handleSaveRule} disabled={savingRule}>
              {savingRule ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <div className="admin-stack">
          {ruleErrorNotice ? (
            <AdminStateNotice
              title="운영 규칙 저장에 실패했습니다"
              description={ruleErrorNotice}
              tone="error"
              compact
            />
          ) : null}

          <div className="admin-form-grid admin-form-grid--single">
            <label className="admin-field">
              <span>카테고리명</span>
              <input
                value={ruleDraft.categoryName}
                onChange={(event) => setRuleDraft((current) => ({ ...current, categoryName: event.target.value }))}
                className="admin-input app-form-input"
                placeholder="예: 견적 요청"
                list={editingRuleId ? undefined : "admin-rule-category-options"}
                disabled={Boolean(editingRuleId)}
              />
              {!editingRuleId ? (
                <datalist id="admin-rule-category-options">
                  {ruleCategoryNames.map((categoryName) => (
                    <option key={categoryName} value={categoryName} />
                  ))}
                </datalist>
              ) : null}
              {!editingRuleId ? (
                <span className="admin-field-help">
                  실제 사용자 카테고리로 DB에 존재하는 이름만 선택할 수 있습니다.
                </span>
              ) : null}
            </label>
            <label className="admin-field">
              <span>색상</span>
              <div className="admin-color-input-row">
                <input
                  type="color"
                  value={ruleDraft.color || "#14B8A6"}
                  onChange={(event) => setRuleDraft((current) => ({ ...current, color: event.target.value }))}
                  className="admin-color-input"
                  aria-label="운영 규칙 색상 선택"
                />
                <input
                  value={ruleDraft.color}
                  onChange={(event) => setRuleDraft((current) => ({ ...current, color: event.target.value }))}
                  className="admin-input app-form-input"
                  placeholder="#14B8A6"
                />
              </div>
            </label>
            <label className="admin-field">
              <span>검색용 키워드</span>
              <textarea
                value={ruleDraft.keywordsText}
                onChange={(event) => setRuleDraft((current) => ({ ...current, keywordsText: event.target.value }))}
                className="admin-textarea app-form-input"
                rows={6}
                placeholder={"한 줄에 하나씩 입력하거나 쉼표로 구분하세요\n예: 견적\n가격\nquote"}
              />
            </label>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(deleteTarget)}
        title="검색용 키워드를 초기화할까요?"
        description="카테고리 자체는 삭제하지 않고, 같은 카테고리명에 저장된 검색용 키워드만 비웁니다."
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onClick={() => setDeleteTarget(null)}
            >
              취소
            </button>
            <button type="button" className="admin-button" onClick={handleDeleteRule} disabled={deletingRule}>
              {deletingRule ? "초기화 중..." : "초기화"}
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="admin-list-card">
            <h3>{deleteTarget.categoryName}</h3>
            <p>이 카테고리에 등록된 검색용 키워드</p>
            <p className="admin-inline-note">
              {(deleteTarget.keywords ?? []).join(", ") || "등록된 검색용 키워드 없음"}
            </p>
          </div>
        ) : null}
      </AdminModal>
    </section>
  );
}
