import { Input, Button } from "@/components/ui";
import { Dialog, DialogTrigger, DialogContent } from "../ui/dialog";
import { useFormContext } from "react-hook-form";
import { useState } from "react";

export default function ClienteBuscarCrear() {
  const { register, setValue: _setValue } = useFormContext();
  const [open, setOpen] = useState(false);
  // Simula búsqueda
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-end">
        <Input placeholder="Buscar cliente por nombre, teléfono o email..." className="flex-1" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">Nuevo cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <h3 className="font-bold mb-2">Nuevo cliente</h3>
            <Input placeholder="Nombre" {...register("cliente.nombre")} />
            <Input placeholder="Teléfono" {...register("cliente.telefono")} />
            <Input placeholder="Email" {...register("cliente.email")} />
            <Button type="button" onClick={() => setOpen(false)}>Guardar</Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
        <Input placeholder="Nombre" {...register("cliente.nombre")} />
        <Input placeholder="Teléfono" {...register("cliente.telefono")} />
        <Input placeholder="Email" {...register("cliente.email")} />
      </div>
    </div>
  );
}
