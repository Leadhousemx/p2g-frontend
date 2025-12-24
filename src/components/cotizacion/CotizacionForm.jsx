import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import CatalogTabs from "./CatalogTabs";
import ItemsTable from "./ItemsTable";
import ResumenCostos from "./ResumenCostos";
import ClienteBuscarCrear from "./ClienteBuscarCrear";
import {
  Button, Input, Select, Tabs, TabsList, TabsTrigger, TabsContent,
  Label, Textarea, Card, CardHeader, CardContent, CardFooter,
  Badge, Separator, Checkbox, Switch, Popover, PopoverTrigger, PopoverContent, Calendar
} from "@/components/ui";
import { Save, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";

// Zod schema (simplificado, puedes expandirlo)
const schema = z.object({
  folio: z.string().min(1),
  tipoEvento: z.string().min(1, "Requerido"),
  nombreEvento: z.string().min(2, "Requerido"),
  fechaEvento: z.date({ required_error: "Requerido" }),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/),
  salonId: z.string().min(1, "Requerido"),
  paqueteId: z.string().optional(),
  invitadosAdultos: z.number().int().min(0),
  invitadosNinos: z.number().int().min(0),
  cliente: z.object({
    nombre: z.string().min(2),
    telefono: z.string().optional(),
    email: z.string().email().optional(),
  }),
  items: z.array(z.object({
    tipo: z.enum(["Platillo", "Bebida", "Personal", "Paquete", "Extra"]),
    nombre: z.string().min(1),
    precio: z.number().gt(0),
    cantidad: z.number().gt(0),
  })).min(1, "Agrega al menos un concepto"),
  ivaPct: z.number().min(0).max(100),
  descuentoPct: z.number().min(0).max(100).optional(),
  descuentoMonto: z.number().min(0).optional(),
  anticipo: z.number().min(0),
  estado: z.enum(["Cotizado", "Contratado"]),
  observaciones: z.string().max(2000).optional(),
});

const defaultValues = {
  folio: "COT-001",
  tipoEvento: "",
  nombreEvento: "",
  fechaEvento: new Date(),
  horaInicio: "18:00",
  horaFin: "22:00",
  salonId: "",
  paqueteId: "",
  invitadosAdultos: 0,
  invitadosNinos: 0,
  cliente: { nombre: "", telefono: "", email: "" },
  items: [],
  ivaPct: 16,
  descuentoPct: 0,
  descuentoMonto: 0,
  anticipo: 0,
  estado: "Cotizado",
  observaciones: "",
};

export default function CotizacionForm() {
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onChange",
  });
  const { handleSubmit, watch, setValue, formState } = methods;
  const [saving, setSaving] = useState(false);

  // Cálculos en tiempo real
  const items = watch("items");
  const ivaPct = watch("ivaPct");
  const descuentoPct = watch("descuentoPct");
  const descuentoMonto = watch("descuentoMonto");
  const anticipo = watch("anticipo");

  const subtotal = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const ivaMonto = subtotal * (ivaPct / 100);
  const desc = descuentoPct ? subtotal * (descuentoPct / 100) : descuentoMonto || 0;
  const total = subtotal + ivaMonto - desc;
  const saldo = total - anticipo;

  // Handlers
  const onSubmit = async (data) => {
    setSaving(true);
    // Simula API
    setTimeout(() => {
      setSaving(false);
      alert("Cotización guardada!\n" + JSON.stringify(data, null, 2));
      // Aquí iría: await API.post("/cotizaciones", data)
    }, 1200);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Header y breadcrumb */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span>Inicio</span>
              <span>/</span>
              <span>Eventos</span>
              <span>/</span>
              <span className="text-[#2563eb] font-semibold">Nueva cotización</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-2xl font-bold">Nueva Cotización</h1>
              <Badge variant="outline" className="text-xs">Folio: <Input className="w-24 h-6 px-2 text-xs" {...methods.register("folio")} /></Badge>
            </div>
          </div>
          {/* Card: Datos del evento */}
          <Card>
            <CardHeader>Datos del evento</CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de evento</Label>
                <Select {...methods.register("tipoEvento")}
                  defaultValue="">
                  <option value="">Selecciona</option>
                  <option>Boda</option>
                  <option>XV Años</option>
                  <option>Graduación</option>
                  <option>Empresarial</option>
                  <option>Otro</option>
                </Select>
              </div>
              <div>
                <Label>Nombre del evento</Label>
                <Input {...methods.register("nombreEvento")} />
              </div>
              <div>
                <Label>Fecha del evento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Input
                      value={format(watch("fechaEvento"), "yyyy-MM-dd")}
                      readOnly
                      className="cursor-pointer"
                    />
                  </PopoverTrigger>
                  <PopoverContent align="start">
                    <Calendar
                      mode="single"
                      selected={watch("fechaEvento")}
                      onSelect={date => setValue("fechaEvento", date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Hora inicio</Label>
                  <Input type="time" {...methods.register("horaInicio")} />
                </div>
                <div className="flex-1">
                  <Label>Hora fin</Label>
                  <Input type="time" {...methods.register("horaFin")} />
                </div>
              </div>
              <div>
                <Label>Salón</Label>
                <Select {...methods.register("salonId")}
                  defaultValue="">
                  <option value="">Selecciona</option>
                  <option value="salon1">Salón Principal</option>
                  <option value="salon2">Salón Terraza</option>
                </Select>
              </div>
              <div>
                <Label>Paquete</Label>
                <Select {...methods.register("paqueteId")}
                  defaultValue="">
                  <option value="">Ninguno</option>
                  <option value="paq1">Paquete Oro</option>
                  <option value="paq2">Paquete Plata</option>
                </Select>
              </div>
              <div>
                <Label>Invitados adultos</Label>
                <Input type="number" min={0} {...methods.register("invitadosAdultos", { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Invitados niños</Label>
                <Input type="number" min={0} {...methods.register("invitadosNinos", { valueAsNumber: true })} />
              </div>
            </CardContent>
          </Card>
          {/* Card: Cliente */}
          <Card>
            <CardHeader>Cliente</CardHeader>
            <CardContent>
              <ClienteBuscarCrear />
            </CardContent>
          </Card>
          {/* Card: Catálogos */}
          <Card>
            <CardHeader>Catálogos</CardHeader>
            <CardContent>
              <CatalogTabs />
            </CardContent>
          </Card>
          {/* Card: Detalle de cotización */}
          <Card>
            <CardHeader>Detalle de cotización</CardHeader>
            <CardContent>
              <ItemsTable />
            </CardContent>
          </Card>
          {/* Card: Observaciones */}
          <Card>
            <CardHeader>Observaciones</CardHeader>
            <CardContent>
              <Textarea maxLength={2000} {...methods.register("observaciones")} />
            </CardContent>
          </Card>
        </div>
        {/* Sidebar derecha: Resumen de costos */}
        <div className="lg:col-span-4">
          <div className="sticky top-20">
            <ResumenCostos
              subtotal={subtotal}
              ivaPct={ivaPct}
              ivaMonto={ivaMonto}
              descuentoPct={descuentoPct}
              descuentoMonto={descuentoMonto}
              total={total}
              anticipo={anticipo}
              saldo={saldo}
              estado={watch("estado")}
              setValue={setValue}
              formState={formState}
              saving={saving}
            />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
