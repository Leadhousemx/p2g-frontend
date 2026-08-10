import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Save, XCircle, AlertCircle } from "lucide-react";
import { createNegocio, NegocioTipo } from "../services/negociosService";
import { logger } from "../lib/logger";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormActionsBar from "../components/common/forms/FormActionsBar";

const NuevoNegocioSchema = z.object({
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  tipo: z.enum(["Salón de eventos", "Catering", "Alquiladora", "Coordinación", "Decoración", "Floristerría", "Producción"]),
});

type NuevoNegocioForm = z.infer<typeof NuevoNegocioSchema>;

const TIPOS_NEGOCIO: NegocioTipo[] = [
  "Salón de eventos",
  "Catering",
  "Alquiladora",
  "Coordinación",
  "Decoración",
  "Floristerría",
  "Producción",
];

export default function NuevoNegocio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<NuevoNegocioForm>({
    resolver: zodResolver(NuevoNegocioSchema),
    defaultValues: {
      nombre: "",
      tipo: "Salón de eventos",
    },
    mode: "onTouched",
  });

  const onSubmit = async (data: NuevoNegocioForm) => {
    setLoading(true);
    setError("");

    try {
      await createNegocio(data);
      navigate("/negocios");
    } catch (err: any) {
      logger.error("Error creating negocio:", err);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Error al crear el negocio. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPageShell
      title="Nuevo Negocio"
      description="Da de alta un nuevo negocio manteniendo intacta la validación actual y el flujo de regreso al listado."
      actions={
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate("/negocios")}
          disabled={loading}
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
            <h3 className="font-semibold text-red-900">Error al crear negocio</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormSection
          title="Datos del negocio"
          description="Captura el nombre comercial y el tipo principal del negocio para registrarlo en el sistema."
        >
          <FieldGrid>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Negocio *</Label>
              <Input
                id="nombre"
                {...form.register("nombre")}
                placeholder="Ej: Mi Salón de Eventos"
                autoFocus
              />
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
          </FieldGrid>
        </FormSection>

        <FormSection contentClassName="pt-5">
          <FormActionsBar className="border-t-0 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/negocios")}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Guardando..." : "Guardar Negocio"}
            </Button>
          </FormActionsBar>
        </FormSection>
      </form>
    </FormPageShell>
  );
}
