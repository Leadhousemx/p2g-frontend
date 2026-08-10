import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import {
  getAdminCompanies,
  type AdminCompany,
  type AdminCompaniesParams,
  extractErrorMessage,
} from '../services/backofficeApi';
import { CompanyStatusBadge, CommercialStatusBadge, EffectiveStatusBadge, formatPlan } from '../components/StatusBadge';
import ActivityBadge from '../components/ActivityBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { fmtDate, fmtLastAccess } from '../utils/formatBackofficeDate';

const STATUS_OPTIONS = [
  { value: '',           label: 'Todos los estados' },
  { value: 'active',     label: 'Activas'           },
  { value: 'trial',      label: 'Trial'             },
  { value: 'suspended',  label: 'Suspendidas'       },
];

const PAGE_SIZE = 20;

function inputCls(base = '') {
  return `rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all ${base}`;
}

export default function BackOfficeCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('');
  const [page, setPage]           = useState(1);

  const load = useCallback(async (params: AdminCompaniesParams) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminCompanies(params);
      setCompanies(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(extractErrorMessage(err));
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ page, limit: PAGE_SIZE, search: search || undefined, status: status || undefined });
  }, [page, search, status, load]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatus = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
        <p className="mt-1 text-sm text-gray-400">
          {pagination.total > 0 ? `${pagination.total} empresas registradas` : 'Listado de empresas'}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC o correo..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className={`${inputCls('pl-9')} w-full`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => handleStatus(e.target.value)}
          className={inputCls()}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading && <LoadingState text="Cargando empresas..." />}
      {!loading && error && <ErrorState message={error} onRetry={() => load({ page, limit: PAGE_SIZE, search: search || undefined, status: status || undefined })} />}
      {!loading && !error && companies.length === 0 && (
        <EmptyState
          title="Sin empresas"
          description="No se encontraron empresas con los filtros aplicados."
        />
      )}

      {!loading && !error && companies.length > 0 && (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Empresa', 'RFC', 'Correo', 'Alta', 'Último acceso', 'Estado', 'Estado efectivo', 'Plan comercial', 'Plan', 'Usuarios', 'Actividad', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      {c.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {c.rfc || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {c.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {fmtDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {fmtLastAccess(c.lastAccessAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <CompanyStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.effectiveStatus ? (
                        <EffectiveStatusBadge status={c.effectiveStatus} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const st = c.effectiveCommercialStatus ?? c.commercialEffectiveStatus ?? null;
                        return st ? (
                          <CommercialStatusBadge status={st} />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {formatPlan(c.plan)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="tabular-nums text-gray-700 font-medium">{c.usersCount ?? 0}</span>
                      <span className="text-gray-400 text-xs"> / {c.activeUsersCount ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActivityBadge status={c.activityStatus} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        to={`/admin/companies/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all"
                      >
                        <ExternalLink size={11} />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between text-sm">
              <p className="text-gray-400">
                Página {pagination.page} de {pagination.totalPages} · {pagination.total} empresas
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={13} /> Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Siguiente <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
