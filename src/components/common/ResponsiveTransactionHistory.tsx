import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import MobileEntityCard from "./MobileEntityCard";
import ResponsiveDataList from "./ResponsiveDataList";
import { formatDateOnly } from "../../utils/dateOnly";

export type TransactionHistoryTone = "neutral" | "success" | "warning" | "danger" | "info";
export type TransactionHistoryMobileBreakpoint = "md" | "lg";
export type TransactionHistoryVariant = "default" | "compact";

export interface TransactionHistoryBadge {
  label: string;
  tone?: TransactionHistoryTone;
}

export interface TransactionHistoryMetaItem {
  label: string;
  value: ReactNode;
}

export interface TransactionHistoryItem {
  id: string;
  date: string | Date;
  title?: string;
  concept?: string;
  amount: number;
  status?: TransactionHistoryBadge;
  paymentMethod?: string;
  reference?: string;
  origin?: string;
  notes?: string;
  meta?: TransactionHistoryMetaItem[];
}

export interface TransactionHistoryColumn {
  key: string;
  header: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface TransactionHistoryPagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export interface ResponsiveTransactionHistoryProps {
  items: TransactionHistoryItem[];
  loading?: boolean;
  errorMessage?: string | null;
  title?: string;
  description?: string;
  emptyMessage?: string;
  mobileBreakpoint?: TransactionHistoryMobileBreakpoint;
  variant?: TransactionHistoryVariant;
  showHeader?: boolean;
  columns?: TransactionHistoryColumn[];
  pagination?: TransactionHistoryPagination | null;
  renderDesktopCell?: (item: TransactionHistoryItem, column: TransactionHistoryColumn) => ReactNode;
  renderMobileTitle?: (item: TransactionHistoryItem) => ReactNode;
  renderMobileMeta?: (item: TransactionHistoryItem) => ReactNode;
  renderActions?: (item: TransactionHistoryItem) => ReactNode;
  formatAmount?: (amount: number, item: TransactionHistoryItem) => ReactNode;
  formatDate?: (date: TransactionHistoryItem["date"], item: TransactionHistoryItem) => ReactNode;
  mobileListClassName?: string;
  desktopClassName?: string;
  className?: string;
}

export const DEFAULT_TRANSACTION_HISTORY_EMPTY_MESSAGE = "No hay movimientos para mostrar";
export const DEFAULT_TRANSACTION_HISTORY_MOBILE_BREAKPOINT: TransactionHistoryMobileBreakpoint = "md";

const toneClasses: Record<TransactionHistoryTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

function StateContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

function formatFallbackDate(value: TransactionHistoryItem["date"]) {
  if (typeof value === "string") {
    return formatDateOnly(value, "es-MX", { day: "numeric", month: "short", year: "numeric" });
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "-";
  return value.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function formatFallbackAmount(value: number) {
  return Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

function renderBadge(badge?: TransactionHistoryBadge) {
  if (!badge?.label) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[badge.tone || "neutral"]
      )}
    >
      {badge.label}
    </span>
  );
}

function defaultColumns(): TransactionHistoryColumn[] {
  return [
    { key: "date", header: "Fecha" },
    { key: "concept", header: "Concepto" },
    { key: "amount", header: "Monto", align: "right" },
    { key: "paymentMethod", header: "Método" },
    { key: "reference", header: "Referencia" },
    { key: "status", header: "Estatus", align: "center" },
    { key: "actions", header: "Acciones", align: "right" },
  ];
}

function columnAlignmentClass(align?: TransactionHistoryColumn["align"]) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function resolveDesktopCellContent({
  item,
  column,
  renderActions,
  amountFormatter,
  dateFormatter,
}: {
  item: TransactionHistoryItem;
  column: TransactionHistoryColumn;
  renderActions?: (item: TransactionHistoryItem) => ReactNode;
  amountFormatter: (amount: number, item: TransactionHistoryItem) => ReactNode;
  dateFormatter: (date: TransactionHistoryItem["date"], item: TransactionHistoryItem) => ReactNode;
}) {
  if (column.key === "date") {
    return <span className="whitespace-nowrap font-medium text-[#111827]">{dateFormatter(item.date, item)}</span>;
  }

  if (column.key === "title") {
    return item.title || item.concept || "-";
  }

  if (column.key === "concept") {
    return (
      <div className="min-w-0">
        <div className="font-medium text-[#111827]">{item.concept || item.title || "-"}</div>
        {item.origin ? <div className="mt-0.5 text-xs text-[#64748B]">{item.origin}</div> : null}
      </div>
    );
  }

  if (column.key === "amount") {
    return <span className="whitespace-nowrap font-semibold text-[#111827]">{amountFormatter(item.amount, item)}</span>;
  }

  if (column.key === "paymentMethod") {
    return item.paymentMethod ? (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        {item.paymentMethod}
      </span>
    ) : (
      "-"
    );
  }

  if (column.key === "reference") {
    return item.reference ? <span className="break-words text-[#64748B]">{item.reference}</span> : "-";
  }

  if (column.key === "origin") {
    return item.origin || "-";
  }

  if (column.key === "notes") {
    return item.notes ? <span className="line-clamp-2 text-[#64748B]">{item.notes}</span> : "-";
  }

  if (column.key === "status") {
    return renderBadge(item.status) || "-";
  }

  if (column.key === "actions") {
    return renderActions ? renderActions(item) : null;
  }

  if (column.key === "meta") {
    return item.meta?.length ? (
      <div className="space-y-1">
        {item.meta.map((entry) => (
          <div key={entry.label} className="text-sm text-[#64748B]">
            <span className="font-medium text-[#111827]">{entry.label}:</span> {entry.value}
          </div>
        ))}
      </div>
    ) : (
      "-"
    );
  }

  return null;
}

export default function ResponsiveTransactionHistory({
  items,
  loading = false,
  errorMessage = null,
  title,
  description,
  emptyMessage = DEFAULT_TRANSACTION_HISTORY_EMPTY_MESSAGE,
  mobileBreakpoint = DEFAULT_TRANSACTION_HISTORY_MOBILE_BREAKPOINT,
  variant = "default",
  showHeader = true,
  columns,
  renderDesktopCell,
  renderMobileTitle,
  renderMobileMeta,
  renderActions,
  formatAmount,
  formatDate,
  mobileListClassName,
  desktopClassName,
  className,
}: ResponsiveTransactionHistoryProps) {
  const hasHeader = showHeader && (title || description);
  const isCompact = variant === "compact";
  const resolvedColumns = columns?.length
    ? columns
    : defaultColumns().filter((column) => column.key !== "actions" || Boolean(renderActions));
  const amountFormatter = formatAmount || ((amount: number) => formatFallbackAmount(amount));
  const dateFormatter = formatDate || ((date: TransactionHistoryItem["date"]) => formatFallbackDate(date));

  const renderDesktop = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {resolvedColumns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]",
                  columnAlignmentClass(column.align),
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
              {resolvedColumns.map((column) => {
                const content =
                  renderDesktopCell?.(item, column) ??
                  resolveDesktopCellContent({
                    item,
                    column,
                    renderActions,
                    amountFormatter,
                    dateFormatter,
                  });

                return (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-sm text-[#111827] align-top",
                      columnAlignmentClass(column.align),
                      column.className
                    )}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMobileItem = (item: TransactionHistoryItem) => (
    <MobileEntityCard
      title={renderMobileTitle ? renderMobileTitle(item) : item.title || item.concept || "Movimiento"}
      subtitle={dateFormatter(item.date, item)}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#111827]">{amountFormatter(item.amount, item)}</span>
          {item.paymentMethod ? (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {item.paymentMethod}
            </span>
          ) : null}
          {renderBadge(item.status)}
        </div>
      }
      actions={renderActions ? renderActions(item) : undefined}
      className={cn(isCompact && "p-3")}
    >
      {renderMobileMeta ? (
        renderMobileMeta(item)
      ) : (
        <dl className={cn("text-sm", isCompact ? "space-y-1.5" : "space-y-2.5")}>
          {item.paymentMethod ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Método</dt>
              <dd className="text-right text-[#111827]">{item.paymentMethod}</dd>
            </div>
          ) : null}
          {item.reference ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Referencia</dt>
              <dd className="text-right text-[#111827] break-words">{item.reference}</dd>
            </div>
          ) : null}
          {item.origin ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Origen</dt>
              <dd className="text-right text-[#111827]">{item.origin}</dd>
            </div>
          ) : null}
          {item.notes ? (
            <div className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Notas</dt>
              <dd className="rounded-2xl bg-slate-50 px-3 py-2 text-[#111827]">{item.notes}</dd>
            </div>
          ) : null}
          {item.meta?.length
            ? item.meta.map((entry) => (
                <div key={entry.label} className="flex items-start justify-between gap-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{entry.label}</dt>
                  <dd className="text-right text-[#111827]">{entry.value}</dd>
                </div>
              ))
            : null}
        </dl>
      )}
    </MobileEntityCard>
  );

  const loadingView = (
    <StateContainer className="p-4 sm:p-5">
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-16 w-full animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {resolvedColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]",
                    columnAlignmentClass(column.align),
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-b border-slate-100 last:border-b-0">
                <td colSpan={resolvedColumns.length} className="px-4 py-4">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StateContainer>
  );

  const emptyView = (
    <StateContainer className="p-5 text-center sm:p-6">
      <p className="text-sm text-[#64748B]">{emptyMessage}</p>
    </StateContainer>
  );

  return (
    <section className={cn("space-y-4", className)}>
      {hasHeader ? (
        <div>
          {title ? <h2 className="text-lg font-semibold text-[#111827]">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm text-[#64748B]">{description}</p> : null}
        </div>
      ) : null}

      {errorMessage ? (
        <StateContainer className="p-5 sm:p-6">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </StateContainer>
      ) : (
        <ResponsiveDataList
          items={items}
          loading={loading}
          getItemKey={(item: TransactionHistoryItem) => item.id}
          renderDesktop={renderDesktop}
          renderMobileItem={renderMobileItem}
          mobileBreakpoint={mobileBreakpoint}
          emptyMessage={emptyMessage}
          loadingView={loadingView}
          emptyView={emptyView}
          mobileListClassName={cn(isCompact && "space-y-3", mobileListClassName)}
          desktopClassName={desktopClassName}
        />
      )}
    </section>
  );
}