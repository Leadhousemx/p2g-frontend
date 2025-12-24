import { useState } from "react";
import { Plus } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "../../components/ui/alert-dialog";
import type { Categoria } from "../../hooks/useCatalogosGastos";

interface Props {
  value: string;
  onChange: (v: string) => void;
  categorias: Categoria[];
  crearCategoria: (nombre: string, descripcion?: string) => Promise<Categoria>;
  loading: boolean;
}

export default function CategoriaSelectWithCreate({ value, onChange, categorias, crearCategoria, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    const nueva = await crearCategoria(nombre, descripcion);
    setSaving(false);
    setOpen(false);
    setNombre("");
    setDescripcion("");
    onChange(nueva.id);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        id="categoriaId"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border rounded px-2 py-1 flex-1"
        aria-label="Categoría"
        disabled={loading}
      >
        <option value="">Selecciona...</option>
        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(true)} aria-label="Agregar categoría">
        <Plus size={18} />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nueva categoría</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="mb-2">
            <label htmlFor="nombre-cat" className="block text-xs font-medium mb-1">Nombre</label>
            <Input id="nombre-cat" value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus />
          </div>
          <div className="mb-2">
            <label htmlFor="desc-cat" className="block text-xs font-medium mb-1">Descripción</label>
            <Input id="desc-cat" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
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
