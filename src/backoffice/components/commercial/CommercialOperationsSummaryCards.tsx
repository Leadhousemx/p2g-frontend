import KpiCard from '../KpiCard';
import { Building2, CheckCircle2, Clock, AlertTriangle, Ban, CreditCard, ShoppingCart } from 'lucide-react';
import type { CommercialOperationsSummary } from '../../services/backofficeApi';

interface Props {
  summary: CommercialOperationsSummary;
}

export default function CommercialOperationsSummaryCards({ summary: s }: Props) {
  const safe = (v?: number | null) => v ?? 0;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        title="Total empresas"
        value={safe(s.totalCompanies)}
        icon={<Building2 size={16} />}
        accent="slate"
      />
      <KpiCard
        title="Activas"
        value={safe(s.commercialActive)}
        icon={<CheckCircle2 size={16} />}
        accent="green"
      />
      <KpiCard
        title="Vencen ≤7 días"
        value={safe(s.commercialDueSoon7)}
        icon={<Clock size={16} />}
        accent="amber"
        subtitle={`≤30 días: ${safe(s.commercialDueSoon30)}`}
      />
      <KpiCard
        title="En gracia"
        value={safe(s.commercialGrace)}
        icon={<AlertTriangle size={16} />}
        accent="amber"
        subtitle={`≤3 días: ${safe(s.commercialGraceExpiring3)}`}
      />
      <KpiCard
        title="Vencidas"
        value={safe(s.commercialExpired)}
        icon={<Ban size={16} />}
        accent="red"
      />
      <KpiCard
        title="Suspendidas"
        value={safe(s.commercialSuspended)}
        icon={<Ban size={16} />}
        accent="red"
      />
      <KpiCard
        title="Pagos sin aplicar"
        value={safe(s.companiesWithPaidUnappliedOrders)}
        icon={<CreditCard size={16} />}
        accent="violet"
      />
      <KpiCard
        title="Órdenes pendientes"
        value={safe(s.companiesWithPendingOrders)}
        icon={<ShoppingCart size={16} />}
        accent="amber"
      />
      <KpiCard
        title="Trial activo"
        value={safe(s.trialActive)}
        icon={<Clock size={16} />}
        accent="sky"
      />
      <KpiCard
        title="Sin plan comercial"
        value={safe(s.noCommercialPlan)}
        icon={<Building2 size={16} />}
        accent="slate"
      />
    </div>
  );
}
