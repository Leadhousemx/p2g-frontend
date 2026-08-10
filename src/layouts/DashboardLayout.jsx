import { logger } from "../lib/logger";
// src/layouts/DashboardLayout.jsx
import { useEffect, useRef, useState } from "react";
import { useTrialStatus } from "../hooks/useTrialStatus";
import { useCommercialStatus } from "../hooks/useCommercialStatus";
import TrialBanner from "../components/trial/TrialBanner";
import CommercialBanner from "../components/commercial/CommercialBanner";
import TrialBlockedPage from "../pages/TrialBlockedPage";
import CommercialBlockedPage from "../pages/CommercialBlockedPage";
import { NavLink, useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { Bell, Settings as SettingsIcon, User, Home, FileText, Users, Package, Utensils, Truck, DollarSign, Building2, BarChart2, Settings, ChevronDown, Menu } from "lucide-react";
import imagenBrentrix from "../assets/imagen bentrix.png";
import { getAlerts } from "../services/alertsService";
import { getCotizacionById } from "../services/cotizacionesService";
import { api } from "../lib/api";
import { useAuth } from "../context/auth-context";
import { extractDateOnly, formatDateOnly, toLocalDateOnly } from "../utils/dateOnly";
import { canViewReports } from "../utils/rolePermissions";
import ContentShell from "../components/common/ContentShell";
import MobileNavDrawer from "../components/common/MobileNavDrawer";
import ResponsiveNavMenu from "../components/common/ResponsiveNavMenu";
import { clearLocalAuthState, resetSessionInvalidationState } from "../services/authSessionService";
const menuItems = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "Cotizaciones", icon: FileText, path: "/cotizaciones" },
  { label: "Clientes", icon: Users, path: "/clientes" },
  { label: "Paquetes", icon: Package, path: "/paquetes" },
  { label: "Catálogo", icon: Utensils, path: "/catalogos", activePrefixes: ["/catalogos", "/catalogo/"] },
  { label: "Proveedores", icon: Truck, path: "/proveedores" },
  { label: "Gastos", icon: DollarSign, path: "/compras" },
  { label: "Negocios", icon: Building2, path: "/negocios" },
  { label: "Reportes", icon: BarChart2, path: "/reportes" },
  { label: "Configuración", icon: Settings, path: "/configuracion" },
];

// Mapeo de rutas a breadcrumbs
const breadcrumbMap = {
  "/dashboard": ["Dashboard", "Eventos Contratados"],
  "/cotizaciones": ["Cotizaciones", "Listado"],
  "/cotizaciones/nueva": ["Cotizaciones", "Nueva Cotización"],
  "/clientes": ["Clientes", "Listado"],
  "/clientes/nuevo": ["Clientes", "Nuevo Cliente"],
  "/paquetes": ["Paquetes", "Listado"],
  "/paquetes/nuevo": ["Paquetes", "Nuevo Paquete"],
  "/catalogos": ["Catálogo", "Listado"],
  "/proveedores": ["Proveedores", "Listado"],
  "/proveedores/nuevo": ["Proveedores", "Nuevo Proveedor"],
  "/compras": ["Gastos", "Listado"],
  "/compras/nueva": ["Gastos", "Nuevo gasto"],
  "/negocios": ["Negocios", "Listado"],
  "/negocios/nuevo": ["Negocios", "Nuevo Negocio"],
  "/reportes": ["Reportes", "Resumen"],
  "/reportes/ingresos-egresos": ["Reportes", "Ingresos y Egresos"],
  "/reportes/cxc": ["Reportes", "CXC"],
  "/reportes/cxp": ["Reportes", "CXP"],
  "/reportes/cotizaciones-contratos": ["Reportes", "Cotizaciones y Contratos"],
  "/reportes/leads": ["Reportes", "Leads"],
  "/productos": ["Productos", "Listado"],
  "/productos/nuevo": ["Productos", "Nuevo Producto"],
  "/pagos": ["Pagos", "Listado"],
  "/pagos/nuevo": ["Pagos", "Nuevo Pago"],
  "/configuracion": ["Configuración", "Empresa"],
  "/configuracion/usuarios": ["Configuración", "Usuarios"],
  "/perfil": ["Perfil", "Usuario"],
};

const catalogTypeLabels = {
  platillos: "Catering",
  bebidas: "Bebidas",
  personal: "Personal",
  mobiliario: "Mobiliario",
  audio: "Audio",
  otros: "Otros",
  tipoeventos: "Tipos de Evento",
};

const breadcrumbRootPathMap = {
  Dashboard: "/dashboard",
  Cotizaciones: "/cotizaciones",
  Clientes: "/clientes",
  Paquetes: "/paquetes",
  "Catálogo": "/catalogos",
  Proveedores: "/proveedores",
  Gastos: "/compras",
  Negocios: "/negocios",
  Reportes: "/reportes",
  Productos: "/productos",
  Pagos: "/pagos",
  Configuración: "/configuracion",
  Perfil: "/perfil",
};

function extractQuotationIdFromAlert(alert) {
  const match = String(alert?.id || "").match(/^evt_([^_]+)_.+$/);
  return match?.[1] || "";
}

function buildPendingEventAlertMessage(cotizacion, eventDate) {
  const clienteNombre = String(cotizacion?.cliente?.nombre || "Cliente").trim() || "Cliente";
  const saldo = Number(cotizacion?.saldo || 0);
  const dateLabel = formatDateOnly(eventDate, "es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const saldoLabel = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(saldo) ? saldo : 0);

  return `El evento del ${dateLabel} con ${clienteNombre} tiene saldo pendiente de ${saldoLabel}.`;
}

async function normalizeAlertsWithQuotationDates(list) {
  if (!Array.isArray(list) || list.length === 0) return [];

  const eventAlertIds = Array.from(new Set(list.map(extractQuotationIdFromAlert).filter(Boolean)));
  if (eventAlertIds.length === 0) return list;

  const quotations = await Promise.all(
    eventAlertIds.map(async (quotationId) => {
      try {
        const quotation = await getCotizacionById(quotationId);
        return [quotationId, quotation];
      } catch {
        return [quotationId, null];
      }
    })
  );

  const quotationsById = new Map(quotations);
  const todayYmd = toLocalDateOnly(new Date());

  return list.map((alert) => {
    const quotationId = extractQuotationIdFromAlert(alert);
    const quotation = quotationId ? quotationsById.get(quotationId) : null;
    const eventDate = extractDateOnly(quotation?.eventStartDate || quotation?.fechaEvento);

    if (!quotation || !eventDate) {
      return alert;
    }

    const nextAlert = {
      ...alert,
      date: eventDate,
    };

    if (String(alert?.type || "").toUpperCase() === "EVENT_TODAY_PENDING" && eventDate !== todayYmd) {
      nextAlert.message = buildPendingEventAlertMessage(quotation, eventDate);
    }

    return nextAlert;
  });
}

export default function DashboardLayout() {
  const { trialStatus, loading: trialLoading, networkError: trialNetworkError, refresh: refreshTrial } = useTrialStatus();
  const { data: commercialStatus, loading: commercialLoading, accessAllowed: commercialAccessAllowed } = useCommercialStatus();
  const authContext = useAuth();
  const currentUser = authContext?.user || null;
  const showReports = canViewReports(currentUser);
  const setStatus = authContext?.setStatus;
  const setUser = authContext?.setUser;
  const setCompany = authContext?.setCompany;
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsMenuRef = useRef(null);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const mobileMenuButtonRef = useRef(null);

  // Obtener breadcrumbs basados en la ruta actual
  const getBreadcrumbs = () => {
    const path = location.pathname;

    // Buscar coincidencia exacta
    if (breadcrumbMap[path]) {
      return breadcrumbMap[path];
    }

    if (path.startsWith("/catalogo/")) {
      const segments = path.split("/").filter(Boolean);
      const catalogType = segments[1];
      const catalogLabel = catalogTypeLabels[catalogType] || "Detalle";
      return ["Catálogo", catalogLabel];
    }

    if (path.startsWith("/proveedores/") && path.endsWith("/editar")) {
      return ["Proveedores", "Editar Proveedor"];
    }

    // Buscar coincidencias con IDs dinámicos
    if (path.includes("/editar")) {
      const base = path.split("/")[1];
      const sectionLabel = base === "compras"
        ? "Gastos"
        : base.charAt(0).toUpperCase() + base.slice(1);
      const detailLabel = base === "compras" ? "Editar gasto" : "Editar";
      return [sectionLabel, detailLabel];
    }

    if (path.includes("/compras/") && path.includes("/pagos")) {
      return ["Gastos", "Pagos"];
    }

    if (path.includes("/pagos")) {
      return ["Cotizaciones", "Pagos"];
    }

    // Default
    const segments = path.split("/").filter(Boolean);
    if (segments.length > 0) {
      const firstSegment = segments[0] === "compras"
        ? "Gastos"
        : segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
      return [firstSegment, "Detalle"];
    }

    return ["Dashboard", ""];
  };

  const breadcrumbs = getBreadcrumbs();
  const breadcrumbRootPath = breadcrumbRootPathMap[breadcrumbs[0]] || "/dashboard";
  const visibleMenuItems = menuItems.filter((item) => {
    if (!showReports && item.path === "/reportes") return false;
    return true;
  });

  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      setAlertsError("");
      const data = await getAlerts();
      const list = Array.isArray(data) ? data : data?.alerts || [];
      const normalizedList = await normalizeAlertsWithQuotationDates(list);
      setAlerts(normalizedList);
    } catch (err) {
      if (err?.response?.status !== 401) {
        logger.error("Error loading alerts:", err);
      }
      setAlertsError("No se pudieron cargar las alertas");
    } finally {
      setAlertsLoading(false);
    }
  };

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (alertsMenuRef.current && !alertsMenuRef.current.contains(event.target)) {
        setAlertsOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    if (alertsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen, alertsOpen]);

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setUserMenuOpen(false);
    setAlertsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch (err) {
      logger.warn("Error during logout request", err);
    }
    clearLocalAuthState();
    resetSessionInvalidationState();
    setStatus && setStatus("unauthenticated");
    setUser && setUser(null);
    setCompany && setCompany(null);
    navigate("/login", { replace: true });
  };

  const currentSectionTitle = breadcrumbs[1] || breadcrumbs[0];
  const brand =<img src={imagenBrentrix} alt="Brentrix" className="h-32 w-auto max-w-full object-contain" />;

  // A valid commercial plan (active or grace) overrides trial denial.
  // Only count it as valid once loading is complete and we have real data.
  const hasValidCommercialPlan =
    !commercialLoading &&
    commercialStatus != null &&
    commercialStatus.accessAllowed === true &&
    commercialStatus.effectiveStatus !== 'no_commercial_plan';

  // Trial gate — wait for both statuses before blocking.
  // Bypass if a valid commercial plan is in place (commercial takes priority).
  if (
    !trialLoading && !commercialLoading &&
    trialStatus && !trialStatus.accessAllowed &&
    !hasValidCommercialPlan
  ) {
    return <TrialBlockedPage status={trialStatus} onLogout={handleLogout} />;
  }

  // Commercial gate — blocks when commercial explicitly denies access.
  if (
    !trialLoading && !commercialLoading &&
    !commercialAccessAllowed &&
    commercialStatus != null
  ) {
    return <CommercialBlockedPage status={commercialStatus} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 min-w-[220px] flex-col bg-[#0F172A] text-gray-300 lg:flex">
        <div className="flex items-center justify-center px-6 py-6">{brand}</div>
        <nav className="flex-1 overflow-y-auto">
          <ResponsiveNavMenu items={visibleMenuItems} />
        </nav>
        <div className="px-6 py-4 text-xs text-gray-500">V 1.0.0</div>
      </aside>

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        items={visibleMenuItems}
        restoreFocusRef={mobileMenuButtonRef}
        brand={brand}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <ContentShell padding="responsive" className="flex min-h-[64px] items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={mobileMenuButtonRef}
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 lg:hidden"
                aria-label="Abrir navegación principal"
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-navigation-drawer"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <div className="hidden items-center gap-2 text-sm md:flex">
                  <Link to={breadcrumbRootPath} className="truncate text-blue-600 hover:text-blue-700 font-medium">
                    {breadcrumbs[0]}
                  </Link>
                  {breadcrumbs[1] && (
                    <>
                      <span className="text-gray-400">/</span>
                      <span className="truncate font-medium text-gray-700">
                        {breadcrumbs[1]}
                      </span>
                    </>
                  )}
                </div>

                <div className="md:hidden">
                  <p className="truncate text-sm font-semibold text-slate-900">{currentSectionTitle}</p>
                  <div className="truncate text-xs text-slate-500">
                    <Link to={breadcrumbRootPath} className="text-blue-600 hover:text-blue-700">
                      {breadcrumbs[0]}
                    </Link>
                    {breadcrumbs[1] && <span className="text-slate-400"> / {breadcrumbs[1]}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
              <div className="relative" ref={alertsMenuRef}>
                <button
                  className="relative rounded-full p-2 transition-colors hover:bg-gray-100"
                  aria-label="Notificaciones"
                  onClick={() => setAlertsOpen(!alertsOpen)}
                >
                  <Bell size={20} className="text-gray-600" />
                  {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                      {alerts.length > 99 ? "99+" : alerts.length}
                    </span>
                  )}
                </button>

                {alertsOpen && (
                  <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                      <span className="text-sm font-semibold text-gray-900">Alertas</span>
                      <button
                        onClick={loadAlerts}
                        className="text-xs text-blue-600 hover:text-blue-700"
                        disabled={alertsLoading}
                      >
                        {alertsLoading ? "Actualizando..." : "Actualizar"}
                      </button>
                    </div>

                    {alertsError && <div className="px-4 py-3 text-sm text-red-600">{alertsError}</div>}

                    {!alertsError && alerts.length === 0 && !alertsLoading && (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">No tienes alertas pendientes</div>
                    )}

                    <div className="max-h-80 overflow-auto">
                      {alerts.map((alert) => (
                        <div key={alert.id || `${alert.type}-${alert.date}-${alert.title}`} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500"></span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{alert.title || "Alerta"}</p>
                              {alert.message && <p className="mt-1 text-xs text-gray-600">{alert.message}</p>}
                              {alert.date && <p className="mt-1 text-xs text-gray-400">{alert.date}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                className="hidden rounded-full p-2 transition-colors hover:bg-gray-100 sm:inline-flex"
                onClick={() => navigate("/configuracion")}
                aria-label="Configuración"
              >
                <SettingsIcon size={20} className="text-gray-600" />
              </button>

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-gray-100 sm:px-3"
                  aria-label="Abrir menú de usuario"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600">
                    <User size={20} className="text-white" />
                  </div>
                  <ChevronDown size={16} className="hidden text-gray-500 sm:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/perfil");
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Mi Perfil
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/configuracion");
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Configuración
                    </button>
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ContentShell>
        </header>

        <ContentShell as="main" className="flex flex-1 min-w-0 flex-col overflow-x-hidden bg-[#F4F6F9]">
          {/* Trial banner — shown for trial_active, trial_warning, trial_grace */}
          {!trialLoading && trialStatus && trialStatus.accessAllowed && (
            <TrialBanner status={trialStatus} />
          )}
          {/* Commercial banner — shown for commercial_active (≤7 days) or commercial_grace */}
          {!commercialLoading && commercialStatus && commercialAccessAllowed && (
            <CommercialBanner status={commercialStatus} />
          )}
          {/* Network error retrieving trial status — non-blocking, shows retry */}
          {!trialLoading && trialNetworkError && (
            <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 sm:px-6">
              <span>No se pudo verificar el estado de tu cuenta.</span>
              <button
                type="button"
                onClick={refreshTrial}
                className="font-semibold underline hover:text-amber-900"
              >
                Reintentar
              </button>
            </div>
          )}
          <div className="min-h-full w-full">
            <Outlet />
          </div>
        </ContentShell>
      </div>
    </div>
  );
}
