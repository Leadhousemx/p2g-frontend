import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Save, XCircle } from "lucide-react";
import { Input, Button, Label } from "@/components/ui";
import { useState } from "react";
import { removeToken } from "../../utils/tokenManager";
import { createCliente } from "../../services/clientesService";
import { preventEnterFormSubmit } from "../../utils/formGuards";
import { logger } from "../../lib/logger";
import { ValidationErrorModal } from "../common/ValidationErrorModal";
import { useValidationError } from "../../hooks/useValidationError";
import FormPageShell from "../common/forms/FormPageShell";
import FormSection from "../common/forms/FormSection";
import FieldGrid from "../common/forms/FieldGrid";
import FormActionsBar from "../common/forms/FormActionsBar";
import {
  buildClienteMedioPayload,
  CLIENTE_MEDIO_OPTIONS,
  clienteMedioSchemaFields,
  refineClienteMedio,
} from "./clienteMedio";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().optional().default(""),
  telefono: z.string().optional().default(""),
  email: z.string().optional().default(""),
  cp: z.string().optional().default(""),
  ...clienteMedioSchemaFields,
  fechaNacimiento: z.string().optional().default(""),
  calificacion: z.enum(["good", "neutral", "bad"]).optional().default("neutral"),
}).superRefine((data, ctx) => refineClienteMedio(data, ctx));

export default function NuevoClienteForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      medio: "",
      medioOtros: "",
      calificacion: "neutral",
    },
  });

  const medioValue = watch("medio");

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError("");

    try {
      const payload = {
        nombre: data.nombre,
        ...(data.apellidos && { apellidos: data.apellidos }),
        ...(data.telefono && { telefono: data.telefono }),
        ...(data.email && { email: data.email }),
        ...(data.cp && { cp: data.cp }),
        ...buildClienteMedioPayload(data),
        ...(data.fechaNacimiento && { fechaNacimiento: data.fechaNacimiento }),
        calificacion: data.calificacion || "neutral",
      };
      await createCliente(payload);
      navigate("/clientes");
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
      logger.error("Error creating cliente:", err);
      handleError(err);
      if (!errorMessage) {
        setError(err?.response?.data?.message || "Error al crear el cliente");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FormPageShell
        description={undefined}
        actions={
          <Button variant="outline" type="button" onClick={() => navigate("/clientes")} disabled={loading} className="w-full sm:w-auto">
            <XCircle size={16} className="mr-2" />
            Cancelar
          </Button>
        }
      >
        {(error || errorMessage) && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="text-sm text-red-700">{error || errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={preventEnterFormSubmit} className="space-y-5">
          <FormSection
            title="Datos del cliente"
            description="Información básica de identificación y contacto para dar de alta al cliente."
          >
            <FieldGrid>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input id="nombre" placeholder="Juan" {...register("nombre")} autoFocus />
                {errors.nombre && typeof errors.nombre.message === 'string' && <div className="mt-1 text-xs text-red-600">{errors.nombre.message}</div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input id="apellidos" placeholder="Pérez López" {...register("apellidos")} />
                {errors.apellidos && typeof errors.apellidos.message === 'string' && <div className="mt-1 text-xs text-red-600">{errors.apellidos.message}</div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" placeholder="5551234567" {...register("telefono")} />
                {errors.telefono && typeof errors.telefono.message === 'string' && <div className="mt-1 text-xs text-red-600">{errors.telefono.message}</div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="juan@example.com" {...register("email")} />
                {errors.email && typeof errors.email.message === 'string' && <div className="mt-1 text-xs text-red-600">{errors.email.message}</div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp">Código Postal</Label>
                <Input id="cp" placeholder="28001" {...register("cp")} />
                {errors.cp && typeof errors.cp.message === 'string' && <div className="mt-1 text-xs text-red-600">{errors.cp.message}</div>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
                <Input id="fechaNacimiento" type="date" {...register("fechaNacimiento")} />
                {errors.fechaNacimiento && typeof errors.fechaNacimiento.message === 'string' && <div className="mt-1 text-xs text-red-600">{errors.fechaNacimiento.message}</div>}
              </div>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Origen del lead"
            description="Datos de seguimiento para saber cómo llegó el cliente al sistema."
          >
            <FieldGrid>
              <div className="space-y-2">
                <Label htmlFor="medio">¿Cómo nos conoció?</Label>
                <select
                  id="medio"
                  {...register("medio")}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-[#111827]"
                  onChange={(e) => {
                    register("medio").onChange(e);
                    if (e.target.value !== "Otros") {
                      setValue("medioOtros", "", { shouldValidate: true, shouldDirty: true });
                    }
                  }}
                >
                  <option value="">Selecciona...</option>
                  {CLIENTE_MEDIO_OPTIONS.map((medio) => (
                    <option key={medio} value={medio}>{medio}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#64748B]">Si seleccionas "Otros", debes especificar el medio.</p>
                {errors.medio && typeof errors.medio.message === 'string' && <div className="mt-1 text-xs text-red-600">{errors.medio.message}</div>}
              </div>
              {medioValue === "Otros" ? (
                <div className="space-y-2">
                  <Label htmlFor="medioOtros">Especifique el medio *</Label>
                  <Input id="medioOtros" placeholder="Ej: TikTok, LinkedIn, Podcast..." {...register("medioOtros")} />
                  {errors.medioOtros && typeof errors.medioOtros.message === 'string' && <div className="mt-1 text-xs text-red-600">{errors.medioOtros.message}</div>}
                </div>
              ) : null}
            </FieldGrid>
          </FormSection>

          <FormSection contentClassName="pt-5">
            <FormActionsBar className="border-t-0 pt-0">
              <Button variant="outline" type="button" onClick={() => navigate("/clientes")} disabled={loading} className="w-full sm:w-auto">
                <XCircle size={16} className="mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                <Save size={16} className="mr-2" />
                {loading ? "Guardando..." : "Crear Cliente"}
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
