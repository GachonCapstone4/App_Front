import { useEffect, useRef, useState } from "react";
import {
  Building2,
  FileText,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  businessTypeOptions,
  categoryColorPalette,
  getBusinessTypeLabel,
  getRecommendedCategoriesForDomain,
  recommendedCategoryOptions,
  type RecommendedCategoryOption,
} from "../../shared/config/onboarding-options";
import { formatKstCompactDate } from "../../shared/lib/date-time";
import {
  BusinessCategorySnapshot,
  createBusinessFaq,
  createBusinessCategory,
  deleteBusinessCategory,
  deleteBusinessFaq,
  deleteBusinessFile,
  FaqSnapshot,
  getBusinessFaqs,
  getBusinessProfile,
  getBusinessResources,
  getBusinessCategories,
  getTemplates,
  regenerateBusinessTemplates,
  TemplateSummarySnapshot,
  updateBusinessFaq,
  uploadBusinessFile,
  upsertBusinessProfile,
} from "../../shared/api/business";
import { getErrorMessage } from "../../shared/api/http";
import {
  generateInitialBusinessTemplates,
  getTemplateGenerationJobs,
} from "../../shared/api/onboarding";
import { subscribeAppEvent } from "../../shared/lib/app-event-stream";
import {
  getTemplateJobStatusLabel,
  getTemplateJobTitle,
  resolveProgressFromEvent,
  resolveProgressFromJobs,
  type TemplateJobProgressState,
} from "./business-profile.helpers";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { AppStatePage } from "../../shared/ui/primitives/AppStatePage";
import { StateBanner } from "../../shared/ui/primitives/StateBanner";
import { AiUsageBadge } from "../../shared/ui/primitives/AiUsageBadge";

const toneOptions = [
  { id: "formal", label: "격식체" },
  { id: "neutral", label: "중립" },
  { id: "friendly", label: "친근한" },
] as const;

type ToneId = (typeof toneOptions)[number]["id"];

interface UploadedFile {
  id: string;
  name: string;
  uploadDate: string;
  resourceId?: number;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  faqId?: number;
}

interface FAQDraft {
  question: string;
  answer: string;
}

interface TemplateSelectionItem {
  id: string;
  title: string;
  categoryId: number | null;
  categoryName: string;
}

interface BusinessCategoryItem {
  id: string;
  categoryId?: number;
  name: string;
  domain: string;
  color: string;
}

const TEMPLATE_JOB_PROGRESS_STORAGE_KEY = "emailassist-template-job-progress";

const demoUploadedFiles: UploadedFile[] = [
  { id: "1", name: "비즈니스_매뉴얼.pdf", uploadDate: "2025.01.15" },
  { id: "2", name: "제품_가이드.pdf", uploadDate: "2025.03.01" },
];

const demoFaqItems: FAQItem[] = [
  {
    id: "1",
    question: "환불 정책은?",
    answer: "14일 이내 전액 환불 가능합니다.",
  },
  {
    id: "2",
    question: "기술 지원 시간은?",
    answer: "평일 09:00 ~ 18:00 (KST)",
  },
];

const demoTemplates: TemplateSelectionItem[] = [
  { id: "1", title: "가격 안내 템플릿", categoryId: 1, categoryName: "가격 협상" },
  { id: "4", title: "미팅 일정 확인 템플릿", categoryId: 2, categoryName: "미팅 일정 조율" },
  { id: "5", title: "기술 지원 접수 템플릿", categoryId: 3, categoryName: "기술 지원 요청" },
  { id: "6", title: "계약 안내 템플릿", categoryId: 4, categoryName: "계약 문의" },
];

const demoCategories: BusinessCategoryItem[] = [
  { id: "1", categoryId: 1, name: "가격 협상", domain: "Sales", color: "#3B82F6" },
  { id: "2", categoryId: 2, name: "미팅 일정 조율", domain: "Sales", color: "#3B82F6" },
  { id: "3", categoryId: 3, name: "기술 지원 요청", domain: "Customer Support", color: "#EF4444" },
  { id: "4", categoryId: 4, name: "계약 문의", domain: "Sales", color: "#3B82F6" },
];

const emptyFaqDraft: FAQDraft = {
  question: "",
  answer: "",
};

interface BusinessProfileProps {
  scenarioId?: string | null;
}

function formatDateLabel(value: string) {
  return formatKstCompactDate(value);
}

function mapApiToneToUi(value: string | null | undefined): ToneId {
  if (value === "FORMAL") {
    return "formal";
  }
  if (value === "FRIENDLY") {
    return "friendly";
  }
  return "neutral";
}

function mapUiToneToApi(value: ToneId): "FORMAL" | "NEUTRAL" | "FRIENDLY" {
  if (value === "formal") {
    return "FORMAL";
  }
  if (value === "friendly") {
    return "FRIENDLY";
  }
  return "NEUTRAL";
}

function mapFaqSnapshot(snapshot: FaqSnapshot): FAQItem {
  return {
    id: String(snapshot.faqId),
    faqId: snapshot.faqId,
    question: snapshot.question,
    answer: snapshot.answer,
  };
}

function mapTemplateSnapshot(snapshot: TemplateSummarySnapshot): TemplateSelectionItem {
  return {
    id: String(snapshot.templateId),
    title: snapshot.title,
    categoryId: snapshot.categoryId,
    categoryName: snapshot.categoryName,
  };
}

function mapCategorySnapshot(
  snapshot: BusinessCategorySnapshot,
  fallbackDomain: string,
): BusinessCategoryItem {
  return {
    id: String(snapshot.categoryId),
    categoryId: snapshot.categoryId,
    name: snapshot.categoryName,
    domain: fallbackDomain || "사용자 정의",
    color:
      snapshot.color ??
      recommendedCategoryOptions.find((option) => option.name === snapshot.categoryName)?.color ??
      categoryColorPalette[0],
  };
}

function readStoredTemplateJobProgress() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(TEMPLATE_JOB_PROGRESS_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as TemplateJobProgressState;
    if (!Array.isArray(parsed.jobIds) || typeof parsed.updatedAt !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredTemplateJobProgress(progress: TemplateJobProgressState | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!progress) {
    window.localStorage.removeItem(TEMPLATE_JOB_PROGRESS_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(TEMPLATE_JOB_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function BusinessProfile({ scenarioId }: BusinessProfileProps) {
  const faqDialogNormalScenario = scenarioId === "profile-faq-dialog-normal";
  const faqDeleteNormalScenario = scenarioId === "profile-faq-delete-normal";
  const regenerateBulkNormalScenario =
    scenarioId === "profile-regenerate-bulk-normal";
  const regenerateSelectNormalScenario =
    scenarioId === "profile-regenerate-select-normal";
  const saveErrorScenario = scenarioId === "profile-save-error";
  const uploadErrorScenario = scenarioId === "profile-upload-error";
  const faqSaveErrorScenario = scenarioId === "profile-faq-save-error";
  const regenerateErrorScenario = scenarioId === "profile-regenerate-error";
  const useDemoDataMode = Boolean(scenarioId?.startsWith("profile-"));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const categoryComposerRef = useRef<HTMLDivElement | null>(null);
  const [businessType, setBusinessType] = useState("Sales");
  const [tone, setTone] = useState<ToneId>("neutral");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [faqItems, setFAQItems] = useState<FAQItem[]>([]);
  const [templateOptions, setTemplateOptions] = useState<TemplateSelectionItem[]>([]);
  const [categories, setCategories] = useState<BusinessCategoryItem[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(useDemoDataMode);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqDraft, setFaqDraft] = useState<FAQDraft>(emptyFaqDraft);
  const [faqDeleteTarget, setFaqDeleteTarget] = useState<FAQItem | null>(null);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<BusinessCategoryItem | null>(null);
  const [regenerateMode, setRegenerateMode] = useState<"bulk" | "select" | "initial" | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(!useDemoDataMode);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [templateJobProgress, setTemplateJobProgress] =
    useState<TemplateJobProgressState | null>(() => readStoredTemplateJobProgress());
  const [loadError, setLoadError] = useState<string | null>(null);

  const impactedCount = templateOptions.length;
  const hasGeneratedTemplates = impactedCount > 0;
  const templatesBySelectedCategories = templateOptions.filter(
    (template) =>
      typeof template.categoryId === "number" &&
      selectedCategoryIds.includes(template.categoryId),
  );
  const canInitialGenerate =
    !hasGeneratedTemplates && selectedCategoryIds.length > 0;
  const canRegenerate = hasGeneratedTemplates;
  const canSubmitTemplateAction =
    regenerateMode === "initial"
      ? canInitialGenerate
      : regenerateMode === "bulk"
        ? templatesBySelectedCategories.length > 0
        : selectedTemplates.length > 0;
  const availableCategorySuggestions = recommendedCategoryOptions.filter(
    (option) => !categories.some((category) => category.name === option.name),
  );
  const recommendedCategoriesForBusinessType = getRecommendedCategoriesForDomain(businessType);

  useEffect(() => {
    let cancelled = false;

    if (useDemoDataMode) {
      setBusinessType("Sales");
      setTone("neutral");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답 및 템플릿 생성 기능을 제공합니다."
      );
      setUploadedFiles(demoUploadedFiles);
      setFAQItems(demoFaqItems);
      setTemplateOptions(demoTemplates);
      setCategories(demoCategories);
      setSelectedCategoryIds(demoCategories.map((category) => category.categoryId ?? 0).filter(Boolean));
      setSelectedTemplates(demoTemplates.slice(0, 2).map((template) => template.id));
      setHasChanges(true);
      setIsLoading(false);
      setLoadError(null);
      return () => {
        cancelled = true;
      };
    }

    async function loadBusinessProfile() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [profile, resources, faqs, templates, categories] = await Promise.all([
          getBusinessProfile(),
          getBusinessResources(),
          getBusinessFaqs(),
          getTemplates(),
          getBusinessCategories(),
        ]);

        if (cancelled) {
          return;
        }

        setBusinessType(profile?.industryType || businessTypeOptions[0].value);
        setTone(mapApiToneToUi(profile?.emailTone));
        setDescription(profile?.companyDescription || "");
        setUploadedFiles(
          resources.map((resource) => ({
            id: String(resource.resourceId),
            resourceId: resource.resourceId,
            name: resource.fileName,
            uploadDate: formatDateLabel(resource.createdAt),
          }))
        );
        setFAQItems(faqs.map(mapFaqSnapshot));
        setTemplateOptions(templates.map(mapTemplateSnapshot));
        const nextCategories = categories.map((category) =>
          mapCategorySnapshot(category, profile?.industryType || businessTypeOptions[0].value),
        );
        setCategories(nextCategories);
        setSelectedCategoryIds(nextCategories.map((category) => category.categoryId ?? 0).filter(Boolean));
        setSelectedTemplates(templates.slice(0, 2).map((template) => String(template.templateId)));
        setHasChanges(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadError(getErrorMessage(error));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBusinessProfile();

    return () => {
      cancelled = true;
    };
  }, [useDemoDataMode]);

  useEffect(() => {
    if (faqDialogNormalScenario) {
      setFaqDialogOpen(true);
      setEditingFaqId(null);
      setFaqDraft({
        question: "도입 상담은 어느 채널로 진행되나요?",
        answer: "기본적으로 이메일 응답 후 미팅 링크를 함께 안내합니다.",
      });
      return;
    }

    if (faqDeleteNormalScenario) {
      const target = faqItems.find((item) => item.id === "2") || faqItems[0] || null;
      setFaqDeleteTarget(target);
      return;
    }

    if (regenerateBulkNormalScenario) {
      setRegenerateMode("bulk");
      return;
    }

    if (regenerateSelectNormalScenario) {
      setRegenerateMode("select");
      return;
    }

    if (faqSaveErrorScenario) {
      const target = faqItems[0];
      setFaqDialogOpen(true);
      setEditingFaqId(target?.id || null);
      setFaqDraft({
        question: target?.question || "환불 정책은?",
        answer: "환불 정책 문구를 최신 기준으로 수정해 주세요.",
      });
      return;
    }

    if (regenerateErrorScenario) {
      setRegenerateMode("bulk");
    }
  }, [
    faqDeleteNormalScenario,
    faqDialogNormalScenario,
    faqItems,
    faqSaveErrorScenario,
    regenerateBulkNormalScenario,
    regenerateErrorScenario,
    regenerateSelectNormalScenario,
  ]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!categoryComposerRef.current?.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    writeStoredTemplateJobProgress(templateJobProgress);
  }, [templateJobProgress]);

  useEffect(() => {
    if (!templateJobProgress?.jobIds.length) {
      return undefined;
    }

    if (templateJobProgress.status === "COMPLETED" || templateJobProgress.status === "FAILED") {
      return undefined;
    }

    let disposed = false;

    const refreshProgress = async () => {
      try {
        const response = await getTemplateGenerationJobs(templateJobProgress.jobIds);
        if (disposed) {
          return;
        }

        setTemplateJobProgress((current) => {
          if (!current || current.jobIds.join(",") !== templateJobProgress.jobIds.join(",")) {
            return current;
          }

          return resolveProgressFromJobs(current, response.jobs);
        });

        if (response.allCompleted || response.hasFailure) {
          void Promise.all([getTemplates(), getBusinessCategories()])
            .then(([templates, nextCategories]) => {
              if (disposed) {
                return;
              }

              setTemplateOptions(templates.map(mapTemplateSnapshot));
              setCategories(
                nextCategories.map((category) =>
                  mapCategorySnapshot(category, businessType),
                ),
              );
            })
            .catch(() => undefined);
        }
      } catch {
        if (!disposed) {
          setTemplateJobProgress((current) =>
            current
              ? {
                  ...current,
                  message: "작업 상태를 확인하지 못했습니다. 잠시 후 다시 시도합니다.",
                  updatedAt: Date.now(),
                }
              : current,
          );
        }
      }
    };

    const unsubscribe = subscribeAppEvent("rag-job-updated", (payload) => {
      setTemplateJobProgress((current) =>
        current ? resolveProgressFromEvent(current, payload) : current,
      );
    });
    void refreshProgress();
    const pollingId = window.setInterval(() => {
      void refreshProgress();
    }, 5000);

    return () => {
      disposed = true;
      unsubscribe();
      window.clearInterval(pollingId);
    };
  }, [businessType, templateJobProgress?.jobIds.join(","), templateJobProgress?.status]);

  const markChanged = () => setHasChanges(true);

  const startTemplateJobProgress = (progress: TemplateJobProgressState) => {
    setTemplateJobProgress(progress);
    writeStoredTemplateJobProgress(progress);
  };

  const toggleSelectedCategory = (categoryId: number) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId],
    );
  };

  const createCategoryItem = async (
    categoryName: string,
    source?: RecommendedCategoryOption,
  ) => {
    if (categories.some((category) => category.name === categoryName)) {
      toast.error("이미 추가된 카테고리입니다.");
      return;
    }

    const nextCategory = source ?? {
      id: `category-${Date.now()}`,
      name: categoryName,
      domain: businessType || "사용자 정의",
      color:
        recommendedCategoriesForBusinessType[0]?.color ??
        categoryColorPalette[Math.floor(Math.random() * categoryColorPalette.length)],
    };

    if (useDemoDataMode) {
      const demoCategoryId = Date.now();
      setCategories((current) => [
        ...current,
        {
          ...nextCategory,
          id: String(demoCategoryId),
          categoryId: demoCategoryId,
        },
      ]);
      setSelectedCategoryIds((current) => [...current, demoCategoryId]);
      setNewCategory("");
      setCategoryDropdownOpen(false);
      return;
    }

    try {
      setIsSavingCategory(true);
      const savedCategory = await createBusinessCategory({
        categoryName,
        color: nextCategory.color,
      });
      const savedItem = {
        ...nextCategory,
        id: String(savedCategory.categoryId),
        categoryId: savedCategory.categoryId,
        color: savedCategory.color ?? nextCategory.color,
      };
      setCategories((current) => [...current, savedItem]);
      setSelectedCategoryIds((current) => [...current, savedCategory.categoryId]);
      setNewCategory("");
      setCategoryDropdownOpen(false);
      toast.success("카테고리를 추가했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "카테고리를 추가하지 못했습니다."));
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleAddCategory = async () => {
    const categoryName = newCategory.trim();

    if (!categoryName) {
      return;
    }

    const suggestedCategory = availableCategorySuggestions.find(
      (option) => option.name === categoryName,
    );
    await createCategoryItem(categoryName, suggestedCategory);
  };

  const handleRemoveCategory = async (category: BusinessCategoryItem) => {
    if (useDemoDataMode || !category.categoryId) {
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setTemplateOptions((current) =>
        current.filter((template) => template.categoryId !== category.categoryId),
      );
      setSelectedCategoryIds((current) =>
        current.filter((categoryId) => categoryId !== category.categoryId),
      );
      setCategoryDeleteTarget(null);
      return;
    }

    try {
      setIsSavingCategory(true);
      await deleteBusinessCategory(category.categoryId);
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setTemplateOptions((current) =>
        current.filter((template) => template.categoryId !== category.categoryId),
      );
      setSelectedCategoryIds((current) =>
        current.filter((categoryId) => categoryId !== category.categoryId),
      );
      setCategoryDeleteTarget(null);
      toast.success("카테고리를 삭제했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "카테고리를 삭제하지 못했습니다."));
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSaveProfile = async () => {
    if (saveErrorScenario) {
      toast.error("비즈니스 프로필을 저장하지 못했습니다.");
      return;
    }

    if (useDemoDataMode) {
      setHasChanges(false);
      toast.success("비즈니스 프로필을 저장했습니다.");
      return;
    }

    try {
      setIsSavingProfile(true);
      await upsertBusinessProfile({
        industryType: businessType,
        companyDescription: description,
        emailTone: mapUiToneToApi(tone),
      });
      setHasChanges(false);
      toast.success("비즈니스 프로필을 저장했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRemoveFile = async (id: string) => {
    const target = uploadedFiles.find((file) => file.id === id);

    if (!target) {
      return;
    }

    if (useDemoDataMode) {
      setUploadedFiles((current) => current.filter((file) => file.id !== id));
      markChanged();
      toast.success("파일을 제거했습니다.");
      return;
    }

    try {
      if (target.resourceId) {
        await deleteBusinessFile(target.resourceId);
      }
      setUploadedFiles((current) => current.filter((file) => file.id !== id));
      markChanged();
      toast.success("파일을 제거했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openFaqDialog = (item?: FAQItem) => {
    setEditingFaqId(item?.id || null);
    setFaqDraft(
      item
        ? { question: item.question, answer: item.answer }
        : emptyFaqDraft
    );
    setFaqDialogOpen(true);
  };

  const handleSaveFaq = async () => {
    if (!faqDraft.question.trim() || !faqDraft.answer.trim()) {
      toast.error("질문과 답변을 모두 입력하세요.");
      return;
    }

    if (faqSaveErrorScenario) {
      toast.error("FAQ 항목을 저장하지 못했습니다.");
      return;
    }

    if (useDemoDataMode) {
      if (editingFaqId) {
        setFAQItems((current) =>
          current.map((item) =>
            item.id === editingFaqId
              ? {
                  ...item,
                  question: faqDraft.question.trim(),
                  answer: faqDraft.answer.trim(),
                }
              : item
          )
        );
        toast.success("FAQ 항목을 수정했습니다.");
      } else {
        setFAQItems((current) => [
          ...current,
          {
            id: String(Date.now()),
            question: faqDraft.question.trim(),
            answer: faqDraft.answer.trim(),
          },
        ]);
        toast.success("FAQ 항목을 추가했습니다.");
      }

      markChanged();
      setFaqDialogOpen(false);
      return;
    }

    try {
      if (editingFaqId) {
        const updated = await updateBusinessFaq(Number(editingFaqId), {
          question: faqDraft.question.trim(),
          answer: faqDraft.answer.trim(),
        });
        setFAQItems((current) =>
          current.map((item) =>
            item.id === editingFaqId ? mapFaqSnapshot(updated) : item
          )
        );
        toast.success("FAQ 항목을 수정했습니다.");
      } else {
        const created = await createBusinessFaq({
          question: faqDraft.question.trim(),
          answer: faqDraft.answer.trim(),
        });
        setFAQItems((current) => [...current, mapFaqSnapshot(created)]);
        toast.success("FAQ 항목을 추가했습니다.");
      }

      markChanged();
      setFaqDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteFaq = async () => {
    if (!faqDeleteTarget) {
      return;
    }

    if (useDemoDataMode) {
      setFAQItems((current) =>
        current.filter((item) => item.id !== faqDeleteTarget.id)
      );
      setFaqDeleteTarget(null);
      markChanged();
      toast.success("FAQ 항목을 삭제했습니다.");
      return;
    }

    try {
      if (faqDeleteTarget.faqId) {
        await deleteBusinessFaq(faqDeleteTarget.faqId);
      }
      setFAQItems((current) =>
        current.filter((item) => item.id !== faqDeleteTarget.id)
      );
      setFaqDeleteTarget(null);
      markChanged();
      toast.success("FAQ 항목을 삭제했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    if (uploadErrorScenario) {
      toast.error("비즈니스 자료 업로드를 완료하지 못했습니다.");
      event.target.value = "";
      return;
    }

    if (useDemoDataMode) {
      const newFiles = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        name: file.name,
        uploadDate: "오늘",
      }));

      setUploadedFiles((current) => [...newFiles, ...current]);
      markChanged();
      toast.success(`${files.length}개 파일을 추가했습니다.`);
      event.target.value = "";
      return;
    }

    try {
      const uploaded = await Promise.all(files.map((file) => uploadBusinessFile(file)));
      setUploadedFiles((current) => [
        ...uploaded.map((file) => ({
          id: String(file.resourceId),
          resourceId: file.resourceId,
          name: file.fileName,
          uploadDate: formatDateLabel(file.createdAt),
        })),
        ...current,
      ]);
      markChanged();
      toast.success(`${files.length}개 파일을 추가했습니다.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      event.target.value = "";
    }
  };

  const handleRegenerateTemplates = async () => {
    if (regenerateMode === "initial") {
      if (!canInitialGenerate) {
        toast.error("초기 템플릿 생성을 위한 카테고리 정보가 없습니다.");
        return;
      }

      if (regenerateErrorScenario) {
        toast.error("템플릿 생성을 완료하지 못했습니다.");
        return;
      }

      if (useDemoDataMode) {
        setRegenerateMode(null);
        startTemplateJobProgress({
          action: "initial",
          status: "COMPLETED",
          jobIds: [],
          targetCount: selectedCategoryIds.length,
          completedCount: selectedCategoryIds.length,
          failedCount: 0,
          message: "데모 템플릿 생성 작업이 완료되었습니다.",
          updatedAt: Date.now(),
        });
        toast.success(`템플릿 ${selectedCategoryIds.length}개 생성 작업을 등록했습니다.`);
        return;
      }

      try {
        setIsRegenerating(true);
        const resourceIds = uploadedFiles
          .map((file) => file.resourceId)
          .filter((resourceId): resourceId is number => typeof resourceId === "number");
        const faqIds = faqItems
          .map((faq) => faq.faqId)
          .filter((faqId): faqId is number => typeof faqId === "number");
        const result = await generateInitialBusinessTemplates({
          industryType: businessType,
          emailTone: mapUiToneToApi(tone),
          companyDescription: description.trim(),
          categoryIds: selectedCategoryIds,
          faqIds,
          resourceIds,
        });

        setRegenerateMode(null);
        startTemplateJobProgress({
          action: "initial",
          status: result.jobIds.length ? "PROCESSING" : "REGISTERED",
          jobIds: result.jobIds,
          targetCount: result.jobIds.length || result.processingCount,
          completedCount: 0,
          failedCount: 0,
          message: result.jobIds.length
            ? "선택한 카테고리의 템플릿 생성 상태를 확인하고 있습니다."
            : "템플릿 생성 작업이 등록되었습니다. 백엔드 응답에 job id가 없어 세부 진행률은 알림으로 확인합니다.",
          updatedAt: Date.now(),
        });
        toast.success(`템플릿 ${result.processingCount}개 생성 작업을 등록했습니다.`);
      } catch (error) {
        toast.error(getErrorMessage(error, "초기 템플릿 생성 작업을 시작하지 못했습니다."));
      } finally {
        setIsRegenerating(false);
      }

      return;
    }

    const selectedTemplateIds =
      regenerateMode === "bulk"
        ? templatesBySelectedCategories.map((template) => Number(template.id))
        : selectedTemplates.map((templateId) => Number(templateId));

    if (regenerateErrorScenario) {
      toast.error("템플릿 재생성을 완료하지 못했습니다.");
      return;
    }

    if (!selectedTemplateIds.length) {
      toast.error("재생성할 템플릿이 없습니다.");
      return;
    }

    if (useDemoDataMode) {
      const targetCount =
        regenerateMode === "bulk" ? templatesBySelectedCategories.length : selectedTemplates.length;
      setHasChanges(false);
      setRegenerateMode(null);
      startTemplateJobProgress({
        action: "regenerate",
        status: "COMPLETED",
        jobIds: [],
        targetCount,
        completedCount: targetCount,
        failedCount: 0,
        message: "데모 템플릿 재생성 작업이 완료되었습니다.",
        updatedAt: Date.now(),
      });
      toast.success(`템플릿 ${targetCount}개를 재생성했습니다.`);
      return;
    }

    try {
      setIsRegenerating(true);
      const result = await regenerateBusinessTemplates({
        regenerateAll: false,
        templateIds: selectedTemplateIds,
      });
      setRegenerateMode(null);
      startTemplateJobProgress({
        action: "regenerate",
        status: result.jobIds.length ? "PROCESSING" : "REGISTERED",
        jobIds: result.jobIds,
        targetCount: result.jobIds.length || result.processingCount,
        completedCount: 0,
        failedCount: 0,
        message: result.jobIds.length
          ? "선택한 카테고리의 템플릿 재생성 상태를 확인하고 있습니다."
          : "템플릿 재생성 작업이 등록되었습니다. 백엔드 응답에 job id가 없어 세부 진행률은 알림으로 확인합니다.",
        updatedAt: Date.now(),
      });
      toast.success(`템플릿 ${result.processingCount}개 재생성 작업을 등록했습니다.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <AppStatePage
        title="비즈니스 프로필을 불러오는 중입니다"
        description="회사 정보와 FAQ, 템플릿 영향을 확인하고 있습니다."
      />
    );
  }

  const templateJobTargetCount = Math.max(templateJobProgress?.targetCount ?? 0, 1);
  const templateJobProgressPercent = templateJobProgress
    ? Math.min(100, Math.round((templateJobProgress.completedCount / templateJobTargetCount) * 100))
    : 0;

  return (
    <>
      <div className="mx-auto max-w-[1200px] p-4 lg:p-8">
        {loadError ? (
          <StateBanner
            title="비즈니스 프로필 일부를 불러오지 못했습니다"
            description={loadError}
            tone="error"
            className="mb-6"
          />
        ) : null}

        {useDemoDataMode ? (
          <StateBanner
            title="데모 데이터 모드"
            description="현재 화면은 스크린샷과 UI 검증용 목업 데이터를 유지한 상태입니다. 일반 진입에서는 백엔드 API를 사용합니다."
            tone="info"
            className="mb-6"
          />
        ) : null}

        {saveErrorScenario ? (
          <StateBanner
            title="비즈니스 프로필을 저장하지 못했습니다"
            description="회사 정보 변경 사항은 유지되지만 저장 응답을 확인하지 못했습니다. 다시 저장해 주세요."
            tone="error"
            className="mb-6"
          />
        ) : null}

        {uploadErrorScenario ? (
          <StateBanner
            title="비즈니스 자료 업로드를 완료하지 못했습니다"
            description="파일 용량 또는 형식을 다시 확인해 주세요. FAQ 입력으로도 동일한 정보를 보완할 수 있습니다."
            tone="error"
            className="mb-6"
          />
        ) : null}

        <div className="mb-8">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-[#1E2A3A]">비즈니스 프로필</h1>
            <AiUsageBadge label="AI/RAG 학습 자료" />
          </div>
          <p className="text-[14px] text-[#64748B]">
            회사 정보, FAQ, 업로드 자료는 AI 템플릿 생성과 RAG 검색 품질에 직접 반영됩니다.
          </p>
        </div>

        {templateJobProgress ? (
          <div className="mb-6 rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0F766E] ring-1 ring-[#99F6E4]">
                  {templateJobProgress.status === "COMPLETED" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : templateJobProgress.status === "FAILED" ? (
                    <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-[#134E4A]">
                      {getTemplateJobTitle(templateJobProgress.action)}
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0F766E]">
                      {getTemplateJobStatusLabel(templateJobProgress.status)}
                    </span>
                  </div>
                  <p className="text-[12px] leading-5 text-[#0F766E]">
                    {templateJobProgress.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTemplateJobProgress(null)}
                className="rounded-full p-1.5 text-[#0F766E] transition-colors hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#0F766E]">
                <span>
                  완료 {templateJobProgress.completedCount}/{templateJobProgress.targetCount}
                  {templateJobProgress.failedCount ? ` · 실패 ${templateJobProgress.failedCount}` : ""}
                </span>
                <span>{templateJobProgressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full transition-all duration-300 ${
                    templateJobProgress.status === "FAILED" ? "bg-[#EF4444]" : "bg-[#2DD4BF]"
                  }`}
                  style={{ width: `${templateJobProgressPercent}%` }}
                />
              </div>
              {templateJobProgress.status === "REGISTERED" ? (
                <p className="text-[11px] text-[#0F766E]">
                  화면을 이동해도 비즈니스 프로필로 돌아오면 최근 등록 상태를 다시 확인할 수 있습니다.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#2DD4BF]" />
            <h3 className="text-[#1E2A3A]">회사 프로필</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-[13px] text-[#1E2A3A]">
                업종 / 비즈니스 유형
              </label>
              <Select
                value={businessType}
                onValueChange={(value) => {
                  setBusinessType(value);
                  markChanged();
                }}
              >
                <SelectTrigger className="app-form-input h-11 w-full rounded-lg px-4 text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="app-select-content rounded-2xl p-1">
                  {businessTypeOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="app-select-item rounded-xl px-3 py-2.5 text-sm"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-[13px] text-[#1E2A3A]">
                이메일 어조
              </label>
              <div className="flex gap-2">
                {toneOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setTone(option.id);
                      markChanged();
                    }}
                    className={`rounded-lg px-4 py-2 text-[13px] transition-all ${
                      tone === option.id
                        ? "bg-[#2DD4BF] text-[#1E2A3A]"
                        : "border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:border-[#CBD5E1]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] text-[#1E2A3A]">
                제품/서비스 설명
              </label>
              <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  markChanged();
                }}
                rows={4}
                className="app-form-input w-full resize-none rounded-lg px-4 py-3 text-[14px]"
              />
            </div>

            <div className="flex justify-end border-t border-[#E2E8F0] pt-3">
              <button
                onClick={() => void handleSaveProfile()}
                disabled={isSavingProfile}
                className="flex items-center gap-2 rounded-lg bg-[#1E2A3A] px-4 py-2 text-[13px] text-white transition-colors hover:bg-[#2A3A4E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSavingProfile ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#2DD4BF]" />
            <h3 className="text-[#1E2A3A]">이메일 카테고리</h3>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {categories.length ? (
              categories.map((category) => {
                const selected = category.categoryId
                  ? selectedCategoryIds.includes(category.categoryId)
                  : false;

                return (
                  <div
                    key={category.id}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] transition-colors ${
                      selected
                        ? "border-[#2DD4BF] bg-[#F0FDFA] text-[#0F766E]"
                        : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (category.categoryId) {
                          toggleSelectedCategory(category.categoryId);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryDeleteTarget(category)}
                      disabled={isSavingCategory}
                      className="rounded-full p-0.5 text-[#94A3B8] transition-colors hover:bg-white hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <StateBanner
                title="등록된 카테고리가 없습니다"
                description="초기 템플릿 생성과 재생성은 카테고리를 기준으로 실행됩니다. 아래에서 카테고리를 추가해 주세요."
                tone="warning"
                className="w-full"
              />
            )}
          </div>

          <div ref={categoryComposerRef} className="relative">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newCategory}
                onFocus={() => setCategoryDropdownOpen(true)}
                onChange={(event) => {
                  setNewCategory(event.target.value);
                  setCategoryDropdownOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddCategory();
                  }
                }}
                placeholder="새 카테고리 추가..."
                className="app-form-input min-h-[44px] flex-1 rounded-xl px-4 text-[14px]"
              />
              <button
                type="button"
                onClick={() => void handleAddCategory()}
                disabled={isSavingCategory || !newCategory.trim()}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1E2A3A] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#2A3A4E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {isSavingCategory ? "추가 중..." : "추가"}
              </button>
            </div>

            {categoryDropdownOpen ? (
              <div className="absolute left-0 right-0 top-[52px] z-20 max-h-[280px] overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-xl">
                <div className="px-2 py-2 text-[11px] font-semibold text-[#94A3B8]">
                  {businessType ? getBusinessTypeLabel(businessType) : "추천"} 카테고리
                </div>
                {availableCategorySuggestions.length ? (
                  <div className="grid gap-1 sm:grid-cols-2">
                    {availableCategorySuggestions.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => void createCategoryItem(category.name, category)}
                        disabled={isSavingCategory}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-[#1E2A3A] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="flex-1">{category.name}</span>
                        <span className="text-[10px] text-[#94A3B8]">
                          {getBusinessTypeLabel(category.domain)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-4 text-[12px] text-[#94A3B8]">
                    추천할 카테고리가 더 없습니다. 직접 입력해서 추가할 수 있습니다.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <p className="mt-3 text-[11px] text-[#94A3B8]">
            선택된 카테고리만 초기 템플릿 생성 또는 재생성 대상에 포함됩니다.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#2DD4BF]" />
            <h3 className="text-[#1E2A3A]">비즈니스 자료</h3>
          </div>

          <div className="mb-6">
            <h4 className="mb-3 text-[13px] text-[#1E2A3A]">업로드된 파일</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="group flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:border-[#CBD5E1]"
                >
                  <FileText className="h-5 w-5 text-[#64748B]" />
                  <span className="flex-1 text-[13px] text-[#1E2A3A]">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    {file.uploadDate} 업로드
                  </span>
                  <button
                    onClick={() => void handleRemoveFile(file.id)}
                    className="rounded-md p-1.5 text-[#94A3B8] opacity-0 transition-all hover:bg-[#FEF2F2] hover:text-[#EF4444] group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="group flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-3 text-left transition-all hover:border-[#2DD4BF] hover:bg-[#2DD4BF]/5"
              >
                <div className="flex h-5 w-5 items-center justify-center text-[#94A3B8] group-hover:text-[#2DD4BF]">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-[13px] text-[#94A3B8] transition-colors group-hover:text-[#1E2A3A]">
                  파일 추가
                </span>
              </button>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-[13px] text-[#1E2A3A]">
              FAQ / 매뉴얼 직접 입력
            </h4>
            <div className="space-y-2">
              {faqItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:border-[#CBD5E1]"
                >
                  <div className="flex-1">
                    <p className="mb-1 text-[13px] text-[#1E2A3A]">
                      Q: {item.question}
                    </p>
                    <p className="text-[12px] text-[#64748B]">
                      A: {item.answer}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openFaqDialog(item)}
                      className="rounded-md p-1.5 text-[#94A3B8] transition-all hover:bg-white hover:text-[#1E2A3A]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setFaqDeleteTarget(item)}
                      className="rounded-md p-1.5 text-[#94A3B8] transition-all hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => openFaqDialog()}
                className="group flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-3 text-left transition-all hover:border-[#2DD4BF] hover:bg-[#2DD4BF]/5"
              >
                <div className="flex h-5 w-5 items-center justify-center text-[#94A3B8] group-hover:text-[#2DD4BF]">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-[13px] text-[#94A3B8] transition-colors group-hover:text-[#1E2A3A]">
                  항목 추가
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#0F766E]" />
            <div className="flex-1">
              <p className="mb-1 text-[14px] font-semibold text-[#1E2A3A]">
                {hasGeneratedTemplates
                  ? "템플릿을 다시 생성할 수 있습니다."
                  : "초기 템플릿 생성을 다시 시작할 수 있습니다."}
              </p>
              <p className="text-[12px] text-[#64748B]">
                {hasGeneratedTemplates
                  ? "선택된 카테고리에 속한 AI 생성 원본 템플릿만 다시 생성합니다. 직접 만든 템플릿과 사용자가 수정한 템플릿은 유지됩니다."
                  : "온보딩에서 템플릿 생성을 건너뛰었거나 완료하지 못했다면 선택된 카테고리로 초기 템플릿 생성을 다시 요청할 수 있습니다."}
              </p>
            </div>
          </div>

          {!selectedCategoryIds.length ? (
            <StateBanner
              title="카테고리 정보가 필요합니다"
              description="템플릿 생성과 재생성은 선택된 카테고리를 기준으로 실행됩니다. 위에서 카테고리를 하나 이상 선택해 주세요."
              tone="warning"
              className="mb-4"
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRegenerateMode(hasGeneratedTemplates ? "bulk" : "initial")}
              disabled={hasGeneratedTemplates ? !canRegenerate || !selectedCategoryIds.length : !canInitialGenerate}
              className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl bg-[#1E2A3A] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#2A3A4E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              {hasGeneratedTemplates ? "템플릿 재생성" : "초기 템플릿 생성"}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(event) => void handleFileSelection(event)}
        />
      </div>

      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editingFaqId ? "FAQ 항목 수정" : "FAQ 항목 추가"}
            </DialogTitle>
            <DialogDescription>
              자주 쓰는 답변이나 운영 정책을 직접 입력해 템플릿 품질을 높일 수
              있습니다.
            </DialogDescription>
          </DialogHeader>

          {faqSaveErrorScenario ? (
            <StateBanner
              title="FAQ 항목을 저장하지 못했습니다"
              description="입력한 질문과 답변은 그대로 유지됩니다. 다시 시도해 주세요."
              tone="error"
            />
          ) : null}

          <div className="space-y-4">
            <label className="block space-y-2 text-sm text-foreground">
              <span>질문</span>
              <input
                value={faqDraft.question}
                onChange={(event) =>
                  setFaqDraft((current) => ({
                    ...current,
                    question: event.target.value,
                  }))
                }
                className="app-form-input h-11 w-full rounded-xl px-4 text-sm"
              />
            </label>
            <label className="block space-y-2 text-sm text-foreground">
              <span>답변</span>
              <textarea
                rows={5}
                value={faqDraft.answer}
                onChange={(event) =>
                  setFaqDraft((current) => ({
                    ...current,
                    answer: event.target.value,
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
              onClick={() => setFaqDialogOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="rounded-xl bg-[#1E2A3A] px-4 py-2 text-sm text-white"
              onClick={() => void handleSaveFaq()}
            >
              저장
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(faqDeleteTarget)} onOpenChange={(open) => !open && setFaqDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>FAQ 항목을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              "{faqDeleteTarget?.question}" 항목이 비즈니스 자료에서 제거됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteFaq()}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(categoryDeleteTarget)}
        onOpenChange={(open) => !open && setCategoryDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              "{categoryDeleteTarget?.name}" 카테고리가 비즈니스 프로필에서 제거됩니다.
              연결된 템플릿과 자동화 설정도 영향을 받을 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingCategory}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSavingCategory}
              onClick={() => {
                if (categoryDeleteTarget) {
                  void handleRemoveCategory(categoryDeleteTarget);
                }
              }}
            >
              {isSavingCategory ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(regenerateMode)} onOpenChange={(open) => !open && setRegenerateMode(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {regenerateMode === "initial"
                ? "초기 템플릿 생성"
                : regenerateMode === "bulk"
                  ? "카테고리별 템플릿 재생성"
                  : "재생성할 템플릿 선택"}
            </DialogTitle>
            <DialogDescription>
              {regenerateMode === "initial"
                ? "선택한 비즈니스 카테고리마다 맞춤 템플릿 생성 작업을 등록합니다."
                : regenerateMode === "bulk"
                  ? "선택한 카테고리에 속한 AI 생성 원본 템플릿만 재생성합니다."
                  : "변경된 비즈니스 자료를 반영할 템플릿을 선택하세요."}
            </DialogDescription>
          </DialogHeader>

          {regenerateErrorScenario ? (
            <StateBanner
              title="템플릿 재생성을 완료하지 못했습니다"
              description="변경 내용은 유지되지만 재생성 작업을 끝내지 못했습니다. 다시 시도해 주세요."
              tone="error"
            />
          ) : null}

          {regenerateMode === "initial" ? (
            <StateBanner
              title="온보딩 템플릿 생성을 다시 요청합니다"
              description={`선택된 카테고리 ${selectedCategoryIds.length}개를 기준으로 생성 작업을 등록합니다. 생성된 템플릿은 완료 후 템플릿 라이브러리에서 확인할 수 있습니다.`}
              tone="info"
            />
          ) : null}

          {regenerateMode === "initial" || regenerateMode === "bulk" ? (
            <div className="space-y-2">
              {categories.map((category) => {
                const categoryId = category.categoryId;
                const selected = categoryId
                  ? selectedCategoryIds.includes(categoryId)
                  : false;
                const templateCount = categoryId
                  ? templateOptions.filter((template) => template.categoryId === categoryId).length
                  : 0;

                return (
                  <button
                    key={category.id}
                    type="button"
                    disabled={!categoryId}
                    onClick={() => {
                      if (categoryId) {
                        toggleSelectedCategory(categoryId);
                      }
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                      selected
                        ? "border-[#2DD4BF] bg-[#2DD4BF]/5 text-[#0F766E]"
                        : "border-border bg-background text-foreground"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate">{category.name}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-[#94A3B8]">
                      {regenerateMode === "bulk" ? `템플릿 ${templateCount}개` : selected ? "선택됨" : "선택"}
                    </span>
                  </button>
                );
              })}

              {regenerateMode === "bulk" && !templatesBySelectedCategories.length ? (
                <StateBanner
                  title="선택한 카테고리에 재생성할 템플릿이 없습니다"
                  description="템플릿이 있는 카테고리를 선택하거나 초기 템플릿 생성을 먼저 진행해 주세요."
                  tone="warning"
                />
              ) : null}
            </div>
          ) : null}

          {regenerateMode === "select" ? (
            <div className="space-y-2">
              {templateOptions.map((template) => {
                const selected = selectedTemplates.includes(template.id);
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() =>
                      setSelectedTemplates((current) =>
                        selected
                          ? current.filter((item) => item !== template.id)
                          : [...current, template.id]
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                      selected
                        ? "border-[#2DD4BF] bg-[#2DD4BF]/5 text-[#0F766E]"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    <span className="flex min-w-0 flex-col text-left">
                      <span className="truncate">{template.title}</span>
                      <span className="text-[11px] text-[#94A3B8]">{template.categoryName}</span>
                    </span>
                    <span>{selected ? "선택됨" : "선택"}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
              onClick={() => setRegenerateMode(null)}
            >
              취소
            </button>
            <button
              type="button"
              disabled={isRegenerating || !canSubmitTemplateAction}
              className="rounded-xl bg-[#1E2A3A] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleRegenerateTemplates()}
            >
              {isRegenerating
                ? "요청 중..."
                : regenerateMode === "initial"
                  ? "생성 시작"
                  : "재생성 시작"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
