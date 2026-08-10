import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Save, Trash2, XCircle } from "lucide-react";
import { ValidationErrorModal } from "../components/common/ValidationErrorModal";
import { useValidationError } from "../hooks/useValidationError";
import { getProducto, updateProducto, deleteProducto } from "../services/productsService";
import { Button, Input, Label } from "@/components/ui";
import Textarea from "../components/ui/textarea";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormActionsBar from "../components/common/forms/FormActionsBar";
import AppConfirmDialog from "../components/common/AppConfirmDialog";

const EditarProductoSchema = z.object({
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  precioUnitario: z.number().min(0, "Precio no puede ser negativo"),
  descripcion: z.string().optional().or(z.literal("")),
  activo: z.boolean().optional(),
});

type EditarProductoType = z.infer<typeof EditarProductoSchema>;

export default function EditarProducto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [producto, setProducto] = useState<any>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();

  const form = useForm<EditarProductoType>({
    resolver: zodResolver(EditarProductoSchema),
    defaultValues: {
      nombre: "",
      precioUnitario: 0,
      descripcion: "",
      activo: true,
    },
  });

  useEffect(() => {
    const loadProducto = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProducto(id!);
        setProducto(data);
        form.reset({
          nombre: data.nombre,
          precioUnitario: data.precioUnitario,
          descripcion: data.descripcion || "",
          activo: data.activo,
        });
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(err?.response?.data?.message || "Error al cargar producto");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProducto();
  }, [id, form]);

  const onSubmit = async (data: EditarProductoType) => {
    setError(null);
    try {
      await updateProducto(id!, {
        nombre: data.nombre,
        precioUnitario: data.precioUnitario,
        descripcion: data.descripcion,
        activo: data.activo,
      });
      navigate("/productos");
    } catch (err: any) {
      handleError(err);
      if (!errorMessage) {
        setError("Error al actualizar producto");
      }
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError(null);
    try {
      await deleteProducto(id!);
      navigate("/productos");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al eliminar producto");
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <FormPageShell title="Editar Producto">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <p className="font-semibold text-yellow-800">Producto no encontrado</p>
          <Button onClick={() => navigate("/productos")} className="mt-4">Volver a Productos</Button>
        </div>
      </FormPageShell>
    );
  }

  return (
    <>
    <FormPageShell
      title="Editar Producto"
      description="Actualiza los datos del producto manteniendo la estructura responsive oficial del sistema."
      actions={
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button type="button" variant="outline" onClick={() => navigate("/productos")} className="w-full sm:w-auto">
            <XCircle className="w-4 h-4" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={deleteLoading}
            className="w-full sm:w-auto"
          >
            <Trash2 className="w-4 h-4" />
            {deleteLoading ? "Eliminando..." : "Eliminar"}
          </Button>
        </div>
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

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormSection
          title="Datos del producto"
          description="Actualiza la información principal del producto."
        >
          <FieldGrid>
            <div className="space-y-2">
              <Label>Nombre del Producto *</Label>
              <Input
                {...form.register("nombre")}
                type="text"
                placeholder="Ej: Carne molida"
              />
              {form.formState.errors.nombre && (
                <p className="text-sm text-red-500">{form.formState.errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Precio Unitario *</Label>
              <Input
                {...form.register("precioUnitario", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
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

        <FormSection title="Configuración" description="Controla la disponibilidad del producto dentro del sistema.">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.watch("activo")}
              onChange={(e) => form.setValue("activo", e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Producto Activo</span>
          </label>
        </FormSection>

        {producto && (
          <FormSection title="Metadatos" description="Información de auditoría del registro.">
            <div className="grid grid-cols-1 gap-3 text-xs text-gray-500 sm:grid-cols-2">
              <p>Creado: {new Date(producto.createdAt).toLocaleString()}</p>
              <p>Actualizado: {new Date(producto.updatedAt).toLocaleString()}</p>
            </div>
          </FormSection>
        )}

        <FormSection contentClassName="pt-5">
          <FormActionsBar className="border-t-0 pt-0">
            <Button type="button" variant="outline" onClick={() => navigate("/productos")} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full gap-2 sm:w-auto">
              <Save className="w-4 h-4" />
              {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
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
      <AppConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Eliminar producto"
        message={producto ? <>¿Estás seguro de que deseas eliminar <strong>{producto.nombre}</strong>?</> : ""}
        confirmLabel={deleteLoading ? "Eliminando..." : "Eliminar"}
        cancelLabel="Cancelar"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </FormPageShell>
    </>
  );
}
