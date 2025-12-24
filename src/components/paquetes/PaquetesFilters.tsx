import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  loading?: boolean;
}

export default function PaquetesFilters({ value, onChange, loading }: Props) {
  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(value);
    }, 300);
    return () => clearTimeout(handler);
  }, [value, onChange]);

  return (
    <form className="flex flex-wrap gap-2 items-end mb-4" onSubmit={e => { e.preventDefault(); onChange(value); }}>
      <div className="flex items-center border rounded px-2 py-1 bg-white">
        <Search size={18} className="text-gray-400 mr-1" />
        <Input
          id="searchNombre"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Buscar por nombre"
          aria-label="Buscar por nombre"
          className="border-0 focus:ring-0 focus:outline-none"
          disabled={loading}
        />
      </div>
      <Button type="submit" className="ml-2">Buscar</Button>
      <Button type="button" variant="outline" onClick={() => onChange("")}>Limpiar</Button>
    </form>
  );
}
