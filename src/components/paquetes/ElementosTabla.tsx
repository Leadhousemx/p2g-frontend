import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../../components/ui/alert-dialog";
import { useState } from "react";
import { formatCurrency } from "../../utils/formatCurrency";

interface Elemento {
  idCatalogo: string;
  tipo: string;
  nombre: string;
  precioPorMesa: number;
  cantidadMesas: number;
  total: number;
}

interface Props {
  elementos: Elemento[];
  update: (idx: number, value: Elemento) => void;
  remove: (idx: number) => void;
  minimoMesas: number;
}

export default function ElementosTabla({ elementos, update, remove }: Props) {
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg shadow">
        <thead>
          <tr className="bg-[#2563eb] text-white">
            <th className="px-2 py-2">Tipo</th>
            <th className="px-2 py-2">Nombre</th>
            <th className="px-2 py-2">Precio x mesa</th>
            <th className="px-2 py-2">Cantidad de mesas</th>
            <th className="px-2 py-2">Total</th>
            <th className="px-2 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {elementos.map((el, idx) => (
            <tr key={el.idCatalogo} className="border-b">
              <td className="px-2 py-2 capitalize">{el.tipo}</td>
              <td className="px-2 py-2">{el.nombre}</td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  min={0}
                  value={el.precioPorMesa}
                  onChange={e => {
                    const precio = Number(e.target.value);
                    update(idx, { ...el, precioPorMesa: precio, total: precio * el.cantidadMesas });
                  }}
                  className="border rounded px-2 py-1 w-24"
                  aria-label="Precio por mesa"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  min={1}
                  value={el.cantidadMesas}
                  onChange={e => {
                    const cantidad = Number(e.target.value);
                    update(idx, { ...el, cantidadMesas: cantidad, total: cantidad * el.precioPorMesa });
                  }}
                  className="border rounded px-2 py-1 w-20"
                  aria-label="Cantidad de mesas"
                />
              </td>
              <td className="px-2 py-2 font-mono">{formatCurrency(el.total)}</td>
              <td className="px-2 py-2">
                <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => setDeleteIdx(idx)}>
                  <Trash2 size={18} className="text-red-500" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Dialogo eliminar */}
      <AlertDialog open={deleteIdx !== null} onOpenChange={() => setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar elemento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => {
                if (deleteIdx !== null) remove(deleteIdx);
                setDeleteIdx(null);
              }}
            >Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
