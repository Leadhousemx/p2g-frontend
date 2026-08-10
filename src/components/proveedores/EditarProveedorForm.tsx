import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Label } from "@/components/ui";
import { ValidationErrorModal } from "../common/ValidationErrorModal";
import { useValidationError } from "../../hooks/useValidationError";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "../ui/select";
import { AlertCircle, Save, XCircle } from "lucide-react";
import { getProveedor, updateProveedor, ProveedorDetalle } from "../../services/proveedoresService";
import { useAuth } from "../../context/auth-context";
import { preventEnterFormSubmit } from "../../utils/formGuards";
import { logger } from "../../lib/logger";
const RFC_REGEX = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/i;

const schema = z.object({
  nombreComercial: z.string().min(2, "Mínimo 2 caracteres"),
  razonSocial: z.string().min(2, "Mínimo 2 caracteres"),
  rfc: z.string().regex(RFC_REGEX, "RFC inválido (12-13 caracteres)").min(12).max(13),
  telefono: z.string().regex(/^\d{7,15}$/, "Teléfono inválido (7-15 dígitos)"),
  email: z.string().email("Correo electrónico inválido"),
  contactoNombre: z.string().min(3, "Mínimo 3 caracteres"),
  formaPago: z.enum(["contado", "credito"]),
  activo: z.boolean(),
});

type EditarProveedorForm = z.infer<typeof schema>;

interface EditarProveedorFormProps {
  id: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditarProveedorForm({ id, onSuccess, onCancel }: EditarProveedorFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [not404, setNot404] = useState(false);
  const [proveedor, setProveedor] = useState<ProveedorDetalle | null>(null);
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();
  const auth = useAuth();

  const form = useForm<EditarProveedorForm>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  // Load proveedor data on mount
  useEffect(() => {
    const loadProveedor = async () => {
      setLoadingData(true);
      try {
        const data = await getProveedor(id);
        setProveedor(data);
        form.reset({
          nombreComercial: data.nombreComercial,
          razonSocial: data.razonSocial,
          rfc: data.rfc,
          telefono: data.telefono,
          email: data.email,
          contactoNombre: data.contactoNombre,
          formaPago: data.formaPago,
          activo: data.activo,
        });
      } catch (err: any) {
        logger.error("Error loading proveedor:", err);
        if (err?.response?.status === 404) {
          setNot404(true);
        } else {
          setError("Error al cargar el proveedor. Intenta de nuevo.");
        }
      } finally {
        setLoadingData(false);
      }
    };

    loadProveedor();
  }, [id, form]);

  const onSubmit = async (data: EditarProveedorForm) => {
    setLoading(true);
    setError("");

    try {
      // Obtener empresaId del contexto de auth
      const empresaId = auth?.company?._id || auth?.company?.id || auth?.user?.empresaId;
      if (!empresaId) {
        setError("No se pudo determinar la empresa activa. Vuelve a iniciar sesión.");
        setLoading(false);
        return;
      }
      // Enviar solo los campos editables en payload mínimo
      const payload = {
        nombreComercial: data.nombreComercial,
        razonSocial: data.razonSocial,
        rfc: data.rfc.toUpperCase(),
        telefono: data.telefono,
        email: data.email,
        contactoNombre: data.contactoNombre,
        formaPago: data.formaPago,
        activo: data.activo,
        empresaId,
      };

      await updateProveedor(id, payload);
      onSuccess?.();
    } catch (err: any) {
      logger.error("Error updating proveedor:", err);
      handleError(err);
      if (!errorMessage) {
        setError("Error al actualizar el proveedor. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (not404) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">
            Proveedor no encontrado
          </h2>
          <p className="text-red-700 mb-6">
            El proveedor que intentas editar no existe o ha sido eliminado.
          </p>
          <Button variant="outline" onClick={onCancel}>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error al actualizar</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {proveedor && (
        <div className="space-y-4">
          {/* Estadísticas */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Resumen</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-600 text-xs uppercase">Compras realizadas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {proveedor.cantidadCompras ?? 0}
                </p>
              </div>
              <div>
                <p className="text-blue-600 text-xs uppercase">Total de compras</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${(proveedor.totalCompras ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={preventEnterFormSubmit}
        className="bg-white rounded-lg shadow p-6 space-y-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombreComercial">Nombre comercial * <span className="text-xs text-gray-500">(único por empresa)</span></Label>
            <Input
              id="nombreComercial"
              {...form.register("nombreComercial")}
              placeholder="Ej: Restaurante XYZ"
              autoFocus
            />
            {form.formState.errors.nombreComercial && (
              <p className="text-sm text-red-600">
                {form.formState.errors.nombreComercial.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="razonSocial">Razón social *</Label>
            <Input
              id="razonSocial"
              {...form.register("razonSocial")}
              placeholder="Ej: Grupo XYZ S.A. de C.V."
            />
            {form.formState.errors.razonSocial && (
              <p className="text-sm text-red-600">
                {form.formState.errors.razonSocial.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rfc">RFC *</Label>
            <Input
              id="rfc"
              {...form.register("rfc")}
              placeholder="XXXXXX000XXX"
              maxLength={13}
              className="uppercase"
            />
            {form.formState.errors.rfc && (
              <p className="text-sm text-red-600">
                {form.formState.errors.rfc.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono *</Label>
            <Input
              id="telefono"
              {...form.register("telefono")}
              placeholder="5551234567"
              maxLength={15}
              inputMode="numeric"
            />
            {form.formState.errors.telefono && (
              <p className="text-sm text-red-600">
                {form.formState.errors.telefono.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              {...form.register("email")}
              placeholder="contacto@proveedor.com"
              type="email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactoNombre">Nombre de contacto *</Label>
            <Input
              id="contactoNombre"
              {...form.register("contactoNombre")}
              placeholder="Ej: Juan Pérez"
            />
            {form.formState.errors.contactoNombre && (
              <p className="text-sm text-red-600">
                {form.formState.errors.contactoNombre.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="formaPago">Forma de pago *</Label>
            <Select
              value={form.watch("formaPago")}
              onValueChange={(value: string) => form.setValue("formaPago", value as any)}
            >
              <SelectTrigger id="formaPago">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contado">Al contado</SelectItem>
                <SelectItem value="credito">A crédito</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.formaPago && (
              <p className="text-sm text-red-600">
                {form.formState.errors.formaPago.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="activo">Estado *</Label>
            <Select
              value={form.watch("activo") ? "activo" : "inactivo"}
              onValueChange={(value: string) => form.setValue("activo", value === "activo")}
            >
              <SelectTrigger id="activo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            <XCircle className="w-4 h-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !form.formState.isDirty}>
            <Save className="w-4 h-4" />
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <ValidationErrorModal
        isOpen={showModal}
        onClose={closeModal}
        fields={validationFields}
        title="Datos incompletos"
      />
    </div>
    </>
  );
}
