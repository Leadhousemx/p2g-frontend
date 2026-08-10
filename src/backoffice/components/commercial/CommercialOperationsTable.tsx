import { Link } from 'react-router-dom';
import { ExternalLink, Info, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { CommercialOperationStatusBadge, AccessAllowedBadge } from './CommercialOperationStatusBadge';
import { fmtDate, fmtRelative } from '../../utils/formatBackofficeDate';
import type { CommercialOperationsCompanyItem } from '../../services/backofficeApi';

function formatDays(days: number | null | undefined): string {
  if (days == null) return '—';
  if (days < 0) return 'Vencido';
  if (days === 0) return 'Vence hoy';
  return `${days} día${days !== 1 ? 's' : ''}`;
}

function daysClass(days: number | null | undefined): string {
  if (days == null) return 'text-gray-400';
  if (days <= 0) return 'text-red-600 font-semibold';
  if (days <= 7) return 'text-amber-600 font-semibold';
  return 'text-gray-700';
}

interface Props {
  items: CommercialOperationsCompanyItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  onPage: (p: number) => void;
  onDetail: (item: CommercialOperationsCompanyItem) => void;
  loading: boolean;
}

export default function CommercialOperationsTable({ items, pagination, onPage, onDetail, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
        <p className="text-sm font-medium text-gray-400">Sin empresas para este filtro.</p>
        <p className="mt-1 text-xs text-gray-300">Prueba con otro estado o limpia la búsqueda.</p>
      </div>
    );
  }

  const HEADERS = ['Empresa', 'Estado comercial', 'Plan', 'Vencimiento', 'Gracia', 'Órdenes', 'Acciones'];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {HEADERS.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const empresaId = item.empresaId ?? (item as any)._id ?? (item as any).id ?? '';
              const needsAction = item.flags?.requiresOwnerAction === true;
              const pendingCount    = item.orders?.pendingCount ?? 0;
              const unappliedCount  = item.orders?.paidUnappliedCount ?? 0;
              const appliedCount    = item.orders?.appliedCount ?? 0;
              const noOrders = pendingCount === 0 && unappliedCount === 0 && appliedCount === 0;

              return (
                <tr
                  key={empresaId}
                  className={`border-b border-gray-50 last:border-0 transition-colors ${
                    needsAction
                      ? 'bg-amber-50/25 hover:bg-amber-50/50'
                      : 'hover:bg-gray-50/60'
                  }`}
                >
                  {/* Empresa */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1.5">
                      {needsAction && (
                        <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[200px] truncate font-semibold text-gray-900">
                          {item.nombre || '—'}
                        </p>
                        <p className="max-w-[200px] truncate text-xs text-gray-400">
                          {item.email || '—'}
                        </p>
                        {item.lastAccessAt && (
                          <p className="text-[10px] text-gray-300">{fmtRelative(item.lastAccessAt)}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Estado comercial */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <CommercialOperationStatusBadge status={item.effectiveCommercialStatus} />
                      <AccessAllowedBadge allowed={item.commercialAccessAllowed} />
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-mono text-xs text-gray-700">{item.currentPlanCode || '—'}</p>
                    {item.billingPreferredCurrency && (
                      <p className="text-[10px] text-gray-400">{item.billingPreferredCurrency}</p>
                    )}
                  </td>

                  {/* Vencimiento */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs text-gray-600">
                      {item.currentPeriodEnd ? fmtDate(item.currentPeriodEnd) : '—'}
                    </p>
                    <p className={`text-xs ${daysClass(item.commercialDaysRemaining)}`}>
                      {formatDays(item.commercialDaysRemaining)}
                    </p>
                  </td>

                  {/* Gracia */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs text-gray-600">
                      {item.paymentGraceEndDate ? fmtDate(item.paymentGraceEndDate) : '—'}
                    </p>
                    {item.commercialGraceDaysRemaining != null && (
                      <p className={`text-xs ${daysClass(item.commercialGraceDaysRemaining)}`}>
                        {formatDays(item.commercialGraceDaysRemaining)}
                      </p>
                    )}
                  </td>

                  {/* Órdenes */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-1">
                      {pendingCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          {pendingCount} pend.
                        </span>
                      )}
                      {unappliedCount > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {unappliedCount} sin aplic.
                        </span>
                      )}
                      {appliedCount > 0 && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                          {appliedCount} aplic.
                        </span>
                      )}
                      {noOrders && <span className="text-xs text-gray-300">—</span>}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/companies/${empresaId}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all"
                      >
                        <ExternalLink size={10} />
                        Empresa
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDetail({ ...item, empresaId })}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-all"
                      >
                        <Info size={10} />
                        Detalle
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-xs text-gray-400">
          Pág. {pagination.page} de {Math.max(1, pagination.totalPages)} · {pagination.total} empresa{pagination.total !== 1 ? 's' : ''}
        </p>
        {pagination.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPage(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
            >
              <ChevronLeft size={13} />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => onPage(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
            >
              Siguiente
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
