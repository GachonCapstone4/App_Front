import { Link } from "react-router";
import { AdminStatePage } from "../shared/ui/AdminStatePage";

export function NotFoundPage() {
  return (
    <AdminStatePage
      title="페이지를 찾을 수 없습니다"
      description="요청한 관리자 화면이 존재하지 않거나 경로가 변경되었습니다. 운영 대시보드로 돌아가 다시 확인해 주세요."
      tone="empty"
      action={
        <Link to="/admin" className="admin-button">
          운영 대시보드로 이동
        </Link>
      }
    />
  );
}
