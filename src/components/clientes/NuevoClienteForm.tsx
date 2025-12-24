import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Save, XCircle } from "lucide-react";
import { Input, Button } from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { useState } from "react";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  telefono: z.string().min(1, "El teléfono es obligatorio").max(15, "Máximo 15 dígitos").regex(/^\d+$/, "Solo números"),
  email: z.string().email("Email inválido"),
  cp: z.string().optional(),
  medio: z.string().min(1, "Selecciona un medio"),
  fechaNacimiento: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const medios = [
  { value: "redes", label: "Redes sociales" },
  { value: "web", label: "Web" },
  { value: "referido", label: "Referido" },
  { value: "espectacular", label: "Espectacular" },
];

export default function NuevoClienteForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Aquí iría POST real: await fetch('/api/clientes', ...)
      console.log("Cliente creado:", data);
      navigate("/clientes");
      // Mostrar notificación de éxito aquí si tienes sistema de alerts
    }, 1200);
  };

  return (
    <form id="nuevo-cliente-form" onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium mb-1">Nombre *</label>
          <Input id="nombre" aria-label="Nombre" {...register("nombre")} autoFocus />
          {errors.nombre && <div className="text-red-600 text-xs mt-1">{errors.nombre.message}</div>}
        </div>
        <div>
          <label htmlFor="apellido" className="block text-sm font-medium mb-1">Apellido *</label>
          <Input id="apellido" aria-label="Apellido" {...register("apellido")} />
          {errors.apellido && <div className="text-red-600 text-xs mt-1">{errors.apellido.message}</div>}
        </div>
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium mb-1">Teléfono *</label>
          <Input id="telefono" aria-label="Teléfono" maxLength={15} {...register("telefono")} />
          {errors.telefono && <div className="text-red-600 text-xs mt-1">{errors.telefono.message}</div>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email *</label>
          <Input id="email" aria-label="Email" type="email" {...register("email")} />
          {errors.email && <div className="text-red-600 text-xs mt-1">{errors.email.message}</div>}
        </div>
        <div>
          <label htmlFor="cp" className="block text-sm font-medium mb-1">C.P.</label>
          <Input id="cp" aria-label="Código Postal" {...register("cp")} />
        </div>
        <div>
          <label htmlFor="medio" className="block text-sm font-medium mb-1">Medio *</label>
          <Select id="medio" aria-label="Medio" {...register("medio")}> 
            <option value="">Selecciona</option>
            {medios.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
          {errors.medio && <div className="text-red-600 text-xs mt-1">{errors.medio.message}</div>}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="fechaNacimiento" className="block text-sm font-medium mb-1">Fecha de nacimiento</label>
          <Input id="fechaNacimiento" aria-label="Fecha de nacimiento" type="date" {...register("fechaNacimiento")} />
        </div>
      </form>
    
  );
}
