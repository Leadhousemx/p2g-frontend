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
const CotizacionesPage = lazy(() => import("./pages/Cotizaciones"));
const CotizacionesNuevaPage = lazy(() => import("./pages/CotizacionesNueva"));
const ClientesPage = lazy(() => import("./pages/ClientesPage"));
const GastosPage = lazy(() => import("./pages/GastosPage"));
const NuevoGastoPage = lazy(() => import("./pages/NuevoGastoPage"));
const PaquetesPage = lazy(() => import("./pages/PaquetesPage"));
const NuevoPaquetePage = lazy(() => import("./pages/NuevoPaquetePage"));
const NuevoClientePage = lazy(() => import("./pages/NuevoClientePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProveedoresPage = lazy(() => import("./pages/ProveedoresPage"));
const NuevoProveedorPage = lazy(() => import("./pages/NuevoProveedor"));
const ComprasPage = lazy(() => import("./pages/ComprasPage"));
const NuevaCompra = lazy(() => import("./pages/NuevaCompra"));
const SalonesPage = lazy(() => import("./pages/Salones"));
const SalonesNuevoPage = lazy(() => import("./pages/SalonesNuevo"));
const ConfiguracionPage = lazy(() => import("./pages/Configuracion"));
const PerfilUsuarioPage = lazy(() => import("./pages/PerfilUsuario"));

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary FallbackComponent={PageSkeleton}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistroPage />} />
            <Route path="/registro" element={<Navigate to="/register" replace />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Rutas protegidas bajo layout autenticado */}
            <Route element={<DashboardLayout />}>
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
                path="dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
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
                path="gastos"
                element={
                  <PrivateRoute>
                    <GastosPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="gastos/nuevo"
                element={
                  <PrivateRoute>
                    <NuevoGastoPage />
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
                path="configuracion"
                element={
                  <PrivateRoute>
                    <ConfiguracionPage />
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

