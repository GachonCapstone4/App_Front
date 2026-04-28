import {
  businessTypeOptions,
  getBusinessTypeLabel,
  recommendedCategoryOptions,
} from "../../../shared/config/onboarding-options";

export const dashboardMetrics = [
  {
    label: "총 가입 사용자 수",
    value: "128명",
    hint: "이번 주 신규 가입 9명",
  },
  {
    label: "연동 완료 사용자 수",
    value: "94명",
    hint: "Google 연동 완료율 73%",
  },
  {
    label: "오늘 AI 분석 완료 건수",
    value: "1,842건",
    hint: "오전 대비 +14%",
  },
  {
    label: "오늘 초안 생성 건수",
    value: "716건",
    hint: "자동 초안 비율 38.9%",
  },
  {
    label: "문의 접수 건수",
    value: "18건",
    hint: "답변 전 7건",
  },
];

export const mailProcessingByPeriod = [
  { label: "월", total: 1284, analyzed: 1180, drafted: 422 },
  { label: "화", total: 1468, analyzed: 1354, drafted: 508 },
  { label: "수", total: 1396, analyzed: 1294, drafted: 466 },
  { label: "목", total: 1582, analyzed: 1496, drafted: 598 },
  { label: "금", total: 1710, analyzed: 1621, drafted: 644 },
  { label: "토", total: 964, analyzed: 901, drafted: 314 },
  { label: "일", total: 812, analyzed: 774, drafted: 282 },
];

export const emailDomainDistribution = [
  { label: "support@", share: 34, count: "628건", color: "teal" },
  { label: "sales@", share: 23, count: "422건", color: "navy" },
  { label: "operations@", share: 19, count: "354건", color: "amber" },
  { label: "partnership@", share: 14, count: "258건", color: "slate" },
  { label: "hr@", share: 10, count: "180건", color: "teal" },
];

export const recentSevenDayTrend = [
  { day: "03/13", processed: 1210, successRate: 95 },
  { day: "03/14", processed: 1368, successRate: 94 },
  { day: "03/15", processed: 1294, successRate: 96 },
  { day: "03/16", processed: 1456, successRate: 95 },
  { day: "03/17", processed: 1588, successRate: 96 },
  { day: "03/18", processed: 1662, successRate: 97 },
  { day: "03/19", processed: 1842, successRate: 97 },
];

export const recentDashboardInquiries = [
  {
    id: "INQ-240319-07",
    requester: "김유리",
    company: "Acme Corp",
    title: "엔터프라이즈 견적 문의",
    status: "답변전",
    receivedAt: "오늘 09:12",
  },
  {
    id: "INQ-240319-05",
    requester: "정소민",
    company: "Prime Support",
    title: "환불 지연 관련 문의",
    status: "답변완료",
    receivedAt: "오늘 08:44",
  },
  {
    id: "INQ-240318-14",
    requester: "오세훈",
    company: "Link Partners",
    title: "공동 마케팅 제안 진행 상태 문의",
    status: "답변전",
    receivedAt: "어제 17:40",
  },
];

const rawUsers = [
  {
    id: "user-1",
    name: "김유리",
    email: "yuri@acme.com",
    company: "Acme Corp",
    industry: "Sales",
    role: "운영 담당자",
    status: "활성",
    googleStatus: "연동 완료",
    googleEmail: "yuri@acme.com",
    joinedAt: "2026.01.12",
    lastActive: "오늘 09:12",
    processedEmails: 182,
    generatedDrafts: 64,
    inquiryCount: 2,
    recentInquiries: [
      { id: "INQ-240319-07", title: "엔터프라이즈 견적 문의", status: "답변전" },
      { id: "INQ-240314-03", title: "도입 일정 조율", status: "답변완료" },
    ],
  },
  {
    id: "user-2",
    name: "정소민",
    email: "somin@primesupport.io",
    company: "Prime Support",
    industry: "Customer Support",
    role: "팀 관리자",
    status: "활성",
    googleStatus: "연동 완료",
    googleEmail: "somin@primesupport.io",
    joinedAt: "2025.12.04",
    lastActive: "오늘 08:44",
    processedEmails: 246,
    generatedDrafts: 108,
    inquiryCount: 1,
    recentInquiries: [
      { id: "INQ-240319-05", title: "환불 지연 관련 문의", status: "답변완료" },
    ],
  },
  {
    id: "user-3",
    name: "오세훈",
    email: "sehun@linkpartners.kr",
    company: "Link Partners",
    industry: "Marketing & PR",
    role: "일반 사용자",
    status: "활성",
    googleStatus: "미연동",
    googleEmail: null,
    joinedAt: "2026.02.02",
    lastActive: "어제 17:40",
    processedEmails: 74,
    generatedDrafts: 26,
    inquiryCount: 3,
    recentInquiries: [
      { id: "INQ-240318-14", title: "공동 마케팅 제안 진행 상태 문의", status: "답변전" },
      { id: "INQ-240311-08", title: "제휴 콘텐츠 협업 일정 문의", status: "답변완료" },
    ],
  },
  {
    id: "user-4",
    name: "윤서영",
    email: "young@peopleops.ai",
    company: "People Ops AI",
    industry: "HR",
    role: "운영 담당자",
    status: "비활성",
    googleStatus: "연동 완료",
    googleEmail: "young@peopleops.ai",
    joinedAt: "2025.11.19",
    lastActive: "3일 전",
    processedEmails: 118,
    generatedDrafts: 41,
    inquiryCount: 0,
    recentInquiries: [],
  },
  {
    id: "user-5",
    name: "최영호",
    email: "yh.choi@finpilot.co.kr",
    company: "FinPilot",
    industry: "Finance",
    role: "일반 사용자",
    status: "활성",
    googleStatus: "연동 완료",
    googleEmail: "yh.choi@finpilot.co.kr",
    joinedAt: "2026.01.29",
    lastActive: "오늘 07:56",
    processedEmails: 96,
    generatedDrafts: 37,
    inquiryCount: 1,
    recentInquiries: [
      { id: "INQ-240310-02", title: "세금계산서 분류 오류 문의", status: "답변완료" },
    ],
  },
  {
    id: "user-6",
    name: "박가은",
    email: "gaeun@opsgrid.io",
    company: "OpsGrid",
    industry: "IT/Ops",
    role: "팀 관리자",
    status: "활성",
    googleStatus: "미연동",
    googleEmail: null,
    joinedAt: "2026.02.15",
    lastActive: "오늘 09:01",
    processedEmails: 61,
    generatedDrafts: 22,
    inquiryCount: 1,
    recentInquiries: [
      { id: "INQ-240309-11", title: "권한 변경 요청 분류 규칙 문의", status: "답변전" },
    ],
  },
];

export const adminUsers = rawUsers.map((user) => ({
  ...user,
  industryLabel: getBusinessTypeLabel(user.industry),
}));

export const templateSummary = [
  { label: "전체 생성 템플릿", value: "84개", hint: "최근 30일 생성 기준" },
  { label: "가장 많이 쓰인 카테고리", value: "견적 요청", hint: "총 126회 사용" },
  { label: "운영 카테고리", value: "8개", hint: "검색 키워드 관리 대상" },
  { label: "등록 검색 키워드", value: "24개", hint: "카테고리별 keyword 합계" },
];

export const generatedTemplates = [
  {
    id: "tpl-01",
    title: "엔터프라이즈 견적 회신 초안",
    category: "견적 요청",
    industry: "Sales",
    useCount: 126,
    userCount: 18,
    generatedAt: "오늘 09:02",
    quality: "높음",
  },
  {
    id: "tpl-02",
    title: "도입 상담 일정 제안 초안",
    category: "미팅 일정 조율",
    industry: "Sales",
    useCount: 88,
    userCount: 14,
    generatedAt: "오늘 08:18",
    quality: "높음",
  },
  {
    id: "tpl-03",
    title: "환불 요청 1차 응답 초안",
    category: "환불 요청",
    industry: "Customer Support",
    useCount: 73,
    userCount: 11,
    generatedAt: "오늘 08:44",
    quality: "보통",
  },
  {
    id: "tpl-04",
    title: "기술 지원 접수 안내 초안",
    category: "기술 지원 요청",
    industry: "Customer Support",
    useCount: 64,
    userCount: 9,
    generatedAt: "오늘 07:52",
    quality: "높음",
  },
  {
    id: "tpl-05",
    title: "세금계산서 발행 안내 초안",
    category: "세금계산서 요청",
    industry: "Finance",
    useCount: 52,
    userCount: 8,
    generatedAt: "어제 17:08",
    quality: "높음",
  },
  {
    id: "tpl-06",
    title: "채용 일정 조율 초안",
    category: "면접 일정 조율",
    industry: "HR",
    useCount: 34,
    userCount: 6,
    generatedAt: "어제 15:26",
    quality: "보통",
  },
  {
    id: "tpl-07",
    title: "파트너십 제안 회신 초안",
    category: "협찬/제휴 제안",
    industry: "Marketing & PR",
    useCount: 29,
    userCount: 4,
    generatedAt: "어제 14:12",
    quality: "보통",
  },
  {
    id: "tpl-08",
    title: "권한 변경 요청 확인 초안",
    category: "권한 변경 요청",
    industry: "IT/Ops",
    useCount: 22,
    userCount: 5,
    generatedAt: "3일 전",
    quality: "보통",
  },
];

export const templateCategoryStats = recommendedCategoryOptions
  .filter((item) =>
    ["견적 요청", "미팅 일정 조율", "환불 요청", "기술 지원 요청", "세금계산서 요청", "면접 일정 조율", "협찬/제휴 제안", "권한 변경 요청"].includes(item.name),
  )
  .map((category) => {
    const matchedTemplates = generatedTemplates.filter(
      (template) => template.category === category.name,
    );

    return {
      id: category.id,
      category: category.name,
      industryLabel: getBusinessTypeLabel(category.domain),
      color: category.color,
      templateCount: matchedTemplates.length,
      usageCount: matchedTemplates.reduce((sum, template) => sum + template.useCount, 0),
    };
  });

export const initialAutomationRules = [
  {
    id: "rule-01",
    name: "견적 요청 자동 초안",
    category: "견적 요청",
    trigger: "subject/body에 견적, 가격, quote 포함",
    action: "가격 안내 초안 생성",
    status: "활성",
    updatedAt: "오늘 08:20",
  },
  {
    id: "rule-02",
    name: "환불 요청 우선 검토",
    category: "환불 요청",
    trigger: "refund, 환불, 취소 키워드 감지",
    action: "CS 담당자 검토 대기 후 초안 생성",
    status: "활성",
    updatedAt: "오늘 07:55",
  },
  {
    id: "rule-03",
    name: "면접 일정 캘린더 연동",
    category: "면접 일정 조율",
    trigger: "시간/날짜 표현과 면접 키워드 동시 감지",
    action: "일정 초안 생성 + 캘린더 후보 등록",
    status: "활성",
    updatedAt: "어제 17:42",
  },
  {
    id: "rule-04",
    name: "세금계산서 요청 분류",
    category: "세금계산서 요청",
    trigger: "invoice, 세금계산서, 사업자등록증 포함",
    action: "재무 카테고리 분류 후 초안 생성",
    status: "비활성",
    updatedAt: "어제 11:18",
  },
  {
    id: "rule-05",
    name: "권한 변경 요청 자동 접수",
    category: "권한 변경 요청",
    trigger: "access, permission, 권한 키워드 포함",
    action: "IT/Ops 카테고리 분류 + 확인 메일 초안 생성",
    status: "활성",
    updatedAt: "3일 전",
  },
];

export const inquiries = [
  {
    id: "INQ-240319-07",
    title: "엔터프라이즈 견적 문의",
    requester: "김유리",
    company: "Acme Corp",
    email: "yuri@acme.com",
    industry: "영업 (Sales)",
    status: "답변전",
    createdAt: "오늘 09:12",
    updatedAt: "오늘 09:12",
    latestResponder: "미응답",
    content:
      "엔터프라이즈 플랜 가격과 초기 도입 일정을 함께 안내받고 싶습니다. 팀 규모는 40명이고, Gmail과 Calendar 연동을 우선 고려하고 있습니다.",
  },
  {
    id: "INQ-240319-05",
    title: "환불 지연 관련 문의",
    requester: "정소민",
    company: "Prime Support",
    email: "somin@primesupport.io",
    industry: "고객지원 (Customer Support)",
    status: "답변완료",
    createdAt: "오늘 08:44",
    updatedAt: "오늘 09:03",
    latestResponder: "박민수",
    content:
      "환불 요청 카테고리로 분류된 메일의 응답이 지연된 이유와 현재 환불 처리 기준을 알고 싶습니다.",
  },
  {
    id: "INQ-240318-14",
    title: "공동 마케팅 제안 진행 상태 문의",
    requester: "오세훈",
    company: "Link Partners",
    email: "sehun@linkpartners.kr",
    industry: "마케팅 / PR (Marketing & PR)",
    status: "답변전",
    createdAt: "어제 17:40",
    updatedAt: "어제 17:40",
    latestResponder: "미응답",
    content:
      "공동 마케팅 제안 메일이 접수된 뒤 아직 회신이 없어 진행 상태를 확인하고 싶습니다.",
  },
  {
    id: "INQ-240317-09",
    title: "채용 일정 감지 규칙 문의",
    requester: "윤서영",
    company: "People Ops AI",
    email: "young@peopleops.ai",
    industry: "인사 (HR)",
    status: "답변완료",
    createdAt: "어제 10:22",
    updatedAt: "어제 13:55",
    latestResponder: "김호진",
    content:
      "면접 일정 조율 메일이 어떤 조건에서 자동으로 캘린더 후보에 등록되는지 확인 부탁드립니다.",
  },
];

export const responseHistory = {
  "INQ-240319-07": [
    {
      at: "오늘 09:12",
      author: "고객",
      channel: "문의 접수",
      note: "엔터프라이즈 플랜 가격과 도입 일정을 문의했습니다.",
    },
  ],
  "INQ-240319-05": [
    {
      at: "오늘 08:44",
      author: "고객",
      channel: "문의 접수",
      note: "환불 요청 응답 지연 이유와 기준을 문의했습니다.",
    },
    {
      at: "오늘 09:03",
      author: "박민수",
      channel: "관리자 답변",
      note: "환불 요청 메일은 검토 승인 이후 초안이 발송되며, 현재 지연 원인을 함께 안내했습니다.",
    },
  ],
  "INQ-240318-14": [
    {
      at: "어제 17:40",
      author: "고객",
      channel: "문의 접수",
      note: "공동 마케팅 제안 메일의 처리 상태를 문의했습니다.",
    },
  ],
  "INQ-240317-09": [
    {
      at: "어제 10:22",
      author: "고객",
      channel: "문의 접수",
      note: "면접 일정 감지 규칙의 조건을 확인 요청했습니다.",
    },
    {
      at: "어제 13:55",
      author: "김호진",
      channel: "관리자 답변",
      note: "시간 표현과 면접 키워드가 동시에 감지될 때 일정 후보로 등록된다고 안내했습니다.",
    },
  ],
};

export const processingJobs = [
  {
    id: "JOB-240319-101",
    userName: "김유리",
    userEmail: "yuri@acme.com",
    emailDomain: "acme.com",
    jobType: "AI 분석",
    category: "견적 요청",
    status: "성공",
    createdAt: "오늘 09:11",
    updatedAt: "오늘 09:12",
    failureReason: "",
  },
  {
    id: "JOB-240319-102",
    userName: "정소민",
    userEmail: "somin@primesupport.io",
    emailDomain: "primesupport.io",
    jobType: "초안 생성",
    category: "환불 요청",
    status: "실패",
    createdAt: "오늘 08:41",
    updatedAt: "오늘 08:43",
    failureReason: "LLM 응답 타임아웃",
  },
  {
    id: "JOB-240319-103",
    userName: "박가은",
    userEmail: "gaeun@opsgrid.io",
    emailDomain: "opsgrid.io",
    jobType: "AI 분석",
    category: "권한 변경 요청",
    status: "대기",
    createdAt: "오늘 08:36",
    updatedAt: "오늘 08:36",
    failureReason: "",
  },
  {
    id: "JOB-240319-104",
    userName: "최영호",
    userEmail: "yh.choi@finpilot.co.kr",
    emailDomain: "finpilot.co.kr",
    jobType: "초안 생성",
    category: "세금계산서 요청",
    status: "성공",
    createdAt: "오늘 08:12",
    updatedAt: "오늘 08:12",
    failureReason: "",
  },
  {
    id: "JOB-240319-105",
    userName: "오세훈",
    userEmail: "sehun@linkpartners.kr",
    emailDomain: "linkpartners.kr",
    jobType: "메일 수집",
    category: "협찬/제휴 제안",
    status: "실패",
    createdAt: "오늘 07:58",
    updatedAt: "오늘 08:00",
    failureReason: "Gmail access token 만료",
  },
  {
    id: "JOB-240319-106",
    userName: "윤서영",
    userEmail: "young@peopleops.ai",
    emailDomain: "peopleops.ai",
    jobType: "캘린더 감지",
    category: "면접 일정 조율",
    status: "대기",
    createdAt: "오늘 07:31",
    updatedAt: "오늘 07:31",
    failureReason: "",
  },
  {
    id: "JOB-240319-107",
    userName: "박가은",
    userEmail: "gaeun@opsgrid.io",
    emailDomain: "opsgrid.io",
    jobType: "초안 생성",
    category: "시스템 오류 보고",
    status: "성공",
    createdAt: "오늘 07:15",
    updatedAt: "오늘 07:16",
    failureReason: "",
  },
];

export const processingJobLogs = {
  "JOB-240319-101": [
    { at: "09:11:12", level: "INFO", message: "메일 원문을 수집했습니다." },
    { at: "09:11:14", level: "INFO", message: "영업 카테고리로 분류했습니다." },
    { at: "09:12:02", level: "INFO", message: "AI 분석을 완료했습니다." },
  ],
  "JOB-240319-102": [
    { at: "08:41:08", level: "INFO", message: "환불 요청 메일을 분류했습니다." },
    { at: "08:42:11", level: "WARN", message: "LLM 응답 시간이 기준치를 초과했습니다." },
    { at: "08:43:02", level: "ERROR", message: "초안 생성 단계에서 타임아웃이 발생했습니다." },
  ],
  "JOB-240319-103": [
    { at: "08:36:10", level: "INFO", message: "권한 변경 요청 메일을 수신했습니다." },
    { at: "08:36:12", level: "INFO", message: "AI 분석 대기 큐에 적재했습니다." },
  ],
  "JOB-240319-104": [
    { at: "08:12:07", level: "INFO", message: "재무 카테고리로 분류했습니다." },
    { at: "08:12:24", level: "INFO", message: "세금계산서 안내 초안을 생성했습니다." },
  ],
  "JOB-240319-105": [
    { at: "07:58:14", level: "INFO", message: "메일 수집 작업을 시작했습니다." },
    { at: "07:59:02", level: "WARN", message: "Google access token 갱신이 필요합니다." },
    { at: "08:00:16", level: "ERROR", message: "메일 수집 단계에서 인증 갱신에 실패했습니다." },
  ],
  "JOB-240319-106": [
    { at: "07:31:10", level: "INFO", message: "면접 일정 키워드를 감지했습니다." },
    { at: "07:31:11", level: "INFO", message: "캘린더 등록 후보 생성 대기 중입니다." },
  ],
  "JOB-240319-107": [
    { at: "07:15:02", level: "INFO", message: "IT/Ops 메일을 분류했습니다." },
    { at: "07:15:46", level: "INFO", message: "시스템 오류 보고 확인 초안을 생성했습니다." },
  ],
};

export const userIndustryOptions = businessTypeOptions.map((item) => ({
  value: item.value,
  label: item.label,
}));
