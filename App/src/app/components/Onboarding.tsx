import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Mail,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  Lock,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Upload,
  X,
  Plus,
  Sparkles,
  Zap,
  Shield,
  Settings,
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
import {
  deriveGoogleIntegrationEmail,
  getAppSession,
  markOnboardingComplete,
  setConnectedEmail as persistConnectedEmail,
} from "../../shared/lib/app-session";
import {
  createBusinessCategory,
  createBusinessFaq,
  deleteBusinessCategory,
  deleteBusinessFaq,
  deleteBusinessFile,
  getBusinessCategories,
  getBusinessFaqs,
  getBusinessProfile,
  getBusinessResources,
  upsertBusinessProfile,
  uploadBusinessFile,
} from "../../shared/api/business";
import { getErrorMessage } from "../../shared/api/http";
import {
  getGoogleAuthorizationUrl,
  getMyIntegrationSafe,
} from "../../shared/api/integrations";
import {
  completeOnboarding as completeOnboardingRequest,
  generateInitialBusinessTemplates,
} from "../../shared/api/onboarding";
import { isDemoModeEnabled } from "../../shared/scenarios/demo-mode";
import { AuthOnboardingLayout } from "../../shared/ui/AuthOnboardingLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { StateBanner } from "../../shared/ui/primitives/StateBanner";

const mainSteps = [
  { id: 1, label: "이메일 연동" },
  { id: 2, label: "비즈니스 설정" },
  { id: 3, label: "템플릿 생성" },
  { id: 4, label: "시작" },
];

const toneOptions = [
  {
    id: "formal",
    label: "격식체",
    desc: "존경어를 사용한 공식적인 어조",
    emoji: "🏢",
  },
  {
    id: "neutral",
    label: "중립",
    desc: "자연스럽고 균형 잡힌 어조",
    emoji: "⚖️",
  },
  {
    id: "friendly",
    label: "친근한",
    desc: "따뜻하고 친절한 어조",
    emoji: "😊",
  },
];

type FaqItem = {
  id: string;
  faqId?: number;
  question: string;
  answer: string;
};

type UploadedFileItem = {
  id: string;
  resourceId?: number;
  fileName: string;
};

type OnboardingCategoryItem = RecommendedCategoryOption & {
  categoryId?: number;
};

const leftPanelContent: Record<
  number,
  { title: string; subtitle: string }
> = {
  1: {
    title: "이메일 업무를\nAI가 대신합니다",
    subtitle: "분류부터 답변 초안까지,\n반복되는 이메일 업무를 자동화하세요",
  },
  2: {
    title: "비즈니스 정보를\n입력해주세요",
    subtitle: "입력한 정보를 바탕으로\nAI가 맞춤 템플릿을 생성합니다",
  },
  3: {
    title: "맞춤 템플릿을\n생성하고 있습니다",
    subtitle: "비즈니스 정보를 분석하여\n최적의 응답 템플릿을 만들고 있습니다",
  },
  4: {
    title: "모든 준비가\n완료되었습니다",
    subtitle: "이제 이메일 자동화를\n시작할 수 있습니다",
  },
};

const footerItems = [
  {
    icon: Shield,
    text: "이메일 원문은 외부 서버에 저장하지 않고 연동 상태만 관리합니다",
  },
  {
    icon: Zap,
    text: "평균 설정 시간은 3분 내외로 빠르게 완료할 수 있습니다",
  },
  {
    icon: Settings,
    text: "완료 후에는 템플릿, 프로필, 자동화 화면에서 개별 조정할 수 있습니다",
  },
];

interface OnboardingProps {
  scenarioId?: string | null;
}

function mapToneToApiTone(value: string) {
  if (value === "formal") {
    return "FORMAL" as const;
  }

  if (value === "friendly") {
    return "FRIENDLY" as const;
  }

  return "NEUTRAL" as const;
}

function mapApiToneToTone(value: string | null) {
  if (value === "FORMAL") {
    return "formal";
  }

  if (value === "FRIENDLY") {
    return "friendly";
  }

  return "neutral";
}

export function Onboarding({ scenarioId }: OnboardingProps) {
  const session = getAppSession();
  const demoMode = isDemoModeEnabled();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const generationTimeoutsRef = useRef<number[]>([]);
  const integrationPollingRef = useRef<number | null>(null);
  const categoryComposerRef = useRef<HTMLDivElement | null>(null);
  const [currentMainStep, setCurrentMainStep] = useState(1);
  const [currentSubStep, setCurrentSubStep] = useState(0);

  // Email connection state
  const initialConnectedEmail =
    session.connectedEmails[session.connectedEmails.length - 1] ?? session.connectedEmail;
  const [emailConnected, setEmailConnected] = useState(Boolean(initialConnectedEmail));
  const [connectedEmail, setConnectedEmail] = useState(initialConnectedEmail);
  const [checkingIntegration, setCheckingIntegration] = useState(false);

  // Onboarding states
  const [tone, setTone] = useState("neutral");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [faqDraft, setFaqDraft] = useState({ question: "", answer: "" });
  const [faqComposerOpen, setFaqComposerOpen] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);
  const [categories, setCategories] = useState<OnboardingCategoryItem[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [initializing, setInitializing] = useState(!scenarioId);
  const [templateGenerationMessage, setTemplateGenerationMessage] = useState<string | null>(null);
  const [generatedTemplateCount, setGeneratedTemplateCount] = useState(0);
  const [completingOnboarding, setCompletingOnboarding] = useState(false);

  // Template generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [templateProgress, setTemplateProgress] = useState(0);
  const profileNormalScenario = scenarioId === "onboarding-profile-normal";
  const knowledgeNormalScenario = scenarioId === "onboarding-knowledge-normal";
  const categoriesNormalScenario = scenarioId === "onboarding-categories-normal";
  const categoriesDropdownNormalScenario =
    scenarioId === "onboarding-categories-dropdown-normal";
  const categoriesCustomNormalScenario =
    scenarioId === "onboarding-categories-custom-normal";
  const generatingNormalScenario = scenarioId === "onboarding-generating-normal";
  const completeNormalScenario = scenarioId === "onboarding-complete-normal";
  const oauthErrorScenario = scenarioId === "onboarding-google-oauth-error";
  const uploadErrorScenario = scenarioId === "onboarding-upload-error";
  const templateGenerationErrorScenario =
    scenarioId === "onboarding-template-generation-error";
  const emailNormalScenario = scenarioId === "onboarding-email-normal";

  const clearGenerationTimeouts = () => {
    generationTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    generationTimeoutsRef.current = [];
  };

  const clearIntegrationPolling = () => {
    if (integrationPollingRef.current !== null) {
      window.clearInterval(integrationPollingRef.current);
      integrationPollingRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearGenerationTimeouts();
      clearIntegrationPolling();
    },
    [],
  );

  useEffect(() => {
    clearGenerationTimeouts();

    if (oauthErrorScenario) {
      setCurrentMainStep(1);
      setCurrentSubStep(0);
      setEmailConnected(false);
      setConnectedEmail("");
      setIsGenerating(false);
      setGenerationStep(0);
      setTemplateProgress(0);
      return;
    }

    if (uploadErrorScenario) {
      setCurrentMainStep(2);
      setCurrentSubStep(1);
      setEmailConnected(true);
      setConnectedEmail(initialConnectedEmail || "user@gmail.com");
      setBusinessType("Sales");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답과 일정 자동화를 지원합니다.",
      );
      setUploadedFiles([
        { id: "resource-1", fileName: "고객응대_매뉴얼.pdf" },
      ]);
      setFaqItems([
        {
          id: "faq-1",
          question: "환불 정책은 어떻게 되나요?",
          answer: "14일 이내에는 사용량과 무관하게 전액 환불 가능합니다.",
        },
      ]);
      setFaqComposerOpen(false);
      setIsGenerating(false);
      setGenerationStep(0);
      setTemplateProgress(0);
      return;
    }

    if (templateGenerationErrorScenario) {
      setCurrentMainStep(3);
      setCurrentSubStep(2);
      setEmailConnected(true);
      setConnectedEmail(initialConnectedEmail || "user@gmail.com");
      setBusinessType("Sales");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답과 일정 자동화를 지원합니다.",
      );
      setIsGenerating(true);
      setGenerationStep(2);
      setTemplateProgress(4);
      setFaqComposerOpen(false);
      return;
    }

    if (emailNormalScenario) {
      setCurrentMainStep(1);
      setCurrentSubStep(0);
      setEmailConnected(false);
      setConnectedEmail("");
      setBusinessType("");
      setDescription("");
      setUploadedFiles([]);
      setFaqItems([]);
      setFaqDraft({ question: "", answer: "" });
      setFaqComposerOpen(true);
      setCategories([]);
      setNewCategory("");
      setCategoryDropdownOpen(false);
      setIsGenerating(false);
      setGenerationStep(0);
      setTemplateProgress(0);
      return;
    }

    if (profileNormalScenario) {
      setCurrentMainStep(2);
      setCurrentSubStep(0);
      setEmailConnected(true);
      setConnectedEmail(initialConnectedEmail || "user@gmail.com");
      setBusinessType("Sales");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답과 일정 자동화를 지원합니다.",
      );
      setUploadedFiles([]);
      setFaqItems([]);
      setFaqDraft({ question: "", answer: "" });
      setFaqComposerOpen(true);
      setIsGenerating(false);
      setGenerationStep(0);
      setTemplateProgress(0);
      return;
    }

    if (knowledgeNormalScenario) {
      setCurrentMainStep(2);
      setCurrentSubStep(1);
      setEmailConnected(true);
      setConnectedEmail(initialConnectedEmail || "user@gmail.com");
      setBusinessType("Sales");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답과 일정 자동화를 지원합니다.",
      );
      setUploadedFiles([
        { id: "resource-1", fileName: "고객응대_매뉴얼.pdf" },
      ]);
      setFaqItems([
        {
          id: "faq-1",
          question: "도입 상담은 어느 채널로 진행되나요?",
          answer: "기본적으로 이메일 응답 후 미팅 링크를 함께 안내합니다.",
        },
        {
          id: "faq-2",
          question: "환불 정책은 어떻게 되나요?",
          answer: "14일 이내에는 사용량과 무관하게 전액 환불 가능합니다.",
        },
      ]);
      setFaqComposerOpen(false);
      setIsGenerating(false);
      setGenerationStep(0);
      setTemplateProgress(0);
      return;
    }

    if (categoriesNormalScenario) {
      setCurrentMainStep(2);
      setCurrentSubStep(2);
      setEmailConnected(true);
      setConnectedEmail(initialConnectedEmail || "user@gmail.com");
      setBusinessType("Sales");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답과 일정 자동화를 지원합니다.",
      );
      setUploadedFiles([
        { id: "resource-1", fileName: "고객응대_매뉴얼.pdf" },
      ]);
      setFaqItems([
        {
          id: "faq-1",
          question: "도입 상담은 어느 채널로 진행되나요?",
          answer: "기본적으로 이메일 응답 후 미팅 링크를 함께 안내합니다.",
        },
      ]);
      setFaqComposerOpen(false);
      setIsGenerating(false);
      setGenerationStep(0);
      setTemplateProgress(0);
      return;
    }

    if (categoriesDropdownNormalScenario) {
      setCurrentMainStep(2);
      setCurrentSubStep(2);
      setEmailConnected(true);
      setConnectedEmail(initialConnectedEmail || "user@gmail.com");
      setBusinessType("Sales");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답과 일정 자동화를 지원합니다.",
      );
      setUploadedFiles([
        { id: "resource-1", fileName: "고객응대_매뉴얼.pdf" },
      ]);
      setFaqItems([
        {
          id: "faq-1",
          question: "도입 상담은 어느 채널로 진행되나요?",
          answer: "기본적으로 이메일 응답 후 미팅 링크를 함께 안내합니다.",
        },
      ]);
      setCategories(getRecommendedCategoriesForDomain("Sales").slice(0, 3));
      setNewCategory("미");
      setCategoryDropdownOpen(true);
      setFaqComposerOpen(false);
      setIsGenerating(false);
      setGenerationStep(0);
      setTemplateProgress(0);
      return;
    }

    if (categoriesCustomNormalScenario) {
      setCurrentMainStep(2);
      setCurrentSubStep(2);
      setEmailConnected(true);
      setConnectedEmail(initialConnectedEmail || "user@gmail.com");
      setBusinessType("Sales");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답과 일정 자동화를 지원합니다.",
      );
      setUploadedFiles([
        { id: "resource-1", fileName: "고객응대_매뉴얼.pdf" },
      ]);
      setFaqItems([
        {
          id: "faq-1",
          question: "도입 상담은 어느 채널로 진행되나요?",
          answer: "기본적으로 이메일 응답 후 미팅 링크를 함께 안내합니다.",
        },
      ]);
      setCategories([
        ...getRecommendedCategoriesForDomain("Sales").slice(0, 3),
        {
          id: "custom-category-1",
          name: "파트너십 제안",
          domain: "Sales",
          color: categoryColorPalette[0],
        },
      ]);
      setNewCategory("");
      setCategoryDropdownOpen(false);
      setFaqComposerOpen(false);
      setIsGenerating(false);
      setGenerationStep(0);
      setTemplateProgress(0);
      return;
    }

    if (generatingNormalScenario) {
      setCurrentMainStep(3);
      setCurrentSubStep(2);
      setEmailConnected(true);
      setConnectedEmail(initialConnectedEmail || "user@gmail.com");
      setBusinessType("Sales");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답과 일정 자동화를 지원합니다.",
      );
      setUploadedFiles([
        { id: "resource-1", fileName: "고객응대_매뉴얼.pdf" },
      ]);
      setFaqItems([
        {
          id: "faq-1",
          question: "도입 상담은 어느 채널로 진행되나요?",
          answer: "기본적으로 이메일 응답 후 미팅 링크를 함께 안내합니다.",
        },
      ]);
      setFaqComposerOpen(false);
      setIsGenerating(true);
      setGenerationStep(2);
      setTemplateProgress(4);
      return;
    }

    if (completeNormalScenario) {
      setCurrentMainStep(4);
      setCurrentSubStep(2);
      setEmailConnected(true);
      setConnectedEmail(initialConnectedEmail || "user@gmail.com");
      setBusinessType("Sales");
      setDescription(
        "비즈니스 이메일 자동화 SaaS 플랫폼으로, AI 기반 이메일 응답과 일정 자동화를 지원합니다.",
      );
      setUploadedFiles([
        { id: "resource-1", fileName: "고객응대_매뉴얼.pdf" },
      ]);
      setFaqItems([
        {
          id: "faq-1",
          question: "도입 상담은 어느 채널로 진행되나요?",
          answer: "기본적으로 이메일 응답 후 미팅 링크를 함께 안내합니다.",
        },
      ]);
      setFaqComposerOpen(false);
      setIsGenerating(false);
      setGenerationStep(0);
      setTemplateProgress(5);
      return;
    }

    setIsGenerating(false);
    setGenerationStep(0);
    setTemplateProgress(0);
  }, [
    categoriesNormalScenario,
    categoriesCustomNormalScenario,
    categoriesDropdownNormalScenario,
    completeNormalScenario,
    emailNormalScenario,
    generatingNormalScenario,
    initialConnectedEmail,
    knowledgeNormalScenario,
    oauthErrorScenario,
    profileNormalScenario,
    templateGenerationErrorScenario,
    uploadErrorScenario,
  ]);

  useEffect(() => {
    if (scenarioId) {
      setInitializing(false);
      return;
    }

    let active = true;

    async function initializeOnboarding() {
      setInitializing(true);

      try {
        const [integration, profile, resources, faqs, storedCategories] =
          await Promise.all([
            getMyIntegrationSafe(),
            getBusinessProfile(),
            getBusinessResources(),
            getBusinessFaqs(),
            getBusinessCategories(),
          ]);

        if (!active) {
          return;
        }

        if (integration?.connectedEmail) {
          setEmailConnected(true);
          setConnectedEmail(integration.connectedEmail);
          persistConnectedEmail(integration.connectedEmail);
        }

        if (profile) {
          setBusinessType(profile.industryType);
          setDescription(profile.companyDescription ?? "");
          setTone(mapApiToneToTone(profile.emailTone));
        }

        setUploadedFiles(
          resources.map((resource) => ({
            id: String(resource.resourceId),
            resourceId: resource.resourceId,
            fileName: resource.fileName,
          })),
        );

        setFaqItems(
          faqs.map((faq) => ({
            id: String(faq.faqId),
            faqId: faq.faqId,
            question: faq.question,
            answer: faq.answer,
          })),
        );
        setFaqComposerOpen(faqs.length === 0);

        setCategories(
          storedCategories.map((category) => ({
            id: String(category.categoryId),
            categoryId: category.categoryId,
            name: category.categoryName,
            domain: profile?.industryType || "사용자 정의",
            color:
              category.color ??
              categoryColorPalette[
                Math.floor(Math.random() * categoryColorPalette.length)
              ],
          })),
        );
      } catch (error) {
        if (!active) {
          return;
        }

        toast.error(getErrorMessage(error, "온보딩 정보를 불러오지 못했습니다."));
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    void initializeOnboarding();

    return () => {
      active = false;
    };
  }, [scenarioId]);

  useEffect(() => {
    if (categoriesDropdownNormalScenario || categoriesCustomNormalScenario) {
      return;
    }

    if (!businessType || categories.length > 0) {
      return;
    }

    setCategories(getRecommendedCategoriesForDomain(businessType));
    setNewCategory("");
    setCategoryDropdownOpen(false);
  }, [
    businessType,
    categories.length,
    categoriesCustomNormalScenario,
    categoriesDropdownNormalScenario,
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

  const availableCategorySuggestions = recommendedCategoryOptions.filter(
    (option) => !categories.some((category) => category.name === option.name),
  );

  const groupedCategorySuggestions = useMemo(
    () =>
      businessTypeOptions
        .map((option) => ({
          businessType: option,
          items: availableCategorySuggestions.filter(
            (category) => category.domain === option.value,
          ),
        }))
        .filter((group) => group.items.length > 0),
    [availableCategorySuggestions],
  );

  const handleEmailConnect = async () => {
    if (oauthErrorScenario) {
      toast.error("Google OAuth 인증을 확인하지 못했습니다.");
      return;
    }

    if (demoMode) {
      const demoConnectedEmail = deriveGoogleIntegrationEmail(session.userEmail);
      setConnectedEmail(demoConnectedEmail);
      setEmailConnected(true);
      persistConnectedEmail(demoConnectedEmail);
      toast.success("데모용 이메일 계정 연결을 완료했습니다.");
      return;
    }

    try {
      setCheckingIntegration(true);
      const authorizationUrl = await getGoogleAuthorizationUrl();
      window.open(authorizationUrl, "_blank", "noopener,noreferrer");
      toast("연결 창에서 권한 동의를 마치면 이 화면에서 자동으로 상태를 확인합니다.");

      let attempts = 0;
      const maxAttempts = 20;

      const intervalId = window.setInterval(async () => {
        attempts += 1;

        try {
          const integration = await getMyIntegrationSafe();

          if (integration?.connectedEmail) {
            window.clearInterval(intervalId);
            integrationPollingRef.current = null;
            setConnectedEmail(integration.connectedEmail);
            setEmailConnected(true);
            persistConnectedEmail(integration.connectedEmail);
            setCheckingIntegration(false);
            toast.success("이메일 계정 연결을 완료했습니다.");
            return;
          }
        } catch {
          // Ignore polling failures and let the user retry.
        }

        if (attempts >= maxAttempts) {
          window.clearInterval(intervalId);
          integrationPollingRef.current = null;
          setCheckingIntegration(false);
          toast("연결 상태를 바로 확인하지 못했습니다. 권한 동의 후 다시 시도해 주세요.");
        }
      }, 3000);
      integrationPollingRef.current = intervalId;
    } catch (error) {
      setCheckingIntegration(false);
      toast.error(getErrorMessage(error, "Google 계정 연결을 시작하지 못했습니다."));
    }
  };

  const handleUploadedFiles = async (files: FileList | null) => {
    const nextFile = files?.[0];

    if (!nextFile) {
      return;
    }

    if (uploadErrorScenario) {
      toast.error("업로드 중 문제가 발생했습니다. 파일 크기와 형식을 다시 확인해 주세요.");
      return;
    }

    if (demoMode) {
      setUploadingFile(true);
      window.setTimeout(() => {
        setUploadedFiles((current) => [
          ...current,
          {
            id: `demo-resource-${Date.now()}`,
            fileName: nextFile.name,
          },
        ]);
        setUploadingFile(false);
        toast.success(`${nextFile.name} 파일을 추가했습니다.`);
      }, 300);
      return;
    }

    try {
      setUploadingFile(true);
      const uploadedResource = await uploadBusinessFile(nextFile);
      setUploadedFiles((current) => [
        ...current,
        {
          id: String(uploadedResource.resourceId),
          resourceId: uploadedResource.resourceId,
          fileName: uploadedResource.fileName,
        },
      ]);
      toast.success(`${uploadedResource.fileName} 파일을 추가했습니다.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "자료 업로드를 완료하지 못했습니다."));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveUploadedFile = async (targetFile: UploadedFileItem) => {
    if (demoMode || !targetFile.resourceId) {
      setUploadedFiles((current) =>
        current.filter((file) => file.id !== targetFile.id),
      );
      return;
    }

    try {
      await deleteBusinessFile(targetFile.resourceId);
      setUploadedFiles((current) =>
        current.filter((file) => file.id !== targetFile.id),
      );
      toast.success("업로드한 자료를 삭제했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "자료를 삭제하지 못했습니다."));
    }
  };

  const ensurePersistedCategories = async (): Promise<OnboardingCategoryItem[]> => {
    const pendingCategories = categories.filter((category) => typeof category.categoryId !== "number");
    if (demoMode || pendingCategories.length === 0) {
      return categories;
    }

    setSavingCategory(true);
    try {
      const existingCategories = await getBusinessCategories();
      const existingByName = new Map(
        existingCategories.map((category) => [category.categoryName, category]),
      );

      const persistedCategories = await Promise.all(
        categories.map(async (category) => {
          if (typeof category.categoryId === "number") {
            return category;
          }

          const matchedExisting = existingByName.get(category.name);
          if (matchedExisting) {
            return {
              ...category,
              id: String(matchedExisting.categoryId),
              categoryId: matchedExisting.categoryId,
              color: matchedExisting.color ?? category.color,
            };
          }

          const savedCategory = await createBusinessCategory({
            categoryName: category.name,
            color: category.color,
          });

          return {
            ...category,
            id: String(savedCategory.categoryId),
            categoryId: savedCategory.categoryId,
            color: savedCategory.color ?? category.color,
          };
        }),
      );

      setCategories(persistedCategories);
      return persistedCategories;
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCancelGeneration = () => {
    clearGenerationTimeouts();
    setIsGenerating(false);
    setGenerationStep(0);
    setTemplateProgress(0);
    markOnboardingComplete();
    toast.message("설정은 저장되지 않았지만 나중에 다시 진행할 수 있습니다.");
    navigate("/app");
  };

  const finalizeOnboarding = async () => {
    if (demoMode) {
      markOnboardingComplete();
      return true;
    }

    try {
      setCompletingOnboarding(true);
      await completeOnboardingRequest();
      markOnboardingComplete();
      return true;
    } catch (error) {
      setTemplateGenerationMessage(
        getErrorMessage(error, "온보딩 완료 상태를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."),
      );
      toast.error(getErrorMessage(error, "온보딩 완료 상태를 저장하지 못했습니다."));
      return false;
    } finally {
      setCompletingOnboarding(false);
    }
  };

  const runTemplateGenerationAnimation = (templateCount: number) => {
    clearGenerationTimeouts();
    setCurrentMainStep(3);
    setIsGenerating(true);
    setGenerationStep(0);
    setTemplateProgress(0);
    setGeneratedTemplateCount(templateCount);

    generationTimeoutsRef.current = [
      window.setTimeout(() => setGenerationStep(1), 800),
      window.setTimeout(() => setGenerationStep(2), 1600),
      window.setTimeout(() => setTemplateProgress(1), 2000),
      window.setTimeout(() => setTemplateProgress(2), 2400),
      window.setTimeout(() => setTemplateProgress(3), 2800),
      window.setTimeout(() => setTemplateProgress(4), 3200),
      window.setTimeout(() => setTemplateProgress(5), 3600),
      window.setTimeout(() => setGenerationStep(3), 4000),
      window.setTimeout(() => {
        void finalizeOnboarding().then((completed) => {
          if (!completed) {
            setIsGenerating(false);
            setCurrentMainStep(3);
            return;
          }

          setIsGenerating(false);
          setCurrentMainStep(4);
        });
      }, 5000),
    ];
  };

  const saveCompanyProfile = async () => {
    if (!businessType) {
      toast.error("업종 / 비즈니스 유형을 선택해 주세요.");
      return false;
    }

    setSavingProfile(true);

    if (demoMode) {
      window.setTimeout(() => {
        setSavingProfile(false);
      }, 200);
      return true;
    }

    try {
      await upsertBusinessProfile({
        industryType: businessType,
        companyDescription: description.trim(),
        emailTone: mapToneToApiTone(tone),
      });
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "회사 프로필을 저장하지 못했습니다."));
      return false;
    } finally {
      setSavingProfile(false);
    }
  };

  const startTemplateGeneration = async () => {
    if (templateGenerationErrorScenario) {
      clearGenerationTimeouts();
      setCurrentMainStep(3);
      setIsGenerating(true);
      setGenerationStep(2);
      setTemplateProgress(4);
      setTemplateGenerationMessage(null);
      toast.error("템플릿 생성 작업을 완료하지 못했습니다.");
      return;
    }

    if (demoMode) {
      setTemplateGenerationMessage(null);
      runTemplateGenerationAnimation(Math.max(categories.length * 3, 3));
      return;
    }

    try {
      setTemplateGenerationMessage(null);
      const persistedCategories = await ensurePersistedCategories();
      const categoryIds = persistedCategories
        .map((category) => category.categoryId)
        .filter((categoryId): categoryId is number => typeof categoryId === "number");
      const faqIds = faqItems
        .map((faq) => faq.faqId)
        .filter((faqId): faqId is number => typeof faqId === "number");
      const resourceIds = uploadedFiles
        .map((file) => file.resourceId)
        .filter((resourceId): resourceId is number => typeof resourceId === "number");

      if (categoryIds.length === 0) {
        toast.error("초기 템플릿 생성을 위해 최소 한 개 이상의 카테고리가 필요합니다.");
        return;
      }

      const response = await generateInitialBusinessTemplates({
        industryType: businessType,
        emailTone: mapToneToApiTone(tone),
        companyDescription: description.trim(),
        categoryIds,
        faqIds,
        resourceIds,
      });

      runTemplateGenerationAnimation(response.processingCount);
    } catch (error) {
      const message =
        error instanceof Error && error.message === "Network Error"
          ? "초기 템플릿 생성 요청에 실패했습니다. 백엔드 서버가 실행 중인지 확인해 주세요."
          : getErrorMessage(error, "템플릿 생성 작업을 시작하지 못했습니다.");

      setTemplateGenerationMessage(message);
      toast.error(message);
    }
  };

  const handleNextMainStep = async () => {
    if (currentMainStep === 1 && emailConnected) {
      setCurrentMainStep(2);
      setCurrentSubStep(0);
    } else if (currentMainStep === 2 && currentSubStep === 2) {
      await startTemplateGeneration();
    }
  };

  const handleRemoveCategory = async (id: string) => {
    const targetCategory = categories.find((category) => category.id === id);

    if (!targetCategory) {
      return;
    }

    if (demoMode || !targetCategory.categoryId) {
      setCategories(categories.filter((c) => c.id !== id));
      return;
    }

    try {
      await deleteBusinessCategory(targetCategory.categoryId);
      setCategories(categories.filter((c) => c.id !== id));
      toast.success("카테고리를 삭제했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "카테고리를 삭제하지 못했습니다."));
    }
  };

  const handleAddCategory = async () => {
    const categoryName = newCategory.trim();

    if (categoryName) {
      if (categories.some((category) => category.name === categoryName)) {
        toast.error("이미 추가된 카테고리입니다.");
        return;
      }

      const recommendedCategory = availableCategorySuggestions.find(
        (option) => option.name === categoryName,
      );

      const nextCategory =
        recommendedCategory ?? {
          id: Date.now().toString(),
          name: categoryName,
          domain: businessType || "사용자 정의",
          color: categoryColorPalette[Math.floor(Math.random() * categoryColorPalette.length)],
        };

      try {
        setSavingCategory(true);
        if (demoMode) {
          setCategories([
            ...categories,
            {
              ...nextCategory,
              id: `demo-category-${Date.now()}`,
            },
          ]);
          setNewCategory("");
          setCategoryDropdownOpen(false);
          return;
        }

        const savedCategory = await createBusinessCategory({
          categoryName,
          color: nextCategory.color,
        });
        setCategories([
          ...categories,
          {
            ...nextCategory,
            id: String(savedCategory.categoryId),
            categoryId: savedCategory.categoryId,
            color: savedCategory.color ?? nextCategory.color,
          },
        ]);
        setNewCategory("");
        setCategoryDropdownOpen(false);
      } catch (error) {
        toast.error(getErrorMessage(error, "카테고리를 추가하지 못했습니다."));
      } finally {
        setSavingCategory(false);
      }
    }
  };

  const handleSelectSuggestedCategory = async (
    category: RecommendedCategoryOption,
  ) => {
    try {
      setSavingCategory(true);
      if (demoMode) {
        setCategories((current) => [
          ...current,
          {
            ...category,
            id: `demo-category-${Date.now()}`,
          },
        ]);
        setNewCategory("");
        setCategoryDropdownOpen(false);
        return;
      }

      const savedCategory = await createBusinessCategory({
        categoryName: category.name,
        color: category.color,
      });
      setCategories((current) => [
        ...current,
        {
          ...category,
          id: String(savedCategory.categoryId),
          categoryId: savedCategory.categoryId,
          color: savedCategory.color ?? category.color,
        },
      ]);
      setNewCategory("");
      setCategoryDropdownOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "카테고리를 추가하지 못했습니다."));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleFaqDraftChange = (
    field: "question" | "answer",
    value: string
  ) => {
    setFaqDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSaveFaq = async () => {
    const question = faqDraft.question.trim();
    const answer = faqDraft.answer.trim();

    if (!question || !answer) {
      return;
    }

    try {
      setSavingFaq(true);
      if (demoMode) {
        setFaqItems((current) => [
          ...current,
          {
            id: `demo-faq-${Date.now()}`,
            question,
            answer,
          },
        ]);
        setFaqDraft({ question: "", answer: "" });
        setFaqComposerOpen(false);
        return;
      }

      const savedFaq = await createBusinessFaq({ question, answer });
      setFaqItems((current) => [
        ...current,
        {
          id: String(savedFaq.faqId),
          faqId: savedFaq.faqId,
          question: savedFaq.question,
          answer: savedFaq.answer,
        },
      ]);
      setFaqDraft({ question: "", answer: "" });
      setFaqComposerOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "FAQ를 저장하지 못했습니다."));
    } finally {
      setSavingFaq(false);
    }
  };

  const handleRemoveFaq = async (id: string) => {
    if (faqItems.length === 1 && faqItems[0].id === id) {
      setFaqComposerOpen(true);
    }

    const targetFaq = faqItems.find((item) => item.id === id);

    if (demoMode || !targetFaq?.faqId) {
      setFaqItems((current) => current.filter((item) => item.id !== id));
      return;
    }

    try {
      await deleteBusinessFaq(targetFaq.faqId);
      setFaqItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      toast.error(getErrorMessage(error, "FAQ를 삭제하지 못했습니다."));
    }
  };

  const panelText = leftPanelContent[currentMainStep];
  const canSaveFaq =
    faqDraft.question.trim().length > 0 && faqDraft.answer.trim().length > 0;

  return (
    <AuthOnboardingLayout
      title={panelText.title}
      subtitle={panelText.subtitle}
      footerItems={footerItems}
      stepBar={
        <div className="flex items-center gap-2 max-w-[600px]">
            {mainSteps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg w-full transition-all ${
                    step.id === currentMainStep
                      ? "bg-[#2DD4BF] text-white"
                      : step.id < currentMainStep
                      ? "bg-transparent text-[#2DD4BF]"
                      : "bg-transparent text-[#94A3B8]"
                  }`}
                >
                  {step.id < currentMainStep ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#2DD4BF] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
                        step.id === currentMainStep
                          ? "bg-white/20 text-white"
                          : "border-2 border-[#CBD5E1] text-[#94A3B8]"
                      }`}
                    >
                      {step.id}
                    </div>
                  )}
                  <span className="text-[13px] hidden sm:inline whitespace-nowrap">
                    {step.label}
                  </span>
                </div>
                {i < mainSteps.length - 1 && (
                  <div
                    className={`w-6 h-px shrink-0 hidden sm:block ${
                      step.id < currentMainStep
                        ? "bg-[#2DD4BF]"
                        : "bg-[#CBD5E1]"
                    }`}
                  />
                )}
              </div>
            ))}
        </div>
      }
    >
            {/* Step 1: Email Connection */}
            {currentMainStep === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0]/60 p-8 sm:p-10">
                {/* Mobile brand header */}
                <div className="lg:hidden text-center mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[#1E2A3A] flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-[#2DD4BF]" />
                  </div>
                  <p className="text-[13px] text-[#94A3B8]">업무용 이메일 자동화</p>
                </div>

                <div className="mb-8 mx-auto max-w-[420px] text-center">
                  <h2 className="text-[#1E2A3A] text-[20px] mb-2">
                    업무 이메일 계정을 연결해주세요
                  </h2>
                  <p className="text-[14px] text-[#94A3B8]">
                    수신 이메일 자동화를 시작하려면 이메일 계정 연동이 필요합니다
                  </p>
                </div>

                {oauthErrorScenario ? (
                  <StateBanner
                    title="Google 계정 인증을 완료하지 못했습니다"
                    description="권한 동의가 중단되었거나 인증 세션이 만료되었습니다. 다시 연결을 시도해 주세요."
                    tone="error"
                    className="mb-6"
                  />
                ) : null}

                {!emailConnected ? (
                  <>
                    {/* Email Provider Selection */}
                    <div className="grid grid-cols-1 gap-3 mb-6 sm:max-w-[240px] mx-auto">
                      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 text-center shadow-sm">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#EA4335]/8 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-7 h-7">
                            <path
                              d="M22 6.25V17.75C22 18.44 21.44 19 20.75 19H18V9.04L12 13.53L6 9.04V19H3.25C2.56 19 2 18.44 2 17.75V6.25C2 4.81 3.81 3.99 4.93 4.93L6 5.82L12 10.31L18 5.82L19.07 4.93C20.19 3.99 22 4.81 22 6.25Z"
                              fill="#EA4335"
                            />
                          </svg>
                        </div>
                        <p className="text-[14px] text-[#1E2A3A] mb-1">Gmail</p>
                        <p className="text-[12px] text-[#94A3B8]">
                          Google 계정으로
                          <br />
                          간편 연결
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => void handleEmailConnect()}
                      disabled={checkingIntegration}
                      className="mx-auto flex w-full max-w-[320px] items-center justify-center gap-2 rounded-xl bg-[#2DD4BF] px-5 py-3.5 text-[#1E2A3A] transition-colors hover:bg-[#14B8A6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {checkingIntegration ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {checkingIntegration ? "연결 상태 확인 중..." : "Google 계정으로 로그인"}
                    </button>

                    {/* Security Notice */}
                    <div className="mt-8 flex items-center justify-center gap-2 text-[#94A3B8]">
                      <Lock className="w-3.5 h-3.5" />
                      <p className="text-[12px]">
                        이메일 원문은 외부 서버에 저장되지 않습니다
                      </p>
                    </div>
                  </>
                ) : (
                  /* Connected State */
                  <div className="text-center py-6">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-[#2DD4BF]" />
                    </div>
                    <h3 className="text-[#1E2A3A] mb-2">연결 완료</h3>
                    <p className="text-[14px] text-[#64748B] mb-8">
                      {connectedEmail}
                    </p>
                    <button
                      onClick={handleNextMainStep}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#2DD4BF] text-[#1E2A3A] rounded-xl hover:bg-[#14B8A6] transition-colors"
                    >
                      다음 단계로
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Business Setup */}
            {currentMainStep === 2 && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0]/60 p-8 sm:p-10 mb-6">
                  {initializing ? (
                    <StateBanner
                      title="기존 온보딩 정보를 불러오는 중입니다"
                      description="이미 저장된 프로필, FAQ, 카테고리, 자료가 있으면 화면에 반영합니다."
                      tone="info"
                      className="mb-6"
                    />
                  ) : null}

                  {/* Sub-step 0: Company Profile */}
                  {currentSubStep === 0 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-[#1E2A3A] text-[20px] mb-2">
                          회사 프로필 설정
                        </h2>
                        <p className="text-[14px] text-[#94A3B8]">
                          AI가 맞춤형 이메일 응답을 생성하기 위한 기본 정보입니다
                        </p>
                      </div>

                      <div>
                        <label className="block text-[13px] text-[#1E2A3A] mb-2">
                          업종 / 비즈니스 유형
                        </label>
                        <Select value={businessType} onValueChange={setBusinessType}>
                          <SelectTrigger className="app-form-input h-11 w-full rounded-xl px-4 text-[14px]">
                            <SelectValue placeholder="선택하세요" />
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
                        <label className="block text-[13px] text-[#1E2A3A] mb-2">
                          제품/서비스 설명
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="고객에게 제공하는 주요 제품이나 서비스를 설명해 주세요. 이 정보를 바탕으로 AI가 적절한 이메일 응답을 생성합니다."
                          rows={5}
                          className="app-form-input w-full resize-none rounded-xl px-4 py-3 text-[14px] placeholder:text-[#94A3B8]"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] text-[#1E2A3A] mb-3">
                          이메일 어조 선택
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {toneOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setTone(option.id)}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${
                                tone === option.id
                                  ? "border-[#2DD4BF] bg-[#2DD4BF]/5"
                                  : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                              }`}
                            >
                              <span className="text-[20px] mb-2 block">
                                {option.emoji}
                              </span>
                              <p className="text-[14px] text-[#1E2A3A] mb-0.5">
                                {option.label}
                              </p>
                              <p className="text-[12px] text-[#94A3B8]">
                                {option.desc}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-step 1: Business Materials */}
                  {currentSubStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-[#1E2A3A] text-[20px] mb-2">
                          비즈니스 자료 업로드
                        </h2>
                        <p className="text-[14px] text-[#94A3B8]">
                          비즈니스 매뉴얼이나 FAQ 문서를 업로드하면 더 정확한
                          응답을 생성합니다
                        </p>
                      </div>

                      {uploadErrorScenario ? (
                        <StateBanner
                          title="자료 업로드를 완료하지 못했습니다"
                          description="파일 용량 제한을 초과했거나 업로드 응답을 확인하지 못했습니다. 다시 시도하거나 FAQ 입력으로 진행할 수 있습니다."
                          tone="error"
                        />
                      ) : null}

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          void handleUploadedFiles(e.dataTransfer.files);
                        }}
                        onClick={() => !uploadingFile && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                          isDragging
                            ? "border-[#2DD4BF] bg-[#2DD4BF]/5"
                            : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => void handleUploadedFiles(e.target.files)}
                        />
                        {uploadingFile ? (
                          <Loader2 className="w-10 h-10 text-[#2DD4BF] mx-auto mb-3 animate-spin" />
                        ) : (
                          <Upload className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" />
                        )}
                        <p className="text-[14px] text-[#1E2A3A] mb-1">
                          {uploadingFile
                            ? "자료를 업로드하는 중입니다"
                            : "파일을 여기에 드래그하거나 클릭하여 업로드"}
                        </p>
                        <p className="text-[12px] text-[#94A3B8]">
                          PDF 형식 지원 (최대 10MB)
                        </p>
                      </div>

                      {uploadedFiles.length > 0 ? (
                        <div className="space-y-2">
                          {uploadedFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center gap-3 p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl"
                            >
                              <FileText className="w-5 h-5 text-[#10B981]" />
                              <span className="flex-1 text-[13px] text-[#1E2A3A]">
                                {file.fileName}
                              </span>
                              <button
                                onClick={() => void handleRemoveUploadedFile(file)}
                                className="text-[#94A3B8] hover:text-[#EF4444]"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="relative">
                        <div className="flex items-center gap-4 my-6">
                          <div className="flex-1 h-px bg-[#E2E8F0]" />
                          <span className="text-[12px] text-[#94A3B8]">
                            또는
                          </span>
                          <div className="flex-1 h-px bg-[#E2E8F0]" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <label className="block text-[13px] text-[#1E2A3A] mb-2">
                              FAQ / 매뉴얼 내용 직접 입력
                            </label>
                            <p className="text-[12px] text-[#94A3B8]">
                              질문과 답변을 한 쌍씩 저장하면 간단한 카드 형태로
                              정리됩니다
                            </p>
                          </div>

                          {faqItems.length > 0 && !faqComposerOpen ? (
                            <button
                              type="button"
                              onClick={() => setFaqComposerOpen(true)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:text-[#1E2A3A]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              FAQ 추가
                            </button>
                          ) : null}
                        </div>

                        {faqItems.length > 0 ? (
                          <div className="space-y-2">
                            {faqItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3"
                              >
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-5 items-center rounded-full bg-[#1E2A3A]/5 px-2 text-[10px] font-semibold text-[#475569]">
                                      Q
                                    </span>
                                    <p className="min-w-0 truncate text-[13px] font-medium text-[#1E2A3A]">
                                      {item.question}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-5 items-center rounded-full bg-[#2DD4BF]/10 px-2 text-[10px] font-semibold text-[#0D9488]">
                                      A
                                    </span>
                                    <p className="min-w-0 flex-1 truncate text-[12px] text-[#64748B]">
                                      {item.answer}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => void handleRemoveFaq(item.id)}
                                  className="text-[#CBD5E1] transition-colors hover:text-[#EF4444]"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {faqComposerOpen ? (
                          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-4">
                            <div>
                              <label className="block text-[13px] text-[#1E2A3A] mb-2">
                                질문
                              </label>
                              <input
                                value={faqDraft.question}
                                onChange={(e) =>
                                  handleFaqDraftChange("question", e.target.value)
                                }
                                placeholder="예: 환불 정책은 어떻게 되나요?"
                                className="app-form-input h-11 w-full rounded-xl px-4 text-[14px] placeholder:text-[#94A3B8]"
                              />
                            </div>

                            <div>
                              <label className="block text-[13px] text-[#1E2A3A] mb-2">
                                답변
                              </label>
                              <textarea
                                value={faqDraft.answer}
                                onChange={(e) =>
                                  handleFaqDraftChange("answer", e.target.value)
                                }
                                placeholder="예: 구매 후 14일 이내에 환불 요청이 가능하며, 사용 이력이 없는 경우 전액 환불됩니다."
                                rows={4}
                                className="app-form-input w-full resize-none rounded-xl px-4 py-3 text-[14px] placeholder:text-[#94A3B8]"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              {faqItems.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFaqDraft({ question: "", answer: "" });
                                    setFaqComposerOpen(false);
                                  }}
                                  className="px-4 py-2.5 rounded-xl text-[13px] text-[#64748B] transition-colors hover:text-[#1E2A3A]"
                                >
                                  취소
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => void handleSaveFaq()}
                                disabled={!canSaveFaq || savingFaq}
                                className={`px-4 py-2.5 rounded-xl text-[13px] transition-colors ${
                                  canSaveFaq && !savingFaq
                                    ? "bg-[#1E2A3A] text-white hover:bg-[#2A3A4E]"
                                    : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                                }`}
                              >
                                {savingFaq ? "저장 중..." : "작성 완료"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Sub-step 2: Email Categories */}
                  {currentSubStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-[#1E2A3A] text-[20px]">
                            이메일 카테고리 설정
                          </h2>
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-[#2DD4BF]/10 rounded-full text-[11px] text-[#0D9488]">
                            <Sparkles className="w-3 h-3" />
                            AI 추천
                          </span>
                        </div>
                        <p className="text-[14px] text-[#94A3B8]">
                          선택한 업종 / 비즈니스 유형에 해당하는 카테고리는 기본 등록되며, 다른 업종의 카테고리도 추가할 수 있습니다.
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[13px] text-[#64748B]">
                        선택한 업종 / 비즈니스 유형:{" "}
                        <span className="font-medium text-[#1E2A3A]">
                          {businessType ? getBusinessTypeLabel(businessType) : "아직 선택되지 않음"}
                        </span>
                      </div>

                      {categories.length ? (
                        <div className="flex flex-wrap gap-2">
                          {categories.map((cat) => (
                            <span
                              key={cat.id}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg group hover:border-[#CBD5E1] transition-colors"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
                                {getBusinessTypeLabel(cat.domain)}
                              </span>
                              <span className="text-[13px] text-[#1E2A3A]">{cat.name}</span>
                              <button
                                onClick={() => void handleRemoveCategory(cat.id)}
                                className="text-[#CBD5E1] hover:text-[#EF4444] transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#D7E0EB] bg-[#F8FAFC] px-4 py-6 text-center text-[13px] text-[#94A3B8]">
                          먼저 비즈니스 설정에서 업종 / 비즈니스 유형을 선택하면 해당 업종의 추천 카테고리가 표시됩니다.
                        </div>
                      )}

                      <div ref={categoryComposerRef} className="relative space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleAddCategory()
                            }
                            onFocus={() => setCategoryDropdownOpen(true)}
                            onClick={() => setCategoryDropdownOpen(true)}
                            placeholder="새 카테고리 추가..."
                            className="app-form-input h-11 flex-1 rounded-xl px-4 text-[14px] placeholder:text-[#94A3B8]"
                          />
                          <button
                            onClick={() => void handleAddCategory()}
                            disabled={savingCategory}
                            className="px-4 py-2.5 bg-[#1E2A3A] text-white rounded-xl hover:bg-[#2A3A4E] transition-colors flex items-center gap-2"
                          >
                            {savingCategory ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                            <span className="text-[13px] hidden sm:inline">
                              {savingCategory ? "추가 중" : "추가"}
                            </span>
                          </button>
                        </div>
                        {categoryDropdownOpen ? (
                          <div className="scrollbar-soft absolute left-0 right-0 top-full z-20 mt-2 max-h-[320px] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xl">
                            <p className="mb-3 text-[12px] font-medium text-[#64748B]">
                              추천 카테고리
                            </p>
                            {groupedCategorySuggestions.length ? (
                              <div className="space-y-3">
                                {groupedCategorySuggestions.map((group) => (
                                  <div key={group.businessType.value}>
                                    <p className="mb-2 text-[11px] font-semibold text-[#94A3B8]">
                                      {group.businessType.label}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {group.items.map((option) => (
                                        <button
                                          key={option.id}
                                          type="button"
                                          className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[12px] text-[#1E2A3A] transition hover:border-[#2DD4BF] hover:bg-[#F0FDFA]"
                                          onClick={() => void handleSelectSuggestedCategory(option)}
                                        >
                                          {option.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[12px] text-[#94A3B8]">
                                추천할 카테고리가 더 없습니다. 직접 입력해서 추가할 수 있습니다.
                              </p>
                            )}
                          </div>
                        ) : null}
                        <p className="text-[12px] text-[#94A3B8]">
                          입력창을 클릭하면 아직 추가하지 않은 다른 업종의 추천 카테고리도 함께 표시됩니다. 직접 입력해서 임의 카테고리를 추가할 수도 있습니다.
                        </p>
                      </div>

                      <div className="bg-[#F8FAFC] rounded-xl p-5 border border-[#E2E8F0]">
                        <p className="text-[13px] text-[#64748B] mb-3">
                          카테고리 미리보기
                        </p>
                        <div className="scrollbar-soft max-h-[320px] space-y-2 overflow-y-auto pr-1">
                          {categories.map((cat) => (
                            <div
                              key={cat.id}
                              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E2E8F0]"
                            >
                              <span
                                className="w-1 h-8 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <div className="flex-1">
                                <p className="text-[13px] text-[#1E2A3A]">
                                  {cat.name}
                                </p>
                                <p className="text-[11px] text-[#94A3B8]">
                                  {getBusinessTypeLabel(cat.domain)} 기준 추천 카테고리
                                </p>
                              </div>
                              <span className="text-[11px] text-[#94A3B8]">
                                템플릿 0개
                              </span>
                            </div>
                          ))}
                          {!categories.length ? (
                            <div className="rounded-lg border border-dashed border-[#D7E0EB] bg-white px-4 py-5 text-center text-[12px] text-[#94A3B8]">
                              선택된 업종 / 비즈니스 유형이 없어서 미리보기를 표시할 수 없습니다.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (currentSubStep === 0) {
                        setCurrentMainStep(1);
                      } else {
                        setCurrentSubStep(Math.max(0, currentSubStep - 1));
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] text-[#64748B] hover:text-[#1E2A3A] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </button>

                  {currentSubStep < 2 ? (
                    <button
                      onClick={async () => {
                        if (currentSubStep === 0) {
                          const saved = await saveCompanyProfile();

                          if (!saved) {
                            return;
                          }
                        }

                        setCurrentSubStep(currentSubStep + 1);
                      }}
                      disabled={currentSubStep === 0 && savingProfile}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] bg-[#1E2A3A] text-white hover:bg-[#2A3A4E] transition-colors"
                    >
                      {currentSubStep === 0 && savingProfile ? "저장 중..." : "다음"}
                      {currentSubStep === 0 && savingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      {templateGenerationMessage ? (
                        <StateBanner
                          title="초기 템플릿 생성 요청에 실패했습니다"
                          description={templateGenerationMessage}
                          tone="warning"
                          className="max-w-[420px]"
                        />
                      ) : null}
                      <button
                        onClick={() => void handleNextMainStep()}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] bg-[#2DD4BF] text-[#1E2A3A] hover:bg-[#14B8A6] transition-colors"
                      >
                        템플릿 생성 시작
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <p className="text-[11px] text-[#94A3B8] text-right max-w-[300px]">
                        설정한 카테고리를 기반으로 AI가 맞춤 템플릿을 자동
                        생성합니다
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Template Generation */}
            {currentMainStep === 3 && isGenerating && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0]/60 p-8 sm:p-10">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#2DD4BF] animate-spin" />
                  </div>
                </div>

                <h2 className="text-[#1E2A3A] text-[20px] text-center mb-2">
                  맞춤 템플릿을 생성하고 있습니다
                </h2>
                <p className="text-[14px] text-[#94A3B8] text-center mb-8">
                  입력하신 비즈니스 정보를 분석하여 카테고리별 템플릿을 만들고
                  있습니다
                </p>

                {templateGenerationErrorScenario ? (
                  <StateBanner
                    title="맞춤 템플릿 생성을 완료하지 못했습니다"
                    description="비즈니스 자료 분석은 끝났지만 템플릿 생성 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요."
                    tone="error"
                    className="mb-6"
                  />
                ) : null}

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    {generationStep > 0 ? (
                      <Check className="w-5 h-5 text-[#2DD4BF] shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#E2E8F0] shrink-0 mt-0.5" />
                    )}
                    <p
                      className={`text-[13px] ${
                        generationStep > 0
                          ? "text-[#1E2A3A]"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      회사 프로필 분석 완료
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    {generationStep > 1 ? (
                      <Check className="w-5 h-5 text-[#2DD4BF] shrink-0 mt-0.5" />
                    ) : generationStep === 1 ? (
                      <Loader2 className="w-5 h-5 text-[#2DD4BF] animate-spin shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#E2E8F0] shrink-0 mt-0.5" />
                    )}
                    <p
                      className={`text-[13px] ${
                        generationStep >= 1
                          ? "text-[#1E2A3A]"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      비즈니스 자료 학습 완료
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    {generationStep > 2 ? (
                      <Check className="w-5 h-5 text-[#2DD4BF] shrink-0 mt-0.5" />
                    ) : generationStep === 2 ? (
                      <Loader2 className="w-5 h-5 text-[#2DD4BF] animate-spin shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#E2E8F0] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`text-[13px] mb-2 ${
                          generationStep >= 2
                            ? "text-[#1E2A3A]"
                            : "text-[#94A3B8]"
                        }`}
                      >
                        카테고리별 템플릿 생성 중
                      </p>
                      {generationStep === 2 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#64748B]">가격문의</span>
                            <span className="text-[#94A3B8]">
                              {templateProgress}/5
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#2DD4BF] transition-all duration-300"
                              style={{
                                width: `${(templateProgress / 5) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    {generationStep > 3 ? (
                      <Check className="w-5 h-5 text-[#2DD4BF] shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#E2E8F0] shrink-0 mt-0.5" />
                    )}
                    <p
                      className={`text-[13px] ${
                        generationStep > 3
                          ? "text-[#1E2A3A]"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      키워드 및 분류 규칙 설정
                    </p>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-[12px] text-[#94A3B8]">
                    약 30초~1분 소요됩니다
                  </p>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleCancelGeneration}
                    className="text-[12px] text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  >
                    취소하고 나중에 설정하기
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Setup Complete */}
            {currentMainStep === 4 && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0]/60 p-8 sm:p-10">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-[#2DD4BF]" />
                  </div>
                </div>

                <h2 className="text-[#1E2A3A] text-[20px] text-center mb-2">
                  모든 설정이 완료되었습니다
                </h2>
                <p className="text-[14px] text-[#94A3B8] text-center mb-8">
                  이제 수신 이메일을 자동으로 분류하고 답변 초안을 생성할 준비가
                  되었습니다
                </p>

                {/* Completion Checklist */}
                <div className="bg-[#F8FAFC] rounded-xl p-5 border border-[#E2E8F0] mb-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#2DD4BF]" />
                      </div>
                      <span className="text-[13px] text-[#1E2A3A]">
                        Gmail 연동 완료 ({connectedEmail})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#2DD4BF]" />
                      </div>
                      <span className="text-[13px] text-[#1E2A3A]">
                        비즈니스 프로필 설정 완료
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#2DD4BF]" />
                      </div>
                      <span className="text-[13px] text-[#1E2A3A]">
                        템플릿 {generatedTemplateCount || categories.length * 3}개 생성 완료
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    navigate("/app");
                  }}
                  disabled={completingOnboarding}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#2DD4BF] text-[#1E2A3A] rounded-xl hover:bg-[#14B8A6] transition-colors"
                >
                  {completingOnboarding ? "완료 상태 저장 중..." : "대시보드로 이동"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
    </AuthOnboardingLayout>
  );
}
