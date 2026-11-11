import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Page({ title, subtitle, actions, children, className }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl space-y-6 px-5 py-6 md:py-10", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, tone, icon, description }: { label: string; value: string; tone?: "income" | "expense" | "primary"; icon?: ReactNode; description?: string | undefined }) {
  return (
    <div role="group" aria-label={label} className={cn("min-w-0 rounded-2xl border bg-card p-5 shadow-soft", tone === "primary" && "border-transparent bg-hero text-primary-foreground")}>
      <div className={cn("flex items-center gap-2 text-sm font-medium", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-2 break-words font-display text-2xl font-bold md:text-3xl",
          tone === "income" && "text-income",
          tone === "expense" && "text-expense",
        )}
      >
        {value}
      </div>
      {description && <p className={cn("mt-2 text-xs", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>{description}</p>}
    </div>
  );
}
