export interface BusinessTypeOption {
  value: string;
  label: string;
}

export interface RecommendedCategoryOption {
  id: string;
  name: string;
  domain: string;
  color: string;
}

export const businessTypeOptions: BusinessTypeOption[] = [
  { value: "Sales", label: "영업 (Sales)" },
  { value: "Marketing & PR", label: "마케팅 / PR (Marketing & PR)" },
  { value: "HR", label: "인사 (HR)" },
  { value: "Finance", label: "재무 (Finance)" },
  { value: "Customer Support", label: "고객지원 (Customer Support)" },
  { value: "IT/Ops", label: "IT 운영 (IT/Ops)" },
  { value: "Admin", label: "관리 / 공통업무 (Admin)" },
];

export const recommendedCategoryOptions: RecommendedCategoryOption[] = [
  { id: "sales-quote", name: "견적 요청", domain: "Sales", color: "#3B82F6" },
  { id: "sales-contract", name: "계약 문의", domain: "Sales", color: "#3B82F6" },
  { id: "sales-price", name: "가격 협상", domain: "Sales", color: "#3B82F6" },
  { id: "sales-proposal", name: "제안서 요청", domain: "Sales", color: "#3B82F6" },
  { id: "sales-meeting", name: "미팅 일정 조율", domain: "Sales", color: "#3B82F6" },
  { id: "mpr-partnership", name: "협찬/제휴 제안", domain: "Marketing & PR", color: "#EC4899" },
  { id: "mpr-ad", name: "광고 문의", domain: "Marketing & PR", color: "#EC4899" },
  { id: "mpr-press", name: "보도자료 요청", domain: "Marketing & PR", color: "#EC4899" },
  { id: "mpr-interview", name: "인터뷰 요청", domain: "Marketing & PR", color: "#EC4899" },
  { id: "mpr-content", name: "콘텐츠 협업 문의", domain: "Marketing & PR", color: "#EC4899" },
  { id: "mpr-campaign", name: "행사/캠페인 문의", domain: "Marketing & PR", color: "#EC4899" },
  { id: "hr-hiring", name: "채용 문의", domain: "HR", color: "#14B8A6" },
  { id: "hr-interview", name: "면접 일정 조율", domain: "HR", color: "#14B8A6" },
  { id: "hr-leave", name: "휴가 신청", domain: "HR", color: "#14B8A6" },
  { id: "hr-certificate", name: "증명서 발급 요청", domain: "HR", color: "#14B8A6" },
  { id: "finance-tax", name: "세금계산서 요청", domain: "Finance", color: "#F59E0B" },
  { id: "finance-expense", name: "비용 처리 문의", domain: "Finance", color: "#F59E0B" },
  { id: "finance-payment", name: "입금 확인 요청", domain: "Finance", color: "#F59E0B" },
  { id: "finance-settlement", name: "정산 문의", domain: "Finance", color: "#F59E0B" },
  { id: "support-complaint", name: "불만 접수", domain: "Customer Support", color: "#EF4444" },
  { id: "support-tech", name: "기술 지원 요청", domain: "Customer Support", color: "#EF4444" },
  { id: "support-refund", name: "환불 요청", domain: "Customer Support", color: "#EF4444" },
  { id: "support-guide", name: "사용법 문의", domain: "Customer Support", color: "#EF4444" },
  { id: "it-incident", name: "시스템 오류 보고", domain: "IT/Ops", color: "#6366F1" },
  { id: "it-account", name: "계정 생성 요청", domain: "IT/Ops", color: "#6366F1" },
  { id: "it-permission", name: "권한 변경 요청", domain: "IT/Ops", color: "#6366F1" },
  { id: "admin-notice", name: "공지 전달", domain: "Admin", color: "#10B981" },
  { id: "admin-report", name: "내부 보고", domain: "Admin", color: "#10B981" },
  { id: "admin-resource", name: "자료 요청", domain: "Admin", color: "#10B981" },
  { id: "admin-coop", name: "협조 요청", domain: "Admin", color: "#10B981" },
];

export const categoryColorPalette = [
  "#3B82F6",
  "#2563EB",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F59E0B",
  "#EF4444",
  "#F97316",
  "#6366F1",
  "#10B981",
];

export function getRecommendedCategoriesForDomain(domain: string) {
  if (!domain) {
    return [];
  }

  return recommendedCategoryOptions.filter((option) => option.domain === domain);
}

export function getBusinessTypeLabel(domain: string) {
  return businessTypeOptions.find((option) => option.value === domain)?.label ?? domain;
}
