import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Label } from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { Save, XCircle, AlertCircle, Loader } from "lucide-react";
import { getNegocio, updateNegocio, Negocio, NegocioTipo } from "../services/negociosService";
import { logger } from "../lib/logger";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormActionsBar from "../components/common/forms/FormActionsBar";

const EditarNegocioSchema = z.object({
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  tipo: z.enum(["Salón de eventos", "Catering", "Alquiladora", "Coordinación", "Decoración", "Floristerría", "Producción"]),
  activo: z.boolean(),
});

type EditarNegocioForm = z.infer<typeof EditarNegocioSchema>;

const TIPOS_NEGOCIO: NegocioTipo[] = [
  "Salón de eventos",
  "Catering",
  "Alquiladora",
  "Coordinación",
  "Decoración",
  "Floristerría",
  "Producción",
];

export default function EditarNegocio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [negocio, setNegocio] = useState<Negocio | null>(null);

  const form = useForm<EditarNegocioForm>({
    resolver: zodResolver(EditarNegocioSchema),
    mode: "onTouched",
  });

  useEffect(() => {
    const loadNegocio = async () => {
      try {
        setLoading(true);
        setError("");

        if (!id) {
          setNotFound(true);
          return;
        }

        const data = await getNegocio(id);
        if (!data) {
          setNotFound(true);
          return;
        }

        setNegocio(data);
        form.reset({
          nombre: data.nombre,
          tipo: data.tipo,
          activo: data.activo,
        });
      } catch (err: any) {
        logger.error("Error loading negocio:", err);
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          setError("Error al cargar el negocio. Intenta de nuevo.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadNegocio();
  }, [id, form]);

  const onSubmit = async (data: EditarNegocioForm) => {
    if (!id) return;

    setSaving(true);
    setError("");

    try {
      const payload = {
        nombre: data.nombre,
        tipo: data.tipo,
        activo: data.activo,
      };

      await updateNegocio(id, payload);
      navigate("/negocios");
    } catch (err: any) {
      logger.error("Error updating negocio:", err);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Error al actualizar el negocio. Intenta de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FormPageShell>
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Cargando negocio...</p>
          </div>
        </div>
      </FormPageShell>
    );
  }

  if (notFound) {
    return (
      <FormPageShell>
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-8 w-8 shrink-0 text-red-600" />
            <div>
              <h2 className="text-xl font-bold text-red-900">Negocio no encontrado</h2>
              <p className="mt-1 text-sm text-red-700">
                El negocio con el ID {id} no existe.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => navigate("/negocios")} className="w-full">
              Volver a Negocios
            </Button>
          </div>
        </div>
      </FormPageShell>
    );
  }

  if (!negocio) {
    return null;
  }

  return (
    <FormPageShell
      actions={
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate("/negocios")}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
      }
    >
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Error al actualizar</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormSection
          title="Datos del negocio"
          description="Edita la información del negocio."
        >
          <FieldGrid>
            <div className="space-y-2 md:col-span-2">
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <p className="text-xs text-gray-600">Creado el</p>
                <p className="text-sm text-gray-900">
                  {new Date(negocio.createdAt).toLocaleDateString("es-MX")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Negocio *</Label>
              <Input id="nombre" {...form.register("nombre")} />
              {form.formState.errors.nombre && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Negocio *</Label>
              <Select
                value={form.watch("tipo")}
                onValueChange={(value: string) => form.setValue("tipo", value as NegocioTipo, { shouldDirty: true, shouldValidate: true })}
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_NEGOCIO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.tipo && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.tipo.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="activo" className="block">Estado</Label>
              <label htmlFor="activo" className="flex min-h-10 items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#111827]">
                <input
                  id="activo"
                  type="checkbox"
                  checked={form.watch("activo")}
                  onChange={(e) => form.setValue("activo", e.target.checked, { shouldDirty: true, shouldValidate: true })}
                  className="h-5 w-5 rounded border-gray-300 accent-blue-600"
                />
                Negocio Activo
              </label>
              <p className="text-xs text-gray-500">
                Desactiva el negocio para evitar que aparezca en los listados
              </p>
            </div>
          </FieldGrid>
        </FormSection>

        <FormSection contentClassName="pt-5">
          <FormActionsBar className="border-t-0 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/negocios")}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </FormActionsBar>
        </FormSection>
      </form>
    </FormPageShell>
  );
}
