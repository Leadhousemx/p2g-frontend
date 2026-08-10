import { cn } from "../../../lib/utils";

export default function FormPageShell({
  title,
  description,
  actions,
  children,
  className,
}) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl space-y-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {title ? <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1> : null}
          {description ? <p className="max-w-3xl text-sm text-[#64748B] sm:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
      </div>

      {children}
    </div>
  );
}