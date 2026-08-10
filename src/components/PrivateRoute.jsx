import { Navigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { isVentasRole } from "../utils/rolePermissions";

export default function PrivateRoute({ children, allowVentas = true }) {
  const { status, user } = useAuth();
  if (status === "checking") {
    return <div className="flex justify-center items-center h-40"><span className="animate-spin mr-2">🔄</span>Verificando acceso...</div>;
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  if (!allowVentas && isVentasRole(user)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
