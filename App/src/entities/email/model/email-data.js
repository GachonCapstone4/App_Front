export const emailStatusMeta = {
  pending: {
    label: "검토 대기",
    tone: "warning",
    banner: "AI 자동 생성 응답 - 하이라이트된 필드를 클릭하여 수정하세요",
  },
  completed: {
    label: "처리 완료",
    tone: "neutral",
    banner: "발송된 응답 내용",
  },
  unsent: {
    label: "미발송",
    tone: "red",
    banner: "읽음 확인 후 발송하지 않은 응답 내용",
  },
  "auto-sent": {
    label: "자동 발송",
    tone: "success",
    banner: "자동 발송된 응답 내용",
  },
};

export const emailItems = [
  {
    id: "1",
    sender: "박민수",
    senderEmail: "minsu.park@techsolution.co.kr",
    company: "(주)테크솔루션",
    subject: "엔터프라이즈 플랜 가격 문의",
    preview: "엔터프라이즈 플랜의 요금 체계와 도입 가능 시점을 문의드립니다.",
    summary:
      "50명 규모 팀 기준 엔터프라이즈 플랜의 월/연간 요금, 할인 조건, Google Workspace 연동 여부를 확인하고 있습니다.\n이번 주 내 화상 미팅 가능 시간도 함께 요청한 상태입니다.",
    body: `안녕하세요,

저희는 (주)테크솔루션의 IT 인프라팀 박민수입니다.

현재 팀 규모가 50명 정도이며, 귀사의 엔터프라이즈 플랜에 관심이 있어 문의드립니다. 다음 사항에 대한 상세한 안내를 요청드립니다:

1. 엔터프라이즈 플랜의 월/연간 요금 체계
2. 50인 이상 팀 할인 적용 가능 여부
3. 기존 이메일 시스템(Google Workspace)과의 연동 가능 여부
4. 온보딩 지원 범위

가능하시다면 이번 주 내에 화상 미팅도 가능할까요?

감사합니다.
박민수 드림`,
    time: "오전 10:23",
    receivedDate: "3월 3일",
    category: "가격문의",
    confidence: 96,
    status: "pending",
    sentTime: "",
    schedule: {
      detected: true,
      title: "테크솔루션 엔터프라이즈 플랜 상담",
      suggestedDate: "2026-03-04",
      suggestedTime: "14:00",
      duration: "1시간",
      type: "video",
      location: "Zoom 화상회의",
      attendees: ["박민수"],
    },
    attachments: [
      {
        attachmentId: 1,
        fileName: "엔터프라이즈_플랜_가격표.pdf",
        contentType: "application/pdf",
        size: 482310,
      },
      {
        attachmentId: 2,
        fileName: "도입_지원_안내서.pdf",
        contentType: "application/pdf",
        size: 215040,
      },
    ],
    draft: `안녕하세요, 박민수님.

{{회사명}}에 관심을 가져주셔서 감사합니다.

문의하신 엔터프라이즈 플랜에 대해 안내드리겠습니다:

1. 요금 체계: 엔터프라이즈 플랜은 사용자당 월 {{가격}}원이며, 연간 결제 시 20% 할인이 적용됩니다.
2. 팀 할인: 50인 이상 팀의 경우 {{할인율}} 추가 할인이 가능합니다.
3. 시스템 연동: Google Workspace와 완벽하게 연동되며, Microsoft 365도 지원합니다.
4. 온보딩 지원: 전담 매니저 배정, 팀 교육 세션, 마이그레이션 지원이 포함됩니다.

화상 미팅은 {{미팅일시}}에 가능합니다. 아래 링크를 통해 편리한 시간을 선택해 주세요.

추가 문의사항이 있으시면 언제든 연락 주시기 바랍니다.

감사합니다.
{{담당자명}} 드림`,
  },
  {
    id: "2",
    sender: "이지은",
    senderEmail: "jieun.lee@smartlogis.com",
    company: "스마트물류",
    subject: "배송 지연 관련 불만 접수",
    preview: "주문번호 #2026-0234 배송 지연에 대한 불만이 접수되었습니다.",
    summary:
      "주문번호 #2026-0234의 배송이 2월 25일 이후 도착하지 않아 불만이 접수됐습니다.\n긴급 확인과 빠른 회신을 요구하는 고객 대응 메일입니다.",
    body: `안녕하세요,

스마트물류의 이지은입니다.

주문번호 #2026-0234 건에 대해 불만을 접수합니다. 지난 2월 25일에 주문한 물품이 아직까지 도착하지 않았습니다.

긴급하게 확인 부탁드립니다.

이지은`,
    time: "오전 09:15",
    receivedDate: "3월 3일",
    category: "불만접수",
    confidence: 93,
    status: "auto-sent",
    sentTime: "2026.03.03 오전 09:20",
    schedule: { detected: false },
    draft: `안녕하세요, 이지은님.

배송 지연으로 불편을 드려 진심으로 사과드립니다.

확인 결과, 물류센터 통관 지연으로 인해 배송이 지연되고 있습니다. 현재 국내 배송 중 상태이며, 3월 4일까지 배송 완료될 예정입니다.

불편을 보상해 드리기 위해 다음 주문 시 사용 가능한 10% 할인 쿠폰을 제공해 드리겠습니다.

감사합니다.
고객지원팀 드림`,
  },
  {
    id: "3",
    sender: "최영호",
    senderEmail: "youngho.choi@greenenergy.kr",
    company: "그린에너지",
    subject: "3월 파트너십 미팅 요청",
    preview: "3월 첫째 주 미팅 가능한 시간을 요청한 메일입니다.",
    summary:
      "전략적 파트너십 논의를 위해 3월 첫째 주 미팅 가능한 시간을 문의한 메일입니다.\n대면 또는 회의 초대 발송이 필요한 일정성 요청으로 분류됩니다.",
    body: `안녕하세요,

그린에너지 사업개발팀 최영호입니다.

귀사와의 전략적 파트너십을 논의하기 위해 미팅을 요청드립니다. 3월 첫째 주에 가능한 시간이 있으시면 안내 부탁드립니다.

최영호 드림`,
    time: "어제 오후 4:30",
    receivedDate: "3월 2일",
    category: "미팅요청",
    confidence: 94,
    status: "pending",
    sentTime: "",
    schedule: {
      detected: true,
      title: "그린에너지 파트너십 미팅",
      suggestedDate: "2026-03-05",
      suggestedTime: "10:00",
      duration: "1시간 30분",
      type: "meeting",
      location: "본사 3층 회의실 A",
      attendees: ["최영호", "이소라"],
    },
    draft: `안녕하세요, 최영호님.

파트너십 미팅 요청에 감사드립니다.

3월 첫째 주 가능한 시간은 다음과 같습니다:
- {{날짜1}} {{시간1}}
- {{날짜2}} {{시간2}}

편리한 시간을 선택해 주시면 미팅 초대를 보내드리겠습니다.

감사합니다.
{{담당자명}} 드림`,
  },
  {
    id: "4",
    sender: "정하나",
    senderEmail: "hana.jung@designlab.kr",
    company: "디자인랩",
    subject: "계약서 수정 요청 건",
    preview: "계약서 3조 2항의 납품 기한 수정 요청입니다.",
    summary:
      "계약서 3조 2항의 납품 기한을 30일에서 45일로 변경해 달라는 요청입니다.\n법무 또는 영업 담당 검토 후 수정본 재전달이 필요한 계약 관련 메일입니다.",
    body: `안녕하세요,

디자인랩 정하나입니다.

지난주 전달드린 계약서 검토 완료했습니다. 3조 2항의 납품 기한을 30일에서 45일로 수정 요청드립니다.

검토 부탁드립니다.

정하나`,
    time: "어제 오후 2:15",
    receivedDate: "3월 2일",
    category: "계약문의",
    confidence: 91,
    status: "completed",
    sentTime: "2026.03.03 오전 10:45",
    schedule: { detected: false },
    draft: `안녕하세요, 정하나님.

계약서 수정 요청 확인했습니다.

3조 2항의 납품 기한을 45일로 수정하여 재전달 드리겠습니다.

감사합니다.
법무팀 드림`,
  },
  {
    id: "5",
    sender: "김영수",
    senderEmail: "youngsoo.kim@futuretech.com",
    company: "퓨처테크",
    subject: "기술 지원 요청 - API 연동 문제",
    preview: "REST API 인증 오류(401)가 계속 발생하고 있습니다.",
    summary:
      "REST API 연동 과정에서 401 인증 오류가 반복 발생하고 있으며 API 키는 정상 발급된 상태라고 전달했습니다.\n기술지원팀의 빠른 원인 확인과 후속 안내가 필요한 지원 요청입니다.",
    body: `안녕하세요,

퓨처테크 개발팀 김영수입니다.

REST API 연동 중 인증 오류가 발생하고 있습니다. API 키는 정상적으로 발급받았으나 401 에러가 계속 발생합니다.

빠른 지원 부탁드립니다.

김영수`,
    time: "2시간 전",
    receivedDate: "3월 1일",
    category: "기술지원",
    confidence: 89,
    status: "pending",
    sentTime: "",
    schedule: { detected: false },
    draft: `안녕하세요, 김영수님.

API 연동 문제로 불편을 드려 죄송합니다.

401 인증 오류는 일반적으로 다음 원인으로 발생합니다:
1. Authorization 헤더 형식 오류
2. API 키 만료
3. IP 화이트리스트 미등록

담당 엔지니어가 직접 연락드려 해결을 도와드리겠습니다.

감사합니다.
기술지원팀 드림`,
  },
];

export function getEmailsByStatus(status) {
  if (status === "all") {
    return emailItems;
  }

  return emailItems.filter((item) => item.status === status);
}

export function getPendingEmailCount() {
  return emailItems.filter((item) => item.status === "pending").length;
}
