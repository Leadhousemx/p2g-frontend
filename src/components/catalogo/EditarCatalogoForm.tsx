import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { Input, Button } from "@/components/ui";
import { Save, XCircle, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ValidationErrorModal } from "../common/ValidationErrorModal";
import FormPageShell from "../common/forms/FormPageShell";
import FormSection from "../common/forms/FormSection";
import FieldGrid from "../common/forms/FieldGrid";
import FormActionsBar from "../common/forms/FormActionsBar";
import { useValidationError } from "../../hooks/useValidationError";
import { getCatalogoItem, updateCatalogoItem, isValidTipo, CatalogoTipo, CatalogoItem } from "../../services/catalogoService";
import { logger } from "../../lib/logger";
interface EditarCatalogoFormProps {
  onCancel?: () => void;
}

export default function EditarCatalogoForm({ onCancel }: EditarCatalogoFormProps) {
  const { tipo, id } = useParams<{ tipo: string; id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();

  // Validar que el tipo sea válido
  if (!tipo || !isValidTipo(tipo)) {
    return <div className="p-8 text-center text-red-600">Tipo de catálogo inválido</div>;
  }

  const tipoValidado: CatalogoTipo = tipo;

  const handleCancel = () => {
    if (typeof onCancel === "function") {
      onCancel();
      return;
    }
    navigate(`/catalogo/${tipoValidado}`);
  };

  // Schema dinámico según tipo
  const getSchema = () => {
    if (tipoValidado === "tipoeventos") {
      return z.object({
        nombre: z.string().min(3, "Mínimo 3 caracteres"),
        precio: z.number().default(0).optional(),
        descripcion: z.string().optional().default(""),
        activo: z.boolean().default(true),
      }).passthrough();
    }

    return z.object({
      nombre: z.string().min(3, "Mínimo 3 caracteres"),
      precio: z.number().min(0, "Precio debe ser >= 0"),
      descripcion: z.string().optional().default(""),
      activo: z.boolean().default(true),
    }).passthrough();
  };

  const form = useForm<any>({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      nombre: "",
      precio: 0,
      descripcion: "",
      activo: true,
    },
    mode: "onChange",
  });

  // Cargar item
  useEffect(() => {
    if (!id) {
      setError("ID inválido");
      setLoading(false);
      return;
    }

    getCatalogoItem(tipoValidado, id)
      .then((item: CatalogoItem) => {
        form.reset({
          nombre: item.nombre,
          precio: item.precio,
          descripcion: item.descripcion || "",
          activo: item.activo,
        });
        setLoading(false);
      })
      .catch((err: any) => {
        logger.error("Error loading catálogo item:", err);
        if (err?.response?.status === 404) {
          setError("elemento-no-encontrado");
        } else if (err?.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError("Error al cargar el elemento");
        }
        setLoading(false);
      });
  }, [tipoValidado, id, form]);

  const onSubmit = async (data: any) => {
    if (!id) {
      setError("ID inválido");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: Record<string, any> = {
        nombre: data.nombre,
        descripcion: data.descripcion || "",
        activo: data.activo,
      };

      if (tipoValidado !== "tipoeventos") {
        payload.precio = data.precio;
      }

      await updateCatalogoItem(tipoValidado, id, payload);
      navigate(`/catalogo/${tipoValidado}`);
    } catch (err: any) {
      logger.error("Error updating catálogo item:", err);
      handleError(err);
      if (!errorMessage) {
        setError("Error al actualizar el elemento. Intenta de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  };

  const getTypeName = () => {
    const names: Record<CatalogoTipo, string> = {
      platillos: "Catering",
      bebidas: "Bebida",
      personal: "Personal",
      mobiliario: "Mobiliario",
      audio: "Audio",
      otros: "Otro",
      tipoeventos: "Tipo de Evento",
    };
    return names[tipoValidado];
  };

  const getCatalogTitle = () => {
    const names: Record<CatalogoTipo, string> = {
      platillos: "Catering",
      bebidas: "Bebidas",
      personal: "Personal",
      mobiliario: "Mobiliario",
      audio: "Audio",
      otros: "Otros",
      tipoeventos: "Tipo de Evento",
    };
    return names[tipoValidado];
  };

  if (loading) {
    return (
      <FormPageShell>
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">Cargando elemento...</div>
      </FormPageShell>
    );
  }

  if (error === "elemento-no-encontrado") {
    return (
      <FormPageShell>
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle size={24} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Elemento no encontrado</h3>
              <p className="mt-1 text-sm text-red-700">El elemento que intentas editar no existe o ha sido eliminado.</p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleCancel} className="w-full">Volver a {getTypeName()}</Button>
          </div>
        </div>
      </FormPageShell>
    );
  }

  return (
    <>
      <FormPageShell>
        {(error || errorMessage) && error !== "elemento-no-encontrado" && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error || errorMessage}</p>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormSection
            title={getCatalogTitle()}
          >
            <FieldGrid>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="nombre" className="block text-sm font-medium text-[#111827]">Nombre *</label>
                <Input id="nombre" placeholder={`Ej: ${getTypeName()}`} {...form.register("nombre")} />
                {form.formState.errors.nombre && typeof form.formState.errors.nombre.message === "string" && (
                  <div className="text-xs text-red-600">{form.formState.errors.nombre.message}</div>
                )}
              </div>

              {tipoValidado !== "tipoeventos" && (
                <div className="space-y-2">
                  <label htmlFor="precio" className="block text-sm font-medium text-[#111827]">
                    Precio *
                  </label>
                  <Input
                    id="precio"
                    type="number"
                    step="0.01"
                    min={0}
                    {...form.register("precio", { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {form.formState.errors.precio && typeof form.formState.errors.precio.message === "string" && (
                    <div className="text-xs text-red-600">{form.formState.errors.precio.message}</div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="activo" className="block text-sm font-medium text-[#111827]">Estado</label>
                <label htmlFor="activo" className="flex min-h-10 items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#111827]">
                  <input type="checkbox" id="activo" {...form.register("activo")} className="h-5 w-5 accent-blue-600" />
                  Activo
                </label>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="descripcion" className="block text-sm font-medium text-[#111827]">Descripción</label>
                <textarea
                  id="descripcion"
                  {...form.register("descripcion")}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalles adicionales..."
                />
              </div>
            </FieldGrid>
          </FormSection>

          <FormSection contentClassName="pt-5">
            <FormActionsBar className="border-t-0 pt-0">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving} className="w-full sm:w-auto">
                <XCircle size={16} className="mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !form.formState.isValid} className="w-full sm:w-auto">
                <Save size={16} className="mr-2" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </FormActionsBar>
          </FormSection>
        </form>
      </FormPageShell>

      <ValidationErrorModal
        isOpen={showModal}
        onClose={closeModal}
        fields={validationFields}
        title="Datos incompletos"
      />
    </>
  );
}
