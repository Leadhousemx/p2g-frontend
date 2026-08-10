import { logger } from "../lib/logger";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo brentrix sin fondo.png";
import { useAuth } from "../context/auth-context";
import { setRefreshToken, setToken } from "../utils/tokenManager";
import { registerCompany } from "../services/companyRbacService";
import { api } from "../lib/api";
import { refreshCsrfToken } from "../services/csrfService";
import { LoginBackground } from "../components/LoginBackground";

const API_URL = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_URL || "https://api.brentrix.com");

export default function RegistroPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const setStatus = auth?.setStatus;
  const setUser = auth?.setUser;
  const setCompany = auth?.setCompany;

  const [form, setForm] = useState({
    razonSocial: "",
    nombreComercial: "",
    direccion: "",
    rfc: "",
    emailEmpresa: "",
    telefonoEmpresa: "",
    sitioWeb: "",
    nombreOwner: "",
    emailOwner: "",
    whatsappOwner: "",
    password: "",
    confirmarPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLoginCta, setShowLoginCta] = useState(false);
  const [mounted, setMounted] = useState(false);
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  useEffect(() => {
    setMounted(true);
  }, []);

  const decodeTokenPayload = (token) => {
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  };

  const mergeAuthUser = (rawUser, decodedUser, backendCompany) => {
    const source = (rawUser && typeof rawUser === "object") ? rawUser : {};
    const decoded = (decodedUser && typeof decodedUser === "object") ? decodedUser : {};
    const companyId =
      source.companyId ||
      source.empresaId ||
      source.company?._id ||
      source.company?.id ||
      source.empresa?._id ||
      source.empresa?.id ||
      backendCompany?._id ||
      backendCompany?.id ||
      decoded.companyId ||
      decoded.empresaId ||
      null;

    const role = source.role || source.rol || decoded.role || decoded.rol || "";

    return {
      ...decoded,
      ...source,
      role: String(role || "").toLowerCase(),
      rol: source.rol || decoded.rol || role || "",
      companyId: companyId || undefined,
      empresaId: source.empresaId || decoded.empresaId || companyId || undefined,
    };
  };

  const backendFieldToFormField = {
    "empresa.razonSocial": "razonSocial",
    "empresa.nombreComercial": "nombreComercial",
    "empresa.direccion": "direccion",
    "empresa.rfc": "rfc",
    "empresa.email": "emailEmpresa",
    "empresa.telefono": "telefonoEmpresa",
    "empresa.sitioWeb": "sitioWeb",
    "usuario.nombre": "nombreOwner",
    "usuario.email": "emailOwner",
    "usuario.whatsapp": "whatsappOwner",
    "usuario.password": "password",
  };

  const extractBackendMessage = (err) => {
    const status = Number(err?.response?.status || 0);
    const data = err?.response?.data;

    if (typeof data === "string" && data.trim()) return data;
    if (data?.msg) return data.msg;
    if (data?.message) return data.message;
    if (data?.error) return data.error;

    if (status === 409) return "El correo electrónico ya está registrado.";
    if (status === 400) {
      return "No se pudo registrar. Verifica especialmente la contraseña: mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.";
    }
    if (status === 403) {
      return "No fue posible completar el registro con los datos enviados. Este correo o la empresa podrían existir ya; intenta iniciar sesión.";
    }
    if (status === 500 || status === 502 || status === 503) {
      return "No fue posible crear la cuenta por un error del servidor. Esto suele pasar cuando el correo o la empresa ya existen, o cuando el backend rechaza el alta sin detalle. Intenta iniciar sesión o cambiar correo/RFC.";
    }
    if (!err?.response) return "No se pudo conectar con el servidor de registro.";
    return `No se pudo completar el registro (HTTP ${status || "desconocido"}).`;
  };

  const mapMessageToFieldErrors = (message) => {
    const text = String(message || "").toLowerCase();
    const next = {};

    if (text.includes("email") || text.includes("correo")) {
      next.emailOwner = "Verifica el correo electrónico del propietario (puede estar ya registrado).";
    }
    if (text.includes("password") || text.includes("contrase")) {
      next.password = "La contraseña no cumple los requisitos mínimos.";
    }
    if (text.includes("telefono") || text.includes("teléfono") || text.includes("whatsapp")) {
      next.whatsappOwner = "Verifica el WhatsApp/teléfono del propietario.";
    }
    if (text.includes("razon social") || text.includes("razón social")) {
      next.razonSocial = "La razón social es inválida o está incompleta.";
    }

    return next;
  };

  const mapBackendFieldToFormField = (fieldPath) => {
    const raw = String(fieldPath || "").trim();
    if (!raw) return null;

    if (backendFieldToFormField[raw]) return backendFieldToFormField[raw];

    const normalized = raw.toLowerCase();
    if (normalized.includes("usuario.email") || normalized.endsWith("email")) return "emailOwner";
    if (normalized.includes("usuario.password") || normalized.endsWith("password")) return "password";
    if (normalized.includes("usuario.whatsapp") || normalized.includes("telefono")) return "whatsappOwner";
    if (normalized.includes("empresa.rfc") || normalized.endsWith("rfc")) return "rfc";
    if (normalized.includes("empresa.razonsocial") || normalized.includes("razon social")) return "razonSocial";
    if (normalized.includes("empresa.nombrecomercial")) return "nombreComercial";
    if (normalized.includes("empresa.direccion")) return "direccion";
    if (normalized.includes("empresa.email")) return "emailEmpresa";
    if (normalized.includes("empresa.telefono")) return "telefonoEmpresa";
    return null;
  };

  const parseStandardizedError = (err) => {
    const data = err?.response?.data;
    if (!data || data?.ok !== false || !data?.error) return null;

    const code = String(data?.error?.code || "");
    const message = String(data?.error?.message || "").trim();
    const field = data?.error?.field;
    const errors = Array.isArray(data?.error?.errors) ? data.error.errors : [];

    const mappedFieldErrors = {};

    const mappedSingleField = mapBackendFieldToFormField(field);
    if (mappedSingleField && message) {
      mappedFieldErrors[mappedSingleField] = message;
    }

    errors.forEach((item) => {
      const targetField = mapBackendFieldToFormField(item?.field);
      const targetMessage = String(item?.message || "").trim();
      if (targetField && targetMessage) {
        mappedFieldErrors[targetField] = targetMessage;
      }
    });

    return {
      code,
      message,
      fieldErrors: mappedFieldErrors,
      hasFieldInfo: Boolean(field) || errors.length > 0,
    };
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validateForm = () => {
    const next = {};
    if (!form.razonSocial) next.razonSocial = "La razón social es obligatoria";
    if (!form.nombreComercial) next.nombreComercial = "El nombre comercial es obligatorio";
    if (!form.direccion) next.direccion = "La dirección es obligatoria";
    if (!form.telefonoEmpresa) next.telefonoEmpresa = "El teléfono es obligatorio";
    if (form.telefonoEmpresa && !/^\d{10,15}$/.test(form.telefonoEmpresa.replace(/\D/g, ""))) {
      next.telefonoEmpresa = "El teléfono debe tener entre 10 y 15 dígitos";
    }
    if (form.rfc && (form.rfc.length < 12 || form.rfc.length > 13)) {
      next.rfc = "RFC debe tener 12 o 13 caracteres";
    }
    if (form.emailEmpresa && !/\S+@\S+\.\S+/.test(form.emailEmpresa)) {
      next.emailEmpresa = "Email de empresa inválido";
    }
    if (!form.nombreOwner) next.nombreOwner = "El nombre del propietario es obligatorio";
    if (!form.emailOwner) next.emailOwner = "El email del propietario es obligatorio";
    if (form.emailOwner && !/\S+@\S+\.\S+/.test(form.emailOwner)) next.emailOwner = "Email inválido";
    if (!form.whatsappOwner) next.whatsappOwner = "El WhatsApp es obligatorio";
    if (form.whatsappOwner && !/^\d{10,15}$/.test(form.whatsappOwner.replace(/\D/g, ""))) {
      next.whatsappOwner = "El WhatsApp debe tener entre 10 y 15 dígitos";
    }
    if (!form.password) next.password = "La contraseña es obligatoria";
    if (form.password && !passwordPattern.test(form.password)) {
      next.password = "Debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo";
    }
    if (!form.confirmarPassword) next.confirmarPassword = "Confirma la contraseña";
    if (form.password && form.confirmarPassword && form.password !== form.confirmarPassword) {
      next.confirmarPassword = "Las contraseñas no coinciden";
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateForm();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Revisa los campos marcados.");
      setShowLoginCta(false);
      return;
    }

    setError("");
    setSuccess("");
    setShowLoginCta(false);

    try {
      const data = await registerCompany({
        empresa: {
          razonSocial: form.razonSocial,
          nombreComercial: form.nombreComercial,
          direccion: form.direccion,
          ...(form.rfc && { rfc: form.rfc }),
          ...(form.emailEmpresa && { email: form.emailEmpresa }),
          telefono: form.telefonoEmpresa,
          ...(form.sitioWeb && { sitioWeb: form.sitioWeb }),
        },
        usuario: {
          nombre: form.nombreOwner,
          email: form.emailOwner,
          whatsapp: form.whatsappOwner,
          password: form.password,
        },
      });

      const accessToken = data?.token || data?.accessToken;
      const refreshToken = data?.refreshToken;
      const backendUser = data?.user || data?.usuario || null;
      const backendCompany = data?.company || data?.empresa || null;
      const decodedUser = decodeTokenPayload(accessToken);
      const hydratedUser = mergeAuthUser(backendUser, decodedUser, backendCompany);

      console.log("[RegisterCompany] respuesta", {
        hasAccessToken: Boolean(accessToken),
        hasRefreshToken: Boolean(refreshToken),
        userRole: hydratedUser?.role || hydratedUser?.rol || null,
        userCompanyId: hydratedUser?.companyId || hydratedUser?.empresaId || null,
        hasCompany: Boolean(backendCompany),
      });

      if (accessToken) {
        setToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);
        await refreshCsrfToken(API_URL);
        setStatus && setStatus("authenticated");
        setUser && setUser(hydratedUser);
        if (backendCompany) {
          setCompany && setCompany(backendCompany);
        }
        navigate("/register-success", { replace: true });
        return;
      }

      try {
        const loginResponse = await api.post("/auth/login", {
          email: form.emailOwner,
          password: form.password,
        });

        const loginAccessToken = loginResponse?.data?.accessToken || loginResponse?.data?.token;
        const loginRefreshToken = loginResponse?.data?.refreshToken;
        const loginUser = loginResponse?.data?.user || loginResponse?.data?.usuario || null;
        const loginCompany = loginResponse?.data?.company || loginResponse?.data?.empresa || backendCompany || null;
        const loginDecodedUser = decodeTokenPayload(loginAccessToken);
        const hydratedLoginUser = mergeAuthUser(loginUser, loginDecodedUser, loginCompany);

        if (loginAccessToken) {
          setToken(loginAccessToken);
          if (loginRefreshToken) setRefreshToken(loginRefreshToken);
          await refreshCsrfToken(API_URL);
          setStatus && setStatus("authenticated");
          setUser && setUser(hydratedLoginUser);
          if (loginCompany) {
            setCompany && setCompany(loginCompany);
          }
          navigate("/register-success", { replace: true });
          return;
        }
      } catch (loginError) {
        logger.warn("Registro exitoso pero auto-login falló", loginError);
      }

      setSuccess("Empresa creada correctamente. Redirigiendo al login...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      logger.error("Error en registro:", err.response?.data || err.message);
      const status = Number(err?.response?.status || 0);
      const standardizedError = parseStandardizedError(err);
      const standardizedCode = standardizedError?.code || "";

      if (
        (status === 400 || status === 403 || status === 409 || status >= 500 || standardizedCode === "EMAIL_ALREADY_EXISTS") &&
        form.emailOwner &&
        form.password
      ) {
        try {
          const loginResponse = await api.post("/auth/login", {
            email: form.emailOwner,
            password: form.password,
          });

          const loginAccessToken = loginResponse?.data?.accessToken || loginResponse?.data?.token;
          const loginRefreshToken = loginResponse?.data?.refreshToken;
          const loginUser = loginResponse?.data?.user || loginResponse?.data?.usuario || null;

          if (loginAccessToken) {
            setToken(loginAccessToken);
            if (loginRefreshToken) setRefreshToken(loginRefreshToken);
            await refreshCsrfToken(API_URL);
            setStatus && setStatus("authenticated");
            setUser && setUser(loginUser);
            navigate("/dashboard", { replace: true });
            return;
          }
        } catch {
        }
      }

      if (standardizedError) {
        const nextFieldErrors = { ...standardizedError.fieldErrors };

        if (standardizedCode === "EMAIL_ALREADY_EXISTS" && !nextFieldErrors.emailOwner) {
          nextFieldErrors.emailOwner = standardizedError.message || "Este correo ya está registrado. Inicia sesión.";
        }

        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...nextFieldErrors }));
        }

        setShowLoginCta(standardizedCode === "EMAIL_ALREADY_EXISTS");

        const standardizedMessage =
          standardizedError.message ||
          (standardizedError.hasFieldInfo ? "Revisa los campos marcados para continuar." : extractBackendMessage(err));

        setError(standardizedMessage);
        return;
      }

      const msg = extractBackendMessage(err);
      const backendFieldErrors = mapMessageToFieldErrors(msg);
      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...backendFieldErrors }));
      }

      if (status === 400 || status === 403 || status === 409 || status >= 500) {
        setFieldErrors((prev) => ({
          ...prev,
          emailOwner:
            prev.emailOwner ||
            "No se pudo registrar este correo. Puede que ya exista o que el servidor rechazara el alta. Si ya tienes cuenta, inicia sesión.",
        }));
      }

      setShowLoginCta(status === 409);
      setError(msg);
    }
  };

  // ─── Helpers de presentación ───────────────────────────────────────────────
  const inputCls = (hasError) =>
    `w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 px-4 border transition-all duration-200 focus:outline-none font-medium text-sm ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
        : "border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 hover:border-white/40"
    }`;

  const FieldError = ({ msg }) =>
    msg ? <p className="text-red-300 text-xs mt-1.5 font-medium">{msg}</p> : null;

  const SectionDivider = ({ label }) => (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 border-t border-white/[0.12]" />
      <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 border-t border-white/[0.12]" />
    </div>
  );

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      <LoginBackground />

      <div className="relative z-10 w-full px-4 flex items-center justify-center py-10">
        <div className="relative w-full max-w-2xl">

          {/* Outer ambient — wide violet haze */}
          <div
            className="pointer-events-none absolute -inset-20 rounded-3xl"
            style={{ background: "rgba(48,18,165,0.07)", filter: "blur(96px)" }}
          />

          {/* Inner ambient — tighter card separation */}
          <div
            className="pointer-events-none absolute -inset-8 rounded-3xl"
            style={{ background: "rgba(62,30,190,0.13)", filter: "blur(60px)" }}
          />

          {/* Glass card */}
          <div
            className={`relative z-10 rounded-3xl border border-white/[0.20] backdrop-blur-2xl p-8 sm:p-10 transition-all duration-500 ease-out transform ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.034) 100%)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.14) inset, " +
                "0 48px 96px rgba(0,0,0,0.65), " +
                "0 0 72px rgba(55,25,175,0.14)",
            }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src={logo} alt="Logo Brentrix" className="h-16 w-16 object-contain" />
            </div>

            {/* Heading */}
            <h1 className="text-center text-3xl font-extrabold text-white mb-1 tracking-tight">
              Crear empresa
            </h1>
            <p className="text-center text-sm text-white/60 mb-8">
              Registra tu empresa en Brentrix
            </p>

            <form className="space-y-4 w-full" onSubmit={handleSubmit}>

              {/* ── Empresa ─────────────────────────────────────────────── */}
              <SectionDivider label="Datos de la empresa" />

              <div>
                <input
                  type="text"
                  name="razonSocial"
                  placeholder="Razón social *"
                  autoComplete="organization"
                  className={inputCls(!!fieldErrors.razonSocial)}
                  value={form.razonSocial}
                  onChange={handleChange}
                />
                <FieldError msg={fieldErrors.razonSocial} />
              </div>

              <div>
                <input
                  type="text"
                  name="nombreComercial"
                  placeholder="Nombre comercial *"
                  autoComplete="off"
                  className={inputCls(!!fieldErrors.nombreComercial)}
                  value={form.nombreComercial}
                  onChange={handleChange}
                />
                <FieldError msg={fieldErrors.nombreComercial} />
              </div>

              <div>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Dirección *"
                  autoComplete="street-address"
                  className={inputCls(!!fieldErrors.direccion)}
                  value={form.direccion}
                  onChange={handleChange}
                />
                <FieldError msg={fieldErrors.direccion} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    name="rfc"
                    placeholder="RFC (opcional)"
                    autoComplete="off"
                    className={inputCls(!!fieldErrors.rfc)}
                    value={form.rfc}
                    onChange={handleChange}
                  />
                  <FieldError msg={fieldErrors.rfc} />
                </div>
                <div>
                  <input
                    type="email"
                    name="emailEmpresa"
                    placeholder="Email empresa (opcional)"
                    autoComplete="off"
                    className={inputCls(!!fieldErrors.emailEmpresa)}
                    value={form.emailEmpresa}
                    onChange={handleChange}
                  />
                  <FieldError msg={fieldErrors.emailEmpresa} />
                </div>
                <div>
                  <input
                    type="tel"
                    name="telefonoEmpresa"
                    placeholder="Teléfono *"
                    autoComplete="tel"
                    className={inputCls(!!fieldErrors.telefonoEmpresa)}
                    value={form.telefonoEmpresa}
                    onChange={handleChange}
                  />
                  <FieldError msg={fieldErrors.telefonoEmpresa} />
                </div>
                <div>
                  <input
                    type="text"
                    name="sitioWeb"
                    placeholder="Sitio web (opcional)"
                    autoComplete="url"
                    className={inputCls(false)}
                    value={form.sitioWeb}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* ── Propietario ──────────────────────────────────────────── */}
              <SectionDivider label="Datos del propietario" />

              <div>
                <input
                  type="text"
                  name="nombreOwner"
                  placeholder="Nombre completo *"
                  autoComplete="name"
                  className={inputCls(!!fieldErrors.nombreOwner)}
                  value={form.nombreOwner}
                  onChange={handleChange}
                />
                <FieldError msg={fieldErrors.nombreOwner} />
              </div>

              <div>
                <input
                  type="email"
                  name="emailOwner"
                  placeholder="Correo electrónico *"
                  autoComplete="email"
                  className={inputCls(!!fieldErrors.emailOwner)}
                  value={form.emailOwner}
                  onChange={handleChange}
                />
                <FieldError msg={fieldErrors.emailOwner} />
              </div>

              <div>
                <input
                  type="tel"
                  name="whatsappOwner"
                  placeholder="WhatsApp *"
                  autoComplete="tel"
                  className={inputCls(!!fieldErrors.whatsappOwner)}
                  value={form.whatsappOwner}
                  onChange={handleChange}
                />
                <FieldError msg={fieldErrors.whatsappOwner} />
              </div>

              <div>
                <input
                  type="password"
                  name="password"
                  placeholder="Contraseña *"
                  autoComplete="new-password"
                  className={inputCls(!!fieldErrors.password)}
                  value={form.password}
                  onChange={handleChange}
                />
                {!fieldErrors.password && (
                  <p className="text-white/40 text-xs mt-1.5">
                    Mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.
                  </p>
                )}
                <FieldError msg={fieldErrors.password} />
              </div>

              <div>
                <input
                  type="password"
                  name="confirmarPassword"
                  placeholder="Confirmar contraseña *"
                  autoComplete="new-password"
                  className={inputCls(!!fieldErrors.confirmarPassword)}
                  value={form.confirmarPassword}
                  onChange={handleChange}
                />
                <FieldError msg={fieldErrors.confirmarPassword} />
              </div>

              {/* Error general */}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm text-center font-medium">
                  {error}
                  {showLoginCta && (
                    <>
                      {" "}
                      <Link
                        to="/login"
                        className="text-sky-300 hover:text-sky-200 font-semibold underline"
                      >
                        Ir a iniciar sesión
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* Éxito */}
              {success && (
                <p className="text-sky-300 text-sm text-center font-medium">{success}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full h-11 mt-2 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 active:scale-95 transition-all duration-200 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30"
              >
                Crear empresa
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-xs text-white/60 mt-6">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/login"
                className="text-sky-300 hover:text-sky-200 font-semibold transition-colors"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
