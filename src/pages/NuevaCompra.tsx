import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input, Label, Separator } from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Plus, Trash2, Save, XCircle } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import DashboardLayout from "../layouts/DashboardLayout";

// --- Tipos y esquema ---
const NuevaCompraItemSchema = z.object({
  productoId: z.string().min(1, "Selecciona un producto"),
  cantidad: z.number().min(1, "Cantidad > 0"),
  precio: z.number().min(0, "Precio >= 0"),
  importe: z.number(),
});

const NuevaCompraSchema = z.object({
  folio: z.string(),
  fecha: z.string().min(1, "Requerido"),
  docTipo: z.enum(["Factura", "Recibo"]),
  docNumero: z.string().min(1, "Requerido"),
  proveedorId: z.string().min(1, "Selecciona proveedor"),
  formaPago: z.enum(["Crédito", "Contado"]),
  metodoPago: z.enum(["Efectivo", "Transferencia", "TDC"]),
  compraTipo: z.enum(["Evento", "General"]),
  eventoFolio: z.string().optional(),
  items: z.array(NuevaCompraItemSchema).min(1, "Agrega al menos una partida"),
  total: z.number(),
}).refine(
  (data) => data.compraTipo === "General" || (data.compraTipo === "Evento" && data.eventoFolio && data.eventoFolio.length > 0),
  {
    message: "Selecciona el evento",
    path: ["eventoFolio"],
  }
);

type NuevaCompraForm = z.infer<typeof NuevaCompraSchema>;

type Proveedor = { id: string; nombre: string };
type Producto = { id: string; nombre: string };
type Evento = { folio: string; nombre: string };

// --- Mocks de catálogos (reemplazar por hooks reales si existen) ---
const useProveedoresLite = (): { proveedores: Proveedor[]; loading: boolean } => ({
  proveedores: [
    { id: "1", nombre: "Proveedor A" },
    { id: "2", nombre: "Proveedor B" },
  ],
  loading: false,
});
const useProductosLite = () => [
  { id: "1", nombre: "Producto X" },
  { id: "2", nombre: "Producto Y" },
];
const useEventosLite = () => [
  { folio: "EVT-20240801-0001", nombre: "Boda Pérez" },
  { folio: "EVT-20240802-0002", nombre: "XV López" },
];

// --- Utilidad para folio temporal ---
function getFallbackFolio() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `CMP-${y}${m}${d}-0001`;
}

export default function NuevaCompra() {
  const navigate = useNavigate();
  const { proveedores } = useProveedoresLite();
  const productos = useProductosLite();
  const eventos = useEventosLite();
  const [folio, setFolio] = useState("");
  const [loading, setLoading] = useState(false);

  // Obtener folio al montar
  useEffect(() => {
    let active = true;
    api.get("/compras/next-folio")
      .then(res => {
        if (active && res.data?.folio) setFolio(res.data.folio);
      })
      .catch(() => {
        if (active) setFolio(getFallbackFolio());
      });
    return () => { active = false; };
  }, []);

  const form = useForm<NuevaCompraForm>({
    resolver: zodResolver(NuevaCompraSchema),
    defaultValues: {
      folio: folio || getFallbackFolio(),
      fecha: new Date().toISOString().slice(0, 10),
      docTipo: "Factura",
      docNumero: "",
      proveedorId: undefined,
      formaPago: "Contado",
      metodoPago: "Efectivo",
      compraTipo: "General",
      eventoFolio: undefined,
      items: [],
      total: 0,
    },
    mode: "onChange",
  });

  // Actualiza folio en el form si cambia
  useEffect(() => {
    if (folio) form.setValue("folio", folio);
  }, [folio]);

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Recalcula importes y total
  useEffect(() => {
    const items = form.getValues("items");
    let changed = false;
    const newItems = items.map((item, idx) => {
      const importe = Number(item.cantidad) * Number(item.precio);
      if (importe !== item.importe) changed = true;
      return { ...item, importe };
    });
    if (changed) form.setValue("items", newItems, { shouldValidate: true });
    const total = newItems.reduce((acc, i) => acc + (i.importe || 0), 0);
    form.setValue("total", total, { shouldValidate: true });
  }, [form.watch("items")]);

  // Al cambiar tipo de compra, limpiar eventoFolio si es General
  useEffect(() => {
    const tipo = form.watch("compraTipo");
    if (tipo === "General") {
      form.setValue("eventoFolio", undefined);
    }
  }, [form.watch("compraTipo")]);

  const onSubmit = async (data: NuevaCompraForm) => {
    setLoading(true);
    try {
      // const res = await api.post("/compras", data);
      await new Promise(res => setTimeout(res, 800));
      // toast.success("Compra creada correctamente");
      toast("Compra creada correctamente", { icon: "✅" });
      navigate("/compras");
    } catch (err: any) {
      toast("Error al guardar: " + (err?.message || ""), { icon: "❌" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nueva compra</h1>
        <div className="flex gap-2">
          <Button variant="secondary" asChild aria-label="Cancelar">
            <Link to="/compras">
              <XCircle className="mr-2 h-4 w-4" /> Cancelar
            </Link>
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="nueva-compra-form"
            disabled={loading}
            aria-label="Guardar compra"
          >
            {loading ? "Guardando..." : (<><Save className="mr-2 h-4 w-4" /> Guardar</>)}
          </Button>
        </div>
      </div>
      <div className="mx-auto mt-4 max-w-5xl rounded-2xl bg-white p-6 shadow">
        <form
          id="nueva-compra-form"
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
        >
          {/* Folio */}
          <div>
            <Label htmlFor="folio">Folio</Label>
            <Input id="folio" {...form.register("folio")} readOnly disabled />
          </div>
          {/* Fecha */}
          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              {...form.register("fecha")}
              required
            />
            {form.formState.errors.fecha && (
              <span className="text-red-500 text-xs">{form.formState.errors.fecha.message as string}</span>
            )}
          </div>
          {/* Tipo de documento */}
          <div>
            <Label>Tipo de documento</Label>
            <Controller
              control={form.control}
              name="docTipo"
              render={({ field }) => (
                <RadioGroup
                  className="flex gap-4 mt-2"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <RadioGroupItem value="Factura" id="docTipo-factura" />
                  <Label htmlFor="docTipo-factura">Factura</Label>
                  <RadioGroupItem value="Recibo" id="docTipo-recibo" />
                  <Label htmlFor="docTipo-recibo">Recibo</Label>
                </RadioGroup>
              )}
            />
          </div>
          {/* Número de factura/recibo */}
          <div>
            <Label htmlFor="docNumero">Número de factura/recibo</Label>
            <Input id="docNumero" {...form.register("docNumero")} required />
            {form.formState.errors.docNumero && (
              <span className="text-red-500 text-xs">{form.formState.errors.docNumero.message as string}</span>
            )}
          </div>
          {/* Proveedor */}
          <div>
            <Label htmlFor="proveedorId">Proveedor</Label>
            <Controller
              control={form.control}
              name="proveedorId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="proveedorId">
                    <SelectValue placeholder="Selecciona proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.proveedorId && (
              <span className="text-red-500 text-xs">{form.formState.errors.proveedorId.message as string}</span>
            )}
          </div>
          {/* Forma de pago */}
          <div>
            <Label htmlFor="formaPago">Forma de pago</Label>
            <Controller
              control={form.control}
              name="formaPago"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="formaPago">
                    <SelectValue placeholder="Selecciona forma de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contado">Contado</SelectItem>
                    <SelectItem value="Crédito">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.formaPago && (
              <span className="text-red-500 text-xs">{form.formState.errors.formaPago.message as string}</span>
            )}
          </div>
          {/* Método de pago */}
          <div>
            <Label htmlFor="metodoPago">Método de pago</Label>
            <Controller
              control={form.control}
              name="metodoPago"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="metodoPago">
                    <SelectValue placeholder="Selecciona método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="TDC">TDC</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.metodoPago && (
              <span className="text-red-500 text-xs">{form.formState.errors.metodoPago.message as string}</span>
            )}
          </div>
          {/* Tipo de compra */}
          <div>
            <Label>Tipo de compra</Label>
            <Controller
              control={form.control}
              name="compraTipo"
              render={({ field }) => (
                <RadioGroup
                  className="flex gap-4 mt-2"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <RadioGroupItem value="Evento" id="compraTipo-evento" />
                  <Label htmlFor="compraTipo-evento">Para evento</Label>
                  <RadioGroupItem value="General" id="compraTipo-general" />
                  <Label htmlFor="compraTipo-general">Gasto general</Label>
                </RadioGroup>
              )}
            />
          </div>
          {/* Evento (solo si compraTipo === Evento) */}
          {form.watch("compraTipo") === "Evento" && (
            <div>
              <Label htmlFor="eventoFolio">Evento</Label>
              <Controller
                control={form.control}
                name="eventoFolio"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="eventoFolio">
                      <SelectValue placeholder="Selecciona evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventos.map((e) => (
                        <SelectItem key={e.folio} value={e.folio}>{e.folio} - {e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.eventoFolio && (
                <span className="text-red-500 text-xs">{form.formState.errors.eventoFolio.message as string}</span>
              )}
            </div>
          )}
        </form>
        <Separator className="my-6" />
        {/* Partidas de compra */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Partidas</h2>
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ productoId: "", cantidad: 1, precio: 0, importe: 0 })}
              aria-label="Agregar partida"
            >
              <Plus className="mr-2 h-4 w-4" /> Agregar partida
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border rounded-xl">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold">Producto</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Cantidad</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Precio unitario</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Importe</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-4">Agrega al menos una partida</td>
                  </tr>
                )}
                {fields.map((field, idx) => (
                  <tr key={field.id} className="border-b">
                    <td className="px-3 py-2">
                      <Controller
                        control={form.control}
                        name={`items.${idx}.productoId`}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Producto" />
                            </SelectTrigger>
                            <SelectContent>
                              {productos.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.items?.[idx]?.productoId && (
                        <span className="text-red-500 text-xs">{form.formState.errors.items[idx]?.productoId?.message as string}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        {...form.register(`items.${idx}.cantidad`, { valueAsNumber: true })}
                        aria-label="Cantidad"
                      />
                      {form.formState.errors.items?.[idx]?.cantidad && (
                        <span className="text-red-500 text-xs">{form.formState.errors.items[idx]?.cantidad?.message as string}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        {...form.register(`items.${idx}.precio`, { valueAsNumber: true })}
                        aria-label="Precio unitario"
                      />
                      {form.formState.errors.items?.[idx]?.precio && (
                        <span className="text-red-500 text-xs">{form.formState.errors.items[idx]?.precio?.message as string}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={form.getValues(`items.${idx}.importe`) || 0}
                        readOnly
                        tabIndex={-1}
                        aria-label="Importe"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => remove(idx)}
                        aria-label="Eliminar partida"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Totales */}
        <div className="flex flex-col md:flex-row md:justify-end gap-4 mt-6 sticky bottom-0 bg-white py-4">
          <div className="flex flex-col items-end">
            <span className="text-sm text-gray-500">Subtotal</span>
            <span className="text-2xl font-bold">${form.watch("total")?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
