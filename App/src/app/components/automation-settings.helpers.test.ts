import { describe, expect, it } from "vitest";
import type { AutomationRuleSnapshot } from "../../shared/api/automations";
import {
  buildAutomationCategoryGroups,
  buildAutomationDialogTemplateDrafts,
  buildAvailableAutomationCategories,
  type AutomationCategoryCatalogItem,
  type AutomationTemplateCatalogItem,
} from "./automation-settings.helpers";

const categories: AutomationCategoryCatalogItem[] = [
  { categoryId: 1, categoryName: "가격문의", color: "#3B82F6" },
  { categoryId: 2, categoryName: "불만접수", color: "#EF4444" },
  { categoryId: 3, categoryName: "미팅요청", color: "#8B5CF6" },
];

const templateCatalog: AutomationTemplateCatalogItem[] = [
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
    title: "할인 안내 템플릿",
  },
  {
    categoryId: 2,
    categoryName: "불만접수",
    color: "#EF4444",
    templateId: 3,
    title: "사과 안내 템플릿",
  },
  {
    categoryId: 3,
    categoryName: "미팅요청",
    color: "#8B5CF6",
    templateId: 4,
    title: "미팅 일정 확인 템플릿",
  },
];

const rules: AutomationRuleSnapshot[] = [
  {
    ruleId: 10,
    categoryId: 1,
    categoryName: "가격문의",
    color: "#3B82F6",
    templateId: 1,
    templateTitle: "가격 안내 템플릿",
    autoSendEnabled: true,
    autoCalendarEnabled: false,
  },
  {
    ruleId: 11,
    categoryId: 2,
    categoryName: "불만접수",
    color: "#EF4444",
    templateId: 3,
    templateTitle: "사과 안내 템플릿",
    autoSendEnabled: false,
    autoCalendarEnabled: false,
  },
];

describe("automation-settings helpers", () => {
  it("builds grouped category cards and keeps missing template rows visible", () => {
    const groups = buildAutomationCategoryGroups(rules);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.categoryName).toBe("가격문의");
    expect(groups[0]?.templates).toEqual([
      {
        templateId: 1,
        userTemplateNo: null,
        title: "가격 안내 템플릿",
        ruleId: 10,
        autoSend: true,
        autoCalendar: false,
      },
    ]);
  });

  it("returns categories that can still be added to automation", () => {
    const groups = buildAutomationCategoryGroups(rules);
    const availableCategories = buildAvailableAutomationCategories(
      categories,
      templateCatalog,
      groups,
    );

    expect(availableCategories).toEqual([
      {
        categoryId: 3,
        categoryName: "미팅요청",
        color: "#8B5CF6",
        templateCount: 1,
      },
    ]);
  });

  it("builds dialog template rows with existing auto-send values", () => {
    const groups = buildAutomationCategoryGroups(rules);
    const drafts = buildAutomationDialogTemplateDrafts(
      1,
      templateCatalog,
      groups[0]?.templates ?? [],
    );

    expect(drafts).toEqual([
      {
        templateId: 1,
        userTemplateNo: null,
        title: "가격 안내 템플릿",
        selected: true,
        autoSend: true,
        autoCalendar: false,
        ruleId: 10,
      },
      {
        templateId: 2,
        userTemplateNo: null,
        title: "할인 안내 템플릿",
        selected: false,
        autoSend: false,
        autoCalendar: false,
        ruleId: null,
      },
    ]);
  });
});
