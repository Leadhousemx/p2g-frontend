import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Briefcase } from 'lucide-react';
import {
  getCommercialOperationsSummary,
  getCommercialOperationsCompanies,
  type CommercialOperationsSummary,
  type CommercialOperationsCompanyItem,
} from '../services/backofficeApi';
import CommercialOperationsSummaryCards from '../components/commercial/CommercialOperationsSummaryCards';
import CommercialOperationsFilters from '../components/commercial/CommercialOperationsFilters';
import CommercialOperationsTable from '../components/commercial/CommercialOperationsTable';
import CommercialOperationDetailDrawer from '../components/commercial/CommercialOperationDetailDrawer';
import ErrorState from '../components/ErrorState';

const DEFAULT_SORT      = 'currentPeriodEnd_asc';
const DEFAULT_PAGE_SIZE = 25;

function get429Message(err: unknown): string | null {
  if ((err as any)?.response?.status !== 429) return null;
  const retryAfter = (err as any)?.response?.headers?.['retry-after'];
  return retryAfter
    ? `Demasiadas solicitudes. Intenta de nuevo en ${retryAfter} segundos.`
    : 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.';
}

export default function CommercialOperationsPage() {
  // Summary
  const [summary, setSummary]             = useState<CommercialOperationsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError]   = useState('');

  // Companies list
  const [items, setItems]           = useState<CommercialOperationsCompanyItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1,
  });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError]     = useState('');

  // Filters
  const [status, setStatus]     = useState('all');
  const [q, setQ]               = useState('');
  const [sort, setSort]         = useState(DEFAULT_SORT);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage]         = useState(1);

  // Debounced search — page reset lives here so q changes never trigger a double request
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Drawer
  const [drawerEmpresaId, setDrawerEmpresaId] = useState<string | null>(null);

  // AbortController ref — cancels the previous companies request before starting a new one
  const abortRef = useRef<AbortController | null>(null);

  // ── Load summary ──────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const res = await getCommercialOperationsSummary();
      setSummary(res);
    } catch (err: unknown) {
      setSummaryError(
        get429Message(err) ??
        ((err as any)?.response?.data?.error?.message || 'Error al cargar resumen operativo.'),
      );
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // ── Load companies ────────────────────────────────────────────────────────────
  const loadCompanies = useCallback(
    async (params: { status: string; q: string; sort: string; page: number; pageSize: number }) => {
      // Cancel any in-flight request to avoid concurrent calls and backend rate limiting
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setListLoading(true);
      setListError('');
      try {
        const res = await getCommercialOperationsCompanies({
          status:   params.status === 'all' ? undefined : params.status,
          q:        params.q || undefined,
          sort:     params.sort,
          page:     params.page,
          pageSize: params.pageSize,
          signal:   controller.signal,
        });
        const normalized = res.data ?? [];
        const normalizedPagination =
          res.pagination ?? { page: 1, pageSize: params.pageSize, total: 0, totalPages: 1 };
        if (import.meta.env.DEV) {
          console.debug('[CommercialOperations] companies normalized', {
            itemsLength: normalized.length,
            total: normalizedPagination.total,
            page: normalizedPagination.page,
            status: params.status,
            q: params.q,
            sort: params.sort,
            pageSize: params.pageSize,
          });
        }
        setItems(normalized);
        setPagination(normalizedPagination);
      } catch (err: unknown) {
        // Aborted by a subsequent call — discard silently, new request is already in flight
        if ((err as any)?.code === 'ERR_CANCELED' || (err as any)?.name === 'CanceledError') return;
        setListError(
          get429Message(err) ??
          ((err as any)?.response?.data?.error?.message || 'Error al cargar empresas.'),
        );
        setItems([]);
      } finally {
        // Only clear loading if this request was not superseded
        if (!controller.signal.aborted) setListLoading(false);
      }
    },
    [],
  );

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    loadCompanies({ status, q: debouncedQ, sort, page, pageSize });
  }, [status, debouncedQ, sort, page, pageSize, loadCompanies]);

  // ── Filter handlers ───────────────────────────────────────────────────────────
  const handleStatus   = (v: string) => { setStatus(v);   setPage(1); };
  const handleQ        = (v: string) => { setQ(v); }; // page reset handled in debounce effect
  const handleSort     = (v: string) => { setSort(v);     setPage(1); };
  const handlePageSize = (v: number) => { setPageSize(v); setPage(1); };
  const handleRefresh  = () => {
    loadSummary();
    loadCompanies({ status, q: debouncedQ, sort, page, pageSize });
  };

  const isRefreshing = summaryLoading || listLoading;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-md shadow-violet-500/20">
            <Briefcase size={17} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Operación comercial</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              Control de vencimientos, renovaciones y pagos pendientes.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      {summaryLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      )}
      {!summaryLoading && summaryError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {summaryError}
        </div>
      )}
      {!summaryLoading && summary && (
        <CommercialOperationsSummaryCards summary={summary} />
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <CommercialOperationsFilters
        status={status}
        q={q}
        sort={sort}
        pageSize={pageSize}
        onStatus={handleStatus}
        onQ={handleQ}
        onSort={handleSort}
        onPageSize={handlePageSize}
      />

      {/* ── Companies table ────────────────────────────────────────────────── */}
      {!listLoading && listError ? (
        <ErrorState
          message={listError}
          onRetry={() => loadCompanies({ status, q: debouncedQ, sort, page, pageSize })}
        />
      ) : (
        <CommercialOperationsTable
          items={items}
          pagination={pagination}
          onPage={setPage}
          onDetail={(item) => setDrawerEmpresaId(item.empresaId)}
          loading={listLoading}
        />
      )}

      {/* ── Detail drawer ──────────────────────────────────────────────────── */}
      <CommercialOperationDetailDrawer
        empresaId={drawerEmpresaId}
        onClose={() => setDrawerEmpresaId(null)}
      />
    </div>
  );
}
