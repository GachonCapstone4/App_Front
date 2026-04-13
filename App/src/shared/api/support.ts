import { api } from "./http";

type SupportTicketListApiResponse = {
  tickets?: Array<{
    ticket_id: number;
    title: string;
    content_preview: string;
    status: "PENDING" | "ANSWERED";
    created_at: string;
  }>;
};

type SupportTicketDetailApiResponse = {
  ticket_id: number;
  title: string;
  content: string;
  status: "PENDING" | "ANSWERED";
  created_at: string;
  admin_reply: string | null;
};

type SupportTicketCreateApiResponse = {
  ticket_id: number;
};

export type SupportTicketSummary = {
  ticketId: string;
  title: string;
  contentPreview: string;
  status: "PENDING" | "ANSWERED";
  createdAt: string;
};

export type SupportTicketDetail = {
  ticketId: string;
  title: string;
  content: string;
  status: "PENDING" | "ANSWERED";
  createdAt: string;
  adminReply: string | null;
};

export async function getSupportTickets(status?: "PENDING" | "ANSWERED") {
  const response = await api.get<SupportTicketListApiResponse>("/api/support-tickets", {
    params: status ? { status } : undefined,
  });

  const tickets = Array.isArray(response.data.tickets) ? response.data.tickets : [];

  return tickets.map((ticket) => ({
    ticketId: String(ticket.ticket_id),
    title: ticket.title,
    contentPreview: ticket.content_preview,
    status: ticket.status,
    createdAt: ticket.created_at,
  })) satisfies SupportTicketSummary[];
}

export async function getSupportTicket(ticketId: string) {
  const response = await api.get<SupportTicketDetailApiResponse>(`/api/support-tickets/${ticketId}`);

  return {
    ticketId: String(response.data.ticket_id),
    title: response.data.title,
    content: response.data.content,
    status: response.data.status,
    createdAt: response.data.created_at,
    adminReply: response.data.admin_reply,
  } satisfies SupportTicketDetail;
}

export async function createSupportTicket(title: string, content: string) {
  const response = await api.post<SupportTicketCreateApiResponse>("/api/support-tickets", {
    title,
    content,
  });

  return {
    ticketId: String(response.data.ticket_id),
  };
}
