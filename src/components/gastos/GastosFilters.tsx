import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const schema = z.object({
  folio: z.string().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

export type FiltroGastos = z.infer<typeof schema>;

interface Props {
  value: FiltroGastos;
  onChange: (next: Partial<FiltroGastos>) => void;
  loading?: boolean;
}

export default function GastosFilters({ value, onChange, loading }: Props) {
  const { register, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<FiltroGastos>({
    resolver: zodResolver(schema),
    defaultValues: value,
  });

  // Debounce: 300ms
  useEffect(() => {
    const sub = watch((data) => {
      const handler = setTimeout(() => {
        if (data.desde && data.hasta && data.desde > data.hasta) {
          setError("hasta", { message: "Hasta debe ser igual o posterior a Desde" });
          return;
        }
        // Normaliza: si el campo está vacío, envía undefined
        const normalized: Partial<FiltroGastos> = {
          folio: data.folio || undefined,
          desde: data.desde || undefined,
          hasta: data.hasta || undefined,
        };
        onChange(normalized);
      }, 300);
      return () => clearTimeout(handler);
    });
    return () => sub.unsubscribe();
  }, [watch, onChange, setError]);

  return (
    <form className="flex flex-wrap gap-2 items-end mb-4" onSubmit={handleSubmit((data) => {
      const normalized: Partial<FiltroGastos> = {
        folio: data.folio || undefined,
        desde: data.desde || undefined,
        hasta: data.hasta || undefined,
      };
      onChange(normalized);
    })}>
      <div>
        <label htmlFor="folio" className="block text-xs font-medium mb-1">Folio</label>
        <Input id="folio" {...register("folio")} placeholder="Folio" aria-label="Folio" value={value.folio ?? ""} />
      </div>
      <div>
        <label htmlFor="desde" className="block text-xs font-medium mb-1">Desde</label>
        <Input id="desde" type="date" {...register("desde")} aria-label="Desde" value={value.desde ?? ""} />
      </div>
      <div>
        <label htmlFor="hasta" className="block text-xs font-medium mb-1">Hasta</label>
        <Input id="hasta" type="date" {...register("hasta")} aria-label="Hasta" value={value.hasta ?? ""} />
        {errors.hasta && <span className="text-xs text-red-500">{errors.hasta.message}</span>}
      </div>
      <Button type="submit" className="ml-2">Buscar</Button>
      <Button type="button" variant="outline" onClick={() => { reset({ folio: "", desde: "", hasta: "" }); onChange({ folio: undefined, desde: undefined, hasta: undefined }); }}>
        Limpiar
      </Button>
    </form>
  );
}
