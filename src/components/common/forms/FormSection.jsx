import { cn } from "../../../lib/utils";

export default function FormSection({
  title,
  description,
  children,
  className,
  contentClassName,
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      {(title || description) ? (
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          {title ? <h2 className="text-base font-semibold text-[#111827] sm:text-lg">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm text-[#64748B]">{description}</p> : null}
        </div>
      ) : null}
      <div className={cn("px-5 py-5 sm:px-6 sm:py-6", contentClassName)}>{children}</div>
    </section>
  );
}