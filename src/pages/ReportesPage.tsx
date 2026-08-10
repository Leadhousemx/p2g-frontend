import { BarChart3, ArrowLeftRight, WalletCards, HandCoins, FileCheck2, UsersRound, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const reportCards = [
  {
    title: "Ingresos y Egresos",
    description: "Consulta los KPIs globales y el detalle de ingresos/egresos del periodo seleccionado.",
    path: "/reportes/ingresos-egresos",
    icon: <ArrowLeftRight size={20} className="text-[#2563EB]" />,
  },
  {
    title: "CXC",
    description: "Revisa cuentas por cobrar, estatus, días restantes y vencimientos próximos.",
    path: "/reportes/cxc",
    icon: <WalletCards size={20} className="text-[#2563EB]" />,
  },
  {
    title: "CXP",
    description: "Monitorea cuentas por pagar a proveedores con detalle de saldo y vencimiento.",
    path: "/reportes/cxp",
    icon: <HandCoins size={20} className="text-[#2563EB]" />,
  },
  {
    title: "Cotizaciones y Contratos",
    description: "Da seguimiento a #cotizaciones y #eventos contratados del periodo.",
    path: "/reportes/cotizaciones-contratos",
    icon: <FileCheck2 size={20} className="text-[#2563EB]" />,
  },
  {
    title: "Leads",
    description: "Analiza la captación de leads por canal y su comportamiento en el periodo.",
    path: "/reportes/leads",
    icon: <UsersRound size={20} className="text-[#2563EB]" />,
  },
];

export default function ReportesPage() {
  const navigate = useNavigate();

  return (
    <div className="p-5 h-screen flex flex-col overflow-hidden bg-[#F4F6F9]">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <BarChart3 size={20} className="text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111827]">Módulo de Reportes</h1>
            <p className="text-sm text-[#64748B]">Selecciona el reporte que deseas consultar.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto pb-1">
        {reportCards.map((card) => (
          <button
            key={card.path}
            type="button"
            onClick={() => navigate(card.path)}
            className="text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                {card.icon}
              </div>
              <ChevronRight size={18} className="text-[#64748B]" />
            </div>
            <h2 className="text-base font-semibold text-[#111827] mb-1">{card.title}</h2>
            <p className="text-sm text-[#64748B]">{card.description}</p>
            <div className="mt-4 text-sm font-medium text-[#2563EB]">Ver reporte</div>
          </button>
        ))}
      </div>
    </div>
  );
}
