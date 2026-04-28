import type { ReactNode } from "react";
import { Link, Navigate, createBrowserRouter, useLocation } from "react-router";
import { AppShell } from "../../shared/ui/AppShell";
import {
  canAccessUserWorkspace,
  getAppSession,
  isAdminSession,
} from "../../shared/lib/app-session";
import { AppStatePage } from "../../shared/ui/primitives/AppStatePage";
import { AdminRootLayout } from "../../admin/AdminRootLayout";

function hasGoogleOAuthCallbackParams(search: string) {
  const searchParams = new URLSearchParams(search);

  return (
    searchParams.has("google_oauth") ||
    searchParams.has("gmail_connected") ||
    searchParams.has("calendar_connected") ||
    searchParams.has("gmail") ||
    searchParams.has("calendar")
  );
}

function AuthEntryGate({ children }: { children: ReactNode }) {
  const session = getAppSession();

  if (isAdminSession(session)) {
    return <Navigate replace to="/admin" />;
  }

  if (canAccessUserWorkspace(session) && session.onboardingCompleted) {
    return <Navigate replace to="/app" />;
  }

  if (canAccessUserWorkspace(session)) {
    return <Navigate replace to="/onboarding" />;
  }

  return <>{children}</>;
}

function OnboardingGate({ children }: { children: ReactNode }) {
  const session = getAppSession();

  if (!session.authenticated) {
    return <Navigate replace to="/" />;
  }

  if (isAdminSession(session)) {
    return <Navigate replace to="/admin" />;
  }

  if (session.onboardingCompleted) {
    return <Navigate replace to="/app" />;
  }

  return <>{children}</>;
}

function AppGate() {
  const session = getAppSession();
  const location = useLocation();

  if (
    location.pathname === "/app/settings" &&
    hasGoogleOAuthCallbackParams(location.search)
  ) {
    return <Navigate replace to={`/oauth/google/callback${location.search}`} />;
  }

  if (!session.authenticated) {
    return <Navigate replace to="/" />;
  }

  if (isAdminSession(session)) {
    return <Navigate replace to="/admin" />;
  }

  if (!session.onboardingCompleted) {
    return <Navigate replace to="/onboarding" />;
  }

  return <AppShell />;
}

function AdminGate() {
  const session = getAppSession();

  if (!session.authenticated) {
    return <Navigate replace to="/" />;
  }

  if (!isAdminSession(session)) {
    return (
      <AppStatePage
        title="관리자 화면에 접근할 수 없습니다"
        description="현재 로그인한 계정은 운영 콘솔 권한이 없습니다. 사용자 업무 화면으로 돌아가 계속 진행해 주세요."
        tone="permission"
        action={
          <Link
            to={session.onboardingCompleted ? "/app" : "/onboarding"}
            className="app-cta-primary inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            사용자 화면으로 이동
          </Link>
        }
      />
    );
  }

  return <AdminRootLayout />;
}

function LegacySettingsGate() {
  const location = useLocation();

  if (hasGoogleOAuthCallbackParams(location.search)) {
    return <Navigate replace to={`/oauth/google/callback${location.search}`} />;
  }

  return <Navigate replace to="/app/settings?tab=email" />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => {
      const module = await import("../../pages/auth");
      return {
        Component: () => (
          <AuthEntryGate>
            <module.AuthRoutePage />
          </AuthEntryGate>
        ),
      };
    },
  },
  {
    path: "/onboarding",
    lazy: async () => {
      const module = await import("../../pages/onboarding");
      return {
        Component: () => (
          <OnboardingGate>
            <module.OnboardingPage />
          </OnboardingGate>
        ),
      };
    },
  },
  {
    path: "/oauth/google/callback",
    lazy: async () => {
      const module = await import("../../pages/google-oauth-callback");
      return { Component: module.GoogleOAuthCallbackPage };
    },
  },
  {
    path: "/auth/google/register",
    lazy: async () => {
      const module = await import("../../pages/google-signup-register");
      return { Component: module.GoogleSignupRegisterRoutePage };
    },
  },
  {
    path: "/settings",
    Component: LegacySettingsGate,
  },
  {
    path: "/app",
    element: <AppGate />,
    children: [
      {
        index: true,
        lazy: async () => {
          const module = await import("../../pages/dashboard");
          return { Component: module.DashboardPage };
        },
      },
      {
        path: "inbox",
        lazy: async () => {
          const module = await import("../../pages/inbox");
          return { Component: module.InboxPage };
        },
      },
      {
        path: "inbox/:emailId",
        lazy: async () => {
          const module = await import("../../pages/inbox");
          return { Component: module.InboxPage };
        },
      },
      {
        path: "calendar",
        lazy: async () => {
          const module = await import("../../pages/calendar");
          return { Component: module.CalendarPage };
        },
      },
      {
        path: "templates",
        lazy: async () => {
          const module = await import("../../pages/template-library");
          return { Component: module.TemplateLibraryPage };
        },
      },
      {
        path: "automation",
        lazy: async () => {
          const module = await import("../../pages/automation-settings");
          return { Component: module.AutomationSettingsPage };
        },
      },
      {
        path: "profile",
        lazy: async () => {
          const module = await import("../../pages/business-profile");
          return { Component: module.BusinessProfilePage };
        },
      },
      {
        path: "settings",
        lazy: async () => {
          const module = await import("../../pages/settings");
          return { Component: module.SettingsPage };
        },
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminGate />,
    children: [
      {
        index: true,
        lazy: async () => {
          const module = await import("../../admin/pages/dashboard");
          return { Component: module.DashboardPage };
        },
      },
      {
        path: "users",
        lazy: async () => {
          const module = await import("../../admin/pages/users");
          return { Component: module.UsersPage };
        },
      },
      {
        path: "template-automation",
        lazy: async () => {
          const module = await import("../../admin/pages/template-automation");
          return { Component: module.TemplateAutomationPage };
        },
      },
      {
        path: "inquiries",
        lazy: async () => {
          const module = await import("../../admin/pages/inquiries");
          return { Component: module.InquiriesPage };
        },
      },
      {
        path: "monitoring",
        lazy: async () => {
          const module = await import("../../admin/pages/monitoring");
          return { Component: module.MonitoringPage };
        },
      },
      {
        path: "internal-monitoring",
        lazy: async () => {
          const module = await import("../../admin/pages/internal-monitoring");
          return { Component: module.InternalMonitoringPage };
        },
      },
      {
        path: "*",
        lazy: async () => {
          const module = await import("../../admin/pages/not-found");
          return { Component: module.NotFoundPage };
        },
      },
    ],
  },
  {
    path: "*",
    lazy: async () => {
      const module = await import("../../pages/not-found");
      return { Component: module.NotFoundPage };
    },
  },
]);
