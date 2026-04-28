import { Link } from "react-router";
import { AppStatePage } from "../../shared/ui/primitives/AppStatePage";

export function NotFoundPage() {
  return (
    <AppStatePage
      title="페이지를 찾을 수 없습니다"
      description="요청한 화면이 존재하지 않거나 이동 경로가 변경되었습니다. 대시보드 또는 로그인 화면으로 돌아가 다시 진행해 주세요."
      tone="empty"
      action={
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/app"
            className="app-cta-primary inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            대시보드로 이동
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground"
          >
            로그인으로 이동
          </Link>
        </div>
      }
    />
  );
}
