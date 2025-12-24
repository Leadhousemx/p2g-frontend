import { Compra } from "../../hooks/useCompras";
import { Skeleton } from "../ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface Props {
  data: Compra[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function ComprasTable({ data, total, loading, page, pageSize, onPageChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  const pages = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

  return (
    <div className="rounded-2xl bg-white shadow p-0 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 z-10">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Fecha</th>
            <th className="px-4 py-2 text-left font-semibold">Factura/Recibo</th>
            <th className="px-4 py-2 text-left font-semibold">Proveedor</th>
            <th className="px-4 py-2 text-left font-semibold">Forma de pago</th>
            <th className="px-4 py-2 text-left font-semibold">Método de pago</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <tr key={i}>
                <td colSpan={5} className="px-4 py-2"><Skeleton className="h-4 w-full" /></td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No hay compras para los filtros seleccionados.</td>
            </tr>
          ) : (
            data.map(compra => (
              <tr key={compra.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">{compra.fecha}</td>
                <td className="px-4 py-2 whitespace-nowrap">{compra.documentoTipo} {compra.documentoFolio}</td>
                <td className="px-4 py-2 whitespace-nowrap">{compra.proveedorNombre}</td>
                <td className="px-4 py-2 whitespace-nowrap">{compra.formaPago}</td>
                <td className="px-4 py-2 whitespace-nowrap">{compra.metodoPago}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 px-4 py-3 border-t bg-gray-50">
          {pages.map(p => (
            <Button
              key={p}
              variant={p === page ? "default" : "secondary"}
              size="sm"
              onClick={() => onPageChange(p)}
              aria-label={`Página ${p}`}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
