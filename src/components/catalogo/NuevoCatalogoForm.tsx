import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { removeToken } from "../../utils/tokenManager";
import { Input, Button } from "@/components/ui";
import { Save, XCircle, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ValidationErrorModal } from "../common/ValidationErrorModal";
import FormPageShell from "../common/forms/FormPageShell";
import FormSection from "../common/forms/FormSection";
import FieldGrid from "../common/forms/FieldGrid";
import FormActionsBar from "../common/forms/FormActionsBar";
import { useValidationError } from "../../hooks/useValidationError";
import { createCatalogoItem, isValidTipo, CatalogoTipo, listCatalogo, getCatalogoItem } from "../../services/catalogoService";
import { preventEnterDefault } from "../../utils/formGuards";
import { logger } from "../../lib/logger";
interface NuevoCatalogoFormProps {
  tipo?: string;
  onSuccess?: (created: unknown) => void;
  onCancel?: () => void;
  embedded?: boolean;
}

function resolveCreatedCatalogPayload(response: any, submitted: any) {
  const candidate =
    (response && typeof response === "object" && (response.item || response.data?.item || response.data || response.result || response)) ||
    {};

  return {
    ...candidate,
    nombre: String(candidate?.nombre ?? submitted?.nombre ?? "").trim(),
    precio: Number(candidate?.precio ?? submitted?.precio ?? 0),
    catalogoTipo: submitted?.tipo,
  };
}

async function verifyCreatedCatalogItem(tipo: CatalogoTipo, normalizedCreated: any) {
  const createdId = String(normalizedCreated?._id || "").trim();
  const nombre = String(normalizedCreated?.nombre || "").trim();

  let lastError: unknown = null;

  if (createdId) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const item = await getCatalogoItem(tipo, createdId);
        if (item) return item;
      } catch (err) {
        lastError = err;
      }
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }

  if (!nombre) {
    throw new Error("No se pudo confirmar el guardado del catálogo: respuesta incompleta del servidor.");
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const verification = await listCatalogo(tipo, {
        nombre,
        page: 1,
        pageSize: 20,
        sortBy: "nombre",
        sortDir: "asc",
      });

      const items = Array.isArray(verification?.items) ? verification.items : [];
      const exactName = items.find((item) => String(item?.nombre || "").trim().toLowerCase() === nombre.toLowerCase());
      if (exactName) return exactName;
    } catch (err) {
      lastError = err;
    }

    await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
  }

  if (lastError) {
    throw new Error("No se pudo confirmar el guardado del catálogo. Intenta nuevamente.");
  }

  throw new Error("No se pudo confirmar el guardado del catálogo. Intenta nuevamente.");
}

export default function NuevoCatalogoForm({ tipo: tipoProp, onSuccess, onCancel, embedded = false }: NuevoCatalogoFormProps) {
  const params = useParams<{ tipo: string }>();
  const tipo = tipoProp || params.tipo;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();

  // Validar que el tipo sea válido
  if (!tipo || !isValidTipo(tipo)) {
    return <div className="p-8 text-center text-red-600">Tipo de catálogo inválido</div>;
  }

  const tipoValidado: CatalogoTipo = tipo;

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
      precio: tipoValidado === "tipoeventos" ? 0 : undefined,
      descripcion: "",
      activo: true,
    },
    mode: "onChange",
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion || "",
        activo: data.activo,
        ...(tipoValidado !== "tipoeventos" && { precio: data.precio }),
      };
      const created = await createCatalogoItem(tipoValidado, payload);
      const normalizedCreated = resolveCreatedCatalogPayload(created, {
        ...data,
        tipo: tipoValidado,
      });
      const verifiedCreated = await verifyCreatedCatalogItem(tipoValidado, normalizedCreated);
      if (typeof onSuccess === "function") {
        onSuccess(verifiedCreated);
      } else {
        navigate(`/catalogo/${tipoValidado}`);
      }
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
      logger.error("Error creating catálogo item:", err);
      handleError(err);
      if (!errorMessage) {
        setError("Error al crear el elemento. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (typeof onCancel === "function") {
      onCancel();
      return;
    }
    navigate(`/catalogo/${tipoValidado}`);
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

  const handleEmbeddedKeyDown = (event: any) => {
    if (!embedded || event?.key !== "Enter") return;

    const targetTagName = String(event?.target?.tagName || "").toUpperCase();
    if (targetTagName === "TEXTAREA") return;

    event.preventDefault();
    void form.handleSubmit(onSubmit)();
  };

  const formContent = (
    <>
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
                onKeyDown={preventEnterDefault}
                {...form.register("precio", { valueAsNumber: true })}
                placeholder="0"
              />
              {form.formState.errors.precio && typeof form.formState.errors.precio.message === "string" && (
                <div className="text-xs text-red-600">{form.formState.errors.precio.message}</div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="activo" className="block text-sm font-medium text-[#111827]">Estado inicial</label>
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
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading} className="w-full sm:w-auto">
            <XCircle size={16} className="mr-2" />
            Cancelar
          </Button>
          <Button
            type={embedded ? "button" : "submit"}
            disabled={loading || !form.formState.isValid}
            className="w-full sm:w-auto"
            onClick={embedded ? () => void form.handleSubmit(onSubmit)() : undefined}
          >
            <Save size={16} className="mr-2" />
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </FormActionsBar>
      </FormSection>
    </>
  );

  return (
    <>
      <FormPageShell>
        {(error || errorMessage) && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error || errorMessage}</p>
          </div>
        )}

        {embedded ? (
          <div className="space-y-5" role="group" onKeyDown={handleEmbeddedKeyDown}>
            {formContent}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {formContent}
          </form>
        )}
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
