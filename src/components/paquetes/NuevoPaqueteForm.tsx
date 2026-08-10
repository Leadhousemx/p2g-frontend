import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { removeToken } from "../../utils/tokenManager";
import { Input, Button } from "@/components/ui";
import { Save, Eraser, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ValidationErrorModal } from "../common/ValidationErrorModal";
import FormPageShell from "../common/forms/FormPageShell";
import FormSection from "../common/forms/FormSection";
import FieldGrid from "../common/forms/FieldGrid";
import FormActionsBar from "../common/forms/FormActionsBar";
import { useValidationError } from "../../hooks/useValidationError";
import { useCatalogosPaquetes } from "../../hooks/useCatalogosPaquetes";
import MenuSelectorTabs from "./MenuSelectorTabs";
import ElementosTabla from "./ElementosTabla";
import { formatCurrency } from "../../utils/formatCurrency";
import { preventEnterFormSubmit } from "../../utils/formGuards";
import { createPaquete, Elemento } from "../../services/paquetesService";
import { logger } from "../../lib/logger";
const elementoSchema = z.object({
  idCatalogo: z.string().min(1, "ID de catálogo requerido"),
  tipo: z.enum(["platillo", "bebida", "mobiliario", "personal", "adicional"]),
  nombre: z.string().min(1, "Nombre requerido"),
  precioPorMesa: z.number().min(0, "Precio debe ser >= 0"),
  cantidadMesas: z.number().int().min(1, "Mínimo 1 mesa"),
  total: z.number().min(0),
});
const schema = z.object({
  nombre: z.string().min(3, "Mínimo 3 caracteres"),
  descripcion: z.string().optional().default(""),
  activo: z.boolean().default(true),
  elementos: z.array(elementoSchema).min(1, "Agrega al menos un elemento al paquete"),
  totalPaquete: z.number().optional(),
  descuentoTipo: z.enum(["porcentaje", "monto"]).nullable().optional(),
  descuentoValor: z.number().min(0, "No puede ser negativo").optional().default(0),
}).passthrough();

export default function NuevoPaqueteForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();
  const { platillos, bebidas, mobiliario, personal, adicionales, loading: loadingCatalogos } = useCatalogosPaquetes();

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      activo: true,
      elementos: [],
      descuentoTipo: null,
      descuentoValor: 0,
    },
    mode: "onChange",
  });
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "elementos",
  });

  // Persistencia en localStorage (borrador)
  useEffect(() => {
    const saved = localStorage.getItem("nuevoPaqueteDraft");
    if (saved) {
      try {
        form.reset(JSON.parse(saved));
      } catch {}
    }
  }, []);
  useEffect(() => {
    const sub = form.watch((data) => {
      localStorage.setItem("nuevoPaqueteDraft", JSON.stringify(data));
    });
    return () => sub.unsubscribe();
  }, [form]);

  // Calcular total general
  const calcTotalGeneral = () => {
    // @ts-ignore - useFieldArray fields type limitation
    return fields.reduce((acc, el) => acc + ((el.precioPorMesa || 0) * (el.cantidadMesas || 0)), 0);
  };

  // Guardar
  const onSubmit = async (data: any) => {
    setLoading(true);
    setError("");

    try {
      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion || "",
        activo: data.activo,
        elementos: data.elementos as Elemento[],
        totalPaquete: calcTotalGeneral(),
        ...(data.descuentoTipo && { descuentoTipo: data.descuentoTipo }),
        ...(data.descuentoValor && { descuentoValor: data.descuentoValor }),
      };
      await createPaquete(payload);
      localStorage.removeItem("nuevoPaqueteDraft");
      navigate("/paquetes");
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
      logger.error("Error creating paquete:", err);
      handleError(err);
      if (!errorMessage) {
        setError("Error al crear paquete");
      }
    } finally {
      setLoading(false);
    }
  };

  // Limpiar
  const handleLimpiar = () => {
    form.reset({
      nombre: "",
      descripcion: "",
      activo: true,
      elementos: [],
      descuentoTipo: null,
      descuentoValor: 0,
    });
    localStorage.removeItem("nuevoPaqueteDraft");
  };

  // Advertencia mínimo de mesas
  const sumaMesas = (() => {
    // @ts-ignore - useFieldArray fields type limitation
    return fields.reduce((acc, el) => acc + (el.cantidadMesas || 0), 0);
  })();

  return (
    <>
      <FormPageShell>
        {(error || errorMessage) && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error || errorMessage}</p>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={preventEnterFormSubmit} className="space-y-5">
          <FormSection
            title="Datos generales del paquete"
            description="Completa la informacion del nuevo paquete"
          >
            <FieldGrid>
              <div className="space-y-2">
                <label htmlFor="nombre" className="block text-sm font-medium text-[#111827]">Nombre del paquete *</label>
                <Input id="nombre" placeholder="Ej: Paquete Ejecutivo" {...form.register("nombre")} />
                {form.formState.errors.nombre && typeof form.formState.errors.nombre.message === "string" && (
                  <div className="text-xs text-red-600">{form.formState.errors.nombre.message}</div>
                )}
              </div>

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
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalles del paquete..."
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="descuentoTipo" className="block text-sm font-medium text-[#111827]">Tipo de descuento</label>
                <select id="descuentoTipo" {...form.register("descuentoTipo")} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin descuento</option>
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="monto">Monto fijo ($)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="descuentoValor" className="block text-sm font-medium text-[#111827]">Valor del descuento</label>
                <Input id="descuentoValor" type="number" step="0.01" min={0} {...form.register("descuentoValor", { valueAsNumber: true })} />
              </div>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Elementos del paquete"
            description="Mantén el flujo actual de selección y edición de elementos dentro de un contenedor responsive estable."
          >
            <div className="space-y-6">
              <div>
                <MenuSelectorTabs
                  platillos={platillos}
                  bebidas={bebidas}
                  mobiliario={mobiliario}
                  personal={personal}
                  adicionales={adicionales}
                  loading={loadingCatalogos}
                  onAgregar={(el) => {
                    append({
                      ...el,
                      cantidadMesas: 1,
                      precioPorMesa: el.precio || 0,
                      total: el.precio || 0,
                    });
                  }}
                />
              </div>

              <div>
                <ElementosTabla
                  // @ts-ignore - useFieldArray fields type limitation
                  elementos={fields}
                  update={update}
                  remove={remove}
                />
                {form.formState.errors.elementos && typeof form.formState.errors.elementos.message === "string" && (
                  <div className="mt-2 text-xs text-red-600">{form.formState.errors.elementos.message}</div>
                )}
                {sumaMesas === 0 && (
                  <div className="mt-2 text-xs text-yellow-600">⚠️ Agrega al menos un elemento con cantidad válida para continuar.</div>
                )}
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Resumen"
            description="Verifica el total calculado antes de guardar el paquete."
          >
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="text-right text-sm text-gray-600">
                Total paquete: <span className="text-lg font-bold text-blue-600">{formatCurrency(calcTotalGeneral())}</span>
              </div>
            </div>
          </FormSection>

          <FormSection contentClassName="pt-5">
            <FormActionsBar className="border-t-0 pt-0">
              <Button type="button" variant="outline" onClick={() => navigate("/paquetes")} disabled={loading} className="w-full sm:w-auto">
                <XCircle size={16} className="mr-2" />
                Cancelar
              </Button>
              <Button type="button" variant="outline" onClick={handleLimpiar} disabled={loading} className="w-full sm:w-auto">
                <Eraser size={16} className="mr-2" />
                Limpiar
              </Button>
              <Button type="submit" disabled={loading || !form.formState.isValid} className="w-full sm:w-auto">
                <Save size={16} className="mr-2" />
                {loading ? "Guardando..." : "Guardar"}
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
