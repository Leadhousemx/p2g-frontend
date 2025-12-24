import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../../components/ui/alert-dialog";
import { Skeleton } from "../../components/ui/skeleton";

export type Gasto = {
  id: string;
  folio: string;
  fecha: string;
  concepto: string;
  evento?: string;
  total: number;
};

interface Props {
  gastos: Gasto[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalFiltrado: number;
  onPageChange: (page: number) => void;
  onSort: (col: string) => void;
  sortBy: string;
  sortDir: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

export default function GastosTable({ gastos, loading, page, pageSize, total, totalFiltrado, onPageChange, onSort, sortBy, sortDir }: Props) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Paginación
  const totalPages = Math.ceil(totalFiltrado / pageSize);

  // Ordenamiento
  const renderSort = (col: string) => sortBy === col ? (sortDir === "asc" ? "▲" : "▼") : "";

  // Skeleton
  if (loading) {
    return (
      <div className="mt-4">
        {[...Array(pageSize)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))}
      </div>
    );
  }

  if (!gastos.length) {
    return <div className="text-center text-gray-500 py-12">No hay gastos para los filtros seleccionados.</div>;
  }

  // Totalizadores
  const totalPagina = gastos.reduce((acc, g) => acc + g.total, 0);

  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full bg-white rounded-lg shadow">
        <thead>
          <tr className="bg-[#2563eb] text-white">
            <th className="px-4 py-2 cursor-pointer" onClick={() => onSort("folio")}>Folio {renderSort("folio")}</th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => onSort("fecha")}>Fecha {renderSort("fecha")}</th>
            <th className="px-4 py-2">Concepto</th>
            <th className="px-4 py-2">Evento</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {gastos.map((g) => (
            <tr key={g.id} className="border-b hover:bg-blue-50">
              <td className="px-4 py-2 font-mono">{g.folio}</td>
              <td className="px-4 py-2">{g.fecha}</td>
              <td className="px-4 py-2">{g.concepto}</td>
              <td className="px-4 py-2">{g.evento || "-"}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(g.total)}</td>
              <td className="px-4 py-2 flex gap-2">
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => navigate(`/gastos/${g.id}/editar`)}>
                  <Pencil size={18} />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => setDeleteId(g.id)}>
                  <Trash2 size={18} className="text-red-500" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold">
            <td colSpan={4} className="px-4 py-2 text-right">Total página:</td>
            <td className="px-4 py-2 text-right">{formatCurrency(totalPagina)}</td>
            <td></td>
          </tr>
          <tr className="bg-gray-100 font-semibold">
            <td colSpan={4} className="px-4 py-2 text-right">Total filtrado:</td>
            <td className="px-4 py-2 text-right">{formatCurrency(totalFiltrado)}</td>
            <td></td>
          </tr>
        </tfoot>
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
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
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
                  await window.__removeGasto(deleteId);
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
