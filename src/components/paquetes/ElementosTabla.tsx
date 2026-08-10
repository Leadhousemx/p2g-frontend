import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import MobileEntityCard from "../common/MobileEntityCard";
import AppConfirmDialog from "../common/AppConfirmDialog";
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
}

export default function ElementosTabla({ elementos, update, remove }: Props) {
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const elementoToDelete = deleteIdx !== null ? elementos[deleteIdx] ?? null : null;

  const handleRemove = async () => {
    if (deleteIdx === null) return;
    remove(deleteIdx);
    setDeleteIdx(null);
  };

  if (!elementos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center text-sm text-[#64748B]">
        Aún no has agregado elementos al paquete.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {elementos.map((el, idx) => (
          <MobileEntityCard
            key={`${el.idCatalogo}-${idx}`}
            title={el.nombre}
            subtitle={el.tipo}
            meta={
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-[#111827]">
                  {formatCurrency(el.total)}
                </span>
              </div>
            }
            actions={
              <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => setDeleteIdx(idx)}>
                <Trash2 size={18} className="text-red-500" />
              </Button>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Precio unitario</label>
                <input
                  type="number"
                  min={0}
                  value={el.precioPorMesa}
                  onChange={(e) => {
                    const precio = Number(e.target.value);
                    update(idx, { ...el, precioPorMesa: precio, total: precio * el.cantidadMesas });
                  }}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  aria-label="Precio unitario"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={el.cantidadMesas}
                  onChange={(e) => {
                    const cantidad = Number(e.target.value);
                    update(idx, { ...el, cantidadMesas: cantidad, total: cantidad * el.precioPorMesa });
                  }}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  aria-label="Cantidad"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 sm:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Total del elemento</span>
                  <span className="text-base font-semibold text-[#111827]">{formatCurrency(el.total)}</span>
                </div>
              </div>
            </div>
          </MobileEntityCard>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full rounded-lg bg-white shadow">
          <thead>
            <tr className="bg-[#2563eb] text-white">
              <th className="px-3 py-3 text-left text-sm">Tipo</th>
              <th className="px-3 py-3 text-left text-sm">Nombre</th>
              <th className="px-3 py-3 text-left text-sm">Precio unitario</th>
              <th className="px-3 py-3 text-left text-sm">Cantidad</th>
              <th className="px-3 py-3 text-left text-sm">Total</th>
              <th className="px-3 py-3 text-left text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {elementos.map((el, idx) => (
              <tr key={`${el.idCatalogo}-${idx}`} className="border-b last:border-b-0">
                <td className="px-3 py-3 capitalize text-[#111827]">{el.tipo}</td>
                <td className="px-3 py-3 text-[#111827]">{el.nombre}</td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    value={el.precioPorMesa}
                    onChange={(e) => {
                      const precio = Number(e.target.value);
                      update(idx, { ...el, precioPorMesa: precio, total: precio * el.cantidadMesas });
                    }}
                    className="h-10 w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    aria-label="Precio unitario"
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={1}
                    value={el.cantidadMesas}
                    onChange={(e) => {
                      const cantidad = Number(e.target.value);
                      update(idx, { ...el, cantidadMesas: cantidad, total: cantidad * el.precioPorMesa });
                    }}
                    className="h-10 w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    aria-label="Cantidad"
                  />
                </td>
                <td className="px-3 py-3 font-mono text-[#111827]">{formatCurrency(el.total)}</td>
                <td className="px-3 py-3">
                  <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => setDeleteIdx(idx)}>
                    <Trash2 size={18} className="text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AppConfirmDialog
        open={deleteIdx !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIdx(null);
        }}
        title="Eliminar elemento"
        message={elementoToDelete ? `¿Estás seguro de que deseas eliminar \"${elementoToDelete.nombre}\"? Esta acción no se puede deshacer.` : ""}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
        onConfirm={handleRemove}
      />
    </>
  );
}
