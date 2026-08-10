import { Navigate, useLocation } from 'react-router-dom';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';

export default function RequireOwner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useBackofficeAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
