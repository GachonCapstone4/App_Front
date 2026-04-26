import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Calendar,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Collapsible,
  CollapsibleContent,
} from "./ui/collapsible";
import {
  createAutomationRule,
  deleteAutomationRule,
  getAutomationRules,
  setAutomationRuleAutoCalendar,
  setAutomationRuleAutoSend,
  type AutomationRuleSnapshot,
} from "../../shared/api/automations";
import {
  getBusinessCategories,
  type BusinessCategorySnapshot,
} from "../../shared/api/business";
import { getErrorMessage } from "../../shared/api/http";
import {
  getGoogleAuthorizationUrl,
  getMyIntegrationSafe,
} from "../../shared/api/integrations";
import {
  navigateGoogleOAuthPopup,
  openGoogleOAuthPopup,
} from "../../shared/lib/google-oauth-popup";
import {
  getTemplateLibrary,
  type TemplateSnapshot,
} from "../../shared/api/templates";
import { AppStatePage } from "../../shared/ui/primitives/AppStatePage";
import { StateBanner } from "../../shared/ui/primitives/StateBanner";
import {
  buildAutomationCategoryGroups,
  buildAutomationDialogTemplateDrafts,
  buildAvailableAutomationCategories,
  getAutomationCategoryKey,
  type AutomationCategoryCatalogItem,
  type AutomationCategoryGroup,
  type AutomationDialogTemplateDraft,
  type AutomationTemplateCatalogItem,
} from "./automation-settings.helpers";

type DialogMode = "create" | "edit";

type DialogState = {
  mode: DialogMode;
  categoryId: string;
  templates: AutomationDialogTemplateDraft[];
};

const demoCategories: AutomationCategoryCatalogItem[] = [
  { categoryId: 1, categoryName: "가격문의", color: "#3B82F6" },
  { categoryId: 2, categoryName: "불만접수", color: "#EF4444" },
  { categoryId: 3, categoryName: "미팅요청", color: "#8B5CF6" },
  { categoryId: 4, categoryName: "기술지원", color: "#F59E0B" },
  { categoryId: 5, categoryName: "계약문의", color: "#10B981" },
  { categoryId: 6, categoryName: "배송문의", color: "#EC4899" },
];

const demoTemplateCatalog: AutomationTemplateCatalogItem[] = [
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 1,
    title: "가격 안내 템플릿",
  },
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 2,
    title: "가격표 및 할인 안내 템플릿",
  },
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 9,
    title: "엔터프라이즈 요금제 안내 템플릿",
  },
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 10,
    title: "연간 계약 할인 안내 템플릿",
  },
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 11,
    title: "도입 규모별 견적 안내 템플릿",
  },
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 12,
    title: "추가 옵션 비용 안내 템플릿",
  },
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 13,
    title: "무료 체험 후 전환 안내 템플릿",
  },
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 14,
    title: "결제 방식 안내 템플릿",
  },
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 15,
    title: "견적서 요청 응답 템플릿",
  },
  {
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 16,
    title: "가격 비교 문의 응답 템플릿",
  },
  {
    categoryId: 2,
    categoryName: "불만접수",
    color: "#EF4444",
    templateId: 3,
    title: "불만 접수 1차 응답 템플릿",
  },
  {
    categoryId: 2,
    categoryName: "불만접수",
    color: "#EF4444",
    templateId: 8,
    title: "불만 보상 후속 안내 템플릿",
  },
  {
    categoryId: 3,
    categoryName: "미팅요청",
    color: "#8B5CF6",
    templateId: 4,
    title: "미팅 일정 확인 템플릿",
  },
  {
    categoryId: 4,
    categoryName: "기술지원",
    color: "#F59E0B",
    templateId: 5,
    title: "기술 지원 접수 템플릿",
  },
  {
    categoryId: 5,
    categoryName: "계약문의",
    color: "#10B981",
    templateId: 6,
    title: "계약 검토 안내 템플릿",
  },
  {
    categoryId: 6,
    categoryName: "배송문의",
    color: "#EC4899",
    templateId: 7,
    title: "배송 현황 안내 템플릿",
  },
];

const initialRules: AutomationRuleSnapshot[] = [
  {
    ruleId: 1,
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 1,
    templateTitle: "가격 안내 템플릿",
    autoSendEnabled: false,
    autoCalendarEnabled: false,
  },
  {
    ruleId: 2,
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 2,
    templateTitle: "가격표 및 할인 안내 템플릿",
    autoSendEnabled: true,
    autoCalendarEnabled: false,
  },
  {
    ruleId: 3,
    categoryId: 2,
    categoryName: "불만접수",
    color: "#EF4444",
    templateId: 3,
    templateTitle: "불만 접수 1차 응답 템플릿",
    autoSendEnabled: false,
    autoCalendarEnabled: false,
  },
  {
    ruleId: 4,
    categoryId: 3,
    categoryName: "미팅요청",
    color: "#8B5CF6",
    templateId: 4,
    templateTitle: "미팅 일정 확인 템플릿",
    autoSendEnabled: true,
    autoCalendarEnabled: true,
  },
];

const emptyDialogState: DialogState = {
  mode: "create",
  categoryId: "",
  templates: [],
};

interface AutomationSettingsProps {
  scenarioId?: string | null;
}

function mapCategoryCatalog(
  categories: BusinessCategorySnapshot[],
): AutomationCategoryCatalogItem[] {
  return categories.map((category) => ({
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    color: category.color,
  }));
}

function mapTemplateCatalog(
  templates: TemplateSnapshot[],
  categories: AutomationCategoryCatalogItem[],
): AutomationTemplateCatalogItem[] {
  const colorByCategoryId = new Map(
    categories.map((category) => [category.categoryId, category.color]),
  );

  return templates.map((template) => ({
    categoryId: template.categoryId,
    categoryName: template.categoryName,
    color: colorByCategoryId.get(template.categoryId) ?? null,
    templateId: template.templateId,
    userTemplateNo: template.userTemplateNo,
    title: template.title,
  }));
}

export function AutomationSettings({ scenarioId }: AutomationSettingsProps) {
  const navigate = useNavigate();
  const scenarioMode = Boolean(scenarioId);
  const loadErrorScenario = scenarioId === "automation-load-error";
  const ruleDialogNormalScenario = scenarioId === "automation-rule-dialog-normal";
  const ruleEditNormalScenario = scenarioId === "automation-rule-edit-normal";
  const ruleDeleteNormalScenario = scenarioId === "automation-rule-delete-normal";
  const ruleSaveErrorScenario = scenarioId === "automation-rule-save-error";
  const calendarDisconnectedScenario = scenarioId === "automation-calendar-disconnected";
  const scenarioRules =
    ruleEditNormalScenario || ruleDeleteNormalScenario ? initialRules : [];
  const [rules, setRules] = useState<AutomationRuleSnapshot[]>(
    scenarioMode ? scenarioRules : [],
  );
  const [categories, setCategories] = useState<AutomationCategoryCatalogItem[]>(
    scenarioMode ? demoCategories : [],
  );
  const [templateCatalog, setTemplateCatalog] = useState<
    AutomationTemplateCatalogItem[]
  >(scenarioMode ? demoTemplateCatalog : []);
  const [isLoading, setIsLoading] = useState(!scenarioMode);
  const [loadError, setLoadError] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>(emptyDialogState);
  const [saving, setSaving] = useState(false);
  const [busyTemplateKey, setBusyTemplateKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutomationCategoryGroup | null>(
    null,
  );
  const [deletingCategoryKey, setDeletingCategoryKey] = useState<string | null>(null);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(
    !calendarDisconnectedScenario,
  );
  const [connectedCalendarEmail, setConnectedCalendarEmail] = useState(
    scenarioMode && !calendarDisconnectedScenario
      ? "calendar@mycompany.co.kr"
      : "",
  );

  const rulesWithTemplateNumbers = useMemo(() => {
    const userTemplateNoByTemplateId = new Map(
      templateCatalog.map((template) => [template.templateId, template.userTemplateNo]),
    );

    return rules.map((rule) => ({
      ...rule,
      userTemplateNo:
        rule.userTemplateNo ??
        (rule.templateId === null
          ? null
          : userTemplateNoByTemplateId.get(rule.templateId) ?? null),
    }));
  }, [rules, templateCatalog]);

  const groups = useMemo(
    () => buildAutomationCategoryGroups(rulesWithTemplateNumbers),
    [rulesWithTemplateNumbers],
  );

  const availableCategories = useMemo(
    () => buildAvailableAutomationCategories(categories, templateCatalog, groups),
    [categories, templateCatalog, groups],
  );

  const selectedDialogCategory = useMemo(() => {
    const categoryId = Number(dialogState.categoryId);

    return (
      categories.find((category) => category.categoryId === categoryId) ?? null
    );
  }, [categories, dialogState.categoryId]);

  useEffect(() => {
    setExpandedGroupKeys((current) =>
      current.filter((groupKey) => groups.some((group) => group.key === groupKey)),
    );
  }, [groups]);

  const toggleGroupExpanded = (groupKey: string) => {
    setExpandedGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey],
    );
  };

  useEffect(() => {
    if (scenarioMode) {
      return;
    }

    let active = true;

    async function loadAutomationData() {
      setIsLoading(true);
      setLoadError(false);

      try {
        const [
          nextRules,
          nextBusinessCategories,
          nextTemplates,
          integration,
        ] = await Promise.all([
          getAutomationRules(),
          getBusinessCategories(),
          getTemplateLibrary(),
          getMyIntegrationSafe(),
        ]);

        if (!active) {
          return;
        }

        const nextCategoryCatalog = mapCategoryCatalog(nextBusinessCategories);

        setRules(nextRules);
        setCategories(nextCategoryCatalog);
        setTemplateCatalog(mapTemplateCatalog(nextTemplates, nextCategoryCatalog));
        setGoogleCalendarConnected(Boolean(integration?.isCalendarConnected));
        setConnectedCalendarEmail(integration?.connectedEmail ?? "");
      } catch (error) {
        if (!active) {
          return;
        }

        setLoadError(true);
        toast.error(getErrorMessage(error, "자동화 설정을 불러오지 못했습니다."));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadAutomationData();

    return () => {
      active = false;
    };
  }, [scenarioMode]);

  useEffect(() => {
    if (!scenarioMode) {
      return;
    }

    if (calendarDisconnectedScenario) {
      setGoogleCalendarConnected(false);
      setConnectedCalendarEmail("");
    }

    if (ruleDialogNormalScenario) {
      const firstCategory = availableCategories[0];

      if (!firstCategory) {
        return;
      }

      setDialogState({
        mode: "create",
        categoryId: String(firstCategory.categoryId),
        templates: buildAutomationDialogTemplateDrafts(
          firstCategory.categoryId,
          templateCatalog,
        ),
      });
      setRuleDialogOpen(true);
      return;
    }

    if (ruleEditNormalScenario) {
      const targetGroup = groups[0];

      if (!targetGroup?.categoryId) {
        return;
      }

      setDialogState({
        mode: "edit",
        categoryId: String(targetGroup.categoryId),
        templates: buildAutomationDialogTemplateDrafts(
          targetGroup.categoryId,
          templateCatalog,
          targetGroup.templates,
        ),
      });
      setRuleDialogOpen(true);
      return;
    }

    if (ruleDeleteNormalScenario) {
      setDeleteTarget(groups[0] ?? null);
    }
  }, [
    availableCategories,
    calendarDisconnectedScenario,
    groups,
    ruleDeleteNormalScenario,
    ruleDialogNormalScenario,
    ruleEditNormalScenario,
    scenarioMode,
    templateCatalog,
  ]);

  const openCreateDialog = () => {
    const targetCategory = availableCategories[0];

    if (!targetCategory) {
      toast("추가할 수 있는 자동발송 규칙이 없습니다.");
      return;
    }

    setDialogState({
      mode: "create",
      categoryId: String(targetCategory.categoryId),
      templates: buildAutomationDialogTemplateDrafts(
        targetCategory.categoryId,
        templateCatalog,
      ),
    });
    setRuleDialogOpen(true);
  };

  const openEditDialog = (group: AutomationCategoryGroup) => {
    if (!group.categoryId) {
      toast.error("카테고리 정보를 확인할 수 없습니다.");
      return;
    }

    setDialogState({
      mode: "edit",
      categoryId: String(group.categoryId),
      templates: buildAutomationDialogTemplateDrafts(
        group.categoryId,
        templateCatalog,
        group.templates,
      ),
    });
    setRuleDialogOpen(true);
  };

  const handleDialogCategoryChange = (value: string) => {
    const categoryId = Number(value);

    setDialogState((current) => ({
      ...current,
      categoryId: value,
      templates: buildAutomationDialogTemplateDrafts(categoryId, templateCatalog),
    }));
  };

  const handleDialogTemplateToggle = (templateId: number) => {
    setDialogState((current) => ({
      ...current,
      templates: current.templates.map((template) =>
        template.templateId === templateId
          ? {
              ...template,
              selected: !template.selected,
              autoSend: !template.selected ? template.autoSend : false,
            }
          : template,
      ),
    }));
  };

  const handleDialogTemplateAutoSendToggle = (templateId: number) => {
    setDialogState((current) => ({
      ...current,
      templates: current.templates.map((template) =>
        template.templateId === templateId
          ? { ...template, autoSend: !template.autoSend }
          : template,
      ),
    }));
  };

  const handleDialogTemplateAutoCalendarToggle = (templateId: number) => {
    setDialogState((current) => ({
      ...current,
      templates: current.templates.map((template) =>
        template.templateId === templateId
          ? { ...template, autoCalendar: !template.autoCalendar }
          : template,
      ),
    }));
  };

  const createAutomationRuleWithCalendar = async (
    category: AutomationCategoryCatalogItem,
    template: AutomationDialogTemplateDraft,
  ) => {
    const createdRule = await createAutomationRule({
      categoryName: category.categoryName,
      color: category.color,
      templateId: template.templateId,
      autoSendEnabled: template.autoSend,
    });

    if (!template.autoCalendar) {
      return createdRule;
    }

    return setAutomationRuleAutoCalendar(createdRule.ruleId, true);
  };

  const handleSaveRuleGroup = async () => {
    if (!selectedDialogCategory) {
      toast.error("카테고리를 선택해 주세요.");
      return;
    }

    const selectedTemplates = dialogState.templates.filter(
      (template) => template.selected,
    );

    if (selectedTemplates.length === 0) {
      toast.error("자동발송 규칙에 포함할 템플릿을 선택해 주세요.");
      return;
    }

    if (ruleSaveErrorScenario) {
      toast.error("자동발송 규칙을 저장하지 못했습니다.");
      return;
    }

    setSaving(true);

    try {
      if (scenarioMode) {
        if (dialogState.mode === "create") {
          const nextRuleStartId =
            rules.reduce((maxRuleId, rule) => Math.max(maxRuleId, rule.ruleId), 0) + 1;

          const createdRules = selectedTemplates.map((template, index) => ({
            ruleId: nextRuleStartId + index,
            categoryId: selectedDialogCategory.categoryId,
            categoryName: selectedDialogCategory.categoryName,
            color: selectedDialogCategory.color,
            templateId: template.templateId,
            templateTitle: template.title,
            autoSendEnabled: template.autoSend,
            autoCalendarEnabled: template.autoCalendar,
          })) satisfies AutomationRuleSnapshot[];

          setRules((current) => [...current, ...createdRules]);
          toast.success("자동발송 규칙을 추가했습니다.");
        } else {
          const currentCategoryId = selectedDialogCategory.categoryId;
          const existingTemplateMap = new Map(
            groups
              .find((group) => group.categoryId === currentCategoryId)
              ?.templates.map((template) => [template.templateId, template]) ?? [],
          );
          const nextRuleStartId =
            rules.reduce((maxRuleId, rule) => Math.max(maxRuleId, rule.ruleId), 0) + 1;
          let createdOffset = 0;

          const nextRules = rules
            .filter((rule) => rule.categoryId !== currentCategoryId)
            .concat(
              selectedTemplates.map((template) => {
                const existingTemplate = existingTemplateMap.get(template.templateId);

                return {
                  ruleId:
                    existingTemplate?.ruleId ??
                    nextRuleStartId + createdOffset++,
                  categoryId: selectedDialogCategory.categoryId,
                  categoryName: selectedDialogCategory.categoryName,
                  color: selectedDialogCategory.color,
                  templateId: template.templateId,
                  templateTitle: template.title,
                  autoSendEnabled: template.autoSend,
                  autoCalendarEnabled: template.autoCalendar,
                } satisfies AutomationRuleSnapshot;
              }),
            );

          setRules(nextRules);
          toast.success("자동발송 규칙을 수정했습니다.");
        }

        setRuleDialogOpen(false);
        return;
      }

      if (dialogState.mode === "create") {
        const createdRules = await Promise.all(
          selectedTemplates.map((template) =>
            createAutomationRuleWithCalendar(selectedDialogCategory, template),
          ),
        );

        setRules((current) => [...current, ...createdRules]);
        toast.success("자동발송 규칙을 추가했습니다.");
      } else {
        const currentCategoryKey = getAutomationCategoryKey(
          selectedDialogCategory.categoryId,
          selectedDialogCategory.categoryName,
        );
        const currentGroup = groups.find((group) => group.key === currentCategoryKey);

        if (!currentGroup) {
          toast.error("수정할 자동발송 규칙을 찾을 수 없습니다.");
          return;
        }

        const nextRules = [...rules];
        const selectedTemplateIds = new Set(
          selectedTemplates.map((template) => template.templateId),
        );

        for (const existingTemplate of currentGroup.templates) {
          if (!existingTemplate.ruleId || existingTemplate.templateId === null) {
            continue;
          }

          if (selectedTemplateIds.has(existingTemplate.templateId)) {
            continue;
          }

          await deleteAutomationRule(existingTemplate.ruleId);

          const ruleIndex = nextRules.findIndex(
            (rule) => rule.ruleId === existingTemplate.ruleId,
          );

          if (ruleIndex >= 0) {
            nextRules.splice(ruleIndex, 1);
          }
        }

        for (const template of selectedTemplates) {
          const existingTemplate = currentGroup.templates.find(
            (item) => item.templateId === template.templateId,
          );

          if (existingTemplate?.ruleId) {
            if (
              existingTemplate.autoSend === template.autoSend &&
              existingTemplate.autoCalendar === template.autoCalendar
            ) {
              continue;
            }

            let updatedRule: AutomationRuleSnapshot | null = null;
            if (existingTemplate.autoSend !== template.autoSend) {
              updatedRule = await setAutomationRuleAutoSend(
                existingTemplate.ruleId,
                template.autoSend,
              );
            }
            if (existingTemplate.autoCalendar !== template.autoCalendar) {
              updatedRule = await setAutomationRuleAutoCalendar(
                existingTemplate.ruleId,
                template.autoCalendar,
              );
            }

            if (!updatedRule) {
              continue;
            }

            const ruleIndex = nextRules.findIndex(
              (rule) => rule.ruleId === updatedRule.ruleId,
            );

            if (ruleIndex >= 0) {
              nextRules.splice(ruleIndex, 1, updatedRule);
            }
            continue;
          }

          const createdRule = await createAutomationRuleWithCalendar(
            selectedDialogCategory,
            template,
          );

          nextRules.push(createdRule);
        }

        setRules(nextRules);
        toast.success("자동발송 규칙을 수정했습니다.");
      }

      setRuleDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "자동발송 규칙을 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRuleGroup = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeletingCategoryKey(deleteTarget.key);

    try {
      if (scenarioMode) {
        setRules((current) =>
          current.filter((rule) =>
            getAutomationCategoryKey(rule.categoryId, rule.categoryName) !==
            deleteTarget.key,
          ),
        );
        toast.success("자동발송 규칙을 삭제했습니다.");
        return;
      }

      const ruleIds = deleteTarget.templates
        .map((template) => template.ruleId)
        .filter((ruleId): ruleId is number => ruleId !== null);

      await Promise.all(ruleIds.map((ruleId) => deleteAutomationRule(ruleId)));

      setRules((current) =>
        current.filter((rule) =>
          getAutomationCategoryKey(rule.categoryId, rule.categoryName) !==
          deleteTarget.key,
        ),
      );
      toast.success("자동발송 규칙을 삭제했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "자동발송 규칙을 삭제하지 못했습니다."));
    } finally {
      setDeletingCategoryKey(null);
      setDeleteTarget(null);
    }
  };

  const handleAutoSendToggle = async (
    group: AutomationCategoryGroup,
    templateId: number,
  ) => {
    const targetTemplate = group.templates.find(
      (template) => template.templateId === templateId,
    );

    if (!targetTemplate || !group.categoryId) {
      return;
    }

    const nextAutoSend = !targetTemplate.autoSend;
    const busyKey = `${group.key}:${templateId}:send`;
    setBusyTemplateKey(busyKey);

    try {
      if (scenarioMode) {
        setRules((current) =>
          current.map((rule) =>
            rule.ruleId === targetTemplate.ruleId
              ? { ...rule, autoSendEnabled: nextAutoSend }
              : rule,
          ),
        );
        return;
      }

      if (targetTemplate.ruleId) {
        const updatedRule = await setAutomationRuleAutoSend(
          targetTemplate.ruleId,
          nextAutoSend,
        );

        setRules((current) =>
          current.map((rule) =>
            rule.ruleId === updatedRule.ruleId ? updatedRule : rule,
          ),
        );
        return;
      }

      const createdRule = await createAutomationRule({
        categoryName: group.categoryName,
        color: group.color,
        templateId,
        autoSendEnabled: nextAutoSend,
      });

      setRules((current) => [...current, createdRule]);
      toast.success("새 템플릿 자동발송 규칙을 추가했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "자동 발송 상태를 변경하지 못했습니다."));
    } finally {
      setBusyTemplateKey(null);
    }
  };

  const handleAutoCalendarToggle = async (
    group: AutomationCategoryGroup,
    templateId: number,
  ) => {
    const targetTemplate = group.templates.find(
      (template) => template.templateId === templateId,
    );

    if (!targetTemplate || !group.categoryId) {
      return;
    }

    const nextAutoCalendar = !targetTemplate.autoCalendar;
    const busyKey = `${group.key}:${templateId}:calendar`;
    setBusyTemplateKey(busyKey);

    try {
      if (scenarioMode) {
        setRules((current) =>
          current.map((rule) =>
            rule.ruleId === targetTemplate.ruleId
              ? { ...rule, autoCalendarEnabled: nextAutoCalendar }
              : rule,
          ),
        );
        return;
      }

      if (targetTemplate.ruleId) {
        const updatedRule = await setAutomationRuleAutoCalendar(
          targetTemplate.ruleId,
          nextAutoCalendar,
        );

        setRules((current) =>
          current.map((rule) =>
            rule.ruleId === updatedRule.ruleId ? updatedRule : rule,
          ),
        );
        return;
      }

      const createdRule = await createAutomationRule({
        categoryName: group.categoryName,
        color: group.color,
        templateId,
        autoSendEnabled: targetTemplate.autoSend,
      });
      const updatedRule = await setAutomationRuleAutoCalendar(
        createdRule.ruleId,
        nextAutoCalendar,
      );

      setRules((current) => [...current, updatedRule]);
      toast.success("새 템플릿 캘린더 자동화 규칙을 추가했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "캘린더 자동 등록 상태를 변경하지 못했습니다."));
    } finally {
      setBusyTemplateKey(null);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const popup = openGoogleOAuthPopup();

      if (!popup) {
        toast.error("브라우저에서 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.");
        return;
      }

      const authorizationUrl = await getGoogleAuthorizationUrl();
      navigateGoogleOAuthPopup(popup, authorizationUrl);
      toast("연동이 완료되면 설정 또는 이 화면을 새로고침해 상태를 확인해 주세요.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Google 캘린더 연결을 시작하지 못했습니다."));
    }
  };

  if (loadErrorScenario || loadError) {
    return (
      <AppStatePage
        title="자동화 설정을 불러오지 못했습니다"
        description="규칙 목록과 캘린더 연동 상태를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[1200px] p-4 lg:p-8">
        {ruleSaveErrorScenario ? (
          <StateBanner
            title="자동발송 규칙을 저장하지 못했습니다"
            description="편집한 자동발송 규칙 내용은 유지되었지만 저장 응답이 지연되고 있습니다. 다시 시도해 주세요."
            tone="error"
            className="mb-6"
          />
        ) : null}

        {calendarDisconnectedScenario ? (
          <StateBanner
            title="Google Calendar 연결이 해제되었습니다"
            description="캘린더 자동 등록 관련 상태만 확인 가능하며, 연결 자체는 설정 화면에서 다시 진행해 주세요."
            tone="warning"
            className="mb-6"
          />
        ) : null}

        <div className="mb-8">
          <h1 className="mb-1 text-[#1E2A3A] dark:text-foreground">자동화 설정</h1>
          <p className="text-[14px] text-[#64748B] dark:text-muted-foreground">
            원하는 카테고리와 템플릿을 선택해 자동발송 규칙을 구성하고, 각 템플릿마다 자동 발송 여부를 설정합니다.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] p-6 dark:border-border">
            <div>
              <h3 className="text-[#1E2A3A] dark:text-foreground">자동발송 규칙</h3>
              <p className="mt-1 text-[12px] text-[#94A3B8] dark:text-muted-foreground">
                카테고리를 선택한 뒤 원하는 템플릿만 골라 자동발송 규칙으로 저장할 수 있습니다.
              </p>
            </div>
            <button
              onClick={openCreateDialog}
              disabled={availableCategories.length === 0}
              className="app-cta-primary flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              규칙 추가
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4 p-6">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-xl border border-[#E2E8F0] p-5 dark:border-border"
                >
                  <div className="mb-3 h-4 w-48 rounded bg-[#F1F5F9] dark:bg-[#1E293B]" />
                  <div className="h-20 rounded bg-[#F8FAFC] dark:bg-[#131D2F]" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="p-8">
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center dark:border-border dark:bg-[#131D2F]">
                <p className="text-[15px] text-[#1E2A3A] dark:text-foreground">
                  아직 설정된 자동발송 규칙이 없습니다
                </p>
                <p className="mt-2 text-[13px] text-[#94A3B8] dark:text-muted-foreground">
                  규칙을 추가한 뒤 필요한 템플릿만 선택해 자동발송 여부를 저장해 주세요.
                </p>
                <button
                  onClick={openCreateDialog}
                  disabled={availableCategories.length === 0}
                  className="app-cta-primary mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  첫 규칙 추가
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-6">
              {groups.map((group) => {
                const deleting = deletingCategoryKey === group.key;
                const isExpanded = expandedGroupKeys.includes(group.key);

                return (
                  <section
                    key={group.key}
                    className="overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-border"
                  >
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleGroupExpanded(group.key)}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleGroupExpanded(group.key)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleGroupExpanded(group.key);
                          }
                        }}
                        className="flex cursor-pointer flex-col gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] p-5 text-left transition-colors hover:bg-[#F1F5F9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF] dark:border-border dark:bg-[#131D2F] dark:hover:bg-[#182338] md:flex-row md:items-center md:justify-between"
                        aria-expanded={isExpanded}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: group.color }}
                            />
                            <h4 className="text-[15px] text-[#1E2A3A] dark:text-foreground">
                              {group.categoryName}
                            </h4>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#64748B] shadow-sm dark:bg-[#0F172A] dark:text-muted-foreground">
                              템플릿 {group.templates.length}개 선택됨
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[12px] text-[#94A3B8] dark:text-muted-foreground">
                            <span>
                              선택한 템플릿만 자동발송 규칙에 포함되며, 카드 안에서 개별 자동 발송 여부를 바꿀 수 있습니다.
                            </span>
                            <span className="hidden rounded-full bg-white px-2.5 py-1 text-[11px] text-[#64748B] shadow-sm dark:bg-[#0F172A] dark:text-muted-foreground md:inline-flex">
                              {isExpanded ? "접기" : "펴기"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditDialog(group);
                            }}
                            className="app-secondary-button flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            관리
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(group);
                            }}
                            disabled={deleting}
                            className="app-danger-button flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            삭제
                          </button>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform dark:text-muted-foreground ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                        <div className="max-h-[320px] overflow-y-auto overscroll-contain divide-y divide-[#F1F5F9] dark:divide-border">
                          {group.templates.map((template) => {
                            const templateKey =
                              template.templateId === null
                                ? `${group.key}:unknown`
                                : `${group.key}:${template.templateId}`;
                            const sendBusyKey =
                              template.templateId === null
                                ? `${templateKey}:send`
                                : `${group.key}:${template.templateId}:send`;
                            const calendarBusyKey =
                              template.templateId === null
                                ? `${templateKey}:calendar`
                                : `${group.key}:${template.templateId}:calendar`;
                            const isSendBusy = busyTemplateKey === sendBusyKey;
                            const isCalendarBusy = busyTemplateKey === calendarBusyKey;

                            return (
                              <div
                                key={templateKey}
                                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-md bg-[#EEF2FF] px-2 py-1 text-[11px] font-medium text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#C7D2FE]">
                                      {template.templateId === null
                                        ? "ID 미지정"
                                        : `ID ${template.userTemplateNo ?? template.templateId}`}
                                    </span>
                                    <span className="text-[14px] text-[#1E2A3A] dark:text-foreground">
                                      {template.title}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-muted-foreground">
                                    <span>자동 발송</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        template.templateId !== null
                                          ? handleAutoSendToggle(group, template.templateId)
                                          : undefined
                                      }
                                      disabled={isSendBusy || template.templateId === null}
                                      className={`relative h-5.5 w-10 rounded-full transition-colors ${
                                        template.autoSend
                                          ? "bg-[#2DD4BF] dark:bg-[#0F766E]"
                                          : "bg-[#CBD5E1] dark:bg-[#334155]"
                                      } disabled:cursor-not-allowed disabled:opacity-60`}
                                      aria-label={`${group.categoryName} ${template.title} 자동 발송`}
                                    >
                                      {isSendBusy ? (
                                        <Loader2 className="absolute left-3 top-1 h-3.5 w-3.5 animate-spin text-white" />
                                      ) : (
                                        <span
                                          className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
                                            template.autoSend ? "left-5" : "left-0.5"
                                          }`}
                                        />
                                      )}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-muted-foreground">
                                    <span>캘린더</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        template.templateId !== null
                                          ? handleAutoCalendarToggle(group, template.templateId)
                                          : undefined
                                      }
                                      disabled={isCalendarBusy || template.templateId === null}
                                      className={`relative h-5.5 w-10 rounded-full transition-colors ${
                                        template.autoCalendar
                                          ? "bg-[#8B5CF6] dark:bg-[#6D28D9]"
                                          : "bg-[#CBD5E1] dark:bg-[#334155]"
                                      } disabled:cursor-not-allowed disabled:opacity-60`}
                                      aria-label={`${group.categoryName} ${template.title} 캘린더 자동 등록`}
                                    >
                                      {isCalendarBusy ? (
                                        <Loader2 className="absolute left-3 top-1 h-3.5 w-3.5 animate-spin text-white" />
                                      ) : (
                                        <span
                                          className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
                                            template.autoCalendar ? "left-5" : "left-0.5"
                                          }`}
                                        />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm dark:border-border dark:bg-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-[#1E2A3A] dark:text-foreground">캘린더 연동</h3>
              <p className="mt-1 text-[12px] text-[#94A3B8] dark:text-muted-foreground">
                현재는 연동 상태 확인만 실제 API에 연결되어 있습니다.
              </p>
            </div>
            {!googleCalendarConnected ? (
              <button
                onClick={handleConnectCalendar}
                className="app-secondary-button flex items-center gap-2 rounded-lg px-4 py-2 text-[13px]"
              >
                <Plus className="h-4 w-4" />
                Google 캘린더 연결
              </button>
            ) : (
              <button
                onClick={() => navigate("/app/settings?tab=email")}
                className="app-secondary-button rounded-lg px-4 py-2 text-[13px]"
              >
                연동 관리
              </button>
            )}
          </div>

          <div className="space-y-3">
            {googleCalendarConnected ? (
              <div className="app-soft-surface flex items-center gap-4 rounded-xl p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4285F4] text-white text-[14px]">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] text-[#1E2A3A] dark:text-foreground">
                      Google Calendar
                    </span>
                    <span className="app-success-pill rounded-full px-2 py-0.5 text-[10px]">
                      연결됨
                    </span>
                  </div>
                  <p className="truncate text-[12px] text-[#94A3B8] dark:text-muted-foreground">
                    {connectedCalendarEmail || "연결된 계정 정보를 확인하는 중입니다."}
                  </p>
                </div>
                <button
                  onClick={() =>
                    window.open(
                      "https://calendar.google.com",
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="rounded-md p-2 text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#64748B] dark:text-muted-foreground dark:hover:bg-[#1E293B] dark:hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-border dark:bg-[#131D2F]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E2E8F0] text-[#94A3B8] dark:bg-[#1E293B] dark:text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-[#94A3B8] dark:text-muted-foreground">
                    Google 캘린더를 연결하세요
                  </p>
                  <p className="text-[11px] text-[#CBD5E1] dark:text-[#64748B]">
                    일정 자동 등록 기능을 사용하려면 설정 화면에서 Google 연동이 필요합니다.
                  </p>
                </div>
              </div>
            )}

            <StateBanner
              title="전역 일정 자동 등록은 아직 실제 연결하지 않았습니다"
              description="현재 백엔드는 규칙별 auto_calendar_enabled만 제공하고, 이 화면의 전역 토글/카테고리 묶음 UX와는 1:1로 맞지 않습니다. 필요한 API와 DB 보완 항목은 문서에 정리해 두었습니다."
              tone="warning"
            />
          </div>
        </div>
      </div>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === "edit"
                ? "자동발송 규칙 수정"
                : "자동발송 규칙 추가"}
            </DialogTitle>
            <DialogDescription>
              카테고리를 선택한 뒤, 사용할 템플릿과 템플릿별 자동 발송 여부를 직접 선택해 저장합니다.
            </DialogDescription>
          </DialogHeader>

          {ruleSaveErrorScenario ? (
            <StateBanner
              title="자동발송 규칙 저장을 완료하지 못했습니다"
              description="입력한 규칙 내용은 유지됩니다. 다시 저장해 주세요."
              tone="error"
            />
          ) : null}

          <div className="space-y-4">
            <div className="space-y-2 text-sm text-foreground">
              <span className="block">카테고리</span>
              {dialogState.mode === "edit" ? (
                <div className="flex h-11 items-center rounded-xl border border-border bg-muted/40 px-4 text-sm text-foreground">
                  {selectedDialogCategory?.categoryName ?? "카테고리 정보 없음"}
                </div>
              ) : (
                <Select
                  value={dialogState.categoryId}
                  onValueChange={handleDialogCategoryChange}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="카테고리를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => (
                      <SelectItem
                        key={category.categoryId}
                        value={String(category.categoryId)}
                      >
                        {category.categoryName} · 템플릿 {category.templateCount}개
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-border dark:bg-[#131D2F]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-[#1E2A3A] dark:text-foreground">
                    지정 템플릿 ID
                  </p>
                  <p className="text-[11px] text-[#94A3B8] dark:text-muted-foreground">
                    선택한 카테고리 안에서 자동발송 규칙에 포함할 템플릿을 고르세요.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#64748B] shadow-sm dark:bg-[#0F172A] dark:text-muted-foreground">
                  선택 {dialogState.templates.filter((template) => template.selected).length}개 / 전체 {dialogState.templates.length}개
                </span>
              </div>

              <div className="max-h-[360px] space-y-2 overflow-y-auto overscroll-contain pr-1">
                {dialogState.templates.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white px-4 py-3 text-[12px] text-[#94A3B8] dark:border-border dark:bg-[#0F172A] dark:text-muted-foreground">
                    이 카테고리에는 사용할 수 있는 템플릿이 없습니다.
                  </div>
                ) : (
                  dialogState.templates.map((template) => (
                    <div
                      key={template.templateId}
                      className="flex items-center justify-between rounded-lg border border-white bg-white px-4 py-3 dark:border-[#1E293B] dark:bg-[#0F172A]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDialogTemplateToggle(template.templateId)}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                              template.selected
                                ? "border-[#2DD4BF] bg-[#CCFBF1] text-[#0F766E] dark:border-[#14B8A6] dark:bg-[#0F2E2B] dark:text-[#5EEAD4]"
                                : "border-[#CBD5E1] bg-transparent text-transparent dark:border-[#334155]"
                            }`}
                            aria-label={`${template.title} 선택`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <span className="rounded-md bg-[#EEF2FF] px-2 py-1 text-[11px] font-medium text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#C7D2FE]">
                            ID {template.userTemplateNo ?? template.templateId}
                          </span>
                          <span className="text-[13px] text-[#1E2A3A] dark:text-foreground">
                            {template.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-muted-foreground">
                          <span>자동 발송</span>
                          <button
                            type="button"
                            onClick={() =>
                              template.selected
                                ? handleDialogTemplateAutoSendToggle(template.templateId)
                                : undefined
                            }
                            disabled={!template.selected}
                            className={`relative h-5.5 w-10 rounded-full transition-colors ${
                              template.autoSend
                                ? "bg-[#2DD4BF] dark:bg-[#0F766E]"
                                : "bg-[#CBD5E1] dark:bg-[#334155]"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                            aria-label={`${template.title} 자동 발송`}
                          >
                            <span
                              className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
                                template.autoSend ? "left-5" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-muted-foreground">
                          <span>캘린더</span>
                          <button
                            type="button"
                            onClick={() =>
                              template.selected
                                ? handleDialogTemplateAutoCalendarToggle(template.templateId)
                                : undefined
                            }
                            disabled={!template.selected}
                            className={`relative h-5.5 w-10 rounded-full transition-colors ${
                              template.autoCalendar
                                ? "bg-[#8B5CF6] dark:bg-[#6D28D9]"
                                : "bg-[#CBD5E1] dark:bg-[#334155]"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                            aria-label={`${template.title} 캘린더 자동 등록`}
                          >
                            <span
                              className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
                                template.autoCalendar ? "left-5" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
              onClick={() => setRuleDialogOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="rounded-xl bg-[#1E2A3A] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSaveRuleGroup}
              disabled={saving || dialogState.templates.length === 0}
            >
              {saving ? "저장 중..." : "저장"}
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
            <AlertDialogTitle>자동발송 규칙을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.categoryName}"에 연결된 템플릿 자동발송 규칙이 함께 제거됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRuleGroup}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
