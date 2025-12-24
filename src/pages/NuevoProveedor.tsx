import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Save, XCircle } from "lucide-react";
import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { useToast } from "../components/ui/use-toast";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "../components/ui/select";
import DashboardLayout from "../layouts/DashboardLayout";

const RFC_REGEX = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/i;

const schema = z.object({
  nombreComercial: z.string().min(2, "Requerido"),
  razonSocial: z.string().min(2, "Requerido"),
  rfc: z.string().regex(RFC_REGEX, "RFC inválido").min(12).max(13),
  telefono: z.string().regex(/^\d{7,15}$/, "Teléfono inválido"),
  email: z.string().email("Correo inválido"),
  contactoNombre: z.string().min(3, "Requerido"),
  formaPago: z.enum(["contado", "credito"]),
});

type NuevoProveedorForm = z.infer<typeof schema>;

export default function NuevoProveedorPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm<NuevoProveedorForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreComercial: "",
      razonSocial: "",
      rfc: "",
      telefono: "",
      email: "",
      contactoNombre: "",
      formaPago: "contado",
    },
    mode: "onTouched",
  });

  const onSubmit = async (data: NuevoProveedorForm) => {
    setLoading(true);
    try {
      const payload = { ...data, rfc: data.rfc.toUpperCase() };
      // Simula POST
      await new Promise((res) => setTimeout(res, 800));
      console.log("POST /api/proveedores", payload);
      toast({ title: "Proveedor creado correctamente", variant: "success" });
      navigate("/proveedores");
    } catch (e) {
      toast({ title: "Error al crear proveedor", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nuevo Proveedor</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" asChild type="button" aria-label="Cancelar">
            <Link to="/proveedores">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Link>
          </Button>
          <Button variant="primary" type="submit" form="nuevo-proveedor-form" aria-label="Guardar">
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>
      <section className="mx-auto mt-4 max-w-5xl rounded-2xl bg-white p-6 shadow">
        <form
          id="nuevo-proveedor-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          autoComplete="off"
        >
          <div>
            <Label htmlFor="nombreComercial">Nombre comercial</Label>
            <Input
              id="nombreComercial"
              {...form.register("nombreComercial")}
              aria-label="Nombre comercial"
              autoFocus
            />
            {form.formState.errors.nombreComercial && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.nombreComercial.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="razonSocial">Razón social</Label>
            <Input
              id="razonSocial"
              {...form.register("razonSocial")}
              aria-label="Razón social"
            />
            {form.formState.errors.razonSocial && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.razonSocial.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="rfc">RFC</Label>
            <Input
              id="rfc"
              {...form.register("rfc")}
              aria-label="RFC"
              maxLength={13}
              className="uppercase"
            />
            {form.formState.errors.rfc && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.rfc.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              {...form.register("telefono")}
              aria-label="Teléfono"
              maxLength={15}
              inputMode="numeric"
              pattern="[0-9]*"
            />
            {form.formState.errors.telefono && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.telefono.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              {...form.register("email")}
              aria-label="Correo electrónico"
              type="email"
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="contactoNombre">Nombre de contacto</Label>
            <Input
              id="contactoNombre"
              {...form.register("contactoNombre")}
              aria-label="Nombre de contacto"
            />
            {form.formState.errors.contactoNombre && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.contactoNombre.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="formaPago">Forma de pago</Label>
            <Select
              onValueChange={v => form.setValue("formaPago", v as "contado" | "credito")}
              value={form.watch("formaPago")}
              name="formaPago"
              aria-label="Forma de pago"
            >
              <SelectTrigger id="formaPago">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contado">Contado</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.formaPago && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.formaPago.message}</p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
