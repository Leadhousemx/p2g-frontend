import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Save, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/auth-context";
import { ValidationErrorModal } from "../components/common/ValidationErrorModal";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormActionsBar from "../components/common/forms/FormActionsBar";
import { useValidationError } from "../hooks/useValidationError";
import { Button, Input, Label } from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "../components/ui/select";
import { createProveedor } from "../services/proveedoresService";
import { preventEnterFormSubmit } from "../utils/formGuards";
import { logger } from "../lib/logger";
import { removeToken } from "../utils/tokenManager";
const RFC_REGEX = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/i;
const RFC_GENERICO = "XAXX010101000";

const schema = z.object({
  nombreComercial: z.string().min(2, "Mínimo 2 caracteres"),
  razonSocial: z.string().min(2, "Mínimo 2 caracteres"),
  rfc: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => {
        if (!value || value.trim() === "") return true; // Permitir vacío
        return RFC_REGEX.test(value);
      },
      { message: "RFC inválido (12-13 caracteres)" }
    ),
  telefono: z.string().regex(/^[\d]{7,15}$/, "Teléfono inválido (7-15 dígitos)"),
  email: z.string().email("Correo electrónico inválido"),
  contactoNombre: z.string().min(3, "Mínimo 3 caracteres"),
  formaPago: z.enum(["contado", "credito"]),
});

type NuevoProveedorForm = z.infer<typeof schema>;

export default function NuevoProveedorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = typeof (location.state as any)?.returnTo === "string"
    ? (location.state as any).returnTo
    : "/proveedores";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();
  const auth: any = useAuth();

  const form = useForm<NuevoProveedorForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreComercial: "",
      razonSocial: "",
      rfc: "",
      telefono: "",
      email: "",
      contactoNombre: "",
      formaPago: "contado",
    },
    mode: "onTouched",
  });

  const onSubmit = async (data: NuevoProveedorForm) => {
    setLoading(true);
    setError("");
    try {
      let rfc = (data.rfc || "").trim().toUpperCase();
      if (!rfc) {
        rfc = RFC_GENERICO;
      }
      // Obtener empresaId del contexto de auth
      const empresaId =
        auth?.company?._id ||
        auth?.company?.id ||
        auth?.user?.empresaId ||
        auth?.user?.companyId;
      if (!empresaId) {
        setError("No se pudo determinar la empresa activa. Vuelve a iniciar sesión.");
        setLoading(false);
        return;
      }
      const createdResponse = await createProveedor({
        ...data,
        nombre: data.nombreComercial,
        rfc,
        empresaId,
      });

      const createdProveedor =
        (createdResponse as any)?.proveedor ||
        (createdResponse as any)?.data?.proveedor ||
        createdResponse;
      const nuevoProveedorId =
        (createdProveedor as any)?._id || (createdProveedor as any)?.id;

      if (returnTo.startsWith("/compras/nueva")) {
        navigate(returnTo, {
          replace: true,
          state: nuevoProveedorId
            ? {
                nuevoProveedorId,
                nuevoProveedorNombre: data.nombreComercial,
              }
            : null,
        });
      } else {
        navigate(returnTo);
      }
    } catch (err: any) {
      logger.error("Error creating proveedor:", err);
      const status = Number(err?.response?.status || 0);
      if (status === 401) {
        removeToken();
        sessionStorage.removeItem("authUser");
        sessionStorage.removeItem("authCompany");
        localStorage.removeItem("user");
        setError("Tu sesión expiró. Inicia sesión nuevamente.");
        navigate("/login", { replace: true });
        return;
      }
      // Mostrar mensaje real y JSON completo del backend si existe
      let backendMsg = err?.response?.data?.message || err?.response?.data?.msg || err?.message || err?.toString();
      let backendJson = "";
      if (err?.response?.data) {
        try {
          backendJson = JSON.stringify(err.response.data, null, 2);
        } catch {}
      }
      setError(`[API] ${backendMsg}${backendJson ? '\nDetalles: ' + backendJson : ''}`);
      handleError(err);
      if (!errorMessage && !backendMsg) {
        setError("Error al crear el proveedor. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <FormPageShell
      actions={
        <Link to={returnTo}>
          <Button variant="outline" className="w-full sm:w-auto">
            <XCircle className="w-4 h-4" />
            Cancelar
          </Button>
        </Link>
      }
    >

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error al crear proveedor</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={preventEnterFormSubmit}
        className="space-y-5"
        autoComplete="off"
      >
        <FormSection
          title="Datos generales"
          description="Información de identificación, contacto y datos fiscales del proveedor."
        >
          <FieldGrid>
            <div className="space-y-2">
              <Label htmlFor="nombreComercial">Nombre comercial *</Label>
              <Input
                id="nombreComercial"
                {...form.register("nombreComercial")}
                aria-label="Nombre comercial"
                autoFocus
                placeholder="Ej: Restaurante XYZ"
              />
              {form.formState.errors.nombreComercial && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.nombreComercial.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón social *</Label>
              <Input
                id="razonSocial"
                {...form.register("razonSocial")}
                aria-label="Razón social"
                placeholder="Ej: Grupo XYZ S.A. de C.V."
              />
              {form.formState.errors.razonSocial && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.razonSocial.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <Input
                id="rfc"
                {...form.register("rfc")}
                aria-label="RFC"
                maxLength={13}
                className="uppercase"
                placeholder={RFC_GENERICO}
              />
              {form.formState.errors.rfc && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.rfc.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                {...form.register("telefono")}
                aria-label="Teléfono"
                maxLength={15}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="5551234567"
              />
              {form.formState.errors.telefono && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.telefono.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico *</Label>
              <Input
                id="email"
                {...form.register("email")}
                aria-label="Correo electrónico"
                type="email"
                placeholder="contacto@proveedor.com"
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactoNombre">Nombre de contacto *</Label>
              <Input
                id="contactoNombre"
                {...form.register("contactoNombre")}
                aria-label="Nombre de contacto"
                placeholder="Ej: Juan Pérez"
              />
              {form.formState.errors.contactoNombre && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.contactoNombre.message}</p>
              )}
            </div>
          </FieldGrid>
        </FormSection>

        <FormSection
          title="Condiciones comerciales"
          description="Configuración mínima necesaria para registrar el proveedor en el sistema."
        >
          <FieldGrid>
            <div className="space-y-2">
              <Label htmlFor="formaPago">Forma de pago *</Label>
              <Select
                onValueChange={(v: string) => form.setValue("formaPago", v as "contado" | "credito")}
                value={form.watch("formaPago")}
                name="formaPago"
                aria-label="Forma de pago"
              >
                <SelectTrigger id="formaPago">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contado">Al contado</SelectItem>
                  <SelectItem value="credito">A crédito</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.formaPago && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.formaPago.message}</p>
              )}
            </div>
          </FieldGrid>
        </FormSection>

        <FormSection contentClassName="pt-5">
          <FormActionsBar className="border-t-0 pt-0">
            <Link to={returnTo}>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="gap-2 w-full sm:w-auto">
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : "Guardar Proveedor"}
            </Button>
          </FormActionsBar>
        </FormSection>
      </form>

      <ValidationErrorModal
        isOpen={showModal}
        onClose={closeModal}
        fields={validationFields}
        title="Datos incompletos"
      />
    </FormPageShell>
    </>
  );
}
