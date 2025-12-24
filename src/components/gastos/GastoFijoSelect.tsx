import type { GastoFijo } from "../../hooks/useCatalogosGastos";

interface Props {
  value?: string;
  onChange: (v: string) => void;
  gastosFijos: GastoFijo[];
  loading: boolean;
}

export default function GastoFijoSelect({ value, onChange, gastosFijos, loading }: Props) {
  return (
    <div>
      <label htmlFor="gastoFijoId" className="block text-xs font-medium mb-1">Gasto fijo</label>
      <select
        id="gastoFijoId"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="border rounded px-2 py-1 w-full"
        aria-label="Gasto fijo"
        disabled={loading}
      >
        <option value="">Selecciona...</option>
        {gastosFijos.map(gf => <option key={gf.id} value={gf.id}>{gf.nombre}</option>)}
      </select>
    </div>
  );
}
