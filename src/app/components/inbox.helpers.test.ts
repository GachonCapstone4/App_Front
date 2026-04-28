import { describe, expect, it } from "vitest";
import {
  deriveCompanyFromEmail,
  formatInboxReceivedDate,
  mapBackendInboxStatus,
  mapFrontendInboxStatus,
  mergeInboxDetail,
  mergeInboxRecommendations,
  mapInboxRecommendation,
} from "./inbox.helpers";

describe("inbox helpers", () => {
  it("maps backend inbox status to frontend status", () => {
    expect(mapBackendInboxStatus("PENDING_REVIEW")).toBe("pending");
    expect(mapBackendInboxStatus("PROCESSED")).toBe("completed");
    expect(mapBackendInboxStatus("AUTO_SENT")).toBe("auto-sent");
    expect(mapBackendInboxStatus("PROCESSED", "SKIPPED")).toBe("unsent");
  });

  it("maps frontend status to backend query status", () => {
    expect(mapFrontendInboxStatus("all")).toBeUndefined();
    expect(mapFrontendInboxStatus("pending")).toBe("PENDING_REVIEW");
    expect(mapFrontendInboxStatus("completed")).toBe("PROCESSED");
  });

  it("derives a simple company label from sender email", () => {
    expect(deriveCompanyFromEmail("minsu.park@techsolution.co.kr")).toBe("Techsolution Co");
  });

  it("formats received date for inbox cards", () => {
    expect(formatInboxReceivedDate("2026-04-04T10:23:00")).toBe("4.4.");
  });

  it("merges inbox detail values into the current item", () => {
    const merged = mergeInboxDetail(
      {
        id: "1",
        sender: "발신자",
        senderEmail: "sender@example.com",
        company: "",
        subject: "제목",
        preview: "",
        summary: "",
        body: "",
        time: "오전 10:00",
        receivedDate: "4.4.",
        category: "미분류",
        confidence: 0,
        status: "pending",
        sentTime: "",
        schedule: { detected: false },
        draft: "",
      },
      {
        email_info: {
          email_id: 1,
          sender_name: "박민수",
          sender_email: "minsu.park@techsolution.co.kr",
          subject: "가격 문의",
          body: "본문",
          received_at: "2026-04-04T10:23:00",
          has_attachments: false,
        },
        ai_analysis: {
          domain: "세일즈",
          intent: "가격문의",
          summary: "요약",
          entities: {
            title: "미팅",
            date: "2026-04-10",
            time: "14:00",
            location: "Zoom",
            participants: ["박민수"],
          },
          confidence_score: 96,
          schedule_detected: true,
        },
        draft_reply: {
          draft_id: 10,
          status: "PENDING_REVIEW",
          template_info: {
            template_id: 4,
            template_title: "가격 안내 템플릿",
          },
          variables: {
            auto_completed_count: 2,
            auto_completed_keys: ["회사명", "가격"],
            required_input_count: 1,
            required_input_keys: ["담당자명"],
          },
          subject: "Re: 가격 문의",
          body: "초안",
        },
      },
    );

    expect(merged.sender).toBe("박민수");
    expect(merged.businessDomain).toBe("세일즈");
    expect(merged.category).toBe("가격문의");
    expect(merged.templateName).toBe("가격 안내 템플릿");
    expect(merged.schedule.detected).toBe(true);
  });

  it("keeps attachment metadata from inbox detail", () => {
    const merged = mergeInboxDetail(
      {
        id: "1",
        sender: "발신자",
        senderEmail: "sender@example.com",
        company: "",
        subject: "제목",
        preview: "",
        summary: "",
        body: "",
        time: "오전 10:00",
        receivedDate: "4.4.",
        category: "미분류",
        confidence: 0,
        status: "pending",
        sentTime: "",
        schedule: { detected: false },
        draft: "",
      },
      {
        email_info: {
          email_id: 1,
          sender_name: "박민수",
          sender_email: "minsu.park@techsolution.co.kr",
          subject: "가격 문의",
          body: "본문",
          received_at: "2026-04-04T10:23:00",
          has_attachments: true,
          attachments: [
            {
              attachment_id: 1,
              file_name: "견적서.pdf",
              content_type: "application/pdf",
              size: 204800,
            },
          ],
        },
        ai_analysis: null,
        draft_reply: null,
      },
    );

    expect(merged.attachments).toEqual([
      {
        attachmentId: 1,
        fileName: "견적서.pdf",
        contentType: "application/pdf",
        size: 204800,
      },
    ]);
  });

  it("maps skipped draft replies to unsent status", () => {
    const merged = mergeInboxDetail(
      {
        id: "1",
        sender: "발신자",
        senderEmail: "",
        company: "",
        subject: "제목",
        preview: "",
        summary: "",
        body: "",
        time: "오전 10:00",
        receivedDate: "4.4.",
        category: "미분류",
        confidence: 0,
        status: "completed",
        sentTime: "",
        schedule: { detected: false },
        draft: "",
      },
      {
        email_info: {
          email_id: 1,
          sender_name: "박민수",
          subject: "가격 문의",
          body: "본문",
          received_at: "2026-04-04T10:23:00",
          has_attachments: false,
        },
        ai_analysis: null,
        draft_reply: {
          draft_id: 10,
          status: "SKIPPED",
          template_info: null,
          variables: null,
          subject: null,
          body: null,
        },
      },
    );

    expect(merged.status).toBe("unsent");
  });

  it("keeps unsent status from the list when detail draft status is missing", () => {
    const merged = mergeInboxDetail(
      {
        id: "1",
        sender: "발신자",
        senderEmail: "",
        company: "",
        subject: "제목",
        preview: "",
        summary: "",
        body: "",
        time: "오전 10:00",
        receivedDate: "4.4.",
        category: "미분류",
        confidence: 0,
        status: "unsent",
        sentTime: "",
        schedule: { detected: false },
        draft: "",
        draftStatus: "SKIPPED",
      },
      {
        email_info: {
          email_id: 1,
          sender_name: "박민수",
          subject: "가격 문의",
          body: "본문",
          received_at: "2026-04-04T10:23:00",
          has_attachments: false,
        },
        ai_analysis: null,
        draft_reply: null,
      },
    );

    expect(merged.status).toBe("unsent");
  });

  it("maps recommendation payloads and prefills draft content when no draft exists", () => {
    const recommendation = mapInboxRecommendation({
      draft_id: 15,
      template_title: "미팅 조율 템플릿",
      subject: "Re: 미팅 일정 조율",
      body: "안녕하세요. 다음 주 수요일 오전 11시에 미팅 가능합니다.",
      similarity: 0.91,
      email_id: 1,
    });

    expect(recommendation).not.toBeNull();

    const merged = mergeInboxRecommendations(
      {
        id: "1",
        sender: "발신자",
        senderEmail: "",
        company: "",
        subject: "제목",
        preview: "",
        summary: "",
        body: "",
        time: "오전 10:00",
        receivedDate: "4.4.",
        category: "미분류",
        confidence: 0,
        status: "pending",
        sentTime: "",
        schedule: { detected: false },
        draft: "",
      },
      recommendation ? [recommendation] : [],
      "ready",
    );

    expect(merged.templateName).toBe("미팅 조율 템플릿");
    expect(merged.draftSubject).toBe("Re: 미팅 일정 조율");
    expect(merged.draft).toContain("다음 주 수요일");
    expect(merged.recommendations).toHaveLength(1);
  });
});
