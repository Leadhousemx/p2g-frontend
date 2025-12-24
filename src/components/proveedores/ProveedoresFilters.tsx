import { Input, Button } from "@/components/ui";
import { Search, X } from "lucide-react";
import { useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  loading?: boolean;
}

export default function ProveedoresFilters({ value, onChange, onClear, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <form
      className="flex gap-2 items-center mb-4"
      onSubmit={e => {
        e.preventDefault();
        inputRef.current?.focus();
      }}
      role="search"
      aria-label="Buscar proveedores"
    >
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
        <Input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Buscar por nombre"
          aria-label="Buscar por nombre"
          className="pl-8 pr-10"
          disabled={loading}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
            aria-label="Limpiar búsqueda"
            title="Limpiar búsqueda"
            tabIndex={0}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </form>
  );
}
