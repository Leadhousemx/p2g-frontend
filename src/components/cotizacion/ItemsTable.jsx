import { useFormContext, useFieldArray } from "react-hook-form";
import { Button, Input } from "@/components/ui";
import { Trash2 } from "lucide-react";

export default function ItemsTable() {
  const { control, register, setValue, watch: _watch } = useFormContext();
  const { fields, remove, update: _update } = useFieldArray({ control, name: "items" });

  const handleBlur = (i, field) => e => {
    if (field === "precio" || field === "cantidad") {
      let val = parseFloat(e.target.value);
      if (isNaN(val) || val < 0) val = 0;
      setValue(`items.${i}.${field}`, val);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="whitespace-nowrap px-2 py-2">Tipo</th>
            <th className="whitespace-nowrap px-2 py-2">Nombre</th>
            <th className="whitespace-nowrap px-2 py-2 text-right w-28">Precio</th>
            <th className="whitespace-nowrap px-2 py-2 text-right w-20">Cantidad</th>
            <th className="whitespace-nowrap px-2 py-2 text-right w-28">Total</th>
            <th className="whitespace-nowrap px-2 py-2 text-center w-10">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {fields.length === 0 && (
            <tr><td colSpan={6} className="text-center text-gray-400 py-4">Agrega conceptos desde los catálogos</td></tr>
          )}
          {fields.map((item, i) => (
            <tr key={item.id} className="hover:bg-muted/50">
              <td className="whitespace-nowrap px-2 py-2">{item.tipo}</td>
              <td className="whitespace-nowrap px-2 py-2">
                <Input {...register(`items.${i}.nombre`)} className="w-40" />
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right w-28">
                <Input type="number" step="0.01" min={0} {...register(`items.${i}.precio`, { valueAsNumber: true })} onBlur={handleBlur(i, "precio")} />
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right w-20">
                <Input type="number" min={1} {...register(`items.${i}.cantidad`, { valueAsNumber: true })} onBlur={handleBlur(i, "cantidad")} />
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right w-28">
                {Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(item.precio * item.cantidad)}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-center w-10">
                <Button variant="ghost" size="icon" onClick={() => remove(i)} title="Eliminar"><Trash2 size={16} /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
