import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { Input, Button, Textarea, Card } from "@/components/ui";
import { Save, Eraser, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCatalogosPaquetes } from "../../hooks/useCatalogosPaquetes";
import MenuSelectorTabs from "./MenuSelectorTabs";
import ElementosTabla from "./ElementosTabla";
import { formatCurrency } from "../../utils/formatCurrency";

const elementoSchema = z.object({
  idCatalogo: z.string(),
  tipo: z.enum(["platillo", "bebida", "mobiliario", "personal", "adicional"]),
  nombre: z.string(),
  precioPorMesa: z.number().min(0),
  cantidadMesas: z.number().int().min(1),
  total: z.number().min(0),
});

const schema = z.object({
  nombre: z.string().min(3, "Mínimo 3 caracteres"),
  costoPorMesa: z.number().positive("Debe ser mayor a 0"),
  minimoMesas: z.number().int().min(1, "Mínimo 1 mesa"),
  descripcion: z.string().optional(),
  activo: z.boolean(),
  elementos: z.array(elementoSchema).min(1, "Agrega al menos un elemento al paquete"),
});

type PaqueteElemento = z.infer<typeof elementoSchema>;
type NuevoPaqueteForm = z.infer<typeof schema>;

export default function NuevoPaqueteForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nombreCheck, setNombreCheck] = useState<string | null>(null);
  const { platillos, bebidas, mobiliario, personal, adicionales, loading: loadingCatalogos } = useCatalogosPaquetes();

  const form = useForm<NuevoPaqueteForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "",
      costoPorMesa: 0,
      minimoMesas: 1,
      descripcion: "",
      activo: true,
      elementos: [],
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

  // Validar unicidad de nombre (simulado)
  const checkNombreUnico = async (nombre: string) => {
    // Simula GET /api/paquetes/check-nombre?nombre=...
    await new Promise((res) => setTimeout(res, 300));
    if (nombre.toLowerCase() === "paquete a") return false;
    return true;
  };

  // Calcular total general
  const calcTotalGeneral = () => fields.reduce((acc, el) => acc + (el.precioPorMesa * el.cantidadMesas), 0);

  // Guardar
  const onSubmit = async (data: NuevoPaqueteForm) => {
    setLoading(true);
    // Validar unicidad de nombre
    const unico = await checkNombreUnico(data.nombre);
    if (!unico) {
      setNombreCheck("Ya existe un paquete con ese nombre");
      setLoading(false);
      return;
    }
    setNombreCheck(null);
    try {
      // Simula POST /api/paquetes
      await new Promise((res) => setTimeout(res, 800));
      // window.fetch("/api/paquetes", { method: "POST", body: JSON.stringify({ ...data, totalPaquete: calcTotalGeneral() }) })
      //   .then(...)
      // Toast éxito
      // @ts-ignore
      if (window.toast) window.toast({ title: "Paquete creado correctamente", variant: "success" });
      localStorage.removeItem("nuevoPaqueteDraft");
      navigate("/paquetes");
    } catch (e) {
      // @ts-ignore
      if (window.toast) window.toast({ title: "Error al crear paquete", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Limpiar
  const handleLimpiar = () => {
    form.reset({ nombre: "", costoPorMesa: 0, minimoMesas: 1, descripcion: "", activo: true, elementos: [] });
    localStorage.removeItem("nuevoPaqueteDraft");
  };

  // Advertencia mínimo de mesas
  const sumaMesas = fields.reduce((acc, el) => acc + el.cantidadMesas, 0);
  const minimoMesas = form.watch("minimoMesas");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl mx-auto">
      <Card className="rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Header botones */}
        <div className="col-span-2 flex justify-end gap-2 mb-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/paquetes")}
            aria-label="Cancelar" className="flex items-center gap-2">
            <XCircle size={18} /> Cancelar
          </Button>
          <Button type="button" variant="secondary" onClick={handleLimpiar} aria-label="Limpiar" className="flex items-center gap-2">
            <Eraser size={18} /> Limpiar
          </Button>
          <Button type="submit" disabled={loading || !form.formState.isValid} className="flex items-center gap-2" aria-label="Guardar">
            <Save size={18} /> {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
        {/* Nombre */}
        <div className="col-span-1">
          <label htmlFor="nombre" className="block text-xs font-medium mb-1">Nombre del paquete</label>
          <Input id="nombre" {...form.register("nombre", { required: true })} aria-label="Nombre del paquete" />
          {form.formState.errors.nombre && <span className="text-xs text-red-500">{form.formState.errors.nombre.message}</span>}
          {nombreCheck && <span className="text-xs text-red-500">{nombreCheck}</span>}
        </div>
        {/* Costo x mesa */}
        <div className="col-span-1">
          <label htmlFor="costoPorMesa" className="block text-xs font-medium mb-1">Costo x mesa</label>
          <Input id="costoPorMesa" type="number" step="0.01" min={0} {...form.register("costoPorMesa", { valueAsNumber: true })} aria-label="Costo por mesa" />
          {form.formState.errors.costoPorMesa && <span className="text-xs text-red-500">{form.formState.errors.costoPorMesa.message}</span>}
        </div>
        {/* Mínimo de mesas */}
        <div className="col-span-1">
          <label htmlFor="minimoMesas" className="block text-xs font-medium mb-1">Mínimo de mesas</label>
          <Input id="minimoMesas" type="number" min={1} {...form.register("minimoMesas", { valueAsNumber: true })} aria-label="Mínimo de mesas" />
          {form.formState.errors.minimoMesas && <span className="text-xs text-red-500">{form.formState.errors.minimoMesas.message}</span>}
        </div>
        {/* Switch Activo/Inactivo */}
        <div className="col-span-1 flex items-center gap-2 mt-6">
          <input type="checkbox" id="activo" {...form.register("activo")} className="accent-blue-600 w-5 h-5" />
          <label htmlFor="activo" className="text-sm">Activo</label>
        </div>
        {/* Descripción */}
        <div className="col-span-2">
          <label htmlFor="descripcion" className="block text-xs font-medium mb-1">Descripción</label>
          <Textarea id="descripcion" {...form.register("descripcion")} rows={2} aria-label="Descripción" />
        </div>
        {/* Selección de menú */}
        <div className="col-span-2">
          <MenuSelectorTabs
            platillos={platillos}
            bebidas={bebidas}
            mobiliario={mobiliario}
            personal={personal}
            adicionales={adicionales}
            loading={loadingCatalogos}
            onAgregar={(el) => {
              append({ ...el, cantidadMesas: 1, precioPorMesa: el.precio || 0, total: el.precio || 0 });
            }}
          />
        </div>
        {/* Tabla de elementos */}
        <div className="col-span-2">
          <ElementosTabla
            elementos={fields}
            update={update}
            remove={remove}
            minimoMesas={minimoMesas}
          />
          {form.formState.errors.elementos && <span className="text-xs text-red-500">{form.formState.errors.elementos.message}</span>}
          {sumaMesas < minimoMesas && (
            <span className="text-xs text-yellow-600">La suma de mesas en los elementos es menor al mínimo requerido.</span>
          )}
        </div>
        {/* Total general */}
        <div className="col-span-2 text-right font-bold text-lg mt-2">
          Total paquete: {formatCurrency(calcTotalGeneral())}
        </div>
      </Card>
    </form>
  );
}
