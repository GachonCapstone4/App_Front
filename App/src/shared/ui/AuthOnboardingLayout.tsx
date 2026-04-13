import type { CSSProperties, ReactNode } from "react";
import { Bot, Calendar, Check, Mail, type LucideIcon } from "lucide-react";

type FooterItem = {
  icon: LucideIcon;
  text: string;
};

type AuthOnboardingLayoutProps = {
  title: ReactNode;
  subtitle: ReactNode;
  footerItems: FooterItem[];
  stepBar?: ReactNode;
  children: ReactNode;
  contentWidthClassName?: string;
};

const SCENE_WIDTH = 720;
const SCENE_HEIGHT = 920;
const CORE_X = 408;
const CORE_Y = 332;

function motionStyle(vars: Record<string, string>) {
  return vars as CSSProperties;
}

function FlyingEnvelopeBackground() {
  const inboundPaths = [
    "M 18 178 C 158 112 300 144 408 332",
    "M 8 430 C 170 420 316 394 408 332",
    "M 112 786 C 244 676 348 526 408 332",
  ];

  const outboundPaths = [
    "M 408 332 C 492 252 578 180 664 144",
    "M 408 332 C 506 352 600 356 688 350",
    "M 408 332 C 472 424 548 542 626 710",
  ];

  const inboundEnvelopes = [
    { path: inboundPaths[0], delay: "-1.4s" },
    { path: inboundPaths[1], delay: "-2.9s" },
    { path: inboundPaths[0], delay: "-4.5s" },
    { path: inboundPaths[2], delay: "-6.1s" },
    { path: inboundPaths[1], delay: "-7.7s" },
    { path: inboundPaths[0], delay: "-9.3s" },
    { path: inboundPaths[2], delay: "-10.9s" },
    { path: inboundPaths[1], delay: "-12.5s" },
    { path: inboundPaths[0], delay: "-14.1s" },
    { path: inboundPaths[2], delay: "-15.7s" },
    { path: inboundPaths[1], delay: "-17.3s" },
  ];

  const outboundTasks: Array<{
    path: string;
    icon: LucideIcon;
    iconClassName: string;
    tokenClassName: string;
    sizeClassName: string;
    delay: string;
  }> = [
    {
      path: outboundPaths[1],
      icon: Check,
      iconClassName: "text-[#B5FFF1]",
      tokenClassName: "ai-flow-token--outbound-primary",
      sizeClassName: "h-14 w-14 xl:h-16 xl:w-16",
      delay: "-2.5s",
    },
    {
      path: outboundPaths[0],
      icon: Calendar,
      iconClassName: "text-[#8CDFFF]/72",
      tokenClassName: "ai-flow-token--outbound-secondary",
      sizeClassName: "h-12 w-12 xl:h-14 xl:w-14",
      delay: "-8s",
    },
    {
      path: outboundPaths[2],
      icon: Check,
      iconClassName: "text-[#A7F3D0]/90",
      tokenClassName: "ai-flow-token--outbound-secondary",
      sizeClassName: "h-11 w-11 xl:h-12 xl:w-12",
      delay: "-11.4s",
    },
    {
      path: outboundPaths[2],
      icon: Calendar,
      iconClassName: "text-[#93C5FD]/76",
      tokenClassName: "ai-flow-token--outbound-secondary",
      sizeClassName: "h-12 w-12 xl:h-14 xl:w-14",
      delay: "-14.6s",
    },
    {
      path: outboundPaths[0],
      icon: Check,
      iconClassName: "text-[#C8FFF6]",
      tokenClassName: "ai-flow-token--outbound-secondary",
      sizeClassName: "h-10 w-10 xl:h-12 xl:w-12",
      delay: "-17.2s",
    },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_22%,rgba(45,212,191,0.12),transparent_14%),radial-gradient(circle_at_48%_22%,rgba(56,189,248,0.14),transparent_20%),radial-gradient(circle_at_72%_10%,rgba(56,189,248,0.07),transparent_24%),radial-gradient(circle_at_12%_84%,rgba(45,212,191,0.05),transparent_28%)]" />

      <div className="absolute z-[1] left-[-255px] top-[-220px] h-[920px] w-[720px] origin-top-left scale-[1.28] xl:left-[-298px] xl:top-[-254px] xl:scale-[1.44] 2xl:left-[-346px] 2xl:top-[-286px] 2xl:scale-[1.58]">
        <div className="relative h-full w-full">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_56%_36%,rgba(56,189,248,0.08),transparent_24%),radial-gradient(circle_at_58%_36%,rgba(45,212,191,0.06),transparent_18%)]" />

          <svg
            className="absolute inset-0 h-full w-full opacity-70"
            viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
            preserveAspectRatio="xMinYMin meet"
            fill="none"
          >
            {inboundPaths.map((path, index) => (
              <path
                key={`inbound-path-${index}`}
                className="ai-flow-path ai-flow-path--inbound"
                d={path}
              />
            ))}
            {outboundPaths.map((path, index) => (
              <path
                key={`outbound-path-${index}`}
                className="ai-flow-path ai-flow-path--outbound"
                d={path}
              />
            ))}
          </svg>

          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: CORE_X, top: CORE_Y }}
          >
            <div className="ai-core h-40 w-40 xl:h-44 xl:w-44">
              <span className="ai-core__glow" />
              <span className="ai-core__ring ai-core__ring--outer" />
              <span className="ai-core__ring ai-core__ring--mid" />
              <span className="ai-core__ring ai-core__ring--inner" />
              <span className="ai-core__burst ai-core__burst--one" />
              <span className="ai-core__burst ai-core__burst--two" />
              <span className="ai-core__dot flex items-center justify-center rounded-full border border-white/18 bg-[radial-gradient(circle_at_30%_30%,rgba(196,255,241,0.96),rgba(45,212,191,0.76)_52%,rgba(13,148,136,0.72)_100%)] shadow-[0_0_30px_rgba(45,212,191,0.36)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#102232]/88 ring-1 ring-white/12 xl:h-10 xl:w-10">
                  <Bot className="h-4 w-4 text-[#7AF2D2] xl:h-[18px] xl:w-[18px]" />
                </span>
              </span>
            </div>
          </div>

          {inboundEnvelopes.map((item, index) => (
            <div
              key={`inbound-envelope-${index}`}
              className="ai-flow-anchor ai-flow-anchor--inbound"
              style={motionStyle({
                offsetPath: `path("${item.path}")`,
                animationDelay: item.delay,
              })}
            >
              <div className="ai-flow-token flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[14px] border border-white/14 bg-white/[0.11] text-[#A7F3D0]/85 shadow-[0_18px_46px_rgba(2,8,23,0.18)] backdrop-blur-[10px] xl:h-[52px] xl:w-[52px]">
                <Mail className="h-[18px] w-[18px] xl:h-5 xl:w-5" />
              </div>
            </div>
          ))}

          {outboundTasks.map(
            (
              {
                path,
                icon: Icon,
                iconClassName,
                tokenClassName,
                sizeClassName,
                delay,
              },
              index,
            ) => (
              <div
                key={`outbound-task-${index}`}
                className="ai-flow-anchor ai-flow-anchor--outbound"
                style={motionStyle({
                  offsetPath: `path("${path}")`,
                  animationDelay: delay,
                })}
              >
                <div
                  className={`ai-flow-token ${tokenClassName} ${sizeClassName} flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-[10px]`}
                >
                  <Icon
                    className={`h-5 w-5 xl:h-[22px] xl:w-[22px] ${iconClassName}`}
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="absolute z-0 inset-0 bg-[linear-gradient(90deg,rgba(16,27,40,0.93)_0%,rgba(16,27,40,0.9)_24%,rgba(16,27,40,0.8)_38%,rgba(16,27,40,0.58)_52%,rgba(16,27,40,0.2)_70%,rgba(16,27,40,0)_100%)]" />
      <div className="absolute z-0 inset-y-0 left-0 w-[46%] bg-[linear-gradient(180deg,rgba(16,27,40,0.14),rgba(16,27,40,0.03))]" />
    </div>
  );
}

export function AuthOnboardingLayout({
  title,
  subtitle,
  footerItems,
  stepBar,
  children,
  contentWidthClassName = "max-w-[560px]",
}: AuthOnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#101B28_0%,#132131_48%,#1A2C3E_100%)] p-12 lg:flex lg:w-[42%] xl:w-[44%]">
        <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2DD4BF]/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#38BDF8]/5 blur-3xl" />
        <FlyingEnvelopeBackground />

        <div className="relative z-10 flex w-full flex-col justify-between">
          <div className="flex max-w-[320px] items-center gap-3 xl:max-w-[360px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DD4BF]/20">
              <Mail className="h-5 w-5 text-[#2DD4BF]" />
            </div>
            <span className="text-[15px] tracking-tight text-white/90">
              업무용 이메일 자동화
            </span>
          </div>
          <div className="max-w-[320px] xl:max-w-[360px]">
            <h1 className="mb-5 whitespace-pre-line text-[34px] leading-[1.3] tracking-tight text-white">
              {title}
            </h1>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/50">
              {subtitle}
            </p>
          </div>

          <div className="max-w-[420px] space-y-4 xl:max-w-[460px]">
            {footerItems.map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0 text-[#2DD4BF]/60" />
                <span className="whitespace-nowrap text-[12px] leading-relaxed text-white/40 xl:text-[13px]">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-screen flex-1 flex-col bg-background">
        {stepBar ? (
          <div className="px-6 pb-2 pt-8 sm:px-10">{stepBar}</div>
        ) : null}

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className={`w-full ${contentWidthClassName}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
