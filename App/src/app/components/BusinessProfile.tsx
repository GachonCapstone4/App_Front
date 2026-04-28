import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  FileText,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { businessTypeOptions } from "../../shared/config/onboarding-options";
import {
  createBusinessFaq,
  deleteBusinessFaq,
  deleteBusinessFile,
  FaqSnapshot,
  getBusinessFaqs,
  getBusinessProfile,
  getBusinessResources,
  getTemplates,
  regenerateBusinessTemplates,
  TemplateSummarySnapshot,
  updateBusinessFaq,
  uploadBusinessFile,
  upsertBusinessProfile,
} from "../../shared/api/business";
import { getErrorMessage } from "../../shared/api/http";
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
}

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
  { id: "1", title: "가격 안내 템플릿" },
  { id: "4", title: "미팅 일정 확인 템플릿" },
  { id: "5", title: "기술 지원 접수 템플릿" },
  { id: "6", title: "계약 안내 템플릿" },
];

const emptyFaqDraft: FAQDraft = {
  question: "",
  answer: "",
};

interface BusinessProfileProps {
  scenarioId?: string | null;
}

function formatDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ko-KR").replace(/\.\s?/g, ".").replace(/\.$/, "");
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
  };
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
  const [businessType, setBusinessType] = useState("Sales");
  const [tone, setTone] = useState<ToneId>("neutral");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [faqItems, setFAQItems] = useState<FAQItem[]>([]);
  const [templateOptions, setTemplateOptions] = useState<TemplateSelectionItem[]>([]);
  const [hasChanges, setHasChanges] = useState(useDemoDataMode);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqDraft, setFaqDraft] = useState<FAQDraft>(emptyFaqDraft);
  const [faqDeleteTarget, setFaqDeleteTarget] = useState<FAQItem | null>(null);
  const [regenerateMode, setRegenerateMode] = useState<"bulk" | "select" | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(!useDemoDataMode);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const impactedCount = templateOptions.length;
  const canRegenerate = impactedCount > 0;

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
        const [profile, resources, faqs, templates] = await Promise.all([
          getBusinessProfile(),
          getBusinessResources(),
          getBusinessFaqs(),
          getTemplates(),
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

  const markChanged = () => setHasChanges(true);

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
    const selectedTemplateIds =
      regenerateMode === "bulk"
        ? templateOptions.map((template) => Number(template.id))
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
        regenerateMode === "bulk" ? impactedCount : selectedTemplates.length;
      setHasChanges(false);
      setRegenerateMode(null);
      toast.success(`템플릿 ${targetCount}개를 재생성했습니다.`);
      return;
    }

    try {
      setIsRegenerating(true);
      const result = await regenerateBusinessTemplates({
        regenerateAll: regenerateMode === "bulk",
        templateIds: selectedTemplateIds,
      });
      setHasChanges(false);
      setRegenerateMode(null);
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
          <h1 className="mb-1 text-[#1E2A3A]">비즈니스 프로필</h1>
          <p className="text-[14px] text-[#64748B]">
            AI 템플릿 생성에 사용되는 비즈니스 정보를 관리합니다
          </p>
        </div>

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

        {hasChanges ? (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7] p-5">
            <div className="mb-4 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
              <div className="flex-1">
                <p className="mb-1 text-[14px] text-[#92400E]">
                  비즈니스 자료가 변경되었습니다.
                </p>
                <p className="text-[12px] text-[#B45309]">
                  영향받는 템플릿 {impactedCount}개가 있습니다.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRegenerateMode("bulk")}
                disabled={!canRegenerate}
                className="rounded-lg bg-[#1E2A3A] px-4 py-2 text-[13px] text-white transition-colors hover:bg-[#2A3A4E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                템플릿 일괄 재생성
              </button>
              <button
                onClick={() => setRegenerateMode("select")}
                disabled={!canRegenerate}
                className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] text-[#64748B] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                개별 선택 후 재생성
              </button>
              <button
                onClick={() => setHasChanges(false)}
                className="rounded-lg px-4 py-2 text-[13px] text-[#64748B] transition-colors hover:text-[#1E2A3A]"
              >
                나중에
              </button>
            </div>
          </div>
        ) : null}

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

      <Dialog open={Boolean(regenerateMode)} onOpenChange={(open) => !open && setRegenerateMode(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {regenerateMode === "bulk"
                ? "영향받는 템플릿 일괄 재생성"
                : "재생성할 템플릿 선택"}
            </DialogTitle>
            <DialogDescription>
              {regenerateMode === "bulk"
                ? `현재 변경 내용을 기준으로 템플릿 ${impactedCount}개를 다시 생성합니다.`
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
                    <span>{template.title}</span>
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
              disabled={isRegenerating || !canRegenerate}
              className="rounded-xl bg-[#1E2A3A] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleRegenerateTemplates()}
            >
              {isRegenerating ? "재생성 요청 중..." : "재생성 시작"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
