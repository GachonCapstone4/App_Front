import { type ReactNode, useEffect, useRef, useState } from "react";
import { ThemeProvider } from "next-themes";
import { RouterProvider } from "react-router";
import { toast } from "sonner";
import { defaultSettingsState } from "../entities/settings/model/default-settings";
import { refreshStoredSession } from "../shared/api/session";
import {
  createAuthenticatedSession,
  getAccessToken,
} from "../shared/lib/app-session";
import { isDemoModeEnabled } from "../shared/scenarios/demo-mode";
import { Toaster } from "./components/ui/sonner";
import { router } from "./router";

const UPDATE_TOAST_ID = "emailassist-update";

function AppUpdateNotifier() {
  const downloadingRef = useRef(false);

  useEffect(() => {
    const updater = window.emailAssistUpdater;

    if (!updater) {
      return;
    }

    const updaterApi = updater;

    function handleUpdateState(state: EmailAssistUpdateState) {
      if (state.status === "available") {
        downloadingRef.current = false;
        toast.info("새 버전의 EmailAssist가 준비되었습니다.", {
          id: UPDATE_TOAST_ID,
          description: state.version
            ? `버전 ${state.version}을 설치할 수 있습니다.`
            : "업데이트를 설치할 수 있습니다.",
          duration: Number.POSITIVE_INFINITY,
          action: {
            label: "업데이트",
            onClick: () => {
              if (downloadingRef.current) {
                return;
              }

              downloadingRef.current = true;
              void updaterApi.download();
            },
          },
        });
        return;
      }

      if (state.status === "downloading") {
        toast.loading("업데이트를 다운로드하는 중입니다.", {
          id: UPDATE_TOAST_ID,
          description:
            typeof state.percent === "number"
              ? `${state.percent}% 완료`
              : "잠시만 기다려 주세요.",
          duration: Number.POSITIVE_INFINITY,
        });
        return;
      }

      if (state.status === "downloaded") {
        downloadingRef.current = false;
        toast.success("업데이트 다운로드가 완료되었습니다.", {
          id: UPDATE_TOAST_ID,
          description: "재시작하면 새 버전이 적용됩니다.",
          duration: Number.POSITIVE_INFINITY,
          action: {
            label: "설치 후 재시작",
            onClick: () => {
              void updaterApi.install();
            },
          },
        });
        return;
      }

      if (state.status === "error") {
        downloadingRef.current = false;
        toast.error("업데이트 확인 중 문제가 발생했습니다.", {
          id: UPDATE_TOAST_ID,
          description: state.error ?? "잠시 후 다시 시도해 주세요.",
          duration: 8000,
        });
      }
    }

    void updaterApi.getState().then(handleUpdateState);
    const unsubscribe = updaterApi.onStatus(handleUpdateState);

    return unsubscribe;
  }, []);

  return null;
}

function SessionBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;

    if (isDemoModeEnabled() && !getAccessToken()) {
      const pathname = window.location.pathname;
      const authPath = pathname === "/";
      const onboardingPath = pathname.startsWith("/onboarding");
      const adminPath = pathname.startsWith("/admin");
      const appPath = pathname.startsWith("/app");

      if (authPath) {
        setReady(true);
        return;
      }

      if (adminPath) {
        createAuthenticatedSession({
          name: "데모 관리자",
          email: "admin@emailassist.demo",
          role: "ADMIN",
          onboardingCompleted: true,
          connectedEmail: "",
          connectedEmails: [],
        });
        setReady(true);
        return;
      }

      if (onboardingPath || appPath) {
        createAuthenticatedSession({
          name: "데모 사용자",
          email: "demo@emailassist.demo",
          role: "USER",
          onboardingCompleted: appPath,
          connectedEmail: "demo@gmail.com",
          connectedEmails: ["demo@gmail.com"],
        });
      }

      setReady(true);
      return;
    }

    void refreshStoredSession().finally(() => {
      setReady(true);
    });
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={defaultSettingsState.display.theme}
      disableTransitionOnChange
      enableSystem={false}
      storageKey="emailassist-theme"
    >
      <SessionBootstrap>
        <RouterProvider router={router} />
      </SessionBootstrap>
      <AppUpdateNotifier />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
