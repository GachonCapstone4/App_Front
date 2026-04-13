import { api } from "./http";

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

export async function getAdminDashboardSummary() {
  const response = await api.get<AdminDashboardSummaryApiResponse>("/api/admin/dashboard/summary");
  return response.data;
}

export async function getAdminEmailVolume(startDate: string, endDate: string) {
  const response = await api.get<AdminEmailVolumeApiResponse>("/api/admin/dashboard/email-volume", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });

  return response.data.volume_data;
}

export async function getAdminDomainDistribution(limit = 5) {
  const response = await api.get<AdminDomainDistributionApiResponse>(
    "/api/admin/dashboard/domain-distribution",
    {
      params: { limit },
    },
  );

  return response.data.domain_data;
}

export async function getAdminWeeklyTrend() {
  const response = await api.get<AdminWeeklyTrendApiResponse>("/api/admin/dashboard/weekly-trend");
  return response.data.trend_data;
}

export async function getAdminSupportTickets(size = 20) {
  const response = await api.get<AdminSupportTicketListApiResponse>("/api/admin/support-tickets", {
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
  const response = await api.get<AdminSupportTicketDetailApiResponse>(
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
  const response = await api.post<AdminSupportTicketReplyApiResponse>(
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
