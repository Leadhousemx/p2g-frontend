import { useState } from "react";
import { Plus } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "../../components/ui/alert-dialog";
import type { Proveedor } from "../../hooks/useCatalogosGastos";

interface Props {
  value: string;
  onChange: (v: string) => void;
  proveedores: Proveedor[];
  crearProveedor: (nombre: string, rfc?: string, telefono?: string, email?: string) => Promise<Proveedor>;
  loading: boolean;
}

export default function ProveedorSelectWithCreate({ value, onChange, proveedores, crearProveedor, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rfc, setRfc] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    const nuevo = await crearProveedor(nombre, rfc, telefono, email);
    setSaving(false);
    setOpen(false);
    setNombre(""); setRfc(""); setTelefono(""); setEmail("");
    onChange(nuevo.id);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        id="proveedorId"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border rounded px-2 py-1 flex-1"
        aria-label="Proveedor"
        disabled={loading}
      >
        <option value="">Selecciona...</option>
        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(true)} aria-label="Agregar proveedor">
        <Plus size={18} />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nuevo proveedor</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="mb-2">
            <label htmlFor="nombre-prov" className="block text-xs font-medium mb-1">Nombre</label>
            <Input id="nombre-prov" value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus />
          </div>
          <div className="mb-2">
            <label htmlFor="rfc-prov" className="block text-xs font-medium mb-1">RFC</label>
            <Input id="rfc-prov" value={rfc} onChange={e => setRfc(e.target.value)} />
          </div>
          <div className="mb-2">
            <label htmlFor="tel-prov" className="block text-xs font-medium mb-1">Teléfono</label>
            <Input id="tel-prov" value={telefono} onChange={e => setTelefono(e.target.value)} />
          </div>
          <div className="mb-2">
            <label htmlFor="email-prov" className="block text-xs font-medium mb-1">Email</label>
            <Input id="email-prov" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={saving || !nombre} onClick={handleCreate}>Guardar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
