interface Props {
  title: string;
  value?: string | number | null;
  subtitle?: string;
}

export default function ReportKpiCard({ title, value, subtitle }: Props) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">{title}</p>
      <p className="text-2xl font-bold leading-tight text-[#111827] sm:text-[1.75rem]">{value ?? "-"}</p>
      {subtitle ? <p className="mt-2 text-xs text-[#64748B] sm:text-sm">{subtitle}</p> : <div className="mt-2 h-5" aria-hidden="true" />}
    </div>
  );
}
