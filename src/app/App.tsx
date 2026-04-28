import { type ReactNode, useEffect, useRef, useState } from "react";
import { ThemeProvider } from "next-themes";
import { RouterProvider } from "react-router";
import { defaultSettingsState } from "../entities/settings/model/default-settings";
import { refreshStoredSession } from "../shared/api/session";
import {
  createAuthenticatedSession,
  getAccessToken,
} from "../shared/lib/app-session";
import { isDemoModeEnabled } from "../shared/scenarios/demo-mode";
import { Toaster } from "./components/ui/sonner";
import { router } from "./router";

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
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
