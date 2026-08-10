import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Upload, X } from "lucide-react";
import ContentShell from "../components/common/ContentShell";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormActionsBar from "../components/common/forms/FormActionsBar";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { useAuth } from "../context/auth-context";
import { canManageCompany, canManageUsers, isAdminRole } from "../utils/rolePermissions";

const ConfigurationSchema = z.object({
  razonSocial: z.string().min(1, "Razón social es requerida"),
  nombreComercial: z.string().min(1, "Nombre comercial es requerido"),
  direccion: z.string().min(1, "Dirección es requerida"),
  rfc: z.string().max(13, "RFC máximo 13 caracteres").optional().or(z.literal("")),
  email: z.string().email("Email no válido").optional().or(z.literal("")),
  telefono: z.string().min(1, "Teléfono es requerido"),
  sitioWeb: z.string().min(1, "Sitio web es requerido"),
  aviso: z.string().min(1, "Aviso de privacidad es requerido"),
  logoUrl: z.string().optional().or(z.literal("")),
  firmaUrl: z.string().optional().or(z.literal("")),
});

type ConfigType = z.infer<typeof ConfigurationSchema>;

export default function Configuracion() {
  const location = useLocation();
  const { user } = (useAuth() || {}) as { user?: any };
  const isAdmin = isAdminRole(user);
  const canEditCompany = isAdmin || canManageCompany(user);
  const canSeeUsers = isAdmin || canManageUsers(user);
  const activeTab = location.pathname.includes("/configuracion/usuarios") ? "usuarios" : "empresa";

  const {
    config,
    loading,
    error: hookError,
    errorStatus,
    errorCode,
    load,
    update,
  } = useConfiguracion();
  const [reloadKey, setReloadKey] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const firmaInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ConfigType>({
    resolver: zodResolver(ConfigurationSchema),
    defaultValues: {
      razonSocial: "",
      nombreComercial: "",
      direccion: "",
      rfc: "",
      email: "",
      telefono: "",
      sitioWeb: "",
      aviso: "",
      logoUrl: "",
      firmaUrl: "",
    },
  });

  useEffect(() => {
    let active = true;

    const loadEmpresaConfig = async () => {
      try {
        console.log("[Configuracion] GET empresa config start");
        const data = await load();
        console.log("[Configuracion] GET empresa config success", {
          empresaId: data?.empresaId || data?._id,
          razonSocial: data?.razonSocial,
        });

        if (!active || !data) return;

        form.reset({
          razonSocial: data.razonSocial || "",
          nombreComercial: data.nombreComercial || "",
          direccion: data.direccion || "",
          rfc: data.rfc || "",
          email: data.email || "",
          telefono: data.telefono || "",
          sitioWeb: data.sitioWeb || "",
          aviso: data.aviso || "",
          logoUrl: data.logoUrl || "",
          firmaUrl: data.firmaUrl || "",
        });
        setLogoPreview(data.logoUrl || null);
        setFirmaPreview(data.firmaUrl || null);
      } catch (err: any) {
        console.log("[Configuracion] GET empresa config error", {
          status: err?.response?.status,
          code: err?.response?.data?.error?.code || err?.response?.data?.code,
          message: err?.response?.data?.message || err?.message,
        });
      }
    };

    loadEmpresaConfig();

    return () => {
      active = false;
    };
  }, [load, form, reloadKey]);

  const handleRetryLoad = () => {
    setReloadKey((prev) => prev + 1);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setLogoPreview(base64);
        form.setValue("logoUrl", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFirmaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFirmaPreview(base64);
        form.setValue("firmaUrl", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ConfigType) => {
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const rfcValue = data.rfc && data.rfc.length > 0 ? data.rfc : undefined;
      if (rfcValue && (rfcValue.length < 12 || rfcValue.length > 13)) {
        setSaveError("RFC debe tener 12 o 13 caracteres");
        return;
      }

      const payload = {
        razonSocial: data.razonSocial,
        nombreComercial: data.nombreComercial,
        direccion: data.direccion,
        ...(rfcValue && { rfc: rfcValue }),
        ...(data.email && { email: data.email }),
        telefono: data.telefono,
        sitioWeb: data.sitioWeb,
        aviso: data.aviso,
        ...(data.logoUrl && { logoUrl: data.logoUrl }),
        ...(data.firmaUrl && { firmaUrl: data.firmaUrl }),
      };

      await update(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Error al guardar configuración");
    }
  };

  if (loading && !config) {
    return (
      <ContentShell
        as="section"
        padding="responsive"
        className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col bg-[#F4F6F9] py-4 sm:py-5"
      >
        <FormPageShell
          title="Configuración de Empresa"
          description="Administra los datos principales de la empresa, documentos legales e imágenes institucionales desde una vista optimizada para mobile y desktop."
          className="max-w-5xl"
        >
          <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-200 animate-pulse" />
            ))}
          </div>
        </FormPageShell>
      </ContentShell>
    );
  }

  return (
    <ContentShell
      as="section"
      padding="responsive"
      className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col bg-[#F4F6F9] py-4 sm:py-5"
    >
      <div className="mx-auto mb-4 w-full max-w-5xl sm:mb-6">
        <div className="inline-flex w-full items-center gap-1 overflow-x-auto rounded-2xl bg-gray-100 p-1 sm:w-auto">
          <Link
            to="/configuracion"
            className={`px-3 py-1.5 text-sm rounded-xl transition ${
              activeTab === "empresa"
                ? "bg-white shadow text-[#2563eb]"
                : "text-gray-600 hover:bg-white/60"
            }`}
          >
            Empresa
          </Link>
          {canSeeUsers && (
            <Link
              to="/configuracion/usuarios"
              className={`px-3 py-1.5 text-sm rounded-xl transition ${
                activeTab === "usuarios"
                  ? "bg-white shadow text-[#2563eb]"
                  : "text-gray-600 hover:bg-white/60"
              }`}
            >
              Usuarios
            </Link>
          )}
        </div>
      </div>

      <FormPageShell
        title="Configuración de Empresa"
        description="Administra los datos principales de la empresa, documentos legales e imágenes institucionales desde una vista optimizada para mobile y desktop."
        className="max-w-5xl"
      >
        <div className="space-y-4">
          {!canEditCompany && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-amber-700 text-sm font-medium">No tienes permisos para cambiar la configuración de la empresa.</p>
            </div>
          )}

          {hookError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">
                  {errorStatus === 404 || errorCode === "COMPANY_NOT_FOUND"
                    ? "Empresa no encontrada"
                    : errorStatus === 403
                    ? "Sin permisos"
                    : "Error"}
                </p>
                <p className="text-red-700 text-sm">
                  {errorStatus === 404 || errorCode === "COMPANY_NOT_FOUND"
                    ? "No se encontró la empresa asociada a tu cuenta. Verifica el registro y vuelve a intentar."
                    : errorStatus === 403
                    ? "No tienes permisos para ver la configuración de la empresa."
                    : hookError}
                </p>
                {(errorStatus === 404 || errorCode === "COMPANY_NOT_FOUND") && (
                  <button
                    type="button"
                    onClick={handleRetryLoad}
                    className="mt-3 px-3 py-1.5 text-sm border border-red-300 rounded-lg text-red-700 hover:bg-red-100"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}

          {saveError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Error al guardar</p>
                <p className="text-red-700 text-sm">{saveError}</p>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
              <p className="text-green-700 font-semibold">✓ Configuración guardada correctamente</p>
            </div>
          )}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 lg:space-y-7">
          <fieldset disabled={!canEditCompany} className="space-y-6 lg:space-y-7">
        {/* Información Básica */}
        <FormSection
          title="Información Básica"
          description="Datos principales de la empresa para identificación, contacto y presentación institucional."
        >
          <FieldGrid>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Razón Social *
              </label>
              <input
                {...form.register("razonSocial")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre oficial de la empresa"
              />
              {form.formState.errors.razonSocial && (
                <p className="text-red-500 text-sm">{form.formState.errors.razonSocial.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Nombre Comercial *
              </label>
              <input
                {...form.register("nombreComercial")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre bajo el que operan"
              />
              {form.formState.errors.nombreComercial && (
                <p className="text-red-500 text-sm">{form.formState.errors.nombreComercial.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Dirección *</label>
              <input
                {...form.register("direccion")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Calle, número, ciudad, estado, CP"
              />
              {form.formState.errors.direccion && (
                <p className="text-red-500 text-sm">{form.formState.errors.direccion.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                RFC <span className="text-gray-500 text-xs">(12-13 caracteres, opcional)</span>
              </label>
              <input
                {...form.register("rfc")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="XXXXXXXXXXXXXXXX"
                maxLength={13}
              />
              {form.formState.errors.rfc && (
                <p className="text-red-500 text-sm">{form.formState.errors.rfc.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                {...form.register("email")}
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="contacto@empresa.com"
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Teléfono *</label>
              <input
                {...form.register("telefono")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+52 1234567890"
              />
              {form.formState.errors.telefono && (
                <p className="text-red-500 text-sm">{form.formState.errors.telefono.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Sitio Web *</label>
              <input
                {...form.register("sitioWeb")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.ejemplo.com"
              />
              {form.formState.errors.sitioWeb && (
                <p className="text-red-500 text-sm">{form.formState.errors.sitioWeb.message}</p>
              )}
            </div>
          </FieldGrid>
        </FormSection>

        {/* Aviso de Privacidad */}
        <FormSection
          title="Documentos Legales"
          description="Mantén actualizado el contenido legal que acompaña la operación y comunicación institucional de la empresa."
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Aviso de Privacidad *</label>
            <textarea
              {...form.register("aviso")}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Inserta tu aviso de privacidad completo aquí..."
            />
            {form.formState.errors.aviso && (
              <p className="text-red-500 text-sm">{form.formState.errors.aviso.message}</p>
            )}
          </div>
        </FormSection>

        {/* Logo y Firma */}
        <FormSection
          title="Imágenes"
          description="Administra el logo institucional y la firma digital conservando la previsualización antes de guardar cambios."
        >
          <FieldGrid>
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Logo (PNG/JPG, opcional)</label>
                <p className="text-xs text-[#64748B]">Se usa en documentos y elementos institucionales de la empresa.</p>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoSelect}
                className="hidden"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-white sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  Subir Logo
                </button>
                {logoPreview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(null);
                      form.setValue("logoUrl", "");
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 sm:w-auto"
                  >
                    <X className="w-4 h-4" />
                    Eliminar
                  </button>
                ) : null}
              </div>
              {logoPreview ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-sm text-gray-600">Previsualización del logo:</p>
                  <div className="flex min-h-[8rem] items-center justify-center overflow-hidden rounded-lg bg-gray-50 p-3">
                    <img src={logoPreview} alt="Logo preview" className="max-h-32 w-auto object-contain" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Firma Digital (PNG/JPG, opcional)</label>
                <p className="text-xs text-[#64748B]">Se utiliza en documentos que requieran representación visual de firma.</p>
              </div>
              <input
                ref={firmaInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFirmaSelect}
                className="hidden"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => firmaInputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-white sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  Subir Firma
                </button>
                {firmaPreview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFirmaPreview(null);
                      form.setValue("firmaUrl", "");
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 sm:w-auto"
                  >
                    <X className="w-4 h-4" />
                    Eliminar
                  </button>
                ) : null}
              </div>
              {firmaPreview ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-sm text-gray-600">Previsualización de la firma:</p>
                  <div className="flex min-h-[8rem] items-center justify-center overflow-hidden rounded-lg bg-gray-50 p-3">
                    <img src={firmaPreview} alt="Firma preview" className="max-h-32 w-auto object-contain" />
                  </div>
                </div>
              ) : null}
            </div>
          </FieldGrid>
        </FormSection>

        {/* Submit Button */}
        <FormActionsBar>
          <button
            type="submit"
            disabled={form.formState.isSubmitting || !canEditCompany}
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-400 sm:w-auto"
          >
            {form.formState.isSubmitting ? "Guardando..." : "Guardar Configuración"}
          </button>
        </FormActionsBar>
          </fieldset>
        </form>
      </FormPageShell>
    </ContentShell>
  );
}
