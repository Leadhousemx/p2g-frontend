import { Search } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all',           label: 'Todos' },
  { value: 'active',        label: 'Activas' },
  { value: 'due_soon',      label: 'Vencen pronto' },
  { value: 'due_soon_7',    label: 'Vencen ≤7 días' },
  { value: 'due_soon_15',   label: 'Vencen ≤15 días' },
  { value: 'due_soon_30',   label: 'Vencen ≤30 días' },
  { value: 'grace',         label: 'En gracia' },
  { value: 'grace_expiring', label: 'Gracia por vencer' },
  { value: 'expired',       label: 'Vencidas' },
  { value: 'suspended',     label: 'Suspendidas' },
  { value: 'no_plan',       label: 'Sin plan' },
  { value: 'trial',         label: 'Trial' },
  { value: 'legacy',        label: 'Legacy' },
  { value: 'pending_order', label: 'Orden pendiente' },
  { value: 'paid_unapplied', label: 'Pago sin aplicar' },
  { value: 'applied',       label: 'Pago aplicado' },
];

const SORT_OPTIONS = [
  { value: 'currentPeriodEnd_asc',  label: 'Vencimiento ↑' },
  { value: 'currentPeriodEnd_desc', label: 'Vencimiento ↓' },
  { value: 'graceEnd_asc',          label: 'Fin gracia ↑' },
  { value: 'lastPaymentAt_desc',    label: 'Último pago' },
  { value: 'lastAccessAt_desc',     label: 'Último acceso' },
  { value: 'createdAt_desc',        label: 'Más nuevas' },
  { value: 'name_asc',              label: 'Nombre A-Z' },
];

const PAGE_SIZES = [25, 50, 100];

interface Props {
  status: string;
  q: string;
  sort: string;
  pageSize: number;
  onStatus: (v: string) => void;
  onQ: (v: string) => void;
  onSort: (v: string) => void;
  onPageSize: (v: number) => void;
}

function selCls() {
  return 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all';
}

export default function CommercialOperationsFilters({
  status, q, sort, pageSize, onStatus, onQ, onSort, onPageSize,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1 max-w-xs">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          id="commercial-operations-search"
          name="commercialOperationsSearch"
          type="text"
          placeholder="Buscar empresa, email o contacto…"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all"
        />
      </div>

      <select id="commercial-operations-status" name="commercialOperationsStatus" value={status} onChange={(e) => onStatus(e.target.value)} className={selCls()}>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select id="commercial-operations-sort" name="commercialOperationsSort" value={sort} onChange={(e) => onSort(e.target.value)} className={selCls()}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select id="commercial-operations-page-size" name="commercialOperationsPageSize" value={String(pageSize)} onChange={(e) => onPageSize(Number(e.target.value))} className={selCls()}>
        {PAGE_SIZES.map((n) => (
          <option key={n} value={String(n)}>Ver {n}</option>
        ))}
      </select>
    </div>
  );
}
