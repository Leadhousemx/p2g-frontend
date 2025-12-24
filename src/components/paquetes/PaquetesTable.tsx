import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../../components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Skeleton } from "../../components/ui/skeleton";

export type Paquete = {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
};

interface Props {
  paquetes: Paquete[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function PaquetesTable({ paquetes, loading, page, pageSize, total, onPageChange }: Props) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="mt-4">
        {[...Array(pageSize)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))}
      </div>
    );
  }
  if (!paquetes.length) {
    return <div className="text-center text-gray-500 py-12">No hay paquetes para los filtros seleccionados.</div>;
  }

  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full bg-white rounded-lg shadow">
        <thead>
          <tr className="bg-[#2563eb] text-white">
            <th className="px-4 py-2">Nombre</th>
            <th className="px-4 py-2">Código</th>
            <th className="px-4 py-2">Estado</th>
            <th className="px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {paquetes.map((p) => (
            <tr key={p.id} className="border-b hover:bg-blue-50">
              <td className="px-4 py-2">{p.nombre}</td>
              <td className="px-4 py-2 font-mono">{p.codigo}</td>
              <td className="px-4 py-2">
                {p.activo ? (
                  <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold">Activo</span>
                ) : (
                  <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold">Inactivo</span>
                )}
              </td>
              <td className="px-4 py-2 flex gap-2">
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => navigate(`/paquetes/${p.id}/editar`)}>
                  <Pencil size={18} />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => setDeleteId(p.id)}>
                  <Trash2 size={18} className="text-red-500" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Paginación */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Anterior">Anterior</Button>
          <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} aria-label="Siguiente">Siguiente</Button>
        </div>
      </div>
      {/* Dialogo eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar paquete?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  // @ts-ignore
                  await window.__removePaquete(deleteId);
                } finally {
                  setDeleting(false);
                  setDeleteId(null);
                }
              }}
            >Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
