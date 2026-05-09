import { ApiError, createApiClient, getApiBaseUrl } from "./http";

function resolveAdminApiBaseUrl() {
  const envBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL?.trim();
  return envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : getApiBaseUrl();
}

export const ADMIN_NETWORK_ERROR_EVENT = "emailassist-admin-network-error";

const adminApi = createApiClient(resolveAdminApiBaseUrl(), {
  networkErrorMessage:
    "관리자 서버에 연결하지 못했습니다. VPN 연결 상태와 서버 상태를 확인한 뒤 다시 시도해주세요.",
  networkErrorEventName: ADMIN_NETWORK_ERROR_EVENT,
});

type AdminDashboardSummaryApiResponse = {
  total_users: number;
  gmail_connected_users: number;
  calendar_connected_users: number;
  today_analyzed_emails: number;
  today_generated_drafts: number;
  total_support_tickets: number;
};

type AdminEmailVolumeApiResponse = {
  volume_data: Array<{
    date: string;
    count: number;
  }>;
};

type AdminDomainDistributionApiResponse = {
  domain_data: Array<{
    domain: string;
    count: number;
  }>;
};

type AdminWeeklyTrendApiResponse = {
  trend_data: Array<{
    date: string;
    received_count: number;
    draft_count: number;
  }>;
};

type AdminSupportTicketListApiResponse = {
  total_count: number;
  tickets: Array<{
    ticket_id: number;
    user_id: number;
    title: string;
    status: string;
    created_at: string;
  }>;
};

type AdminSupportTicketDetailApiResponse = {
  ticket_id: number;
  user_id: number;
  title: string;
  content: string;
  status: string;
  admin_reply: string | null;
  replied_by: number | null;
  replied_at: string | null;
  created_at: string;
};

type AdminSupportTicketReplyApiResponse = {
  ticket_id: number;
  status: string;
};

type AdminUserListApiResponse = {
  total_count: number;
  users: Array<{
    user_id: number;
    email: string;
    name: string;
    industry_type: string | null;
    is_active: boolean;
    created_at: string;
  }>;
};

type AdminUserDetailApiResponse = {
  user_id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at?: string | null;
  last_login_at: string | null;
  industry_type: string | null;
  email_tone: string | null;
  company_desc: string | null;
  total_processed_emails: number;
  total_generated_drafts: number;
  recent_ticket_count: number;
};

type AdminUserIntegrationApiResponse = {
  is_gmail_connected: boolean | null;
  is_calendar_connected: boolean;
  integrated_email: string | null;
  integrated_at: string | null;
  last_sync_at: string | null;
};

type AdminTemplateListApiResponse = {
  total_count: number;
  templates: Array<{
    template_id: number;
    user_template_no?: number | null;
    user_id: number;
    title: string;
    created_at: string;
    category: string | null;
    industry: string | null;
    use_count: number | null;
    user_count: number | null;
    generated_at: string | null;
    quality: string | null;
  }>;
};

type AdminTemplateSummaryApiResponse = {
  total_templates: number;
  top_category: string | null;
  top_category_usage_count: number;
  active_rule_count: number;
  auto_send_rule_count: number;
};

type AdminTemplateCategoryStatApiResponse = {
  statistics: Array<{
    category_id: number;
    category_name: string;
    template_count: number;
    usage_count: number;
  }>;
};

type AdminAutomationRuleListApiResponse = {
  total_count: number;
  rules: Array<{
    rule_id: number;
    user_id: number;
    is_active: boolean;
    name: string | null;
    category: string | null;
    trigger: string | null;
    action: string | null;
    status: string;
    updated_at: string | null;
  }>;
};

type AdminAutomationRuleCreateApiResponse = {
  rule_id: number;
};

type AdminAutomationRuleUpdateApiResponse = {
  rule_id: number;
};

type AdminCategoryKeywordListApiResponse = {
  total_count: number;
  categories: Array<{
    category_key: string;
    category_name: string;
    color: string | null;
    keywords: string[] | null;
    category_count: number;
    user_count: number;
  }>;
};

type AdminCategoryKeywordApiResponse = {
  category_key: string;
  category_name: string;
  color: string | null;
  keywords: string[] | null;
  category_count: number;
  user_count: number;
};

type AdminJobListApiResponse = {
  total_count: number;
  jobs: Array<{
    outbox_id: number;
    email_id: number;
    status: string;
    created_at: string;
  }>;
};

type AdminJobSummaryApiResponse = {
  ready_count: number;
  success_count: number;
  failed_count: number;
};

type AdminJobDetailApiResponse = {
  outbox_id: number;
  email_id: number;
  status: string;
  payload: string;
  retry_count: number;
  max_retry: number;
  created_at: string;
  sent_at: string | null;
  finished_at: string | null;
};

type AdminJobErrorApiResponse = {
  outbox_id: number;
  fail_reason: string | null;
};

type AdminKubernetesJobApiResponse = {
  job_name: string;
  namespace: string;
  uid: string;
  yaml_path: string;
  created_at: string;
};

type AdminSagemakerJobApiResponse = {
  training_job_arn: string;
  created_at: string;
};

export type AdminSupportTicketSummary = {
  ticketId: string;
  userId: string;
  title: string;
  status: "PENDING" | "ANSWERED";
  createdAt: string;
};

export type AdminSupportTicketDetail = {
  ticketId: string;
  userId: string;
  title: string;
  content: string;
  status: "PENDING" | "ANSWERED";
  adminReply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  createdAt: string;
};

export type AdminUserSummary = {
  userId: string;
  email: string;
  name: string;
  industryType: string | null;
  active: boolean;
  createdAt: string;
};

export type AdminUserDetail = AdminUserSummary & {
  role: string;
  lastLoginAt: string | null;
  emailTone: string | null;
  companyDesc: string | null;
  totalProcessedEmails: number;
  totalGeneratedDrafts: number;
  recentTicketCount: number;
  gmailConnected: boolean;
  calendarConnected: boolean;
  integratedEmail: string | null;
  integratedAt: string | null;
  lastSyncAt: string | null;
};

export type AdminTemplateItem = {
  templateId: string;
  userTemplateNo: number | null;
  userId: string;
  title: string;
  createdAt: string;
  category: string;
  industry: string;
  useCount: number;
  userCount: number;
  generatedAt: string;
  quality: string;
};

export type AdminTemplateCategoryStat = {
  categoryId: string;
  categoryName: string;
  templateCount: number;
  usageCount: number;
};

export type AdminAutomationRule = {
  ruleId: string;
  userId: string;
  active: boolean;
  name: string;
  category: string;
  trigger: string;
  action: string;
  status: string;
  updatedAt: string;
};

export type AdminCategoryKeyword = {
  categoryKey: string;
  categoryName: string;
  color: string | null;
  keywords: string[];
  categoryCount: number;
  userCount: number;
};

export type AdminJobItem = {
  outboxId: string;
  emailId: string;
  status: string;
  createdAt: string;
};

export async function getAdminDashboardSummary() {
  const response = await adminApi.get<AdminDashboardSummaryApiResponse>("/api/admin/dashboard/summary");
  return response.data;
}

export async function getAdminEmailVolume(startDate: string, endDate: string) {
  const response = await adminApi.get<AdminEmailVolumeApiResponse>("/api/admin/dashboard/email-volume", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });

  return response.data.volume_data;
}

export async function getAdminDomainDistribution(limit = 5) {
  const response = await adminApi.get<AdminDomainDistributionApiResponse>(
    "/api/admin/dashboard/domain-distribution",
    {
      params: { limit },
    },
  );

  return response.data.domain_data;
}

export async function getAdminWeeklyTrend() {
  const response = await adminApi.get<AdminWeeklyTrendApiResponse>("/api/admin/dashboard/weekly-trend");
  return response.data.trend_data;
}

export async function getAdminSupportTickets(size = 20) {
  const response = await adminApi.get<AdminSupportTicketListApiResponse>("/api/admin/support-tickets", {
    params: {
      page: 1,
      size,
    },
  });

  return response.data.tickets.map((ticket) => ({
    ticketId: String(ticket.ticket_id),
    userId: String(ticket.user_id),
    title: ticket.title,
    status: ticket.status as "PENDING" | "ANSWERED",
    createdAt: ticket.created_at,
  })) satisfies AdminSupportTicketSummary[];
}

export async function getAdminSupportTicket(ticketId: string) {
  const response = await adminApi.get<AdminSupportTicketDetailApiResponse>(
    `/api/admin/support-tickets/${ticketId}`,
  );

  return {
    ticketId: String(response.data.ticket_id),
    userId: String(response.data.user_id),
    title: response.data.title,
    content: response.data.content,
    status: response.data.status as "PENDING" | "ANSWERED",
    adminReply: response.data.admin_reply,
    repliedBy:
      response.data.replied_by === null ? null : String(response.data.replied_by),
    repliedAt: response.data.replied_at,
    createdAt: response.data.created_at,
  } satisfies AdminSupportTicketDetail;
}

export async function replyAdminSupportTicket(ticketId: string, adminReply: string) {
  const response = await adminApi.post<AdminSupportTicketReplyApiResponse>(
    `/api/admin/support-tickets/${ticketId}/reply`,
    {
      admin_reply: adminReply,
    },
  );

  return {
    ticketId: String(response.data.ticket_id),
    status: response.data.status as "PENDING" | "ANSWERED",
  };
}

export async function getAdminUsers(size = 100, searchKeyword = "") {
  const response = await adminApi.get<AdminUserListApiResponse>("/api/admin/users", {
    params: {
      page: 1,
      size,
      ...(searchKeyword.trim()
        ? {
            search_type: "keyword",
            search_keyword: searchKeyword.trim(),
          }
        : {}),
    },
  });

  return response.data.users.map((user) => ({
    userId: String(user.user_id),
    email: user.email,
    name: user.name,
    industryType: user.industry_type,
    active: user.is_active,
    createdAt: user.created_at,
  })) satisfies AdminUserSummary[];
}

export async function getAdminUserDetail(userId: string) {
  const detailResponse = await adminApi.get<AdminUserDetailApiResponse>(`/api/admin/users/${userId}`);
  const integration = await adminApi
    .get<AdminUserIntegrationApiResponse>(`/api/admin/users/${userId}/integration`)
    .then((response) => response.data)
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }

      throw error;
    });

  return {
    userId: String(detailResponse.data.user_id),
    email: detailResponse.data.email,
    name: detailResponse.data.name,
    industryType: detailResponse.data.industry_type,
    active: detailResponse.data.is_active,
    createdAt: detailResponse.data.created_at ?? "",
    role: detailResponse.data.role,
    lastLoginAt: detailResponse.data.last_login_at,
    emailTone: detailResponse.data.email_tone,
    companyDesc: detailResponse.data.company_desc,
    totalProcessedEmails: detailResponse.data.total_processed_emails,
    totalGeneratedDrafts: detailResponse.data.total_generated_drafts,
    recentTicketCount: detailResponse.data.recent_ticket_count,
    gmailConnected: Boolean(integration?.is_gmail_connected),
    calendarConnected: Boolean(integration?.is_calendar_connected),
    integratedEmail: integration?.integrated_email ?? null,
    integratedAt: integration?.integrated_at ?? null,
    lastSyncAt: integration?.last_sync_at ?? null,
  } satisfies AdminUserDetail;
}

export async function updateAdminUserStatus(userId: string, isActive: boolean) {
  const response = await adminApi.patch(`/api/admin/users/${userId}/status`, {
    is_active: isActive,
  });

  return response.data;
}

export async function deleteAdminUserIntegration(userId: string) {
  const response = await adminApi.delete(`/api/admin/users/${userId}/integration`);
  return response.data;
}

export async function getAdminTemplates(size = 100) {
  const response = await adminApi.get<AdminTemplateListApiResponse>("/api/admin/templates", {
    params: {
      page: 1,
      size,
    },
  });

  return response.data.templates.map((template) => ({
    templateId: String(template.template_id),
    userTemplateNo: template.user_template_no ?? null,
    userId: String(template.user_id),
    title: template.title,
    createdAt: template.created_at,
    category: template.category ?? "미분류",
    industry: template.industry ?? "미지정",
    useCount: template.use_count ?? 0,
    userCount: template.user_count ?? 0,
    generatedAt: template.generated_at ?? template.created_at,
    quality: template.quality ?? "미평가",
  })) satisfies AdminTemplateItem[];
}

export async function getAdminTemplateSummary() {
  const response = await adminApi.get<AdminTemplateSummaryApiResponse>("/api/admin/templates/summary");
  return response.data;
}

export async function getAdminTemplateCategoryStats() {
  const response = await adminApi.get<AdminTemplateCategoryStatApiResponse>(
    "/api/admin/templates/statistics/by-category",
  );

  return response.data.statistics.map((stat) => ({
    categoryId: String(stat.category_id),
    categoryName: stat.category_name,
    templateCount: stat.template_count,
    usageCount: stat.usage_count,
  })) satisfies AdminTemplateCategoryStat[];
}

export async function getAdminAutomationRules(size = 100) {
  const response = await adminApi.get<AdminAutomationRuleListApiResponse>(
    "/api/admin/automations/rules",
    {
      params: {
        page: 1,
        size,
      },
    },
  );

  return response.data.rules.map((rule) => ({
    ruleId: String(rule.rule_id),
    userId: String(rule.user_id),
    active: rule.is_active,
    name: rule.name ?? `자동화 규칙 #${rule.rule_id}`,
    category: rule.category ?? "미분류",
    trigger: rule.trigger ?? "",
    action: rule.action ?? "",
    status: rule.status,
    updatedAt: rule.updated_at ?? "",
  })) satisfies AdminAutomationRule[];
}

export async function createAdminAutomationRule(payload: {
  userId: string;
  categoryId: string;
  templateId?: string;
  autoSendEnabled: boolean;
  autoCalendarEnabled: boolean;
  name: string;
  trigger: string;
  action: string;
}) {
  const response = await adminApi.post<AdminAutomationRuleCreateApiResponse>(
    "/api/admin/automations/rules",
    {
      user_id: Number(payload.userId),
      category_id: Number(payload.categoryId),
      template_id: payload.templateId ? Number(payload.templateId) : null,
      auto_send_enabled: payload.autoSendEnabled,
      auto_calendar_enabled: payload.autoCalendarEnabled,
      name: payload.name,
      trigger_condition: payload.trigger,
      action_description: payload.action,
    },
  );

  return response.data;
}

export async function updateAdminAutomationRule(
  ruleId: string,
  payload: {
    templateId?: string;
    active: boolean;
    autoSendEnabled: boolean;
    name: string;
    trigger: string;
    action: string;
  },
) {
  const response = await adminApi.patch<AdminAutomationRuleUpdateApiResponse>(
    `/api/admin/automations/rules/${ruleId}`,
    {
      template_id: payload.templateId ? Number(payload.templateId) : null,
      is_active: payload.active,
      auto_send_enabled: payload.autoSendEnabled,
      name: payload.name,
      trigger_condition: payload.trigger,
      action_description: payload.action,
    },
  );

  return response.data;
}

export async function deleteAdminAutomationRule(ruleId: string) {
  const response = await adminApi.delete(`/api/admin/automations/rules/${ruleId}`);
  return response.data;
}

function mapAdminCategoryKeyword(category: AdminCategoryKeywordApiResponse): AdminCategoryKeyword {
  return {
    categoryKey: category.category_key,
    categoryName: category.category_name,
    color: category.color,
    keywords: Array.isArray(category.keywords) ? category.keywords : [],
    categoryCount: category.category_count,
    userCount: category.user_count,
  };
}

export async function getAdminCategoryKeywords() {
  const response = await adminApi.get<AdminCategoryKeywordListApiResponse>("/api/admin/categories");
  return response.data.categories.map(mapAdminCategoryKeyword);
}

export async function createAdminCategoryKeyword(payload: {
  categoryName: string;
  color?: string | null;
  keywords: string[];
}) {
  const response = await adminApi.post<AdminCategoryKeywordApiResponse>("/api/admin/categories", {
    category_name: payload.categoryName,
    color: payload.color ?? null,
    keywords: payload.keywords,
  });

  return mapAdminCategoryKeyword(response.data);
}

export async function updateAdminCategoryKeyword(
  categoryName: string,
  payload: {
    color?: string | null;
    keywords: string[];
  },
) {
  const response = await adminApi.patch<AdminCategoryKeywordApiResponse>(
    `/api/admin/categories/${encodeURIComponent(categoryName)}`,
    {
      color: payload.color ?? null,
      keywords: payload.keywords,
    },
  );

  return mapAdminCategoryKeyword(response.data);
}

export async function deleteAdminCategoryKeyword(categoryName: string) {
  const response = await adminApi.delete(`/api/admin/categories/${encodeURIComponent(categoryName)}`);
  return response.data;
}

export async function getAdminOperationJobs(size = 100) {
  const response = await adminApi.get<AdminJobListApiResponse>("/api/admin/operations/jobs", {
    params: {
      page: 1,
      size,
    },
  });

  return response.data.jobs.map((job) => ({
    outboxId: String(job.outbox_id),
    emailId: String(job.email_id),
    status: job.status,
    createdAt: job.created_at,
  })) satisfies AdminJobItem[];
}

export async function getAdminOperationJobSummary() {
  const response = await adminApi.get<AdminJobSummaryApiResponse>("/api/admin/operations/jobs/summary");
  return response.data;
}

export async function getAdminOperationJobDetail(jobId: string) {
  const response = await adminApi.get<AdminJobDetailApiResponse>(
    `/api/admin/operations/jobs/${jobId}`,
  );
  return response.data;
}

export async function getAdminOperationJobError(jobId: string) {
  const response = await adminApi.get<AdminJobErrorApiResponse>(
    `/api/admin/operations/jobs/${jobId}/error`,
  );
  return response.data;
}

export async function deleteAdminOperationJob(jobId: string) {
  const response = await adminApi.delete(`/api/admin/operations/jobs/${jobId}`);
  return response.data;
}

export async function executeAdminNetworkDictJob() {
  const response = await adminApi.post<AdminKubernetesJobApiResponse>(
    "/api/admin/k8s/jobs/network-dict",
  );
  return response.data;
}

export async function executeAdminOSDictJob() {
  const response = await adminApi.post<AdminKubernetesJobApiResponse>(
    "/api/admin/k8s/jobs/os-dict",
  );
  return response.data;
}

export async function executeAdminVPNDictJob() {
  const response = await adminApi.post<AdminKubernetesJobApiResponse>(
    "/api/admin/k8s/jobs/vpn-dict",
  );
  return response.data;
}

export async function executeAdminDatasetJob() {
  const response = await adminApi.post<AdminKubernetesJobApiResponse>(
    "/api/admin/k8s/jobs/dataset",
  );
  return response.data;
}

export async function executeAdminSagemakerTrainingJob() {
  const response = await adminApi.post<AdminSagemakerJobApiResponse>(
    "/api/admin/sagemakertraining",
  );
  return response.data;
}
