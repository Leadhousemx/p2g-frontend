import { Navigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export default function PrivateRoute({ children }) {
  const { status } = useAuth();
  if (import.meta.env.DEV) console.info("[PrivateRoute] status:", status);
  if (status === "checking") {
    return <div className="flex justify-center items-center h-40"><span className="animate-spin mr-2">🔄</span>Verificando acceso...</div>;
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  return children;
}
