import { AuthContext } from "./auth-context";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function AuthProvider({ children }) {
  const location = useLocation();
  useEffect(() => {
    // lógica dependiente de la ruta
  }, [location.pathname]);
  const value = { /* estado + acciones auth */ };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
