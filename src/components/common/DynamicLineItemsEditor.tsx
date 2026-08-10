import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import MobileEntityCard from "./MobileEntityCard";
import FieldGrid from "./forms/FieldGrid";

export type DynamicLineItemsEditorVariant = "default" | "compact";
export type DynamicLineItemsEditorMobileBreakpoint = "md" | "lg";
export type DynamicLineItemFieldType = "text" | "number" | "currency" | "select" | "readonly" | "custom";
export type DynamicLineItemActionTone = "default" | "danger" | "neutral";
export type DynamicLineItemAlign = "left" | "center" | "right";

export interface DynamicLineItemMeta {
  key: string;
  label: ReactNode;
  value: ReactNode;
}

export interface DynamicLineItemSummary {
  label?: ReactNode;
  value: ReactNode;
  helperText?: ReactNode;
}

export interface DynamicLineItemRecord {
  id?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  summary?: DynamicLineItemSummary;
  meta?: DynamicLineItemMeta[];
  raw?: unknown;
}

export interface DynamicLineItemFieldRenderContext<TItem extends DynamicLineItemRecord> {
  item: TItem;
  index: number;
  isMobile: boolean;
  isDesktop: boolean;
  disabled: boolean;
  readOnly: boolean;
  error?: ReactNode;
}

export interface DynamicLineItemField<TItem extends DynamicLineItemRecord> {
  key: string;
  label: ReactNode;
  type?: DynamicLineItemFieldType;
  required?: boolean;
  desktopWidth?: string;
  desktopAlign?: DynamicLineItemAlign;
  desktopHeaderAlign?: DynamicLineItemAlign;
  mobilePriority?: number;
  mobileGridSpan?: 1 | 2;
  hideOnMobile?: boolean;
  renderField?: (context: DynamicLineItemFieldRenderContext<TItem>) => ReactNode;
  renderValue?: (context: DynamicLineItemFieldRenderContext<TItem>) => ReactNode;
  getError?: (item: TItem, index: number) => ReactNode;
}

export interface DynamicLineItemAction<TItem extends DynamicLineItemRecord> {
  key: string;
  label: ReactNode;
  tone?: DynamicLineItemActionTone;
  disabled?: boolean;
  onClick?: (item: TItem, index: number) => void;
}

export interface DynamicLineItemsEditorEmptyState {
  title?: ReactNode;
  description?: ReactNode;
  actionLabel?: ReactNode;
}

export interface DynamicLineItemsEditorAddAction {
  label: ReactNode;
  disabled?: boolean;
}

export interface DynamicLineItemsEditorProps<TItem extends DynamicLineItemRecord> {
  items: TItem[];
  getItemKey: (item: TItem, index: number) => string;
  fields: Array<DynamicLineItemField<TItem>>;
  title?: ReactNode;
  description?: ReactNode;
  showHeader?: boolean;
  summaryColumnLabel?: ReactNode;
  actionsColumnLabel?: ReactNode;
  summaryColumnWidth?: string;
  actionsColumnWidth?: string;
  errorMessage?: ReactNode;
  emptyState?: DynamicLineItemsEditorEmptyState;
  addAction?: DynamicLineItemsEditorAddAction;
  actions?: Array<DynamicLineItemAction<TItem>>;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  mobileBreakpoint?: DynamicLineItemsEditorMobileBreakpoint;
  variant?: DynamicLineItemsEditorVariant;
  className?: string;
  onAddItem?: () => void;
  onRemoveItem?: (index: number) => void;
  onDuplicateItem?: (index: number) => void;
  showDuplicateAction?: boolean;
  removeActionLabel?: ReactNode;
  duplicateActionLabel?: ReactNode;
  onItemAction?: (actionKey: string, item: TItem, index: number) => void;
  renderErrorMessage?: () => ReactNode;
  renderItemHeader?: (item: TItem, index: number) => ReactNode;
  renderItemError?: (item: TItem, index: number) => ReactNode;
  renderItemSummary?: (item: TItem, index: number) => ReactNode;
  renderItemActions?: (item: TItem, index: number) => ReactNode;
  renderEmptyState?: () => ReactNode;
}

export const DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_VARIANT: DynamicLineItemsEditorVariant = "default";
export const DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_BREAKPOINT: DynamicLineItemsEditorMobileBreakpoint = "md";
export const DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_EMPTY_TITLE = "No hay líneas para mostrar";
export const DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_EMPTY_DESCRIPTION = "Agrega una línea para comenzar.";
export const DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_ADD_LABEL = "Agregar línea";
export const DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_REMOVE_LABEL = "Eliminar";
export const DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_DUPLICATE_LABEL = "Duplicar";

const breakpointVisibility = {
  md: {
    mobile: "md:hidden",
    desktop: "hidden md:block",
  },
  lg: {
    mobile: "lg:hidden",
    desktop: "hidden lg:block",
  },
};

const breakpointQueries: Record<DynamicLineItemsEditorMobileBreakpoint, string> = {
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
};

function useDesktopLayout(breakpoint: DynamicLineItemsEditorMobileBreakpoint) {
  const getMatch = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return true;
    }

    return window.matchMedia(breakpointQueries[breakpoint] || breakpointQueries.md).matches;
  };

  const [isDesktop, setIsDesktop] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(breakpointQueries[breakpoint] || breakpointQueries.md);
    const update = (event?: MediaQueryListEvent) => {
      setIsDesktop(event ? event.matches : mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [breakpoint]);

  return isDesktop;
}

function StateContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

function LoadingView({ variant }: { variant: DynamicLineItemsEditorVariant }) {
  return (
    <StateContainer className={cn(variant === "compact" ? "p-4" : "p-5 sm:p-6")}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 p-4">
            <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="h-10 animate-pulse rounded bg-slate-200" />
              <div className="h-10 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </StateContainer>
  );
}

function actionToneClass(tone?: DynamicLineItemActionTone) {
  if (tone === "danger") return "border-red-200 text-red-700 hover:bg-red-50";
  if (tone === "neutral") return "border-slate-200 text-slate-700 hover:bg-slate-50";
  return "border-blue-200 text-blue-700 hover:bg-blue-50";
}

function resolveEmptyStateLabel(emptyState?: DynamicLineItemsEditorEmptyState) {
  return emptyState?.actionLabel || DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_ADD_LABEL;
}

function sortFieldsForMobile<TItem extends DynamicLineItemRecord>(fields: Array<DynamicLineItemField<TItem>>) {
  return [...fields].sort((left, right) => (left.mobilePriority || 0) - (right.mobilePriority || 0));
}

function resolveDesktopTemplateColumns<TItem extends DynamicLineItemRecord>(
  fields: Array<DynamicLineItemField<TItem>>,
  hasSummaryColumn: boolean,
  hasActionsColumn: boolean,
  summaryColumnWidth?: string,
  actionsColumnWidth?: string
) {
  const baseColumns = fields.map((field, index) => {
    if (field.desktopWidth) {
      return field.desktopWidth;
    }

    if (index === 0) {
      return "minmax(0, 2.2fr)";
    }

    if (field.type === "number" || field.type === "currency") {
      return "minmax(0, 0.95fr)";
    }

    if (field.type === "readonly") {
      return "minmax(0, 1fr)";
    }

    return "minmax(0, 1.15fr)";
  });

  if (hasSummaryColumn) {
    baseColumns.push(summaryColumnWidth || "minmax(0, 1fr)");
  }

  if (hasActionsColumn) {
    baseColumns.push(actionsColumnWidth || "minmax(6.75rem, 0.9fr)");
  }

  return baseColumns.join(" ");
}

function resolveDesktopAlignmentClass(align?: DynamicLineItemAlign) {
  if (align === "center") return "text-center items-center";
  if (align === "right") return "text-right items-end";
  return "text-left items-start";
}

function resolveMobileFieldSpanClass<TItem extends DynamicLineItemRecord>(field: DynamicLineItemField<TItem>, totalFields: number) {
  if (field.mobileGridSpan === 2) {
    return "sm:col-span-2";
  }

  if (totalFields <= 2) {
    return "sm:col-span-1";
  }

  if (field.type === "text" || field.type === "select" || field.type === "custom") {
    return "sm:col-span-2";
  }

  return "sm:col-span-1";
}

function resolveFieldContent<TItem extends DynamicLineItemRecord>(
  field: DynamicLineItemField<TItem>,
  context: DynamicLineItemFieldRenderContext<TItem>
) {
  if (field.renderField) {
    return field.renderField(context);
  }

  if (field.renderValue) {
    return field.renderValue(context);
  }

  return null;
}

function resolveFieldError<TItem extends DynamicLineItemRecord>(
  field: DynamicLineItemField<TItem>,
  item: TItem,
  index: number
) {
  return field.getError?.(item, index) || null;
}

function resolveIntrinsicActions<TItem extends DynamicLineItemRecord>({
  actions,
  onRemoveItem,
  onDuplicateItem,
  removeActionLabel,
  duplicateActionLabel,
  showDuplicateAction,
}: {
  actions?: Array<DynamicLineItemAction<TItem>>;
  onRemoveItem?: (index: number) => void;
  onDuplicateItem?: (index: number) => void;
  removeActionLabel?: ReactNode;
  duplicateActionLabel?: ReactNode;
  showDuplicateAction?: boolean;
}) {
  const resolvedActions = [...(actions?.filter(Boolean) || [])];

  if (showDuplicateAction && onDuplicateItem) {
    resolvedActions.push({
      key: "duplicate",
      label: duplicateActionLabel || DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_DUPLICATE_LABEL,
      tone: "neutral",
      onClick: (_, index) => onDuplicateItem(index),
    });
  }

  if (onRemoveItem) {
    resolvedActions.push({
      key: "remove",
      label: removeActionLabel || DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_REMOVE_LABEL,
      tone: "danger",
      onClick: (_, index) => onRemoveItem(index),
    });
  }

  return resolvedActions;
}

function FieldErrorMessage({ error, align }: { error?: ReactNode; align?: DynamicLineItemAlign }) {
  if (!error) return null;

  return (
    <p
      className={cn(
        "text-xs font-medium text-red-600",
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      )}
    >
      {error}
    </p>
  );
}

function ArrayErrorMessage({ error }: { error?: ReactNode }) {
  if (!error) return null;

  return <p className="text-sm font-medium text-red-600">{error}</p>;
}

function AddItemButton({
  label,
  onClick,
  disabled,
  className,
}: {
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  if (!onClick) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {label}
    </button>
  );
}

function ItemActionButtons<TItem extends DynamicLineItemRecord>({
  actions,
  item,
  index,
  disabled,
  readOnly,
  onItemAction,
  className,
}: {
  actions: Array<DynamicLineItemAction<TItem>>;
  item: TItem;
  index: number;
  disabled: boolean;
  readOnly: boolean;
  onItemAction?: (actionKey: string, item: TItem, index: number) => void;
  className?: string;
}) {
  if (!actions.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled={disabled || readOnly || action.disabled}
          onClick={() => {
            action.onClick?.(item, index);
            onItemAction?.(action.key, item, index);
          }}
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
            actionToneClass(action.tone)
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function EmptyView({
  title,
  description,
  emptyState,
  canAddItem,
  disabled,
  addAction,
  onAddItem,
}: {
  title?: ReactNode;
  description?: ReactNode;
  emptyState?: DynamicLineItemsEditorEmptyState;
  canAddItem: boolean;
  disabled: boolean;
  addAction?: DynamicLineItemsEditorAddAction;
  onAddItem?: () => void;
}) {
  return (
    <div className="space-y-4 text-center">
      {(title || description) ? (
        <div>
          {title ? <h2 className="text-lg font-semibold text-[#111827]">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm text-[#64748B]">{description}</p> : null}
        </div>
      ) : null}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8">
        <p className="text-base font-semibold text-[#111827]">
          {emptyState?.title || DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_EMPTY_TITLE}
        </p>
        <p className="mt-2 text-sm text-[#64748B]">
          {emptyState?.description || DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_EMPTY_DESCRIPTION}
        </p>
        {canAddItem ? (
          <AddItemButton
            onClick={onAddItem}
            disabled={disabled || addAction?.disabled}
            label={resolveEmptyStateLabel(emptyState)}
            className="mt-4"
          />
        ) : null}
      </div>
    </div>
  );
}

function DesktopList<TItem extends DynamicLineItemRecord>({
  items,
  fields,
  actions,
  getItemKey,
  disabled,
  readOnly,
  summaryColumnLabel,
  actionsColumnLabel,
  summaryColumnWidth,
  actionsColumnWidth,
  onItemAction,
  renderItemHeader,
  renderItemError,
  renderItemSummary,
  renderItemActions,
}: {
  items: TItem[];
  fields: Array<DynamicLineItemField<TItem>>;
  actions: Array<DynamicLineItemAction<TItem>>;
  getItemKey: (item: TItem, index: number) => string;
  disabled: boolean;
  readOnly: boolean;
  summaryColumnLabel?: ReactNode;
  actionsColumnLabel?: ReactNode;
  summaryColumnWidth?: string;
  actionsColumnWidth?: string;
  onItemAction?: (actionKey: string, item: TItem, index: number) => void;
  renderItemHeader?: (item: TItem, index: number) => ReactNode;
  renderItemError?: (item: TItem, index: number) => ReactNode;
  renderItemSummary?: (item: TItem, index: number) => ReactNode;
  renderItemActions?: (item: TItem, index: number) => ReactNode;
}) {
  const hasSummaryColumn = items.some((item) => Boolean(item.summary));
  const hasActionsColumn = actions.length > 0;
  const gridTemplateColumns = resolveDesktopTemplateColumns(
    fields,
    hasSummaryColumn,
    hasActionsColumn,
    summaryColumnWidth,
    actionsColumnWidth
  );

  return (
    <div className="rounded-2xl border border-slate-200 overflow-visible bg-white">
      <div
        className="grid gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3"
        style={{ gridTemplateColumns }}
      >
        {fields.map((field) => (
          <div
            key={field.key}
            className={cn(
              "text-xs font-semibold uppercase tracking-wide text-[#64748B]",
              field.desktopHeaderAlign ? resolveDesktopAlignmentClass(field.desktopHeaderAlign).split(" ")[0] : resolveDesktopAlignmentClass(field.desktopAlign).split(" ")[0]
            )}
          >
            {field.label}
          </div>
        ))}
        {hasSummaryColumn ? (
          <div className="text-right text-xs font-semibold uppercase tracking-wide text-[#64748B]">
            {summaryColumnLabel || "Resumen"}
          </div>
        ) : null}
        {hasActionsColumn ? (
          <div className="text-right text-xs font-semibold uppercase tracking-wide text-[#64748B]">
            {actionsColumnLabel || "Acciones"}
          </div>
        ) : null}
      </div>
      <div className="divide-y divide-slate-200">
        {items.map((item, index) => (
          <div key={getItemKey(item, index)} className="relative px-4 py-4 transition-colors hover:bg-slate-50/70 focus-within:z-20">
            {renderItemHeader ? <div className="mb-3">{renderItemHeader(item, index)}</div> : null}
            <div className="grid items-start gap-4" style={{ gridTemplateColumns }}>
              {fields.map((field) => {
                const fieldError = resolveFieldError(field, item, index);
                const context: DynamicLineItemFieldRenderContext<TItem> = {
                  item,
                  index,
                  isMobile: false,
                  isDesktop: true,
                  disabled,
                  readOnly,
                  error: fieldError,
                };

                return (
                  <div
                    key={field.key}
                    className={cn("flex min-w-0 flex-col justify-center gap-1", resolveDesktopAlignmentClass(field.desktopAlign))}
                  >
                    {resolveFieldContent(field, context)}
                    <FieldErrorMessage error={fieldError} align={field.desktopAlign} />
                  </div>
                );
              })}
              {hasSummaryColumn ? (
                <div className="flex min-w-0 flex-col justify-center text-right">
                  {item.summary ? (
                    <>
                      {item.summary.label ? (
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{item.summary.label}</p>
                      ) : null}
                      <div className="text-sm font-semibold leading-tight text-[#111827]">{item.summary.value}</div>
                      {item.summary.helperText ? <p className="mt-1 text-xs leading-tight text-[#64748B]">{item.summary.helperText}</p> : null}
                    </>
                  ) : (
                    <span className="text-sm text-[#94A3B8]">-</span>
                  )}
                </div>
              ) : null}
              {hasActionsColumn ? (
                <div className="flex min-w-0 items-start justify-end">
                  <ItemActionButtons
                    actions={actions}
                    item={item}
                    index={index}
                    disabled={disabled}
                    readOnly={readOnly}
                    onItemAction={onItemAction}
                    className="w-full justify-end"
                  />
                </div>
              ) : null}
            </div>
            {renderItemError ? <div className="mt-3">{renderItemError(item, index)}</div> : null}
            {renderItemSummary ? <div className="mt-3">{renderItemSummary(item, index)}</div> : null}
            {renderItemActions ? <div className="mt-3">{renderItemActions(item, index)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileList<TItem extends DynamicLineItemRecord>({
  items,
  fields,
  actions,
  getItemKey,
  disabled,
  readOnly,
  onItemAction,
  renderItemHeader,
  renderItemError,
  renderItemSummary,
  renderItemActions,
}: {
  items: TItem[];
  fields: Array<DynamicLineItemField<TItem>>;
  actions: Array<DynamicLineItemAction<TItem>>;
  getItemKey: (item: TItem, index: number) => string;
  disabled: boolean;
  readOnly: boolean;
  onItemAction?: (actionKey: string, item: TItem, index: number) => void;
  renderItemHeader?: (item: TItem, index: number) => ReactNode;
  renderItemError?: (item: TItem, index: number) => ReactNode;
  renderItemSummary?: (item: TItem, index: number) => ReactNode;
  renderItemActions?: (item: TItem, index: number) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <MobileEntityCard
          key={getItemKey(item, index)}
          title={item.title || `Línea ${index + 1}`}
          subtitle={item.subtitle}
          meta={
            item.meta?.length ? (
              <div className="flex flex-wrap gap-2">
                {item.meta.map((metaItem) => (
                  <div key={metaItem.key} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-[#475569]">
                    <span className="font-semibold">{metaItem.label}:</span> {metaItem.value}
                  </div>
                ))}
              </div>
            ) : null
          }
        >
          {renderItemHeader ? <div className="mb-4">{renderItemHeader(item, index)}</div> : null}
          {item.summary ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {item.summary.label ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{item.summary.label}</p>
                  ) : null}
                  {item.summary.helperText ? <p className="mt-1 text-xs text-[#64748B]">{item.summary.helperText}</p> : null}
                </div>
                <div className="shrink-0 text-right text-base font-semibold text-[#111827]">{item.summary.value}</div>
              </div>
            </div>
          ) : null}
          <FieldGrid columns={2} className="gap-3 sm:gap-4 md:grid-cols-2">
            {fields.map((field) => {
              const fieldError = resolveFieldError(field, item, index);
              const context: DynamicLineItemFieldRenderContext<TItem> = {
                item,
                index,
                isMobile: true,
                isDesktop: false,
                disabled,
                readOnly,
                error: fieldError,
              };

              return (
                <div key={field.key} className={cn("space-y-1.5", resolveMobileFieldSpanClass(field, fields.length))}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{field.label}</div>
                  <div className="min-w-0">{resolveFieldContent(field, context)}</div>
                  <FieldErrorMessage error={fieldError} />
                </div>
              );
            })}
          </FieldGrid>
          {renderItemError ? <div className="mt-4">{renderItemError(item, index)}</div> : null}
          {renderItemSummary ? <div className="mt-4 border-t border-slate-100 pt-4">{renderItemSummary(item, index)}</div> : null}
          {renderItemActions ? <div className="mt-4">{renderItemActions(item, index)}</div> : null}
          {actions.length ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <ItemActionButtons
                actions={actions}
                item={item}
                index={index}
                disabled={disabled}
                readOnly={readOnly}
                onItemAction={onItemAction}
              />
            </div>
          ) : null}
        </MobileEntityCard>
      ))}
    </div>
  );
}

export default function DynamicLineItemsEditor<TItem extends DynamicLineItemRecord>({
  items,
  getItemKey,
  fields,
  title,
  description,
  showHeader = true,
  summaryColumnLabel,
  actionsColumnLabel,
  summaryColumnWidth,
  actionsColumnWidth,
  emptyState,
  addAction,
  actions,
  errorMessage,
  loading = false,
  disabled = false,
  readOnly = false,
  mobileBreakpoint = DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_BREAKPOINT,
  variant = DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_VARIANT,
  className,
  onAddItem,
  onRemoveItem,
  onDuplicateItem,
  showDuplicateAction = false,
  removeActionLabel,
  duplicateActionLabel,
  onItemAction,
  renderErrorMessage,
  renderItemHeader,
  renderItemError,
  renderItemSummary,
  renderItemActions,
  renderEmptyState,
}: DynamicLineItemsEditorProps<TItem>) {
  const resolvedActions = resolveIntrinsicActions({
    actions,
    onRemoveItem,
    onDuplicateItem,
    removeActionLabel,
    duplicateActionLabel,
    showDuplicateAction,
  });
  const visibleFields = fields?.filter(Boolean) || [];
  const mobileFields = sortFieldsForMobile(visibleFields).filter((field) => !field.hideOnMobile);
  const hasHeader = Boolean(showHeader && (title || description));
  const isCompact = variant === "compact";
  const canAddItem = Boolean(onAddItem && !readOnly);
  const resolvedErrorMessage = renderErrorMessage ? renderErrorMessage() : errorMessage;
  const isDesktop = useDesktopLayout(mobileBreakpoint);

  if (loading) {
    return <LoadingView variant={variant} />;
  }

  if (!items.length) {
    if (renderEmptyState) {
      return <>{renderEmptyState()}</>;
    }

    return (
      <StateContainer className={cn(isCompact ? "p-4" : "p-5 sm:p-6", className)}>
        <div className="space-y-4">
          <EmptyView
            title={hasHeader ? title : undefined}
            description={hasHeader ? description : undefined}
            emptyState={emptyState}
            canAddItem={canAddItem}
            disabled={disabled}
            addAction={addAction}
            onAddItem={onAddItem}
          />
          <ArrayErrorMessage error={resolvedErrorMessage} />
        </div>
      </StateContainer>
    );
  }

  return (
    <StateContainer className={cn(isCompact ? "p-4" : "p-5 sm:p-6", className)}>
      <div className="space-y-4">
        {hasHeader ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {title ? <h2 className="text-lg font-semibold text-[#111827]">{title}</h2> : null}
              {description ? <p className="mt-1 text-sm text-[#64748B]">{description}</p> : null}
            </div>
            {canAddItem ? (
              <AddItemButton
                onClick={onAddItem}
                disabled={disabled || addAction?.disabled}
                label={addAction?.label || DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_ADD_LABEL}
              />
            ) : null}
          </div>
        ) : null}

        {isDesktop ? (
          <DesktopList
            items={items}
            fields={visibleFields}
            actions={resolvedActions}
            getItemKey={getItemKey}
            disabled={disabled}
            readOnly={readOnly}
            summaryColumnLabel={summaryColumnLabel}
            actionsColumnLabel={actionsColumnLabel}
            summaryColumnWidth={summaryColumnWidth}
            actionsColumnWidth={actionsColumnWidth}
            onItemAction={onItemAction}
            renderItemHeader={renderItemHeader}
            renderItemError={renderItemError}
            renderItemSummary={renderItemSummary}
            renderItemActions={renderItemActions}
          />
        ) : (
          <MobileList
            items={items}
            fields={mobileFields}
            actions={resolvedActions}
            getItemKey={getItemKey}
            disabled={disabled}
            readOnly={readOnly}
            onItemAction={onItemAction}
            renderItemHeader={renderItemHeader}
            renderItemError={renderItemError}
            renderItemSummary={renderItemSummary}
            renderItemActions={renderItemActions}
          />
        )}

        <ArrayErrorMessage error={resolvedErrorMessage} />

        {!hasHeader && canAddItem ? (
          <div className="flex justify-start pt-1">
            <AddItemButton
              onClick={onAddItem}
              disabled={disabled || addAction?.disabled}
              label={addAction?.label || DEFAULT_DYNAMIC_LINE_ITEMS_EDITOR_ADD_LABEL}
            />
          </div>
        ) : null}
      </div>
    </StateContainer>
  );
}