import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type FinancialSummaryTone = "neutral" | "success" | "warning" | "danger" | "info";
export type FinancialSummaryVariant = "sidebar" | "inline" | "stacked";
export type FinancialSummaryDensity = "default" | "compact";
export type FinancialSummaryValueImportance = "primary" | "secondary" | "default";

export interface FinancialSummaryStatus {
  label: string;
  tone?: FinancialSummaryTone;
}

export interface FinancialSummaryKpi {
  key: string;
  label: ReactNode;
  value: ReactNode;
  helperText?: ReactNode;
  tone?: FinancialSummaryTone;
  importance?: FinancialSummaryValueImportance;
}

export interface FinancialSummaryLine {
  key: string;
  label: ReactNode;
  value: ReactNode;
  helperText?: ReactNode;
  tone?: FinancialSummaryTone;
  importance?: FinancialSummaryValueImportance;
}

export interface FinancialSummaryAlert {
  key: string;
  message: ReactNode;
  tone?: FinancialSummaryTone;
  title?: ReactNode;
}

export interface FinancialSummaryAction {
  key: string;
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface ResponsiveFinancialSummaryProps {
  title?: ReactNode;
  description?: ReactNode;
  primaryValue?: ReactNode;
  primaryLabel?: ReactNode;
  status?: FinancialSummaryStatus;
  kpis?: FinancialSummaryKpi[];
  lines?: FinancialSummaryLine[];
  alerts?: FinancialSummaryAlert[];
  actions?: FinancialSummaryAction[];
  loading?: boolean;
  variant?: FinancialSummaryVariant;
  density?: FinancialSummaryDensity;
  showHeader?: boolean;
  showDividers?: boolean;
  emptyValueFallback?: ReactNode;
  className?: string;
}

export const DEFAULT_FINANCIAL_SUMMARY_VARIANT: FinancialSummaryVariant = "sidebar";
export const DEFAULT_FINANCIAL_SUMMARY_DENSITY: FinancialSummaryDensity = "default";
export const DEFAULT_FINANCIAL_SUMMARY_EMPTY_VALUE = "-";

const toneClasses: Record<FinancialSummaryTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

function resolveValue(value: ReactNode | undefined, fallback: ReactNode) {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function importanceClass(importance?: FinancialSummaryValueImportance) {
  if (importance === "primary") return "text-lg font-bold text-[#111827]";
  if (importance === "secondary") return "text-sm font-semibold text-[#111827]";
  return "text-sm font-medium text-[#111827]";
}

function toneValueClass(tone?: FinancialSummaryTone) {
  if (tone === "success") return "text-green-700";
  if (tone === "warning") return "text-amber-700";
  if (tone === "danger") return "text-red-700";
  if (tone === "info") return "text-blue-700";
  return "text-[#111827]";
}

function toneSurfaceClass(tone?: FinancialSummaryTone) {
  if (!tone) return "border-slate-200 bg-white";
  return toneClasses[tone];
}

function variantClass(variant: FinancialSummaryVariant) {
  if (variant === "inline") return "rounded-xl";
  if (variant === "stacked") return "rounded-2xl";
  return "rounded-2xl";
}

function mobilePrimaryClass(variant: FinancialSummaryVariant, density: FinancialSummaryDensity) {
  if (variant === "inline") {
    return density === "compact" ? "text-xl" : "text-2xl";
  }

  if (variant === "stacked") {
    return density === "compact" ? "text-2xl" : "text-3xl";
  }

  return density === "compact" ? "text-2xl" : "text-3xl";
}

function densityClasses(density: FinancialSummaryDensity) {
  return density === "compact"
    ? {
        container: "p-4",
        sectionGap: "space-y-4",
        kpiGap: "gap-3",
        primaryValue: "text-2xl",
      }
    : {
        container: "p-5 sm:p-6",
        sectionGap: "space-y-5",
        kpiGap: "gap-4",
        primaryValue: "text-3xl",
      };
}

function SummaryStateContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

function SummaryBadge({ status }: { status: FinancialSummaryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[status.tone || "neutral"]
      )}
    >
      {status.label}
    </span>
  );
}

function SummaryAlert({ alert }: { alert: FinancialSummaryAlert }) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3", toneClasses[alert.tone || "info"])}>
      {alert.title ? <p className="text-sm font-semibold">{alert.title}</p> : null}
      <div className={cn(alert.title ? "mt-1 text-sm" : "text-sm font-medium")}>{alert.message}</div>
    </div>
  );
}

function SummaryLoadingView({ density, variant }: { density: FinancialSummaryDensity; variant: FinancialSummaryVariant }) {
  const resolvedDensity = densityClasses(density);

  return (
    <SummaryStateContainer className={cn(variantClass(variant), resolvedDensity.container)}>
      <div className={resolvedDensity.sectionGap}>
        <div className="space-y-2">
          <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-2/3 animate-pulse rounded bg-slate-200" />
        </div>

        <div className={cn("grid grid-cols-1 sm:grid-cols-2", resolvedDensity.kpiGap)}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 p-4">
              <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </SummaryStateContainer>
  );
}

function SummaryKpiCard({ item, emptyValueFallback }: { item: FinancialSummaryKpi; emptyValueFallback: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border p-4", toneSurfaceClass(item.tone))}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{item.label}</p>
      <p className={cn("mt-2", importanceClass(item.importance), toneValueClass(item.tone))}>
        {resolveValue(item.value, emptyValueFallback)}
      </p>
      {item.helperText ? <p className="mt-1 text-xs text-[#64748B]">{item.helperText}</p> : null}
    </div>
  );
}

function SummaryLineItem({
  item,
  emptyValueFallback,
  showDivider,
}: {
  item: FinancialSummaryLine;
  emptyValueFallback: ReactNode;
  showDivider: boolean;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", showDivider && "border-t border-slate-100 pt-3")}>
      <div className="min-w-0">
        <p className="text-sm text-[#64748B]">{item.label}</p>
        {item.helperText ? <p className="mt-1 text-xs text-[#94A3B8]">{item.helperText}</p> : null}
      </div>
      <div className={cn("shrink-0 text-right", importanceClass(item.importance), toneValueClass(item.tone))}>
        {resolveValue(item.value, emptyValueFallback)}
      </div>
    </div>
  );
}

export default function ResponsiveFinancialSummary({
  title,
  description,
  primaryValue,
  primaryLabel,
  status,
  kpis,
  lines,
  alerts,
  actions,
  loading = false,
  variant = DEFAULT_FINANCIAL_SUMMARY_VARIANT,
  density = DEFAULT_FINANCIAL_SUMMARY_DENSITY,
  showHeader = true,
  showDividers = true,
  emptyValueFallback = DEFAULT_FINANCIAL_SUMMARY_EMPTY_VALUE,
  className,
}: ResponsiveFinancialSummaryProps) {
  const resolvedDensity = densityClasses(density);
  const visibleKpis = kpis?.filter(Boolean) || [];
  const visibleLines = lines?.filter(Boolean) || [];
  const visibleAlerts = alerts?.filter(Boolean) || [];
  const visibleActions = actions?.filter(Boolean) || [];
  const hasHeader = showHeader && (title || description || status);
  const hasPrimary = primaryValue !== undefined || primaryLabel !== undefined;
  const isInline = variant === "inline";
  const isStacked = variant === "stacked";
  const useMobileStack = isInline || isStacked;

  if (loading) {
    return <SummaryLoadingView density={density} variant={variant} />;
  }

  return (
    <SummaryStateContainer className={cn(variantClass(variant), resolvedDensity.container, className)}>
      <div className={resolvedDensity.sectionGap}>
        {hasHeader ? (
          <div className={cn("flex flex-col gap-3", !useMobileStack && "sm:flex-row sm:items-start sm:justify-between")}>
            <div className="min-w-0">
              {title ? <h2 className="text-lg font-semibold text-[#111827]">{title}</h2> : null}
              {description ? <p className="mt-1 text-sm text-[#64748B]">{description}</p> : null}
            </div>
            {status ? <SummaryBadge status={status} /> : null}
          </div>
        ) : null}

        {hasPrimary ? (
          <div className={cn("rounded-2xl border border-slate-200 bg-slate-50", isInline ? "p-4" : "p-4 sm:p-5")}>
            {primaryLabel ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{primaryLabel}</p>
            ) : null}
            <div
              className={cn(
                "mt-2 font-bold text-[#111827]",
                resolvedDensity.primaryValue,
                useMobileStack && mobilePrimaryClass(variant, density)
              )}
            >
              {resolveValue(primaryValue, emptyValueFallback)}
            </div>
          </div>
        ) : null}

        {visibleKpis.length > 0 ? (
          <div
            className={cn(
              "grid grid-cols-1",
              !useMobileStack && "sm:grid-cols-2",
              isInline ? "lg:grid-cols-2 xl:grid-cols-4" : !isStacked && "lg:grid-cols-2",
              resolvedDensity.kpiGap
            )}
          >
            {visibleKpis.map((item) => (
              <SummaryKpiCard key={item.key} item={item} emptyValueFallback={emptyValueFallback} />
            ))}
          </div>
        ) : null}

        {visibleLines.length > 0 ? (
          <div className={cn("rounded-2xl border border-slate-200 bg-white", isInline ? "p-4" : "p-4 sm:p-5")}>
            <div className="space-y-3">
              {visibleLines.map((item, index) => (
                <SummaryLineItem
                  key={item.key}
                  item={item}
                  emptyValueFallback={emptyValueFallback}
                  showDivider={showDividers && index > 0}
                />
              ))}
            </div>
          </div>
        ) : null}

        {visibleAlerts.length > 0 ? (
          <div className="space-y-3">
            {visibleAlerts.map((alert) => (
              <SummaryAlert key={alert.key} alert={alert} />
            ))}
          </div>
        ) : null}

        {visibleActions.length > 0 ? (
          <div className={cn("flex gap-3", useMobileStack ? "flex-col sm:flex-row" : "flex-wrap")}>
            {visibleActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  "inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
                  useMobileStack && "w-full sm:w-auto",
                  action.className
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </SummaryStateContainer>
  );
}