import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { BackofficeAuthProvider } from '../hooks/useBackofficeAuth';
import RequireOwner from './RequireOwner';
import BackOfficeLayout from '../layouts/BackOfficeLayout';
import BackOfficeLoginPage from '../pages/BackOfficeLoginPage';
import BackOfficeDashboardPage from '../pages/BackOfficeDashboardPage';
import BackOfficeCompaniesPage from '../pages/BackOfficeCompaniesPage';
import BackOfficeCompanyDetailPage from '../pages/BackOfficeCompanyDetailPage';
import BackOfficeAccessDeniedPage from '../pages/BackOfficeAccessDeniedPage';
import CommercialPlansPage from '../pages/CommercialPlansPage';
import PaymentOrdersPage from '../pages/PaymentOrdersPage';
import CommercialOperationsPage from '../pages/CommercialOperationsPage';
import LoadingState from '../components/LoadingState';

function BO_Fallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <LoadingState text="Cargando BackOffice..." />
    </div>
  );
}

export default function BackOfficeRoutes() {
  return (
    <BackofficeAuthProvider>
      <Suspense fallback={<BO_Fallback />}>
        <Routes>
          {/* Public */}
          <Route path="login" element={<BackOfficeLoginPage />} />
          <Route path="access-denied" element={<BackOfficeAccessDeniedPage />} />

          {/* Protected — wrapped in layout */}
          <Route
            element={
              <RequireOwner>
                <BackOfficeLayout />
              </RequireOwner>
            }
          >
            <Route index element={<BackOfficeDashboardPage />} />
            <Route path="companies" element={<BackOfficeCompaniesPage />} />
            <Route path="companies/:id" element={<BackOfficeCompanyDetailPage />} />
            <Route path="commercial/operations" element={<CommercialOperationsPage />} />
            <Route path="commercial/plans" element={<CommercialPlansPage />} />
            <Route path="payment-orders" element={<PaymentOrdersPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </BackofficeAuthProvider>
  );
}
