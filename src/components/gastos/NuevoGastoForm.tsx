import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Button, Textarea, Card } from "@/components/ui";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { formatCurrency } from "../../utils/formatCurrency";
import { useNavigate } from "react-router-dom";
import { Save, XCircle } from "lucide-react";
import { useCatalogosGastos } from "../../hooks/useCatalogosGastos";
import CategoriaSelectWithCreate from "./CategoriaSelectWithCreate";
import ProveedorSelectWithCreate from "./ProveedorSelectWithCreate";
import EventoSelector from "./EventoSelector";
import GastoFijoSelect from "./GastoFijoSelect";

const schema = z.object({
  folio: z.string(),
  fecha: z.string(),
  concepto: z.string().min(10, "Mínimo 10 caracteres"),
  categoriaId: z.string().min(1, "Requerido"),
  costo: z.number().min(0.01, "Debe ser mayor a 0"),
  proveedorId: z.string().min(1, "Requerido"),
  tipo: z.enum(["evento", "fijo"]),
  fechaEvento: z.string().optional(),
  eventoId: z.string().optional(),
  gastoFijoId: z.string().optional(),
}).refine((data) => {
  if (data.tipo === "evento") {
    return data.fechaEvento && data.eventoId;
  }
  if (data.tipo === "fijo") {
    return data.gastoFijoId;
  }
  return true;
}, {
  message: "Completa los campos requeridos según el tipo de gasto",
  path: ["tipo"],
});

type NuevoGastoForm = z.infer<typeof schema>;

function getNextFolio() {
  // Simula GET /api/gastos/next-folio
  let last = Number(localStorage.getItem("lastFolio") || "1000");
  last++;
  localStorage.setItem("lastFolio", String(last));
  return `G${last}`;
}

export default function NuevoGastoForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [folio, setFolio] = useState("");
  const { categorias, proveedores, gastosFijos, loading: loadingCatalogos, crearCategoria, crearProveedor } = useCatalogosGastos();

  const form = useForm<NuevoGastoForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      folio: "",
      fecha: new Date().toISOString().slice(0, 10),
      concepto: "",
      categoriaId: "",
      costo: 0,
      proveedorId: "",
      tipo: "evento",
      fechaEvento: undefined,
      eventoId: undefined,
      gastoFijoId: undefined,
    },
    mode: "onChange",
  });

  useEffect(() => {
    setFolio(getNextFolio());
  }, []);
  useEffect(() => {
    if (folio) form.setValue("folio", folio);
  }, [folio, form]);

  const onSubmit = async (data: NuevoGastoForm) => {
    setLoading(true);
    try {
      // Simula POST /api/gastos
      await new Promise((res) => setTimeout(res, 800));
      // window.fetch("/api/gastos", { method: "POST", body: JSON.stringify(data) })
      //   .then(...)
      // Toast éxito
      // @ts-ignore
      if (window.toast) window.toast({ title: "Gasto creado correctamente", variant: "success" });
      navigate("/gastos");
    } catch (e) {
      // @ts-ignore
      if (window.toast) window.toast({ title: "Error al crear gasto", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-3xl mx-auto">
      <Card className="rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Folio */}
        <div className="col-span-1">
          <label htmlFor="folio" className="block text-xs font-medium mb-1">Folio</label>
          <Input id="folio" value={folio} readOnly aria-label="Folio" />
        </div>
        {/* Fecha */}
        <div className="col-span-1">
          <label htmlFor="fecha" className="block text-xs font-medium mb-1">Fecha</label>
          <Input id="fecha" type="date" {...form.register("fecha")} aria-label="Fecha" />
        </div>
        {/* Concepto */}
        <div className="col-span-2">
          <label htmlFor="concepto" className="block text-xs font-medium mb-1">Concepto</label>
          <Textarea id="concepto" {...form.register("concepto")} minLength={10} rows={2} aria-label="Concepto" />
          {form.formState.errors.concepto && <span className="text-xs text-red-500">{form.formState.errors.concepto.message}</span>}
        </div>
        {/* Categoría */}
        <div className="col-span-1">
          <label htmlFor="categoriaId" className="block text-xs font-medium mb-1">Categoría</label>
          <CategoriaSelectWithCreate
            value={form.watch("categoriaId")}
            onChange={v => form.setValue("categoriaId", v, { shouldValidate: true })}
            categorias={categorias}
            crearCategoria={crearCategoria}
            loading={loadingCatalogos}
          />
          {form.formState.errors.categoriaId && <span className="text-xs text-red-500">{form.formState.errors.categoriaId.message}</span>}
        </div>
        {/* Costo */}
        <div className="col-span-1">
          <label htmlFor="costo" className="block text-xs font-medium mb-1">Costo</label>
          <Input id="costo" type="number" step="0.01" min={0} {...form.register("costo", { valueAsNumber: true })} aria-label="Costo" />
          {form.formState.errors.costo && <span className="text-xs text-red-500">{form.formState.errors.costo.message}</span>}
        </div>
        {/* Proveedor */}
        <div className="col-span-1">
          <label htmlFor="proveedorId" className="block text-xs font-medium mb-1">Proveedor</label>
          <ProveedorSelectWithCreate
            value={form.watch("proveedorId")}
            onChange={v => form.setValue("proveedorId", v, { shouldValidate: true })}
            proveedores={proveedores}
            crearProveedor={crearProveedor}
            loading={loadingCatalogos}
          />
          {form.formState.errors.proveedorId && <span className="text-xs text-red-500">{form.formState.errors.proveedorId.message}</span>}
        </div>
        {/* Tipo de gasto */}
        <div className="col-span-1">
          <label className="block text-xs font-medium mb-1">Tipo de gasto</label>
          <RadioGroup
            value={form.watch("tipo")}
            onValueChange={v => form.setValue("tipo", v as "evento" | "fijo", { shouldValidate: true })}
            className="flex gap-4"
          >
            <RadioGroupItem value="evento" id="tipo-evento" aria-label="Evento específico" />
            <label htmlFor="tipo-evento">Evento específico</label>
            <RadioGroupItem value="fijo" id="tipo-fijo" aria-label="Gasto fijo mensual" />
            <label htmlFor="tipo-fijo">Gasto fijo mensual</label>
          </RadioGroup>
          {form.formState.errors.tipo && <span className="text-xs text-red-500">{form.formState.errors.tipo.message}</span>}
        </div>
        {/* Bloque A: Evento específico */}
        {form.watch("tipo") === "evento" && (
          <div className="col-span-2">
            <EventoSelector
              fecha={form.watch("fechaEvento")}
              onFechaChange={v => form.setValue("fechaEvento", v, { shouldValidate: true })}
              eventoId={form.watch("eventoId")}
              onEventoChange={v => form.setValue("eventoId", v, { shouldValidate: true })}
            />
            {(form.formState.errors.fechaEvento || form.formState.errors.eventoId) && (
              <span className="text-xs text-red-500">Debes seleccionar fecha y evento</span>
            )}
          </div>
        )}
        {/* Bloque B: Gasto fijo mensual */}
        {form.watch("tipo") === "fijo" && (
          <div className="col-span-2">
            <GastoFijoSelect
              value={form.watch("gastoFijoId")}
              onChange={v => form.setValue("gastoFijoId", v, { shouldValidate: true })}
              gastosFijos={gastosFijos}
              loading={loadingCatalogos}
            />
            {form.formState.errors.gastoFijoId && <span className="text-xs text-red-500">Selecciona un gasto fijo</span>}
          </div>
        )}
        {/* Acciones */}
        <div className="col-span-2 flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => navigate("/gastos")}
            aria-label="Cancelar" className="flex items-center gap-2">
            <XCircle size={18} /> Cancelar
          </Button>
          <Button type="submit" disabled={loading || !form.formState.isValid} className="flex items-center gap-2" aria-label="Guardar">
            <Save size={18} /> {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
