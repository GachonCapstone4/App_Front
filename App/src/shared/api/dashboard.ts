import { api } from "./http";

type DashboardSummaryApiResponse = {
  processed_today: {
    count: number;
    diff_from_yesterday: number;
  };
  pending_drafts: {
    count: number;
  };
  template_matching: {
    rate: number;
    diff_from_last_week: number;
  };
  integration_status: {
    status: string;
    connected_email: string | null;
  };
};

type DashboardScheduleApiResponse = {
  schedules: Array<{
    event_id: number;
    title: string;
    start_datetime: string;
    end_datetime: string;
    source: string;
    status: string;
    is_calendar_added: boolean;
  }>;
};

type DashboardWeeklySummaryApiResponse = {
  date_range: {
    start: string;
    end: string;
  };
  categories: Array<{
    category_name: string;
    count: number;
    color: string;
  }>;
};

type DashboardRecentEmailApiResponse = {
  emails: Array<{
    email_id: number;
    sender_name: string;
    sender_company: string | null;
    subject: string;
    category_name: string | null;
    status: string;
    received_at: string;
  }>;
};

export async function getDashboardSummary() {
  const response = await api.get<DashboardSummaryApiResponse>("/api/dashboard/summary");
  return response.data;
}

export async function getDashboardSchedules() {
  const response = await api.get<DashboardScheduleApiResponse>("/api/dashboard/schedules");
  return response.data;
}

export async function getDashboardWeeklySummary() {
  const response = await api.get<DashboardWeeklySummaryApiResponse>("/api/dashboard/weekly-summary");
  return response.data;
}

export async function getDashboardRecentEmails() {
  const response = await api.get<DashboardRecentEmailApiResponse>("/api/dashboard/recent-emails");
  return response.data;
}
