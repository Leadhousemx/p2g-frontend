import { Button, Input, Select, Label } from "@/components/ui";
import { useFormContext } from "react-hook-form";
import { Save, FileText, CheckCircle } from "lucide-react";

export default function ResumenCostos({ subtotal, ivaMonto, descuentoMonto, total, saldo, formState, saving }) {
  const { register } = useFormContext();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4">
      <h2 className="text-lg font-bold mb-2">Resumen de costos</h2>
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>{Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <Label htmlFor="ivaPct">IVA (%)</Label>
        <Input id="ivaPct" type="number" min={0} max={100} className="w-16" {...register("ivaPct", { valueAsNumber: true })} />
        <span>{Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(ivaMonto)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <Label htmlFor="descuentoPct">Descuento (%)</Label>
        <Input id="descuentoPct" type="number" min={0} max={100} className="w-16" {...register("descuentoPct", { valueAsNumber: true })} />
        <span>-{Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(descuentoMonto)}</span>
      </div>
      <div className="flex justify-between text-base font-bold border-t pt-2">
        <span>Total</span>
        <span>{Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Saldo pendiente</span>
        <span>{Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(saldo)}</span>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <Button type="submit" size="lg" disabled={saving} className="w-full flex gap-2 items-center"><Save size={18}/> Guardar borrador</Button>
        <Button type="button" size="lg" variant="success" className="w-full flex gap-2 items-center"><CheckCircle size={18}/> Contratar</Button>
        <Button type="button" size="lg" variant="outline" className="w-full flex gap-2 items-center"><FileText size={18}/> PDF</Button>
      </div>
      {formState.errors && Object.keys(formState.errors).length > 0 && (
        <div className="text-red-600 text-xs mt-2">
          {Object.values(formState.errors).map((err, i) => (
            <div key={i}>{err.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
