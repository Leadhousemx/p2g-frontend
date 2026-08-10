import { logger } from "../lib/logger";
// src/pages/PerfilUsuario.jsx
import { useState, useEffect } from "react";
import { Button, Input, Label } from "@/components/ui";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import ContentShell from "../components/common/ContentShell";
import FormActionsBar from "../components/common/forms/FormActionsBar";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import { getMyProfile, updateMyProfile, changePassword } from "../services/userService";
export default function PerfilUsuario() {
  // Estados de datos del perfil
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  // Estados de cambio de contraseña
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Estados de UI
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Cargar perfil al montar
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const profile = await getMyProfile();
      setNombre(profile.nombre || "");
      setEmail(profile.email || "");
      setTelefono(profile.telefono || "");
    } catch (err) {
      logger.error("Error loading profile:", err);
      setErrorMessage("Error al cargar el perfil. Intenta recargar la página.");
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = "Nombre requerido";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Correo inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePassword = () => {
    const e = {};
    if (!passwordActual.trim()) e.passwordActual = "Contraseña actual requerida";
    if (!passwordNuevo.trim() || passwordNuevo.length < 6) {
      e.passwordNuevo = "La nueva contraseña debe tener al menos 6 caracteres";
    }
    if (passwordNuevo !== passwordConfirm) {
      e.passwordConfirm = "Las contraseñas no coinciden";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;

    try {
      setSaving(true);
      setSuccessMessage("");
      setErrorMessage("");

      await updateMyProfile({
        nombre,
        email,
        telefono,
      });

      setSuccessMessage("Perfil actualizado correctamente");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      logger.error("Error updating profile:", err);
      setErrorMessage(err?.response?.data?.message || "Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    try {
      setSavingPassword(true);
      setSuccessMessage("");
      setErrorMessage("");

      await changePassword({
        passwordActual,
        passwordNuevo,
      });

      setSuccessMessage("Contraseña cambiada correctamente");
      setPasswordActual("");
      setPasswordNuevo("");
      setPasswordConfirm("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      logger.error("Error changing password:", err);
      setErrorMessage(err?.response?.data?.message || "Error al cambiar la contraseña. Verifica tu contraseña actual.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <ContentShell className="min-h-full bg-[#F4F6F9] py-4 sm:py-5 lg:py-6" padding="responsive">
        <FormPageShell
          title="Mi Perfil"
          description="Administra tus datos personales y mantén actualizadas tus credenciales de acceso sin salir de la misma vista."
          className="max-w-4xl"
        >
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Cargando perfil</p>
                <p className="text-sm text-[#64748B]">Estamos preparando tu información personal.</p>
              </div>
            </div>
          </div>
        </FormPageShell>
      </ContentShell>
    );
  }

  return (
    <ContentShell className="min-h-full bg-[#F4F6F9] py-4 sm:py-5 lg:py-6" padding="responsive">
      <FormPageShell
        title="Mi Perfil"
        description="Administra tus datos personales y mantén actualizadas tus credenciales de acceso sin salir de la misma vista."
        className="max-w-4xl space-y-5 lg:space-y-6"
      >

        {(successMessage || errorMessage) && (
          <div className="space-y-3">
            {successMessage && (
              <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-green-900">Éxito</p>
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-5 lg:space-y-6">
          {/* Sección: Datos del Perfil */}
          <form onSubmit={handleSubmitProfile}>
            <FormSection
              title="Datos del Usuario"
              description="Actualiza tu información de contacto manteniendo intacto el comportamiento actual de guardado."
            >
              <FieldGrid>
                <div>
                  <Label htmlFor="nombre">Nombre Completo *</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={errors.nombre ? "border-red-500" : ""}
                  />
                  {errors.nombre && <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </FieldGrid>
              <FormActionsBar>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
                </Button>
              </FormActionsBar>
            </FormSection>
          </form>

          {/* Sección: Cambiar Contraseña */}
          <form onSubmit={handleSubmitPassword}>
            <FormSection
              title="Cambiar Contraseña"
              description="Actualiza tus credenciales manteniendo intactas las validaciones y el flujo actual del módulo."
            >
              <FieldGrid>
                <div className="md:col-span-2">
                  <Label htmlFor="passwordActual">Contraseña Actual *</Label>
                  <Input
                    id="passwordActual"
                    type="password"
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    className={errors.passwordActual ? "border-red-500" : ""}
                    placeholder="Ingresa tu contraseña actual"
                  />
                  {errors.passwordActual && (
                    <p className="text-red-600 text-sm mt-1">{errors.passwordActual}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="passwordNuevo">Nueva Contraseña *</Label>
                  <Input
                    id="passwordNuevo"
                    type="password"
                    value={passwordNuevo}
                    onChange={(e) => setPasswordNuevo(e.target.value)}
                    className={errors.passwordNuevo ? "border-red-500" : ""}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {errors.passwordNuevo && (
                    <p className="text-red-600 text-sm mt-1">{errors.passwordNuevo}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="passwordConfirm">Confirmar Nueva Contraseña *</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className={errors.passwordConfirm ? "border-red-500" : ""}
                    placeholder="Repite la nueva contraseña"
                  />
                  {errors.passwordConfirm && (
                    <p className="text-red-600 text-sm mt-1">{errors.passwordConfirm}</p>
                  )}
                </div>
              </FieldGrid>
              <FormActionsBar>
                <Button type="submit" disabled={savingPassword} variant="secondary">
                  {savingPassword ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    "Cambiar Contraseña"
                  )}
                </Button>
              </FormActionsBar>
            </FormSection>
          </form>
        </div>
      </FormPageShell>
    </ContentShell>
  );
}
