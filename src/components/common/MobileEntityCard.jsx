import { cn } from "../../lib/utils";

export default function MobileEntityCard({
  title,
  subtitle,
  meta,
  actions,
  children,
  className,
}) {
  return (
    <article className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-[#111827]">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p> : null}
          {meta ? <div className="mt-2">{meta}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {children ? <div className="mt-4 border-t border-slate-100 pt-4">{children}</div> : null}
    </article>
  );
}