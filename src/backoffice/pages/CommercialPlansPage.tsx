import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Package } from 'lucide-react';
import {
  getCommercialPlans,
  disableCommercialPlan,
  type CommercialPlan,
  extractErrorMessage,
} from '../services/backofficeApi';
import { formatUsd } from '../utils/formatCurrency';
import { fmtDate } from '../utils/formatBackofficeDate';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../components/ui/alert-dialog';

export default function CommercialPlansPage() {
  const [plans, setPlans]       = useState<CommercialPlan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Disable flow
  const [disableTarget, setDisableTarget] = useState<CommercialPlan | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError]     = useState('');
  const [disableMsg, setDisableMsg]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCommercialPlans();
      setPlans(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDisable = async () => {
    if (!disableTarget) return;
    setDisableLoading(true);
    setDisableError('');
    try {
      const id = disableTarget.id || (disableTarget as any)._id;
      await disableCommercialPlan(id);
      setDisableMsg(`Plan "${disableTarget.name}" deshabilitado.`);
      setDisableTarget(null);
      setTimeout(() => { setDisableMsg(''); load(); }, 1500);
    } catch (err) {
      setDisableError(extractErrorMessage(err));
    } finally {
      setDisableLoading(false);
    }
  };

  const HEADERS = [
    'Código', 'Nombre', 'Precio USD', 'Meses pago / regalo / servicio',
    'Usuarios inc.', 'Extra / usuario', 'Empresas inc.', 'Estado', 'Orden', 'Alta', '',
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planes comerciales</h1>
          <p className="mt-1 text-sm text-gray-400">
            {plans.length > 0 ? `${plans.length} plan${plans.length !== 1 ? 'es' : ''} registrado${plans.length !== 1 ? 's' : ''}` : 'Catálogo de planes del SaaS'}
          </p>
        </div>
        <button type="button" onClick={load}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 shadow-sm">
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {disableMsg && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {disableMsg}
        </div>
      )}

      {loading && <LoadingState text="Cargando planes..." />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Package size={32} className="text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Sin planes registrados</p>
          <p className="text-xs text-gray-400 mt-1">El catálogo de planes está vacío.</p>
        </div>
      )}

      {!loading && !error && plans.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[1000px] text-sm">
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
              {plans.map((p) => {
                const pid = p.id || (p as any)._id;
                return (
                  <tr key={pid} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700 whitespace-nowrap">{p.code}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{formatUsd(p.basePriceUsd)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap tabular-nums">
                      {p.paidMonths ?? '—'} / {p.bonusMonths ?? 0} / {p.serviceMonths ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 whitespace-nowrap">{p.includedUsers ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatUsd(p.extraUserMonthlyPriceUsd)}</td>
                    <td className="px-4 py-3 text-center text-gray-700 whitespace-nowrap">{p.includedBusinesses ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.isActive ? (
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">Activo</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">Inactivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 whitespace-nowrap">{p.sortOrder ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(p.createdAt, '—')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.isActive && (
                        <button type="button" onClick={() => { setDisableError(''); setDisableTarget(p); }}
                                className="text-xs text-red-500 hover:underline">
                          Deshabilitar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Disable confirmation */}
      <AlertDialog open={!!disableTarget} onOpenChange={(o) => { if (!disableLoading && !o) setDisableTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deshabilitar plan</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deshabilitar el plan <strong>{disableTarget?.name}</strong>? No se podrán crear nuevas órdenes con este plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {disableError && <p className="px-4 text-xs text-red-600">{disableError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disableLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisable} disabled={disableLoading}>
              {disableLoading ? 'Deshabilitando…' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
