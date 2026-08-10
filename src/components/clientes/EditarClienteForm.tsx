import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { Save, XCircle, AlertCircle } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { useState, useEffect } from "react";
import { getCliente, updateCliente, Cliente } from "../../services/clientesService";
import { preventEnterFormSubmit } from "../../utils/formGuards";
import { logger } from "../../lib/logger";
import { ValidationErrorModal } from "../common/ValidationErrorModal";
import { useValidationError } from "../../hooks/useValidationError";
import { toLocalDateOnly } from "../../utils/dateOnly";
import {
  buildClienteMedioPayload,
  CLIENTE_MEDIO_OPTIONS,
  clienteMedioSchemaFields,
  normalizeClienteMedioValues,
  refineClienteMedio,
} from "./clienteMedio";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().optional().default(""),
  telefono: z.string().optional().default(""),
  email: z.string().email("Email inválido").or(z.literal("")).optional().default(""),
  cp: z.string().optional().default(""),
  ...clienteMedioSchemaFields,
  fechaNacimiento: z.string().optional().default(""),
  calificacion: z.enum(["good", "neutral", "bad"]).optional().default("neutral"),
}).superRefine((data, ctx) => refineClienteMedio(data, ctx)).passthrough();

function toDateInputValue(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.includes("T") ? value.split("T")[0] : value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toLocalDateOnly(value);
  }

  return "";
}

export default function EditarClienteForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<any>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const medioValue = watch("medio");

  useEffect(() => {
    setLoading(true);
    setError("");

    if (!id) {
      setError("ID de cliente no válido");
      setLoading(false);
      return;
    }

    getCliente(id)
      .then((cliente: Cliente) => {
        const normalizedMedio = normalizeClienteMedioValues((cliente as any).medio, (cliente as any).medioOtros);
        reset({
          nombre: cliente.nombre || "",
          apellidos: cliente.apellidos || "",
          telefono: cliente.telefono || "",
          email: cliente.email || "",
          cp: cliente.cp || "",
          medio: normalizedMedio.medio,
          medioOtros: normalizedMedio.medioOtros,
          fechaNacimiento: toDateInputValue(cliente.fechaNacimiento),
          calificacion: cliente.calificacion || "neutral",
        });
        setLoading(false);
      })
      .catch((err: any) => {
        logger.error("Error loading cliente:", err);
        if (err?.response?.status === 404) {
          setError("Cliente no encontrado");
        } else {
          setError(err?.response?.data?.message || "Error al cargar el cliente");
        }
        setLoading(false);
      });
  }, [id, reset]);

  const onSubmit = async (data: any) => {
    if (!id) {
      setError("ID de cliente no válido");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: Record<string, any> = {
        nombre: data.nombre,
        calificacion: data.calificacion || "neutral",
      };

      // Add optional fields only if they're not empty
      if (data.apellidos) payload.apellidos = data.apellidos;
      if (data.telefono) payload.telefono = data.telefono;
      if (data.email) payload.email = data.email;
      if (data.cp) payload.cp = data.cp;
      Object.assign(payload, buildClienteMedioPayload(data));
      if (data.fechaNacimiento) payload.fechaNacimiento = data.fechaNacimiento;

      await updateCliente(id, payload);
      navigate("/clientes");
    } catch (err: any) {
      logger.error("Error updating cliente:", err);
      handleError(err);
      if (!errorMessage) {
        if (err?.response?.status === 404) {
          setError("Cliente no encontrado");
        } else if (err?.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError("Error al actualizar el cliente. Intenta de nuevo.");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando cliente...</div>;
  }

  if (error === "Cliente no encontrado") {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow-lg">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Cliente no encontrado</h3>
            <p className="text-sm text-red-700 mt-1">El cliente que intentas editar no existe o ha sido eliminado.</p>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={() => navigate("/clientes")} className="w-full">Volver a Clientes</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={preventEnterFormSubmit} className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl mx-auto mt-8 space-y-4">
        {(error || errorMessage) && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error || errorMessage}</p>
          </div>
        )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium mb-1">Nombre *</label>
          <Input id="nombre" placeholder="Juan" {...register("nombre")} autoFocus />
          {errors.nombre && typeof errors.nombre.message === 'string' && <div className="text-red-600 text-xs mt-1">{errors.nombre.message}</div>}
        </div>
        <div>
          <label htmlFor="apellidos" className="block text-sm font-medium mb-1">Apellidos</label>
          <Input id="apellidos" placeholder="Pérez López" {...register("apellidos")} />
          {errors.apellidos && typeof errors.apellidos.message === 'string' && <div className="text-red-600 text-xs mt-1">{errors.apellidos.message}</div>}
        </div>
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium mb-1">Teléfono</label>
          <Input id="telefono" placeholder="5551234567" {...register("telefono")} />
          {errors.telefono && typeof errors.telefono.message === 'string' && <div className="text-red-600 text-xs mt-1">{errors.telefono.message}</div>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <Input id="email" type="email" placeholder="juan@example.com" {...register("email")} />
          {errors.email && typeof errors.email.message === 'string' && <div className="text-red-600 text-xs mt-1">{errors.email.message}</div>}
        </div>
        <div>
          <label htmlFor="cp" className="block text-sm font-medium mb-1">Código Postal</label>
          <Input id="cp" placeholder="28001" {...register("cp")} />
          {errors.cp && typeof errors.cp.message === 'string' && <div className="text-red-600 text-xs mt-1">{errors.cp.message}</div>}
        </div>
        <div>
          <label htmlFor="medio" className="block text-sm font-medium mb-1">¿Cómo nos conoció?</label>
          <select
            id="medio"
            {...register("medio")}
            className="w-full px-3 py-2 border border-gray-300 rounded"
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
          <p className="text-xs text-[#64748B] mt-1">Si seleccionas "Otros", debes especificar el medio.</p>
          {errors.medio && typeof errors.medio.message === 'string' && <div className="text-red-600 text-xs mt-1">{errors.medio.message}</div>}
        </div>
        {medioValue === "Otros" && (
          <div>
            <label htmlFor="medioOtros" className="block text-sm font-medium mb-1">Especifique el medio *</label>
            <Input id="medioOtros" placeholder="Ej: TikTok, LinkedIn, Podcast..." {...register("medioOtros")} />
            {errors.medioOtros && typeof errors.medioOtros.message === 'string' && <div className="text-red-600 text-xs mt-1">{errors.medioOtros.message}</div>}
          </div>
        )}
        <div className="md:col-span-2">
          <label htmlFor="fechaNacimiento" className="block text-sm font-medium mb-1">Fecha de nacimiento</label>
          <Input id="fechaNacimiento" type="date" {...register("fechaNacimiento")} />
          {errors.fechaNacimiento && typeof errors.fechaNacimiento.message === 'string' && <div className="text-red-600 text-xs mt-1">{errors.fechaNacimiento.message}</div>}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="calificacion" className="block text-sm font-medium mb-1">Calificación</label>
          <select id="calificacion" {...register("calificacion")} className="w-full px-3 py-2 border border-gray-300 rounded">
            <option value="neutral">Neutral</option>
            <option value="good">Buena</option>
            <option value="bad">Mala</option>
          </select>
          {errors.calificacion && typeof errors.calificacion.message === 'string' && <div className="text-red-600 text-xs mt-1">{errors.calificacion.message}</div>}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="outline" type="button" onClick={() => navigate("/clientes")} disabled={saving}>
          <XCircle size={16} className="mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
      </form>

      <ValidationErrorModal
        isOpen={showModal}
        onClose={closeModal}
        fields={validationFields}
        title="Datos incompletos"
      />
    </>
  );
}
