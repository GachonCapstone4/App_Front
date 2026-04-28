import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  BusinessCategorySnapshot,
  getBusinessCategories,
} from "../../shared/api/business";
import { getErrorMessage } from "../../shared/api/http";
import {
  createTemplate,
  deleteTemplate,
  getTemplateLibrary,
  TemplateSnapshot,
  updateTemplate,
} from "../../shared/api/templates";
import { AppStatePage } from "../../shared/ui/primitives/AppStatePage";
import { StateBanner } from "../../shared/ui/primitives/StateBanner";
import {
  formatRelativeTimeLabel,
  isRecentlyUpdatedLabel,
} from "./template-library.helpers";

interface Template {
  id: string;
  templateId?: number;
  userTemplateNo?: number | null;
  title: string;
  subject: string;
  body: string;
  confidence: number;
  category: string;
  categoryId: string;
  updatedAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface TemplateDraft {
  title: string;
  subject: string;
  body: string;
  categoryId: string;
}

const demoCategoryOptions: CategoryOption[] = [
  { id: "price", name: "가격문의" },
  { id: "complaint", name: "불만접수" },
  { id: "meeting", name: "미팅요청" },
  { id: "tech", name: "기술지원" },
  { id: "contract", name: "계약문의" },
  { id: "shipping", name: "배송문의" },
  { id: "refund", name: "환불요청" },
];

const initialTemplates: Template[] = [
  {
    id: "1",
    title: "가격 안내 템플릿",
    subject: "가격 안내 드립니다 - {{제품명}} 관련",
    body: "안녕하세요, {{고객명}}님. 문의하신 {{제품명}}의 가격 정보를 안내드립니다. 현재 기본 플랜은 월 49,000원부터 시작하며...",
    confidence: 96,
    category: "가격문의",
    categoryId: "price",
    updatedAt: "2시간 전",
  },
  {
    id: "2",
    title: "가격표 및 할인 안내 템플릿",
    subject: "가격표 및 할인 조건 안내",
    body: "안녕하세요, {{고객명}}님. 요청하신 가격표를 첨부하여 보내드립니다. 연간 결제 시 20% 할인이 적용되며...",
    confidence: 92,
    category: "가격문의",
    categoryId: "price",
    updatedAt: "1일 전",
  },
  {
    id: "3",
    title: "불만 접수 1차 응답 템플릿",
    subject: "불편을 드려 죄송합니다 - {{이슈번호}} 관련",
    body: "안녕하세요, {{고객명}}님. 말씀하신 불편 사항에 대해 진심으로 사과드립니다. 담당 부서에서 즉시 확인 후...",
    confidence: 94,
    category: "불만접수",
    categoryId: "complaint",
    updatedAt: "3시간 전",
  },
  {
    id: "4",
    title: "미팅 일정 확인 템플릿",
    subject: "미팅 일정 확인 - {{날짜}} {{시간}}",
    body: "안녕하세요, {{고객명}}님. 요청하신 미팅 일정을 아래와 같이 확인드립니다. 일시: {{날짜}} {{시간}}...",
    confidence: 89,
    category: "미팅요청",
    categoryId: "meeting",
    updatedAt: "5시간 전",
  },
  {
    id: "5",
    title: "기술 지원 접수 템플릿",
    subject: "기술 지원 요청 접수 완료 - 티켓 #{{티켓번호}}",
    body: "안녕하세요, {{고객명}}님. 기술 지원 요청이 정상적으로 접수되었습니다. 담당 엔지니어가 배정되어 24시간 이내에...",
    confidence: 91,
    category: "기술지원",
    categoryId: "tech",
    updatedAt: "1일 전",
  },
  {
    id: "6",
    title: "계약 검토 안내 템플릿",
    subject: "계약 조건 검토 결과 안내",
    body: "안녕하세요, {{고객명}}님. 요청하신 계약 조건 검토가 완료되었습니다. 주요 변경 사항은 아래와 같습니다...",
    confidence: 87,
    category: "계약문의",
    categoryId: "contract",
    updatedAt: "2일 전",
  },
  {
    id: "7",
    title: "배송 현황 안내 템플릿",
    subject: "배송 현황 안내 - 주문번호 {{주문번호}}",
    body: "안녕하세요, {{고객명}}님. 주문하신 상품의 배송 현황을 안내드립니다. 현재 배송 중이며 {{예상일자}}에...",
    confidence: 93,
    category: "배송문의",
    categoryId: "shipping",
    updatedAt: "4시간 전",
  },
  {
    id: "8",
    title: "환불 완료 안내 템플릿",
    subject: "환불 처리 완료 안내",
    body: "안녕하세요, {{고객명}}님. 요청하신 환불 처리가 완료되었습니다. 환불 금액은 {{금액}}원이며, 영업일 기준 3-5일...",
    confidence: 95,
    category: "환불요청",
    categoryId: "refund",
    updatedAt: "6시간 전",
  },
];

const emptyDraft: TemplateDraft = {
  title: "",
  subject: "",
  body: "",
  categoryId: "",
};

const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl border border-[#E2E8F0] bg-card p-5 dark:border-border">
    <div className="mb-3 h-4 w-3/4 rounded bg-[#F1F5F9] dark:bg-[#1E293B]" />
    <div className="mb-2 h-3 w-1/2 rounded bg-[#F1F5F9] dark:bg-[#1E293B]" />
    <div className="mb-2 h-3 w-full rounded bg-[#F1F5F9] dark:bg-[#1E293B]" />
    <div className="mb-4 h-3 w-2/3 rounded bg-[#F1F5F9] dark:bg-[#1E293B]" />
    <div className="flex items-center justify-between">
      <div className="h-5 w-16 rounded bg-[#F1F5F9] dark:bg-[#1E293B]" />
      <div className="flex gap-2">
        <div className="h-7 w-7 rounded bg-[#F1F5F9] dark:bg-[#1E293B]" />
        <div className="h-7 w-7 rounded bg-[#F1F5F9] dark:bg-[#1E293B]" />
      </div>
    </div>
  </div>
);

function mapCategorySnapshot(snapshot: BusinessCategorySnapshot): CategoryOption {
  return {
    id: String(snapshot.categoryId),
    name: snapshot.categoryName,
  };
}

function mapTemplateSnapshot(snapshot: TemplateSnapshot): Template {
  return {
    id: String(snapshot.templateId),
    templateId: snapshot.templateId,
    userTemplateNo: snapshot.userTemplateNo,
    title: snapshot.title,
    subject: snapshot.subjectTemplate,
    body: snapshot.bodyTemplate,
    confidence: snapshot.accuracyScore ? Number(snapshot.accuracyScore) : 0,
    category: snapshot.categoryName,
    categoryId: String(snapshot.categoryId),
    updatedAt: formatRelativeTimeLabel(snapshot.createdAt),
  };
}

function buildCategoryOptions(
  categories: CategoryOption[],
  templates: Template[],
) {
  if (categories.length > 0) {
    return categories;
  }

  const categoryMap = new Map<string, CategoryOption>();

  templates.forEach((template) => {
    if (!categoryMap.has(template.categoryId)) {
      categoryMap.set(template.categoryId, {
        id: template.categoryId,
        name: template.category,
      });
    }
  });

  return Array.from(categoryMap.values());
}

interface TemplateLibraryProps {
  scenarioId?: string | null;
}

export function TemplateLibrary({ scenarioId }: TemplateLibraryProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const createNormalScenario = scenarioId === "templates-create-normal";
  const previewNormalScenario = scenarioId === "templates-preview-normal";
  const editNormalScenario = scenarioId === "templates-edit-normal";
  const deleteNormalScenario = scenarioId === "templates-delete-normal";
  const loadErrorScenario = scenarioId === "templates-load-error";
  const emptyScenario = scenarioId === "templates-empty";
  const saveErrorScenario = scenarioId === "templates-save-error";
  const useDemoDataMode = Boolean(scenarioId?.startsWith("templates-"));
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(demoCategoryOptions);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(!useDemoDataMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [minimumConfidence, setMinimumConfidence] = useState(0);
  const [recentOnly, setRecentOnly] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  async function loadTemplateLibrary() {
    if (useDemoDataMode) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const [templateSnapshots, categorySnapshots] = await Promise.all([
        getTemplateLibrary(),
        getBusinessCategories(),
      ]);

      const nextTemplates = templateSnapshots.map(mapTemplateSnapshot);
      const nextCategories = buildCategoryOptions(
        categorySnapshots.map(mapCategorySnapshot),
        nextTemplates,
      );

      setTemplates(nextTemplates);
      setCategoryOptions(nextCategories);
    } catch (error) {
      setLoadError(getErrorMessage(error, "템플릿 라이브러리를 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (useDemoDataMode) {
      setTemplates(initialTemplates);
      setCategoryOptions(demoCategoryOptions);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    void loadTemplateLibrary();
  }, [useDemoDataMode]);

  useEffect(() => {
    if (!useDemoDataMode) {
      return;
    }

    const state = location.state as
      | { templateName?: string; emailCategory?: string }
      | null;

    if (!state?.templateName) {
      return;
    }

    setSearchQuery(state.templateName);

    if (state.emailCategory) {
      const matchedCategory = categoryOptions.find(
        (category) => category.name === state.emailCategory,
      );
      if (matchedCategory) {
        setActiveCategory(matchedCategory.id);
      }
    }

    const targetTemplateName = state.templateName;
    const matchedTemplate =
      templates.find((template) => template.title.includes(targetTemplateName)) ||
      templates.find((template) => template.subject.includes(targetTemplateName)) ||
      templates.find((template) => template.category === state.emailCategory) ||
      null;

    if (matchedTemplate) {
      setPreviewTemplate(matchedTemplate);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [categoryOptions, location.pathname, location.state, navigate, templates, useDemoDataMode]);

  useEffect(() => {
    if (!useDemoDataMode) {
      return;
    }

    if (!emptyScenario) {
      return;
    }

    setSearchQuery("없는 템플릿");
    setActiveCategory("all");
    setMinimumConfidence(0);
    setRecentOnly(false);
    setPreviewTemplate(null);
  }, [emptyScenario, useDemoDataMode]);

  useEffect(() => {
    if (!useDemoDataMode) {
      return;
    }

    if (createNormalScenario) {
      setActiveCategory("all");
      setSearchQuery("");
      setPreviewTemplate(null);
      setEditingTemplateId(null);
      setDraft({
        title: "도입 상담 미팅 제안 템플릿",
        subject: "도입 상담 미팅 일정 제안",
        body: "안녕하세요, {{고객명}}님. 요청하신 도입 상담을 위해 가능한 일정을 제안드립니다.",
        categoryId: "meeting",
      });
      setEditorOpen(true);
      return;
    }

    if (previewNormalScenario) {
      setActiveCategory("all");
      setSearchQuery("");
      setPreviewTemplate(initialTemplates[0]);
      setEditorOpen(false);
      return;
    }

    if (editNormalScenario) {
      setActiveCategory("all");
      setSearchQuery("");
      setPreviewTemplate(null);
      setEditingTemplateId("1");
      setDraft({
        title: "가격 안내 템플릿",
        subject: "가격 안내 드립니다 - {{제품명}} 관련",
        body: "안녕하세요, {{고객명}}님. 문의하신 {{제품명}}의 가격 정보를 안내드립니다. 현재 기본 플랜은 월 49,000원부터 시작하며...",
        categoryId: "price",
      });
      setEditorOpen(true);
      return;
    }

    if (deleteNormalScenario) {
      setActiveCategory("all");
      setSearchQuery("");
      setPreviewTemplate(null);
      setEditorOpen(false);
      setDeleteTarget(initialTemplates[1]);
      return;
    }

    if (!saveErrorScenario) {
      return;
    }

    setEditingTemplateId("3");
    setDraft({
      title: "불만 접수 1차 응답 템플릿",
      subject: "불만 접수 확인 안내",
      body: "안녕하세요, {{고객명}}님. 접수해 주신 내용을 확인 중입니다.",
      categoryId: "complaint",
    });
    setEditorOpen(true);
  }, [
    createNormalScenario,
    deleteNormalScenario,
    editNormalScenario,
    previewNormalScenario,
    saveErrorScenario,
    useDemoDataMode,
  ]);

  const categories = useMemo(
    () => [
      { id: "all", name: "전체", count: templates.length },
      ...categoryOptions.map((category) => ({
        ...category,
        count: templates.filter((template) => template.categoryId === category.id).length,
      })),
    ],
    [categoryOptions, templates],
  );

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) => {
        const matchedCategory =
          activeCategory === "all" || template.categoryId === activeCategory;
        const matchedSearch =
          !searchQuery ||
          template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchedConfidence = template.confidence >= minimumConfidence;
        const matchedRecency = !recentOnly || isRecentlyUpdatedLabel(template.updatedAt);

        return matchedCategory && matchedSearch && matchedConfidence && matchedRecency;
      }),
    [activeCategory, minimumConfidence, recentOnly, searchQuery, templates],
  );

  const showEmpty = !isLoading && !loadError && filteredTemplates.length === 0;
  const selectedCategoryLabel =
    categoryOptions.find((category) => category.id === draft.categoryId)?.name ||
    "카테고리를 선택하세요";
  const isCategoryLocked = Boolean(editingTemplateId) && !useDemoDataMode;

  const getConfidenceColor = (score: number) => {
    if (score >= 95) {
      return "bg-[#10B981]/10 text-[#10B981] dark:bg-[#102317] dark:text-[#86EFAC]";
    }
    if (score >= 90) {
      return "bg-[#2DD4BF]/10 text-[#0D9488] dark:bg-[#0B2728] dark:text-[#5EEAD4]";
    }
    if (score >= 85) {
      return "bg-[#F59E0B]/10 text-[#D97706] dark:bg-[#24190F] dark:text-[#F4C98A]";
    }
    return "bg-[#94A3B8]/10 text-[#64748B] dark:bg-[#1E293B] dark:text-[#CBD5E1]";
  };

  const openCreateDialog = (template?: Template) => {
    setEditingTemplateId(template?.id || null);
    setDraft(
      template
        ? {
            title: template.title,
            subject: template.subject,
            body: template.body,
            categoryId: template.categoryId,
          }
        : {
            ...emptyDraft,
            categoryId: categoryOptions[0]?.id || "",
          },
    );
    setEditorOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!draft.title.trim() || !draft.subject.trim() || !draft.body.trim()) {
      toast.error("템플릿 이름과 메일 제목, 본문을 입력하세요.");
      return;
    }

    if (!draft.categoryId) {
      toast.error("카테고리를 선택하세요.");
      return;
    }

    if (saveErrorScenario) {
      toast.error("템플릿을 저장하지 못했습니다.");
      return;
    }

    const selectedCategory = categoryOptions.find(
      (category) => category.id === draft.categoryId,
    );

    if (!selectedCategory) {
      toast.error("유효한 카테고리를 선택하세요.");
      return;
    }

    setIsSaving(true);

    try {
      if (useDemoDataMode) {
        if (editingTemplateId) {
          const nextTemplate = {
            id: editingTemplateId,
            title: draft.title.trim(),
            subject: draft.subject.trim(),
            body: draft.body.trim(),
            category: selectedCategory.name,
            categoryId: selectedCategory.id,
            confidence:
              templates.find((template) => template.id === editingTemplateId)?.confidence || 90,
            updatedAt: "방금 전",
          } satisfies Template;

          setTemplates((current) =>
            current.map((template) =>
              template.id === editingTemplateId ? nextTemplate : template,
            ),
          );
          if (previewTemplate?.id === editingTemplateId) {
            setPreviewTemplate(nextTemplate);
          }
          toast.success("템플릿을 수정했습니다.");
        } else {
          const newTemplate: Template = {
            id: String(Date.now()),
            title: draft.title.trim(),
            subject: draft.subject.trim(),
            body: draft.body.trim(),
            category: selectedCategory.name,
            categoryId: selectedCategory.id,
            confidence: 90,
            updatedAt: "방금 전",
          };
          setTemplates((current) => [newTemplate, ...current]);
          setPreviewTemplate(newTemplate);
          setActiveCategory("all");
          toast.success("새 템플릿을 생성했습니다.");
        }
      } else if (editingTemplateId) {
        const savedTemplate = await updateTemplate(Number(editingTemplateId), {
          title: draft.title.trim(),
          subjectTemplate: draft.subject.trim(),
          bodyTemplate: draft.body.trim(),
        });
        const nextTemplate = mapTemplateSnapshot(savedTemplate);

        setTemplates((current) =>
          current.map((template) =>
            template.id === editingTemplateId ? nextTemplate : template,
          ),
        );
        if (previewTemplate?.id === editingTemplateId) {
          setPreviewTemplate(nextTemplate);
        }
        toast.success("템플릿을 수정했습니다.");
      } else {
        const savedTemplate = await createTemplate({
          categoryId: Number(draft.categoryId),
          title: draft.title.trim(),
          subjectTemplate: draft.subject.trim(),
          bodyTemplate: draft.body.trim(),
        });
        const nextTemplate = mapTemplateSnapshot(savedTemplate);

        setTemplates((current) => [nextTemplate, ...current]);
        setPreviewTemplate(nextTemplate);
        setActiveCategory("all");
        toast.success("새 템플릿을 생성했습니다.");
      }

      setEditorOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "템플릿을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) {
      return;
    }

    if (useDemoDataMode) {
      setTemplates((current) =>
        current.filter((template) => template.id !== deleteTarget.id),
      );
      if (previewTemplate?.id === deleteTarget.id) {
        setPreviewTemplate(null);
      }
      toast.success("템플릿을 삭제했습니다.");
      setDeleteTarget(null);
      return;
    }

    if (!deleteTarget.templateId) {
      toast.error("삭제할 템플릿 정보를 찾지 못했습니다.");
      return;
    }

    setIsDeleting(true);

    try {
      await deleteTemplate(deleteTarget.templateId);
      setTemplates((current) =>
        current.filter((template) => template.id !== deleteTarget.id),
      );
      if (previewTemplate?.id === deleteTarget.id) {
        setPreviewTemplate(null);
      }
      toast.success("템플릿을 삭제했습니다.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "템플릿을 삭제하지 못했습니다."));
    } finally {
      setIsDeleting(false);
    }
  };

  const runRefresh = () => {
    if (useDemoDataMode) {
      setIsLoading(true);
      window.setTimeout(() => {
        setIsLoading(false);
        toast.success("필터를 적용했습니다.");
      }, 600);
      return;
    }

    void (async () => {
      await loadTemplateLibrary();
      toast.success("템플릿 목록을 새로고침했습니다.");
    })();
  };

  if (loadErrorScenario) {
    return (
      <AppStatePage
        title="템플릿 라이브러리를 불러오지 못했습니다"
        description="템플릿 목록과 카테고리 집계를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (loadError) {
    return (
      <AppStatePage
        title="템플릿 라이브러리를 불러오지 못했습니다"
        description={loadError}
        action={
          <button
            type="button"
            onClick={() => void loadTemplateLibrary()}
            className="app-cta-primary inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            다시 시도
          </button>
        }
      />
    );
  }

  return (
    <>
      <div className="flex h-full w-full min-h-0 min-w-0 overflow-hidden bg-background">
        <div className="scrollbar-none hidden w-[240px] shrink-0 overflow-y-auto border-r border-[#E2E8F0] bg-card p-4 dark:border-border lg:block">
          <p className="mb-3 px-3 text-[11px] uppercase tracking-wider text-[#94A3B8] dark:text-muted-foreground">
            카테고리
          </p>
          <div className="space-y-0.5">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors ${
                  activeCategory === category.id
                    ? "app-cta-primary"
                    : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E2A3A] dark:text-muted-foreground dark:hover:bg-[#131D2F] dark:hover:text-foreground"
                }`}
              >
                <span>{category.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                    activeCategory === category.id
                      ? "bg-white/20 text-white"
                      : "bg-[#F1F5F9] text-[#94A3B8] dark:bg-[#1E293B] dark:text-muted-foreground"
                  }`}
                >
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {useDemoDataMode ? (
            <StateBanner
              title="데모 데이터 모드"
              description="시나리오용 목업 데이터를 그대로 유지하고 있습니다. 실제 백엔드 연결 상태는 일반 진입 경로에서 확인할 수 있습니다."
              tone="info"
              className="mb-5"
            />
          ) : null}

          {saveErrorScenario ? (
            <StateBanner
              title="템플릿 저장을 완료하지 못했습니다"
              description="편집 내용은 유지되었지만 저장 응답이 지연되고 있습니다. 다시 시도해 주세요."
              tone="error"
              className="mb-5"
            />
          ) : null}

          {!useDemoDataMode && categoryOptions.length === 0 ? (
            <StateBanner
              title="등록된 카테고리가 없습니다"
              description="템플릿을 새로 만들려면 비즈니스 프로필에서 카테고리를 먼저 등록해 주세요."
              tone="warning"
              className="mb-5"
            />
          ) : null}

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8] dark:text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="템플릿 검색..."
                className="app-form-input h-11 w-full rounded-lg py-2.5 pl-10 pr-4 text-[14px]"
              />
            </div>

            <Select value={activeCategory} onValueChange={setActiveCategory}>
              <SelectTrigger className="app-form-input h-11 rounded-lg px-3 text-[13px] lg:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="app-select-content rounded-2xl p-1">
                {categories.map((category) => (
                  <SelectItem
                    key={category.id}
                    value={category.id}
                    className="app-select-item rounded-xl px-3 py-2 text-[13px]"
                  >
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <button className="app-secondary-button hidden items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] sm:flex">
                  <Filter className="h-4 w-4" />
                  필터
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-4 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">정확도 기준</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[0, 85, 90, 95].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setMinimumConfidence(score)}
                        className={`rounded-full px-3 py-1 text-xs transition ${
                          minimumConfidence === score
                            ? "app-cta-primary"
                            : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E293B] dark:text-muted-foreground"
                        }`}
                      >
                        {score === 0 ? "전체" : `${score}% 이상`}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRecentOnly((current) => !current)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                    recentOnly
                      ? "border-[#2DD4BF] bg-[#2DD4BF]/5 text-[#0F766E]"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  최근 수정 템플릿만 보기
                  <span>{recentOnly ? "ON" : "OFF"}</span>
                </button>
                <button
                  type="button"
                  onClick={runRefresh}
                  className="app-cta-primary w-full rounded-xl px-4 py-2 text-sm"
                >
                  적용
                </button>
              </PopoverContent>
            </Popover>

            <button
              onClick={() => openCreateDialog()}
              className="app-cta-accent flex items-center gap-2 rounded-lg px-4 py-2.5 shadow-sm"
              disabled={!useDemoDataMode && categoryOptions.length === 0}
            >
              <Plus className="h-4 w-4" />
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden text-[13px] sm:inline">새 템플릿 생성</span>
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : null}

          {showEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9] dark:bg-[#1E293B]">
                <Sparkles className="h-8 w-8 text-[#CBD5E1] dark:text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-[#1E2A3A] dark:text-foreground">템플릿이 없습니다</h3>
              <p className="mb-6 max-w-[320px] text-[13px] text-[#94A3B8] dark:text-muted-foreground">
                현재 필터 조건에 맞는 템플릿이 없습니다. 새 템플릿을 생성하거나
                필터를 조정해 보세요.
              </p>
              <button
                onClick={() => openCreateDialog()}
                className="app-cta-accent flex items-center gap-2 rounded-lg px-5 py-2.5"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[13px]">첫 번째 템플릿 생성</span>
              </button>
            </div>
          ) : null}

          {!isLoading && !showEmpty ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setPreviewTemplate(template)}
                  className="group rounded-xl border border-[#E2E8F0] bg-card p-5 text-left transition-all hover:border-[#CBD5E1] hover:shadow-md dark:border-border dark:hover:bg-[#131D2F] dark:hover:border-[#475569]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-[#1E2A3A] px-2 py-0.5 text-[11px] text-white dark:bg-[#E2E8F0] dark:text-[#111827]">
                        ID {template.userTemplateNo ?? template.id}
                      </span>
                      <span className="inline-flex rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] text-[#64748B] dark:bg-[#1E293B] dark:text-muted-foreground">
                        {template.category}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="text-[#94A3B8] opacity-0 transition-opacity hover:text-[#64748B] group-hover:opacity-100 dark:text-muted-foreground dark:hover:text-foreground"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                          미리보기
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openCreateDialog(template)}>
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(template)}
                        >
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h4 className="mb-2 line-clamp-1 text-[14px] text-[#1E2A3A] dark:text-foreground">
                    {template.title}
                  </h4>
                  <p className="mb-2 line-clamp-1 text-[12px] text-[#64748B] dark:text-muted-foreground">
                    메일 제목: {template.subject}
                  </p>
                  <p className="mb-4 min-h-[36px] line-clamp-2 text-[12px] text-[#94A3B8] dark:text-muted-foreground">
                    {template.body}
                  </p>

                  <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-3 dark:border-border">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${getConfidenceColor(
                        template.confidence,
                      )}`}
                    >
                      {template.confidence}% 정확도
                    </span>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openCreateDialog(template);
                        }}
                        className="rounded-md p-1.5 text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E2A3A] dark:text-muted-foreground dark:hover:bg-[#1E293B] dark:hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(template);
                        }}
                        className="rounded-md p-1.5 text-[#94A3B8] transition-colors hover:bg-[#FEF2F2] hover:text-[#EF4444] dark:text-muted-foreground dark:hover:bg-[#3F1D24] dark:hover:text-[#FCA5A5]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-[10px] text-[#CBD5E1] dark:text-[#64748B]">
                    {template.updatedAt} 수정됨
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.title}</DialogTitle>
            <DialogDescription>
              ID {previewTemplate?.userTemplateNo ?? previewTemplate?.id} · {previewTemplate?.category} · {previewTemplate?.confidence}% 정확도
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-7 text-foreground">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                메일 제목
              </p>
              <p>{previewTemplate?.subject}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-7 text-foreground">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                본문 템플릿
              </p>
              <p>{previewTemplate?.body}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              마지막 표시 시간: {previewTemplate?.updatedAt}
            </p>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
              onClick={() => previewTemplate && openCreateDialog(previewTemplate)}
            >
              수정
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplateId ? "템플릿 수정" : "새 템플릿 생성"}
            </DialogTitle>
            <DialogDescription>
              템플릿 이름과 메일 제목, 본문을 입력하면 라이브러리에 즉시 반영됩니다.
            </DialogDescription>
          </DialogHeader>

          {saveErrorScenario ? (
            <StateBanner
              title="템플릿 저장을 완료하지 못했습니다"
              description="입력한 내용은 그대로 유지됩니다. 네트워크 상태를 확인한 뒤 다시 저장해 주세요."
              tone="error"
            />
          ) : null}

          <div className="space-y-4">
            <label className="block space-y-2 text-sm text-foreground">
              <span>카테고리</span>
              <Select
                disabled={isCategoryLocked}
                value={draft.categoryId}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    categoryId: value,
                  }))
                }
              >
                <SelectTrigger className="app-form-input h-11 w-full rounded-xl px-4 text-sm">
                  <SelectValue placeholder={selectedCategoryLabel} />
                </SelectTrigger>
                <SelectContent className="app-select-content rounded-2xl p-1">
                  {categoryOptions.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="app-select-item rounded-xl px-3 py-2.5 text-sm"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isCategoryLocked ? (
                <p className="text-xs text-muted-foreground">
                  기존 템플릿의 카테고리 변경은 아직 지원되지 않습니다. 다른 카테고리로 만들려면 새 템플릿으로 등록해 주세요.
                </p>
              ) : null}
            </label>

            <label className="block space-y-2 text-sm text-foreground">
              <span>템플릿 이름</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="app-form-input h-11 w-full rounded-xl px-4 text-sm"
              />
            </label>

            <label className="block space-y-2 text-sm text-foreground">
              <span>메일 제목</span>
              <input
                value={draft.subject}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                className="app-form-input h-11 w-full rounded-xl px-4 text-sm"
              />
            </label>

            <label className="block space-y-2 text-sm text-foreground">
              <span>본문</span>
              <textarea
                rows={6}
                value={draft.body}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                className="app-form-input w-full rounded-xl px-4 py-3 text-sm"
              />
            </label>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
              onClick={() => setEditorOpen(false)}
              disabled={isSaving}
            >
              취소
            </button>
            <button
              type="button"
              className="app-cta-primary rounded-xl px-4 py-2 text-sm"
              onClick={() => void handleSaveTemplate()}
              disabled={isSaving}
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>템플릿을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" 템플릿은 라이브러리에서 제거됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteTemplate()} disabled={isDeleting}>
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
