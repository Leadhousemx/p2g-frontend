import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  Activity,
  BarChart2,
  CalendarPlus,
  CheckCircle2,
  Ban,
  Loader2,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import {
  getAdminCompanyById,
  extendCompanyTrial,
  activateCompany,
  suspendCompany,
  type AdminCompanyDetail,
  extractErrorMessage,
} from '../services/backofficeApi';
import { CompanyStatusBadge, CommercialStatusBadge, EffectiveStatusBadge, UserStatusBadge, formatPlan } from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { fmtDate, fmtDatetime, fmtLastAccess, fmtTrial } from '../utils/formatBackofficeDate';
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
import CompanyPaymentOrdersSection from '../components/CompanyPaymentOrdersSection';

// ─── Section card ────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-sm">
          {icon}
        </span>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Field row ───────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="w-52 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800">{value ?? <span className="text-gray-300">—</span>}</dd>
    </div>
  );
}

// ─── Bool badge ──────────────────────────────────────────────────────────────
function BoolBadge({ value, trueLabel = 'Sí', falseLabel = 'No' }: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return value ? (
    <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-700">{trueLabel}</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-500">{falseLabel}</span>
  );
}

// ─── Input helper ────────────────────────────────────────────────────────────
function inputCls(extra = '') {
  return `w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 transition-all ${extra}`;
}

// ─── Action buttons ──────────────────────────────────────────────────────────
function ActionButton({
  icon,
  label,
  variant = 'default',
  onClick,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'danger' | 'success';
  onClick: () => void;
  loading?: boolean;
}) {
  const cls = {
    default: 'border-gray-200 text-gray-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700',
    success: 'border-green-200 text-green-700 hover:border-green-300 hover:bg-green-50',
    danger:  'border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BackOfficeCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData]       = useState<AdminCompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Action modals
  const [extendOpen, setExtendOpen]   = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [suspendOpen, setSuspendOpen]  = useState(false);

  // Action form state
  const [extendDays, setExtendDays]     = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [activateReason, setActivateReason] = useState('');
  const [suspendReason, setSuspendReason]   = useState('');

  // Action feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]         = useState('');
  const [actionError, setActionError]     = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getAdminCompanyById(id);
      setData(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Action helpers ─────────────────────────────────────────────────────────
  function clearActionState() {
    setActionLoading(false);
    setActionMsg('');
    setActionError('');
    setExtendDays('');
    setExtendReason('');
    setActivateReason('');
    setSuspendReason('');
  }

  const handleExtend = async () => {
    const days = parseInt(extendDays, 10);
    if (!days || days <= 0) { setActionError('Ingresa un número de días válido (> 0).'); return; }
    if (!extendReason.trim()) { setActionError('La razón no puede estar vacía.'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await extendCompanyTrial(id!, { days, reason: extendReason.trim() });
      setActionMsg(`Trial extendido ${days} día(s). Los cambios ya están activos.`);
      setExtendOpen(false);
      setTimeout(() => { clearActionState(); load(); }, 1500);
    } catch (err) {
      setActionError(extractErrorMessage(err));
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!activateReason.trim()) { setActionError('La razón no puede estar vacía.'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await activateCompany(id!, { reason: activateReason.trim() });
      setActionMsg('Empresa activada correctamente.');
      setActivateOpen(false);
      setTimeout(() => { clearActionState(); load(); }, 1500);
    } catch (err) {
      setActionError(extractErrorMessage(err));
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) { setActionError('La razón no puede estar vacía.'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await suspendCompany(id!, { reason: suspendReason.trim() });
      setActionMsg('Empresa suspendida. El acceso operativo ha sido bloqueado.');
      setSuspendOpen(false);
      setTimeout(() => { clearActionState(); load(); }, 1500);
    } catch (err) {
      setActionError(extractErrorMessage(err));
      setActionLoading(false);
    }
  };

  const com = data?.commercial;

  // Normalize commercial fields — backend may return at company or commercial level with varied names
  const resolvedCommercialStatus =
    com?.effectiveCommercialStatus ??
    com?.commercialEffectiveStatus ??
    (data?.company as any)?.effectiveCommercialStatus ??
    (data?.company as any)?.commercialEffectiveStatus ??
    null;
  const resolvedCommercialDaysRemaining =
    com?.commercialDaysRemaining ??
    (data?.company as any)?.commercialDaysRemaining ??
    null;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Back */}
      <div className="mb-6">
        <Link
          to="/admin/companies"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver a Empresas
        </Link>
      </div>

      {loading && <LoadingState text="Cargando empresa..." />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {/* Global action feedback */}
      {actionMsg && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {actionMsg}
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-5">
          {/* Page heading */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{data.company.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">ID: <span className="font-mono">{data.company.id}</span></p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CompanyStatusBadge status={data.company.status} />
              {com?.effectiveStatus && com.effectiveStatus !== data.company.status && (
                <EffectiveStatusBadge status={com.effectiveStatus} />
              )}
              <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {data.company.plan || 'free'}
              </span>
            </div>
          </div>

          {/* 1. Datos generales */}
          <SectionCard title="Datos generales" icon={<Building2 size={13} />}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre"           value={data.company.name}            />
              <Field label="RFC"               value={data.company.rfc || '—'}     />
              <Field label="Correo"            value={data.company.email}           />
              <Field label="Teléfono"          value={data.company.phone || '—'}   />
              <Field label="Responsable"       value={data.company.responsibleName || '—'} />
              <Field label="Fecha de alta"     value={fmtDate(data.company.createdAt)}     />
              <Field label="Última actualiz."  value={fmtDatetime(data.company.updatedAt)} />
              <Field label="Último acceso"     value={fmtLastAccess(data.company.lastAccessAt)} />
            </dl>
          </SectionCard>

          {/* 2. Estado comercial — expandido Fase 2 */}
          <SectionCard title="Estado comercial" icon={<BarChart2 size={13} />}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Estado"               value={<CompanyStatusBadge status={com?.status ?? data.company.status} />} />
              {com?.effectiveStatus && (
                <Field label="Estado efectivo"    value={<EffectiveStatusBadge status={com.effectiveStatus} />} />
              )}
              <Field label="Plan"                 value={formatPlan(com?.plan)}           />
              <Field
                label="Acceso permitido"
                value={
                  com?.accessAllowed != null
                    ? <BoolBadge value={com.accessAllowed} trueLabel="Sí" falseLabel="No" />
                    : '—'
                }
              />
              <Field label="Trial inicio"         value={fmtTrial(com?.trialStartDate)}   />
              <Field label="Trial fin"            value={fmtTrial(com?.trialEndDate)}      />
              <Field label="Gracia fin"           value={fmtTrial(com?.trialGraceEndDate)} />
              <Field
                label="Días restantes trial"
                value={
                  com?.daysRemaining != null
                    ? `${com.daysRemaining} día${com.daysRemaining !== 1 ? 's' : ''}`
                    : 'No aplica'
                }
              />
              <Field
                label="Días gracia restantes"
                value={
                  com?.graceDaysRemaining != null
                    ? `${com.graceDaysRemaining} día${com.graceDaysRemaining !== 1 ? 's' : ''}`
                    : 'No aplica'
                }
              />
              <Field label="Días desde alta"      value={`${com?.daysSinceCreated ?? '—'} días`} />
              {com?.message && (
                <Field label="Mensaje sistema"    value={<span className="text-gray-600 italic">{com.message}</span>} />
              )}
              {com?.suspendedAt && (
                <Field label="Suspendida el"      value={fmtDatetime(com.suspendedAt)} />
              )}
              {com?.suspensionReason && (
                <Field label="Razón suspensión"   value={com.suspensionReason} />
              )}
              {com?.activatedAt && (
                <Field label="Activada el"        value={fmtDatetime(com.activatedAt)} />
              )}
              {com?.activationReason && (
                <Field label="Razón activación"   value={com.activationReason} />
              )}
              {com?.trialExtendedAt && (
                <Field label="Trial extendido el" value={fmtDatetime(com.trialExtendedAt)} />
              )}
              {com?.trialExtensionReason && (
                <Field label="Razón extensión"    value={com.trialExtensionReason} />
              )}
            </dl>
          </SectionCard>

          {/* 2b. Periodo comercial — shown when backend returns commercial plan data */}
          {(com?.currentPlanCode || com?.currentPeriodStart || com?.currentPeriodEnd || resolvedCommercialStatus) && (
            <SectionCard title="Periodo comercial" icon={<CreditCard size={13} />}>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {resolvedCommercialStatus && (
                  <Field label="Estado comercial" value={<CommercialStatusBadge status={resolvedCommercialStatus} />} />
                )}
                {com?.currentPlanCode && (
                  <Field label="Plan activo" value={<span className="font-mono text-sm text-gray-800">{com.currentPlanCode}</span>} />
                )}
                {com?.currentPeriodStart && (
                  <Field label="Inicio periodo" value={fmtDate(com.currentPeriodStart)} />
                )}
                {com?.currentPeriodEnd && (
                  <Field label="Fin periodo" value={fmtDate(com.currentPeriodEnd)} />
                )}
                {resolvedCommercialDaysRemaining != null && (
                  <Field
                    label="Días restantes"
                    value={
                      resolvedCommercialDaysRemaining <= 0
                        ? <span className="font-semibold text-red-600">Vencido</span>
                        : <span className={resolvedCommercialDaysRemaining <= 7 ? 'font-semibold text-amber-600' : 'text-gray-800'}>
                            {resolvedCommercialDaysRemaining} día{resolvedCommercialDaysRemaining !== 1 ? 's' : ''}
                          </span>
                    }
                  />
                )}
                {com?.nextPaymentDueAt && (
                  <Field label="Próximo pago" value={fmtDate(com.nextPaymentDueAt)} />
                )}
                {com?.paymentGraceEndDate && (
                  <Field label="Fin gracia pago" value={fmtDate(com.paymentGraceEndDate)} />
                )}
              </dl>
              {resolvedCommercialDaysRemaining != null && resolvedCommercialDaysRemaining <= 7 && resolvedCommercialDaysRemaining > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    El periodo comercial vence en {resolvedCommercialDaysRemaining} día{resolvedCommercialDaysRemaining !== 1 ? 's' : ''}.
                    Considera renovar pronto.
                  </p>
                </div>
              )}
              {com?.currentPeriodEnd && new Date(com.currentPeriodEnd) < new Date() && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <AlertTriangle size={13} className="shrink-0 text-red-500" />
                  <p className="text-xs text-red-700">
                    El periodo comercial está vencido. El acceso de la empresa puede estar bloqueado.
                  </p>
                </div>
              )}
            </SectionCard>
          )}

          {/* 3. Acciones OWNER */}
          <SectionCard title="Acciones OWNER" icon={<CheckCircle2 size={13} />}>
            <p className="mb-4 text-xs text-gray-400">
              Estas acciones modifican el estado comercial de la empresa. Se registra la razón y el timestamp.
            </p>
            <div className="flex flex-wrap gap-3">
              <ActionButton
                icon={<CalendarPlus size={14} />}
                label="Extender trial"
                variant="default"
                onClick={() => { clearActionState(); setExtendOpen(true); }}
              />
              <ActionButton
                icon={<CheckCircle2 size={14} />}
                label="Activar empresa"
                variant="success"
                onClick={() => { clearActionState(); setActivateOpen(true); }}
              />
              <ActionButton
                icon={<Ban size={14} />}
                label="Suspender empresa"
                variant="danger"
                onClick={() => { clearActionState(); setSuspendOpen(true); }}
              />
            </div>
          </SectionCard>

          {/* 4. Actividad */}
          <SectionCard title="Actividad" icon={<Activity size={13} />}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Último acceso"         value={fmtLastAccess(data.activity.lastAccessAt)} />
              <Field label="Activa hoy"            value={<BoolBadge value={data.activity.activeToday} />}       />
              <Field label="Activa últimos 7 días" value={<BoolBadge value={data.activity.activeLast7Days} />}   />
            </dl>
          </SectionCard>

          {/* 5. Uso */}
          <SectionCard title="Uso" icon={<BarChart2 size={13} />}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Total usuarios"   value={String(data.usage.usersCount ?? 0)}       />
              <Field label="Usuarios activos" value={String(data.usage.activeUsersCount ?? 0)} />
            </dl>
          </SectionCard>

          {/* 6. Usuarios */}
          {data.users && data.users.length > 0 && (
            <SectionCard title={`Usuarios (${data.users.length})`} icon={<Users size={13} />}>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Nombre', 'Correo', 'Rol', 'Estado', 'Último login', 'Alta'].map((h) => (
                        <th key={h} className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{u.name || '—'}</td>
                        <td className="py-2.5 pr-4 text-gray-500">{u.email}</td>
                        <td className="py-2.5 pr-4 text-gray-600 capitalize">{u.role}</td>
                        <td className="py-2.5 pr-4"><UserStatusBadge isActive={u.isActive} /></td>
                        <td className="py-2.5 pr-4 text-gray-400 text-xs">{fmtLastAccess(u.lastLoginAt)}</td>
                        <td className="py-2.5 text-gray-400 text-xs">{fmtDate(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {data.users && data.users.length === 0 && (
            <SectionCard title="Usuarios" icon={<Users size={13} />}>
              <p className="text-sm text-gray-400">Sin usuarios registrados.</p>
            </SectionCard>
          )}

          {/* 7. Órdenes de pago */}
          <CompanyPaymentOrdersSection companyId={data.company.id} />
        </div>
      )}

      {/* ── Modal: Extender trial ──────────────────────────────────────────── */}
      <AlertDialog open={extendOpen} onOpenChange={(o) => { if (!actionLoading) { setExtendOpen(o); setActionError(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extender trial</AlertDialogTitle>
            <AlertDialogDescription>
              Ingresa los días adicionales y la razón de la extensión. Esta acción queda registrada.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 mb-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Días adicionales
              </label>
              <input
                type="number"
                min="1"
                placeholder="Ej: 15"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Razón
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Cliente solicitó extensión por evaluación adicional"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                className={inputCls('resize-none')}
              />
            </div>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExtend}
              disabled={actionLoading}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {actionLoading ? 'Extendiendo...' : 'Extender trial'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal: Activar empresa ─────────────────────────────────────────── */}
      <AlertDialog open={activateOpen} onOpenChange={(o) => { if (!actionLoading) { setActivateOpen(o); setActionError(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activar empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Esto activará el acceso completo a la plataforma. Ingresa la razón de la activación.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 mb-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Razón
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Cliente activado manualmente por contrato firmado"
                value={activateReason}
                onChange={(e) => setActivateReason(e.target.value)}
                className={inputCls('resize-none')}
              />
            </div>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? 'Activando...' : 'Activar empresa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal: Suspender empresa ───────────────────────────────────────── */}
      <AlertDialog open={suspendOpen} onOpenChange={(o) => { if (!actionLoading) { setSuspendOpen(o); setActionError(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender empresa</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-red-600">Esta acción bloqueará el acceso operativo de todos los usuarios.</span>
              {' '}Los datos no serán eliminados. Ingresa la razón de la suspensión.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 mb-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Razón
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Trial vencido sin renovación de plan"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className={inputCls('resize-none')}
              />
            </div>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={actionLoading}
            >
              {actionLoading ? 'Suspendiendo...' : 'Suspender empresa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
