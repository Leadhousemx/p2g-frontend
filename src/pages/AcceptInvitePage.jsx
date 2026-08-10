import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Calendar, Loader2, Mail, ShieldCheck, User } from "lucide-react";
import { logger } from "../lib/logger";
import { LoginBackground } from "../components/LoginBackground";
import logo from "../assets/logo brentrix sin fondo.png";
import { acceptInvite, getInvitationPreview } from "../services/companyRbacService";
import { setRefreshToken, setToken } from "../utils/tokenManager";
import { useAuth } from "../context/auth-context";
import { useToast } from "../components/ui/use-toast";

function getRolLabel(role) {
  if (!role) return null;
  const r = String(role).toLowerCase();
  if (r === "admin") return "Administrador";
  if (r === "ventas") return "Ventas";
  return role;
}

function formatExpiry(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const auth = useAuth();
  const setStatus = auth?.setStatus;
  const setUser = auth?.setUser;
  const setCompany = auth?.setCompany;
  const token = useMemo(() => params.get("token") || "", [params]);

  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLoginCta, setShowLoginCta] = useState(false);
  const { toast } = useToast();

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchPreview = async () => {
      setPreviewLoading(true);
      setPreviewError("");
      try {
        const data = await getInvitationPreview(token);
        if (!cancelled) setPreview(data);
      } catch (err) {
        if (cancelled) return;
        const code = String(
          err?.response?.data?.error?.code ||
          err?.response?.data?.code ||
          ""
        ).toUpperCase();
        const msg = String(
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.response?.data?.msg ||
          "Invitación inválida o no encontrada"
        );
        if (code.includes("EXPIR") || msg.toLowerCase().includes("expi")) {
          setPreviewError("Esta invitación expiró. Contacta al administrador para solicitar una nueva.");
        } else if (
          code.includes("USED") ||
          code.includes("ACCEPTED") ||
          msg.toLowerCase().includes("ya fue utilizada") ||
          msg.toLowerCase().includes("aceptada")
        ) {
          setPreviewError("Esta invitación ya fue utilizada.");
        } else if (code.includes("NOT_FOUND") || err?.response?.status === 404) {
          setPreviewError("Invitación no encontrada. Verifica el enlace o solicita una nueva.");
        } else {
          setPreviewError(msg);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };
    fetchPreview();
    return () => { cancelled = true; };
  }, [token]);

  const fieldMap = {
    token: "token",
    nombre: "nombre",
    whatsapp: "whatsapp",
    password: "password",
    "usuario.nombre": "nombre",
    "usuario.whatsapp": "whatsapp",
    "usuario.password": "password",
  };

  const mapBackendField = (fieldPath) => {
    const raw = String(fieldPath || "").trim();
    if (!raw) return null;
    if (fieldMap[raw]) return fieldMap[raw];
    const normalized = raw.toLowerCase();
    if (normalized.includes("token")) return "token";
    if (normalized.includes("nombre")) return "nombre";
    if (normalized.includes("whatsapp") || normalized.includes("telefono")) return "whatsapp";
    if (normalized.includes("password")) return "password";
    if (normalized.includes("email")) return "token";
    return null;
  };

  const parseStandardizedError = (err) => {
    const data = err?.response?.data;
    if (!data || data?.ok !== false || !data?.error) return null;

    const code = String(data?.error?.code || "");
    const message = String(data?.error?.message || "").trim();
    const field = data?.error?.field;
    const errors = Array.isArray(data?.error?.errors) ? data.error.errors : [];

    const mapped = {};

    const singleTarget = mapBackendField(field);
    if (singleTarget && message) {
      mapped[singleTarget] = message;
    }

    errors.forEach((item) => {
      const target = mapBackendField(item?.field);
      const targetMessage = String(item?.message || "").trim();
      if (target && targetMessage) {
        mapped[target] = targetMessage;
      }
    });

    return {
      code,
      message,
      fieldErrors: mapped,
      hasFieldInfo: Boolean(field) || errors.length > 0,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});
    setShowLoginCta(false);

    if (!token) {
      setError("Invitación inválida");
      return;
    }

    if (!nombre || !whatsapp || !password || !confirmPassword) {
      setError("Completa todos los campos obligatorios");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const data = await acceptInvite({ token, nombre, whatsapp, password });

      const accessToken = data?.token || data?.accessToken;
      const refreshToken = data?.refreshToken;
      const backendUser = data?.user || data?.usuario || null;
      const backendCompany = data?.company || data?.empresa || null;

      if (accessToken) {
        setToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);
        setStatus && setStatus("authenticated");
        setUser && setUser(backendUser);
        setCompany && setCompany(backendCompany);
        navigate("/dashboard", { replace: true });
        return;
      }

      setSuccess("Invitación aceptada. Redirigiendo al login...");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      logger.error("Error accept invite:", err?.response?.data || err?.message);
      const standardizedError = parseStandardizedError(err);

      if (standardizedError) {
        if (Object.keys(standardizedError.fieldErrors).length > 0) {
          setFieldErrors(standardizedError.fieldErrors);
        }

        if (standardizedError.code === "EMAIL_ALREADY_EXISTS") {
          setShowLoginCta(true);
          if (!standardizedError.fieldErrors.token) {
            setFieldErrors((prev) => ({
              ...prev,
              token: standardizedError.message || "Este correo ya está registrado. Inicia sesión.",
            }));
          }
        }

        const message = standardizedError.message || "No se pudo aceptar la invitación";
        setError(message);

        if (!standardizedError.hasFieldInfo) {
          toast({ title: message, variant: "destructive" });
        }
        return;
      }

      const fallbackMessage =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        "No se pudo aceptar la invitación";
      setError(fallbackMessage);
      toast({ title: fallbackMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Normalize response — try nested shapes first, fall back to flat
  const _raw = preview || {};
  const _inv = (
    (_raw.invitation && typeof _raw.invitation === "object" ? _raw.invitation : null) ||
    (_raw.data?.invitation && typeof _raw.data.invitation === "object" ? _raw.data.invitation : null) ||
    (_raw.data && typeof _raw.data === "object" ? _raw.data : null) ||
    _raw
  );

  const previewEmail =
    _inv?.email || _inv?.inviteeEmail || _inv?.correo || _inv?.emailInvitado ||
    _raw?.email || _raw?.inviteeEmail ||
    null;

  // Extract empresa string — covers all common field name variants across two levels
  const previewEmpresa = (() => {
    const tryStr = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const tryObj = (v) => {
      if (!v || typeof v !== "object") return null;
      return tryStr(v.nombreComercial) || tryStr(v.nombre) || tryStr(v.name) || null;
    };
    for (const src of [_inv, _raw]) {
      if (!src) continue;
      const found =
        tryStr(src.companyName) ||
        tryStr(src.empresaNombre) ||
        tryStr(src.nombreEmpresa) ||
        tryStr(src.empresa) || tryObj(src.empresa) ||
        tryStr(src.company) || tryObj(src.company);
      if (found) return found;
    }
    return null;
  })();

  const previewRol = getRolLabel(
    _inv?.role || _inv?.rol || _raw?.role || _raw?.rol || null
  );
  const previewExpira = formatExpiry(
    _inv?.expiresAt || _inv?.expira || _inv?.fechaExpiracion || _inv?.expires_at ||
    _raw?.expiresAt || _raw?.expira || null
  );

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      <LoginBackground />

      <div className="relative z-10 w-full px-4 flex items-center justify-center py-8">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-fuchsia-500/25 via-violet-500/25 to-sky-500/25 blur-2xl opacity-60" />

          <div className="relative z-10 rounded-3xl border border-white/20 bg-white/8 backdrop-blur-xl shadow-2xl p-8 sm:p-10">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src={logo} alt="Logo Brentrix" className="h-16 w-16 object-contain" />
            </div>

            {/* Título */}
            <h1 className="text-center text-2xl font-extrabold text-white mb-1 tracking-tight">
              {previewEmpresa ? `Únete a ${previewEmpresa}` : "Aceptar invitación"}
            </h1>
            <p className="text-center text-sm text-white/55 mb-6">
              Crea tu acceso para empezar a usar Brentrix
            </p>

            {/* Estado de carga del preview */}
            {previewLoading && (
              <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-white/50 text-sm">
                <Loader2 className="animate-spin" size={15} />
                Validando invitación...
              </div>
            )}

            {/* Card de preview */}
            {preview && !previewError && !previewLoading && (
              <div className="mb-6 overflow-hidden rounded-2xl border border-sky-400/30 bg-sky-950/50 shadow-lg">
                {/* Header */}
                <div className="border-b border-sky-400/20 bg-sky-900/40 px-4 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-300/80">
                    Detalles de tu invitación
                  </p>
                </div>

                {/* Filas de datos */}
                <div className="divide-y divide-white/10">
                  {previewEmpresa && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Building2 size={15} className="mt-0.5 shrink-0 text-sky-400" />
                      <div className="min-w-0">
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300/60">Empresa</p>
                        <p className="truncate text-sm font-semibold text-white">{previewEmpresa}</p>
                      </div>
                    </div>
                  )}

                  {previewEmail && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Mail size={15} className="mt-0.5 shrink-0 text-sky-400" />
                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300/60">Correo invitado</p>
                        <p className="break-all text-sm font-semibold text-white">{previewEmail}</p>
                      </div>
                    </div>
                  )}

                  {previewRol && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <ShieldCheck size={15} className="mt-0.5 shrink-0 text-sky-400" />
                      <div className="min-w-0">
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300/60">Rol asignado</p>
                        <p className="text-sm font-semibold text-white">{previewRol}</p>
                      </div>
                    </div>
                  )}

                  {previewExpira && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Calendar size={15} className="mt-0.5 shrink-0 text-sky-400" />
                      <div className="min-w-0">
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300/60">Válida hasta</p>
                        <p className="text-sm font-semibold text-white">{previewExpira}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error del preview */}
            {previewError && (
              <div className="mb-5 p-4 rounded-2xl bg-red-500/15 border border-red-400/30 text-red-200 text-sm text-center font-medium">
                {previewError}
              </div>
            )}

            {/* Token ausente */}
            {!token && (
              <div className="mb-5 p-4 rounded-2xl bg-red-500/15 border border-red-400/30 text-red-200 text-sm text-center font-medium">
                Invitación inválida. Verifica el enlace del correo.
              </div>
            )}

            {/* Error de submit */}
            {error && (
              <div className="mb-5 p-4 rounded-2xl bg-red-500/15 border border-red-400/30 text-red-200 text-sm text-center font-medium">
                {error}
              </div>
            )}

            {/* Éxito */}
            {success && (
              <div className="mb-5 p-4 rounded-2xl bg-green-500/15 border border-green-400/30 text-green-200 text-sm text-center font-medium">
                {success}
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo oculto para que el browser asocie el email correcto y no rellene otros campos */}
              {previewEmail && (
                <input type="email" readOnly tabIndex={-1} value={previewEmail} autoComplete="email"
                  aria-hidden="true" className="sr-only" />
              )}

              {/* Nombre completo */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Nombre completo <span className="text-sky-400">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Tu nombre y apellido"
                    value={nombre}
                    autoComplete="name"
                    onChange={(e) => {
                      setNombre(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, nombre: "" }));
                    }}
                    className="w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 pl-9 pr-4 border border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 focus:outline-none text-sm"
                  />
                </div>
                {fieldErrors.nombre && (
                  <p className="text-red-300 text-xs">{fieldErrors.nombre}</p>
                )}
              </div>

              {/* WhatsApp */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-white/50">
                  WhatsApp <span className="text-sky-400">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Tu número de WhatsApp"
                  value={whatsapp}
                  autoComplete="tel"
                  onChange={(e) => {
                    setWhatsapp(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, whatsapp: "" }));
                  }}
                  className="w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 px-4 border border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 focus:outline-none text-sm"
                />
                {fieldErrors.whatsapp && (
                  <p className="text-red-300 text-xs">{fieldErrors.whatsapp}</p>
                )}
              </div>

              {/* Contraseña */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Contraseña <span className="text-sky-400">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Elige una contraseña segura"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className="w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 px-4 border border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 focus:outline-none text-sm"
                />
                {fieldErrors.password && (
                  <p className="text-red-300 text-xs">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Confirmar contraseña <span className="text-sky-400">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  className="w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 px-4 border border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 focus:outline-none text-sm"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-red-300 text-xs">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {fieldErrors.token && (
                <p className="text-red-300 text-xs -mt-2">{fieldErrors.token}</p>
              )}

              {showLoginCta && (
                <div className="text-center">
                  <Link to="/login" className="text-sky-300 hover:text-sky-200 text-sm font-semibold">
                    Ir a Iniciar sesión
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token || !!previewError || previewLoading}
                className="w-full h-11 mt-2 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Creando cuenta...
                  </span>
                ) : "Crear cuenta"}
              </button>
            </form>

            <p className="text-center text-xs text-white/50 mt-6">
              ¿Ya tienes una cuenta?{" "}
              <Link to="/login" className="text-sky-300 hover:text-sky-200 font-semibold">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
