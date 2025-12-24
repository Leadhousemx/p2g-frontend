import { Proveedor } from "../../hooks/useProveedores";
import { Button } from "@/components/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "../ui/alert-dialog";
import { useToast } from "../ui/use-toast";

interface Props {
  proveedores: Proveedor[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function ProveedoresTable({ proveedores, loading, page, pageSize, total, onEdit, onDelete }: Props) {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await onDelete(id);
      toast({ title: "Proveedor eliminado", variant: "success" });
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre del proveedor</TableHead>
            <TableHead>Razón social</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Correo electrónico</TableHead>
            <TableHead className="w-32 text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-1" />
                </TableCell>
              </TableRow>
            ))
          ) : proveedores.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                No hay proveedores que coincidan con tu búsqueda.
              </TableCell>
            </TableRow>
          ) : (
            proveedores.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <span title={p.nombre} className="truncate max-w-[160px] block cursor-help">{p.nombre}</span>
                </TableCell>
                <TableCell>
                  <span title={p.razonSocial} className="truncate max-w-[160px] block cursor-help">{p.razonSocial}</span>
                </TableCell>
                <TableCell>
                  <span title={p.telefono} className="truncate max-w-[120px] block cursor-help">{p.telefono}</span>
                </TableCell>
                <TableCell>
                  <span title={p.email} className="truncate max-w-[180px] block cursor-help">{p.email}</span>
                </TableCell>
                <TableCell className="flex gap-2 justify-center items-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar proveedor"
                    title="Editar proveedor"
                    onClick={() => onEdit(p.id)}
                  >
                    <Pencil size={18} />
                  </Button>
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Borrar proveedor"
                      title="Borrar proveedor"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setDeleteId(p.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                    {deleteId === p.id && (
                      <AlertDialog open={true} onOpenChange={open => setDeleteId(open ? p.id : null)}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. ¿Seguro que deseas eliminar este proveedor?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {/* Paginación */}
      {total > pageSize && (
        <div className="flex justify-end items-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(total / pageSize) }).map((_, i) => (
            <Button
              key={i}
              size="sm"
              variant={i + 1 === page ? "default" : "outline"}
              onClick={() => {
                onEdit(`page:${i + 1}`);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              aria-label={`Página ${i + 1}`}
              title={`Página ${i + 1}`}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
