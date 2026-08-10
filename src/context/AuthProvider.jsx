import { AuthContext } from "./auth-context";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getRefreshToken, getToken } from "../utils/tokenManager";
import { refreshAccessToken } from "../api/axiosConfig";
import { verifySession } from "../lib/api";
import { AUTH_SESSION_INVALIDATED_EVENT, clearLocalAuthState } from "../services/authSessionService";

const AUTH_USER_KEY = "authUser";
const AUTH_COMPANY_KEY = "authCompany";

function readSessionJson(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionJson(key, value) {
  try {
    if (value == null) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage may be unavailable in this context
  }
}

function decodeTokenPayload(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function normalizeUser(inputUser, decodedUser = null) {
  if (!inputUser && !decodedUser) return null;

  const source = (inputUser && typeof inputUser === "object") ? inputUser : {};
  const decoded = (decodedUser && typeof decodedUser === "object") ? decodedUser : {};

  const rawRole =
    source.role ||
    source.rol ||
    decoded.role ||
    decoded.rol ||
    "";

  const companyId =
    source.companyId ||
    source.empresaId ||
    source.company?._id ||
    source.company?.id ||
    source.empresa?._id ||
    source.empresa?.id ||
    decoded.companyId ||
    decoded.empresaId ||
    null;

  const normalized = {
    ...decoded,
    ...source,
    role: String(rawRole || "").toLowerCase(),
    rol: source.rol || decoded.rol || rawRole || "",
    companyId: companyId || undefined,
    empresaId: source.empresaId || decoded.empresaId || companyId || undefined,
  };

  return normalized;
}

function normalizeCompany(company) {
  if (!company || typeof company !== "object") return null;
  return {
    ...company,
    id: company.id || company._id,
    _id: company._id || company.id,
  };
}

export default function AuthProvider({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking");
  const [userState, setUserState] = useState(() => readSessionJson(AUTH_USER_KEY));
  const [companyState, setCompanyState] = useState(() => readSessionJson(AUTH_COMPANY_KEY));

  const setUser = (nextUser) => {
    const normalized = normalizeUser(nextUser);
    setUserState(normalized);
    writeSessionJson(AUTH_USER_KEY, normalized);
  };

  const setCompany = (nextCompany) => {
    const normalized = normalizeCompany(nextCompany);
    setCompanyState(normalized);
    writeSessionJson(AUTH_COMPANY_KEY, normalized);
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleSessionInvalidated = () => {
      setUser(null);
      setCompany(null);
      setStatus("unauthenticated");
    };

    window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    return () => {
      window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      setStatus("checking");

      const path = String(location.pathname || "");
      const isPublicRoute =
        path === "/"
        || path === "/login"
        || path === "/register"
        || path === "/accept-invite"
        || path === "/aceptar-invitacion"
        || path === "/registro"
        || path.startsWith("/login/")
        || path.startsWith("/register/")
        || path.startsWith("/accept-invite/")
        || path.startsWith("/aceptar-invitacion/")
        || path.startsWith("/registro/")
        || path.startsWith("/admin");

      let token = getToken();
      const refreshToken = getRefreshToken();
      const decodedUser = decodeTokenPayload(token);

      if (isPublicRoute) {
        setStatus("unauthenticated");
        return;
      }

      if (!token && !refreshToken) {
        setUser(null);
        setCompany(null);
        setStatus("unauthenticated");
        return;
      }

      if (!token && refreshToken) {
        try {
          token = await refreshAccessToken();
        } catch {
          clearLocalAuthState();
          setUser(null);
          setCompany(null);
          setStatus("unauthenticated");
          return;
        }
      }

      try {
        const persistedUser = readSessionJson(AUTH_USER_KEY);
        const persistedCompany = readSessionJson(AUTH_COMPANY_KEY);
        const res = await verifySession();
        if (res === null) {
          const fallbackUser = normalizeUser(persistedUser, decodedUser);
          setUser(fallbackUser);
          if (persistedCompany) {
            setCompany(persistedCompany);
          }
          setStatus(fallbackUser ? "authenticated" : "unauthenticated");
          return;
        }

        const backendUser = res?.data?.user || res?.data?.usuario || null;
        const backendCompany = res?.data?.company || res?.data?.empresa || null;
        const normalizedUser = normalizeUser(backendUser, decodedUser);
        setUser(normalizedUser);
        if (backendCompany) {
          setCompany(backendCompany);
        } else if (persistedCompany) {
          setCompany(persistedCompany);
        }
        setStatus("authenticated");
      } catch {
        if (token) {
          clearLocalAuthState();
        }
        setUser(null);
        setCompany(null);
        setStatus("unauthenticated");
      }
    };

    checkAuth();
  }, [location.pathname]);

  const value = { status, user: userState, company: companyState, setStatus, setUser, setCompany };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
