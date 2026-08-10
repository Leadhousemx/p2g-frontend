import { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Users,
  UserCheck,
  Activity,
  CalendarDays,
  Timer,
  ShieldAlert,
  Hourglass,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getAdminDashboard,
  getAdminTrialsSummary,
  type AdminDashboardData,
  type AdminTrialSummary,
  extractErrorMessage,
} from '../services/backofficeApi';
import KpiCard from '../components/KpiCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function BackOfficeDashboardPage() {
  const [data, setData]           = useState<AdminDashboardData | null>(null);
  const [trials, setTrials]       = useState<AdminTrialSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [trialsLoading, setTrialsLoading] = useState(true);
  const [error, setError]         = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminDashboard();
      setData(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadTrials = async () => {
    setTrialsLoading(true);
    try {
      const res = await getAdminTrialsSummary();
      setTrials(res);
    } catch {
      // Non-critical — silently ignore if endpoint not yet available
    } finally {
      setTrialsLoading(false);
    }
  };

  useEffect(() => { load(); loadTrials(); }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">Vista general del SaaS Brentrix</p>
      </div>

      {loading && <LoadingState text="Cargando métricas..." />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && data && (
        <>
          {/* Empresas */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Empresas</h2>
              <Link
                to="/admin/companies"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors"
              >
                Ver todas →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Registradas"
                value={data.companies.total}
                subtitle="Total en la plataforma"
                icon={<Building2 size={16} />}
                accent="violet"
              />
              <KpiCard
                title="Activas"
                value={data.companies.active}
                subtitle="Con plan activo"
                icon={<CheckCircle2 size={16} />}
                accent="green"
              />
              <KpiCard
                title="Trial"
                value={data.companies.trial}
                subtitle="En período de prueba"
                icon={<Clock size={16} />}
                accent="amber"
              />
              <KpiCard
                title="Suspendidas"
                value={data.companies.suspended}
                subtitle="Sin acceso activo"
                icon={<AlertOctagon size={16} />}
                accent="red"
              />
            </div>
          </section>

          {/* Actividad */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Actividad</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                title="Activas hoy"
                value={data.companies.activeToday}
                subtitle="Empresas con acceso hoy"
                icon={<Activity size={16} />}
                accent="sky"
              />
              <KpiCard
                title="Activas 7 días"
                value={data.companies.activeLast7Days}
                subtitle="Empresas activas esta semana"
                icon={<CalendarDays size={16} />}
                accent="sky"
              />
              <KpiCard
                title="Usuarios"
                value={data.users.total}
                subtitle="Registrados en la plataforma"
                icon={<Users size={16} />}
                accent="slate"
              />
              <KpiCard
                title="Usuarios hoy"
                value={data.users.activeToday}
                subtitle="Usuarios activos hoy"
                icon={<UserCheck size={16} />}
                accent="green"
              />
            </div>
          </section>

          {/* Trial system summary */}
          {!trialsLoading && trials && (
            <section className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Sistema de Trial</h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <KpiCard
                  title="Trials activos"
                  value={trials.active}
                  subtitle="En período de prueba"
                  icon={<Timer size={16} />}
                  accent="sky"
                />
                <KpiCard
                  title="Por vencer"
                  value={trials.aboutToExpire}
                  subtitle="Vencen en menos de 7 días"
                  icon={<Clock size={16} />}
                  accent="amber"
                />
                <KpiCard
                  title="En gracia"
                  value={trials.inGrace}
                  subtitle="Período de gracia activo"
                  icon={<Hourglass size={16} />}
                  accent="amber"
                />
                <KpiCard
                  title="Vencidos"
                  value={trials.expired}
                  subtitle="Sin acceso por trial"
                  icon={<XCircle size={16} />}
                  accent="red"
                />
                <KpiCard
                  title="Suspendidas"
                  value={trials.suspended}
                  subtitle="Acceso bloqueado"
                  icon={<ShieldAlert size={16} />}
                  accent="red"
                />
              </div>
            </section>
          )}

          {/* Quick actions */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Acciones rápidas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <Link
                to="/admin/companies"
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-sky-100 transition-all group"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-md shadow-violet-500/20">
                  <Building2 size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-sky-700 transition-colors">Ver empresas</p>
                  <p className="text-xs text-gray-400">{data.companies.total} registradas</p>
                </div>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
