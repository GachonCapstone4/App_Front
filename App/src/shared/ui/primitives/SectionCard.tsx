import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section className={`rounded-2xl border border-border bg-card shadow-sm ${className}`.trim()}>
      {(title || description || action) && (
        <div className="flex flex-col gap-3 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
