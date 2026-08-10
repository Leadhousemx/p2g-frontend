import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Package, CreditCard, Briefcase, type LucideIcon } from 'lucide-react';
import logo from '../../assets/logo brentrix sin fondo.png';

const NAV_MAIN: { label: string; icon: LucideIcon; to: string }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin'           },
  { label: 'Empresas',  icon: Building2,        to: '/admin/companies' },
];

const NAV_COMERCIAL: { label: string; icon: LucideIcon; to: string }[] = [
  { label: 'Operación comercial', icon: Briefcase, to: '/admin/commercial/operations' },
  { label: 'Planes',              icon: Package,   to: '/admin/commercial/plans'       },
  { label: 'Órdenes de pago',     icon: CreditCard, to: '/admin/payment-orders'        },
];

function NavItem({ label, icon: Icon, to }: { label: string; icon: LucideIcon; to: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/admin'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-white/[0.08] text-white'
            : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? 'bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-md shadow-violet-500/20'
                : 'text-slate-500'
            }`}
          >
            <Icon size={15} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function BackOfficeSidebar() {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-[#0F172A]">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-5">
        <img src={logo} alt="Brentrix" className="h-7 w-7 object-contain" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Brentrix</p>
          <p className="text-sm font-semibold text-white leading-tight">BackOffice</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {NAV_MAIN.map((item) => <NavItem key={item.to} {...item} />)}
        </div>

        <p className="mb-1 mt-5 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
          Comercial
        </p>
        <div className="space-y-0.5">
          {NAV_COMERCIAL.map((item) => <NavItem key={item.to} {...item} />)}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-5 py-3">
        <p className="text-[10px] text-slate-600">Fase 3.2 · Comercial</p>
      </div>
    </aside>
  );
}
