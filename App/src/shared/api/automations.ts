import { api } from "./http";

type AutomationRuleApiResponse = {
  rule_id: number;
  category: {
    category_id: number;
    name: string;
    color: string | null;
  };
  template: {
    template_id: number;
    user_template_no?: number | null;
    title: string;
  } | null;
  auto_send_enabled: boolean;
  auto_calendar_enabled: boolean;
};

type AutomationRuleListApiResponse = {
  rules: AutomationRuleApiResponse[];
};

export type AutomationRuleSnapshot = {
  ruleId: number;
  categoryId: number;
  categoryName: string;
  color: string | null;
  templateId: number | null;
  userTemplateNo?: number | null;
  templateTitle: string | null;
  autoSendEnabled: boolean;
  autoCalendarEnabled: boolean;
};

export type AutomationRulePayload = {
  categoryName: string;
  color?: string | null;
  templateId: number | null;
  autoSendEnabled: boolean;
};

function mapAutomationRuleSnapshot(
  response: AutomationRuleApiResponse,
): AutomationRuleSnapshot {
  return {
    ruleId: response.rule_id,
    categoryId: response.category.category_id,
    categoryName: response.category.name,
    color: response.category.color,
    templateId: response.template?.template_id ?? null,
    userTemplateNo: response.template?.user_template_no ?? null,
    templateTitle: response.template?.title ?? null,
    autoSendEnabled: response.auto_send_enabled,
    autoCalendarEnabled: response.auto_calendar_enabled,
  };
}

export async function getAutomationRules() {
  const response = await api.get<AutomationRuleListApiResponse>(
    "/api/automations/rules",
  );

  return response.data.rules.map(mapAutomationRuleSnapshot);
}

export async function createAutomationRule(payload: AutomationRulePayload) {
  const response = await api.post<AutomationRuleApiResponse>(
    "/api/automations/rules",
    {
      category_name: payload.categoryName,
      color: payload.color ?? null,
      template_id: payload.templateId,
      auto_send_enabled: payload.autoSendEnabled,
    },
  );

  return mapAutomationRuleSnapshot(response.data);
}

export async function updateAutomationRule(
  ruleId: number,
  payload: AutomationRulePayload,
) {
  const response = await api.put<AutomationRuleApiResponse>(
    `/api/automations/rules/${ruleId}`,
    {
      category_name: payload.categoryName,
      color: payload.color ?? null,
      template_id: payload.templateId,
      auto_send_enabled: payload.autoSendEnabled,
    },
  );

  return mapAutomationRuleSnapshot(response.data);
}

export async function deleteAutomationRule(ruleId: number) {
  await api.delete(`/api/automations/rules/${ruleId}`);
}

export async function setAutomationRuleAutoSend(
  ruleId: number,
  autoSendEnabled: boolean,
) {
  const response = await api.patch<AutomationRuleApiResponse>(
    `/api/automations/rules/${ruleId}/auto-send`,
    {
      auto_send_enabled: autoSendEnabled,
    },
  );

  return mapAutomationRuleSnapshot(response.data);
}

export async function setAutomationRuleAutoCalendar(
  ruleId: number,
  autoCalendarEnabled: boolean,
) {
  const response = await api.patch<AutomationRuleApiResponse>(
    `/api/automations/rules/${ruleId}/auto-calendar`,
    {
      auto_calendar_enabled: autoCalendarEnabled,
    },
  );

  return mapAutomationRuleSnapshot(response.data);
}
