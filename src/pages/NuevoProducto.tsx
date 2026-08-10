import { useState } from "react";
import { removeToken } from "../utils/tokenManager";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle, Save, XCircle } from "lucide-react";
import { ValidationErrorModal } from "../components/common/ValidationErrorModal";
import { useValidationError } from "../hooks/useValidationError";
import { createProducto } from "../services/productsService";
import { Button, Input, Label } from "@/components/ui";
import Textarea from "../components/ui/textarea";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormActionsBar from "../components/common/forms/FormActionsBar";

const NuevoProductoSchema = z.object({
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  precioUnitario: z.number().min(0, "Precio no puede ser negativo").optional(),
  descripcion: z.string().optional().or(z.literal("")),
  activo: z.boolean().optional(),
});

type NuevoProductoType = z.infer<typeof NuevoProductoSchema>;

export default function NuevoProducto() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();

  const form = useForm<NuevoProductoType>({
    resolver: zodResolver(NuevoProductoSchema),
    defaultValues: {
      nombre: "",
      precioUnitario: 0,
      descripcion: "",
      activo: true,
    },
  });

  const onSubmit = async (data: NuevoProductoType) => {
    setError(null);
    setSuccess(false);
    try {
      await createProducto({
        nombre: data.nombre,
        precioUnitario: data.precioUnitario || 0,
        descripcion: data.descripcion || "",
        activo: data.activo !== false,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate("/productos");
      }, 2000);
    } catch (err: any) {
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
      handleError(err);
      if (!errorMessage) {
        setError("Error al crear producto");
      }
    }
  };

  return (
    <>
    <FormPageShell
      title="Nuevo Producto"
      description="Registra un producto nuevo con una estructura compacta en móvil y mejor distribuida en pantallas medianas y grandes."
      actions={
        <Button type="button" variant="outline" onClick={() => navigate("/productos")} className="w-full sm:w-auto">
          <XCircle className="w-4 h-4" />
          Cancelar
        </Button>
      }
    >

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Producto creado correctamente</p>
            <p className="text-green-700 text-sm">Redirigiendo al listado de productos...</p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormSection
          title="Datos del producto"
          description="Información principal del producto para su uso administrativo y de catálogo."
        >
          <FieldGrid>
            <div className="space-y-2">
              <Label>Nombre del Producto *</Label>
              <Input
                {...form.register("nombre")}
                type="text"
                placeholder="Ej: Carne molida"
              />
              <p className="text-xs text-gray-500">Se guardará en minúsculas. Debe ser único por empresa.</p>
              {form.formState.errors.nombre && (
                <p className="text-sm text-red-500">{form.formState.errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Precio Unitario <span className="text-xs text-gray-500">(opcional, default 0)</span>
              </Label>
              <Input
                {...form.register("precioUnitario", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">Este es el precio de catálogo, no el precio de compra específico.</p>
              {form.formState.errors.precioUnitario && (
                <p className="text-sm text-red-500">{form.formState.errors.precioUnitario.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                {...form.register("descripcion")}
                rows={4}
                placeholder="Detalles del producto..."
              />
              {form.formState.errors.descripcion && (
                <p className="text-sm text-red-500">{form.formState.errors.descripcion.message}</p>
              )}
            </div>
          </FieldGrid>
        </FormSection>

        <FormSection
          title="Estado inicial"
          description="Define si el producto estará disponible desde su creación."
        >
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.watch("activo") !== false}
                onChange={(e) => form.setValue("activo", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Producto Activo</span>
            </label>
          </div>
        </FormSection>

        <FormSection contentClassName="pt-5">
          <FormActionsBar className="border-t-0 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/productos")}
              disabled={form.formState.isSubmitting || success}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || success}
              className="w-full gap-2 sm:w-auto"
            >
              <Save className="w-4 h-4" />
              {form.formState.isSubmitting ? "Creando..." : "Crear Producto"}
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
