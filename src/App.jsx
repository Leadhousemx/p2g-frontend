import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "react-error-boundary";
import PageSkeleton from "./components/common/PageSkeleton";
import PrivateRoute from "./components/PrivateRoute";
import AuthProvider from "./context/AuthProvider";

const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegistroPage = lazy(() => import("./pages/RegistroPage"));
const RegisterSuccessPage = lazy(() => import("./pages/RegisterSuccessPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const CotizacionesPage = lazy(() => import("./pages/Cotizaciones"));
// Explicit extensions lock the active page when legacy duplicates coexist.
const CotizacionesNuevaPage = lazy(() => import("./pages/CotizacionesNueva.jsx"));
const CotizacionVerPage = lazy(() => import("./pages/CotizacionVer"));
const CotizacionEditarPage = lazy(() => import("./pages/CotizacionEditar"));
const ClientesPage = lazy(() => import("./pages/ClientesPage"));
const NuevoClientePage = lazy(() => import("./pages/NuevoClientePage"));
const EditarClientePage = lazy(() => import("./pages/EditarClientePage"));
const PaquetesPage = lazy(() => import("./pages/PaquetesPage"));
const NuevoPaquetePage = lazy(() => import("./pages/NuevoPaquetePage"));
const EditarPaquetePage = lazy(() => import("./pages/EditarPaquetePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProveedoresPage = lazy(() => import("./pages/ProveedoresPage"));
const NuevoProveedorPage = lazy(() => import("./pages/NuevoProveedor"));
const EditarProveedorPage = lazy(() => import("./pages/EditarProveedorPage"));
const ComprasPage = lazy(() => import("./pages/ComprasPage"));
const NuevaCompra = lazy(() => import("./pages/NuevaCompra"));
const EditarCompra = lazy(() => import("./pages/EditarCompra"));
const PagosCompra = lazy(() => import("./pages/PagosCompra"));
const NegociosPage = lazy(() => import("./pages/NegociosPage"));
const NuevoNegocio = lazy(() => import("./pages/NuevoNegocio"));
const EditarNegocio = lazy(() => import("./pages/EditarNegocio"));
const SalonesPage = lazy(() => import("./pages/Salones.tsx"));
const SalonesNuevoPage = lazy(() => import("./pages/SalonesNuevo.jsx"));
const SalonesEditarPage = lazy(() => import("./pages/SalonesEditar.jsx"));
const ConfiguracionPage = lazy(() => import("./pages/Configuracion.tsx"));
const ConfiguracionUsuariosPage = lazy(() => import("./pages/ConfiguracionUsuarios"));
const PerfilUsuarioPage = lazy(() => import("./pages/PerfilUsuario"));
const CatalogoPage = lazy(() => import("./pages/CatalogoPage"));
const NuevoCatalogoPage = lazy(() => import("./pages/NuevoCatalogoPage"));
const EditarCatalogoPage = lazy(() => import("./pages/EditarCatalogoPage"));
const CatalogosPage = lazy(() => import("./pages/CatalogosPage"));
const ProductosPage = lazy(() => import("./pages/ProductosPage"));
const NuevoProducto = lazy(() => import("./pages/NuevoProducto"));
const EditarProducto = lazy(() => import("./pages/EditarProducto"));
const PagosPage = lazy(() => import("./pages/PagosPage"));
const NuevoPago = lazy(() => import("./pages/NuevoPago"));
const PagosCotizacion = lazy(() => import("./pages/PagosCotizacion.tsx"));
const ReportesPage = lazy(() => import("./pages/ReportesPage"));
const ReportesIngresosEgresosPage = lazy(() => import("./pages/ReportesIngresosEgresosPage"));
const ReportesCXCPage = lazy(() => import("./pages/ReportesCXCPage"));
const ReportesCXPPage = lazy(() => import("./pages/ReportesCXPPage"));
const ReportesCotizacionesContratosPage = lazy(() => import("./pages/ReportesCotizacionesContratosPage"));
const ReportesLeadsPage = lazy(() => import("./pages/ReportesLeadsPage"));
const BackOfficeRoutes = lazy(() => import("./backoffice/routes/BackOfficeRoutes"));

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary FallbackComponent={PageSkeleton}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/loginbrir" element={<Navigate to="/login" replace />} />
            <Route path="/login/*" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<RegistroPage />} />
            <Route path="/registro" element={<Navigate to="/register" replace />} />
            <Route
              path="/register-success"
              element={
                <PrivateRoute>
                  <RegisterSuccessPage />
                </PrivateRoute>
              }
            />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/aceptar-invitacion" element={<AcceptInvitePage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* BackOffice — rutas completamente independientes del cliente */}
            <Route path="/admin/*" element={<BackOfficeRoutes />} />

            {/* Rutas protegidas bajo layout autenticado */}
            <Route element={<DashboardLayout />}>
              <Route
                path="dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="cotizaciones"
                element={
                  <PrivateRoute>
                    <CotizacionesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="cotizaciones/nueva"
                element={
                  <PrivateRoute>
                    <CotizacionesNuevaPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="cotizaciones/:id/pagos"
                element={
                  <PrivateRoute>
                    <PagosCotizacion />
                  </PrivateRoute>
                }
              />
              <Route
                path="cotizaciones/:id/ver"
                element={
                  <PrivateRoute>
                    <CotizacionVerPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="cotizaciones/:id"
                element={
                  <PrivateRoute>
                    <CotizacionEditarPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="clientes"
                element={
                  <PrivateRoute>
                    <ClientesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="clientes/nuevo"
                element={
                  <PrivateRoute>
                    <NuevoClientePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="clientes/:id"
                element={
                  <PrivateRoute>
                    <EditarClientePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="paquetes"
                element={
                  <PrivateRoute>
                    <PaquetesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="paquetes/nuevo"
                element={
                  <PrivateRoute>
                    <NuevoPaquetePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="paquetes/:id/editar"
                element={
                  <PrivateRoute>
                    <EditarPaquetePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="catalogos"
                element={
                  <PrivateRoute>
                    <CatalogosPage />
                  </PrivateRoute>
                }
              />
              <Route path="catalogo" element={<Navigate to="/catalogos" replace />} />
              <Route
                path="catalogo/:tipo"
                element={
                  <PrivateRoute>
                    <CatalogoPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="catalogo/:tipo/nuevo"
                element={
                  <PrivateRoute>
                    <NuevoCatalogoPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="catalogo/:tipo/:id/editar"
                element={
                  <PrivateRoute>
                    <EditarCatalogoPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="proveedores"
                element={
                  <PrivateRoute>
                    <ProveedoresPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="proveedores/nuevo"
                element={
                  <PrivateRoute>
                    <NuevoProveedorPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="proveedores/:id/editar"
                element={
                  <PrivateRoute>
                    <EditarProveedorPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="compras"
                element={
                  <PrivateRoute>
                    <ComprasPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="compras/nueva"
                element={
                  <PrivateRoute>
                    <NuevaCompra />
                  </PrivateRoute>
                }
              />
              <Route
                path="compras/:id/editar"
                element={
                  <PrivateRoute>
                    <EditarCompra />
                  </PrivateRoute>
                }
              />
              <Route
                path="compras/:id/pagos"
                element={
                  <PrivateRoute>
                    <PagosCompra />
                  </PrivateRoute>
                }
              />
              <Route
                path="negocios"
                element={
                  <PrivateRoute>
                    <NegociosPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="reportes"
                element={
                  <PrivateRoute allowVentas={false}>
                    <ReportesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="reportes/ingresos-egresos"
                element={
                  <PrivateRoute allowVentas={false}>
                    <ReportesIngresosEgresosPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="reportes/cxc"
                element={
                  <PrivateRoute allowVentas={false}>
                    <ReportesCXCPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="reportes/cxp"
                element={
                  <PrivateRoute allowVentas={false}>
                    <ReportesCXPPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="reportes/cotizaciones-contratos"
                element={
                  <PrivateRoute allowVentas={false}>
                    <ReportesCotizacionesContratosPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="reportes/leads"
                element={
                  <PrivateRoute allowVentas={false}>
                    <ReportesLeadsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="negocios/nuevo"
                element={
                  <PrivateRoute>
                    <NuevoNegocio />
                  </PrivateRoute>
                }
              />
              <Route
                path="negocios/:id/editar"
                element={
                  <PrivateRoute>
                    <EditarNegocio />
                  </PrivateRoute>
                }
              />
              <Route
                path="productos"
                element={
                  <PrivateRoute>
                    <ProductosPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="productos/nuevo"
                element={
                  <PrivateRoute>
                    <NuevoProducto />
                  </PrivateRoute>
                }
              />
              <Route
                path="productos/:id/editar"
                element={
                  <PrivateRoute>
                    <EditarProducto />
                  </PrivateRoute>
                }
              />
              <Route
                path="pagos"
                element={
                  <PrivateRoute>
                    <PagosPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="pagos/nuevo"
                element={
                  <PrivateRoute>
                    <NuevoPago />
                  </PrivateRoute>
                }
              />
              <Route
                path="salones"
                element={
                  <PrivateRoute>
                    <SalonesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="salones/nuevo"
                element={
                  <PrivateRoute>
                    <SalonesNuevoPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="salones/:id/editar"
                element={
                  <PrivateRoute>
                    <SalonesEditarPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="configuracion"
                element={
                  <PrivateRoute>
                    <ConfiguracionPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="configuracion/usuarios"
                element={
                  <PrivateRoute allowVentas={false}>
                    <ConfiguracionUsuariosPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="perfil"
                element={
                  <PrivateRoute>
                    <PerfilUsuarioPage />
                  </PrivateRoute>
                }
              />
              {/* Fallback 404 bajo layout autenticado */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
}

