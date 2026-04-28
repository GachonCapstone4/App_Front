const toneByLabel = {
  활성: "ok",
  비활성: "muted",
  운영중: "ok",
  정상: "ok",
  성공: "ok",
  "연동 완료": "ok",
  "승인 완료": "ok",
  "답변 완료": "ok",
  답변완료: "ok",
  높음: "ok",
  대기: "muted",
  미연동: "muted",
  보통: "muted",
  답변전: "warn",
  초안: "muted",
  검토중: "muted",
  "추가 확인": "warn",
  "개선 필요": "warn",
  주의: "warn",
  점검: "danger",
  실패: "danger",
  "승인 대기": "danger",
};

export function StatusBadge({ children }) {
  const tone = toneByLabel[children] ?? "muted";

  return <span className={`status status--${tone}`}>{children}</span>;
}
