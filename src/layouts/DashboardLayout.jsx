// src/layouts/DashboardLayout.jsx
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { Bell, HelpCircle, User, Home, FileText, Users, DollarSign, Package, Truck, ShoppingCart, Building2, BarChart2, Settings } from "lucide-react";
import logo from "../assets/logo.png";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/auth-context";

const menuItems = [
  { label: "Dashboard", icon: <Home size={20} />, path: "/dashboard" },
  { label: "Cotizaciones", icon: <FileText size={20} />, path: "/cotizaciones" },
  { label: "Clientes", icon: <Users size={20} />, path: "/clientes" },
  { label: "Gastos", icon: <DollarSign size={20} />, path: "/gastos" },
  { label: "Paquetes", icon: <Package size={20} />, path: "/paquetes" },
  { label: "Proveedores", icon: <Truck size={20} />, path: "/proveedores" },
  { label: "Compras", icon: <ShoppingCart size={20} />, path: "/compras" },
  { label: "Salones", icon: <Building2 size={20} />, path: "/salones" },
  { label: "Reportes", icon: <BarChart2 size={20} />, path: "/reportes" },
  { label: "Configuración", icon: <Settings size={20} />, path: "/configuracion" },
];

function UserMenuButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleLogout = () => {
    if (typeof auth?.logout === "function") {
      auth.logout();
    } else {
      localStorage.removeItem("auth_token");
      if (typeof auth?.setSession === "function") auth.setSession(null);
    }
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (e.key === "Escape") { setOpen(false); return; }
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onDoc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <span className="sr-only">Abrir menú de usuario</span>
        <User size={22} />
      </Button>
      {open && (
        <div
          id="user-menu"
          role="menu"
          aria-label="Menú de usuario"
          className="absolute right-0 mt-2 w-48 rounded-2xl border bg-white shadow-md py-1 z-50"
        >
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 hover:bg-gray-100"
            onClick={() => { setOpen(false); navigate("/perfil"); }}
          >
            Mi perfil
          </button>
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 hover:bg-gray-100"
            onClick={() => { setOpen(false); handleLogout(); }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

// usuario es opcional
export default function DashboardLayout({ usuario = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const azul = "bg-[#2563eb]";
  const azulHover = "hover:bg-[#1d4ed8]";

  if (import.meta.env.DEV) console.info("[DashboardLayout] Renderizando layout y Outlet");
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`hidden md:flex flex-col ${azul} text-white w-64 min-w-[220px] h-full`}>
        <div className="flex items-center gap-2 px-6 py-6">
          <img src={logo} alt="Logo" className="w-10 h-10" />
          <span className="font-bold text-lg tracking-wide">P2G</span>
        </div>
        <nav className="flex-1">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-3 rounded-lg transition cursor-pointer ${azulHover} ` +
                    (isActive ? 'bg-white text-[#2563eb] font-bold' : '')
                  }
                  end={item.path === "/dashboard"}
                >
                  {item.icon}
                  <span className="text-base">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-6 py-4 text-xs text-gray-300">V 1.0.0</div>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 py-3 bg-white shadow z-10">
          <div className="md:hidden flex items-center">
            <button onClick={() => setMenuOpen(!menuOpen)} className="mr-2">
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h20M4 12h20M4 18h20"/></svg>
            </button>
            <img src={logo} alt="Logo" className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 rounded-full hover:bg-gray-200">
              <Bell size={22} />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-200">
              <HelpCircle size={22} />
            </button>
            {/* User menu */}
            <UserMenuButton />
          </div>
        </header>
        {/* Main area */}
        <main className="flex-1 p-6 bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
