import { useState, useEffect } from "react";
import { Input, Button } from "@/components/ui";

interface Props {
  value: { nombre: string; email: string; telefono: string };
  onChange: (v: { nombre: string; email: string; telefono: string }) => void;
  loading?: boolean;
}

export default function ClientesFilters({ value, onChange, loading }: Props) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => {
    const handler = setTimeout(() => { onChange(local); }, 300);
    return () => clearTimeout(handler);
  }, [local]);
  return (
    <form className="flex flex-wrap gap-2 items-end mb-4">
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium mb-1">Nombre</label>
        <Input id="nombre" aria-label="Nombre" value={local.nombre} onChange={e => setLocal(l => ({ ...l, nombre: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
        <Input id="email" aria-label="Email" value={local.email} onChange={e => setLocal(l => ({ ...l, email: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="telefono" className="block text-sm font-medium mb-1">Teléfono</label>
        <Input id="telefono" aria-label="Teléfono" value={local.telefono} onChange={e => setLocal(l => ({ ...l, telefono: e.target.value }))} />
      </div>
      <Button type="button" className="ml-2" onClick={() => onChange(local)} title="Buscar" aria-label="Buscar" disabled={loading}>Buscar</Button>
      <Button type="button" variant="outline" onClick={() => { setLocal({ nombre: "", email: "", telefono: "" }); onChange({ nombre: "", email: "", telefono: "" }); }} title="Limpiar" aria-label="Limpiar">Limpiar</Button>
    </form>
  );
}
