import { api } from "./http";

type CalendarEventApiResponse = {
  event_id: number;
  title: string;
  start_datetime: string;
  end_datetime: string | null;
  event_type?: string | null;
  location?: string | null;
  notes?: string | null;
  source: string | null;
  status: string | null;
  is_calendar_added: boolean;
  email_id?: number | null;
  email_sender_name?: string | null;
  email_subject?: string | null;
  created_at: string;
  updated_at?: string;
};

type CalendarEventListApiResponse = {
  events: CalendarEventApiResponse[];
};

export type CalendarEventSnapshot = {
  eventId: number;
  title: string;
  startDatetime: string;
  endDatetime: string | null;
  eventType: string | null;
  location: string | null;
  notes: string | null;
  source: string | null;
  status: string | null;
  isCalendarAdded: boolean;
  emailId: number | null;
  emailSenderName: string | null;
  emailSubject: string | null;
  createdAt: string;
  updatedAt: string | null;
};

function mapCalendarSnapshot(event: CalendarEventApiResponse): CalendarEventSnapshot {
  return {
    eventId: event.event_id,
    title: event.title,
    startDatetime: event.start_datetime,
    endDatetime: event.end_datetime,
    eventType: event.event_type ?? null,
    location: event.location ?? null,
    notes: event.notes ?? null,
    source: event.source,
    status: event.status,
    isCalendarAdded: event.is_calendar_added,
    emailId: event.email_id ?? null,
    emailSenderName: event.email_sender_name ?? null,
    emailSubject: event.email_subject ?? null,
    createdAt: event.created_at,
    updatedAt: event.updated_at ?? null,
  };
}

export async function getCalendarEvents(payload: {
  startDate: string;
  endDate: string;
}) {
  const response = await api.get<CalendarEventListApiResponse>("/api/calendar/events", {
    params: {
      start_date: payload.startDate,
      end_date: payload.endDate,
    },
  });

  return response.data.events.map(mapCalendarSnapshot);
}

export async function getCalendarEventDetail(eventId: number) {
  const response = await api.get<CalendarEventApiResponse>(`/api/calendar/events/${eventId}`);
  return mapCalendarSnapshot(response.data);
}

export async function createCalendarEvent(payload: {
  title: string;
  startDatetime: string;
  endDatetime: string;
  eventType?: string;
  location?: string;
  notes?: string;
}) {
  const response = await api.post<CalendarEventApiResponse>("/api/calendar/events", {
    title: payload.title,
    startDatetime: payload.startDatetime,
    endDatetime: payload.endDatetime,
    eventType: payload.eventType,
    location: payload.location,
    notes: payload.notes,
  });

  return mapCalendarSnapshot(response.data);
}

export async function updateCalendarEvent(
  eventId: number,
  payload: {
    title: string;
    startDatetime: string;
    endDatetime: string;
    eventType?: string;
    location?: string;
    notes?: string;
  },
) {
  const response = await api.put<CalendarEventApiResponse>(`/api/calendar/events/${eventId}`, {
    title: payload.title,
    startDatetime: payload.startDatetime,
    endDatetime: payload.endDatetime,
    eventType: payload.eventType,
    location: payload.location,
    notes: payload.notes,
  });

  return mapCalendarSnapshot(response.data);
}

export async function confirmCalendarEvent(eventId: number) {
  const response = await api.patch<CalendarEventApiResponse>(`/api/calendar/events/${eventId}/confirm`);
  return mapCalendarSnapshot(response.data);
}

export async function deleteCalendarEvent(eventId: number) {
  await api.delete(`/api/calendar/events/${eventId}`);
}
