import type { AutomationRuleSnapshot } from "../../shared/api/automations";

export type AutomationCategoryCatalogItem = {
  categoryId: number;
  categoryName: string;
  color: string | null;
};

export type AutomationTemplateCatalogItem = {
  categoryId: number;
  categoryName: string;
  color: string | null;
  templateId: number;
  userTemplateNo?: number | null;
  title: string;
};

export type AutomationTemplateRow = {
  templateId: number | null;
  userTemplateNo: number | null;
  title: string;
  ruleId: number | null;
  autoSend: boolean;
  autoCalendar: boolean;
};

export type AutomationCategoryGroup = {
  key: string;
  categoryId: number | null;
  categoryName: string;
  color: string;
  templates: AutomationTemplateRow[];
};

export type AutomationDialogTemplateDraft = {
  templateId: number;
  userTemplateNo: number | null;
  title: string;
  selected: boolean;
  autoSend: boolean;
  ruleId: number | null;
};

export type AvailableAutomationCategory = {
  categoryId: number;
  categoryName: string;
  color: string | null;
  templateCount: number;
};

const fallbackColor = "#94A3B8";

export function getAutomationCategoryKey(
  categoryId: number | null,
  categoryName: string,
) {
  return categoryId ? `category:${categoryId}` : `category-name:${categoryName}`;
}

export function buildAutomationCategoryGroups(
  rules: AutomationRuleSnapshot[],
) {
  const groupMap = new Map<
    string,
    {
      categoryId: number | null;
      categoryName: string;
      color: string;
      templates: Map<string, AutomationTemplateRow>;
    }
  >();

  rules.forEach((rule) => {
    const key = getAutomationCategoryKey(rule.categoryId, rule.categoryName);
    const existingGroup = groupMap.get(key);

    if (!existingGroup) {
      groupMap.set(key, {
        categoryId: rule.categoryId,
        categoryName: rule.categoryName,
        color: rule.color ?? fallbackColor,
        templates: new Map(),
      });
    }

    const group = groupMap.get(key);

    if (!group) {
      return;
    }

    if (rule.templateId === null) {
      group.templates.set(`rule:${rule.ruleId}`, {
        templateId: null,
        userTemplateNo: null,
        title: rule.templateTitle ?? "지정되지 않은 템플릿",
        ruleId: rule.ruleId,
        autoSend: rule.autoSendEnabled,
        autoCalendar: rule.autoCalendarEnabled,
      });
      return;
    }

    group.templates.set(`template:${rule.templateId}`, {
      templateId: rule.templateId,
      userTemplateNo: rule.userTemplateNo ?? null,
      title: rule.templateTitle ?? `템플릿 ${rule.templateId}`,
      ruleId: rule.ruleId,
      autoSend: rule.autoSendEnabled,
      autoCalendar: rule.autoCalendarEnabled,
    });
  });

  return Array.from(groupMap.entries())
    .map(([key, group]) => ({
      key,
      categoryId: group.categoryId,
      categoryName: group.categoryName,
      color: group.color,
      templates: Array.from(group.templates.values()).sort((left, right) => {
        if (left.templateId === null) {
          return 1;
        }

        if (right.templateId === null) {
          return -1;
        }

        return left.templateId - right.templateId;
      }),
    }))
    .sort((left, right) => left.categoryName.localeCompare(right.categoryName, "ko"));
}

export function buildAvailableAutomationCategories(
  categories: AutomationCategoryCatalogItem[],
  templateCatalog: AutomationTemplateCatalogItem[],
  groups: AutomationCategoryGroup[],
) {
  const configuredCategoryIds = new Set(
    groups
      .map((group) => group.categoryId)
      .filter((categoryId): categoryId is number => categoryId !== null),
  );

  const templateCountByCategoryId = new Map<number, number>();
  templateCatalog.forEach((template) => {
    templateCountByCategoryId.set(
      template.categoryId,
      (templateCountByCategoryId.get(template.categoryId) ?? 0) + 1,
    );
  });

  return categories
    .map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      color: category.color,
      templateCount: templateCountByCategoryId.get(category.categoryId) ?? 0,
    }))
    .filter(
      (category) =>
        category.templateCount > 0 &&
        !configuredCategoryIds.has(category.categoryId),
    )
    .sort((left, right) => left.categoryName.localeCompare(right.categoryName, "ko"));
}

export function buildAutomationDialogTemplateDrafts(
  categoryId: number,
  templateCatalog: AutomationTemplateCatalogItem[],
  existingTemplates: AutomationTemplateRow[] = [],
) {
  const existingTemplateMap = new Map(
    existingTemplates
      .filter(
        (template): template is AutomationTemplateRow & { templateId: number } =>
          template.templateId !== null,
      )
      .map((template) => [template.templateId, template]),
  );

  return templateCatalog
    .filter((template) => template.categoryId === categoryId)
    .sort((left, right) => left.templateId - right.templateId)
    .map((template) => {
      const existingTemplate = existingTemplateMap.get(template.templateId);

      return {
        templateId: template.templateId,
        userTemplateNo: template.userTemplateNo ?? null,
        title: template.title,
        selected: Boolean(existingTemplate),
        autoSend: existingTemplate?.autoSend ?? false,
        ruleId: existingTemplate?.ruleId ?? null,
      } satisfies AutomationDialogTemplateDraft;
    });
}
