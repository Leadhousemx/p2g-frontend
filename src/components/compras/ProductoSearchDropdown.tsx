import { useEffect, useRef, useState } from "react";
import { useProductos } from "../../hooks/useProductos";
import { Producto } from "../../services/productsService";

interface ProductoSearchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onSelectProducto: (producto: Producto | null) => void;
  placeholder?: string;
}

export default function ProductoSearchDropdown({
  value,
  onChange,
  onSelectProducto,
  placeholder = "Buscar producto...",
}: ProductoSearchDropdownProps) {
  const { search } = useProductos();
  const [results, setResults] = useState<Producto[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Buscar productos cuando el valor cambia
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value && value.length > 0) {
        setLoading(true);
        const foundProducts = await search(value);
        setResults(foundProducts);
        setLoading(false);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [value, search]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProducto = (producto: Producto) => {
    onChange(producto.nombre);
    onSelectProducto(producto);
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange("");
    onSelectProducto(null);
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}

      {/* Dropdown */}
      {isOpen && value && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="px-4 py-3 text-gray-500 text-sm">Buscando...</div>
          ) : results.length > 0 ? (
            results.map((producto) => (
              <button
                key={producto._id}
                type="button"
                onClick={() => handleSelectProducto(producto)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-900">{producto.nombre}</div>
                <div className="text-sm text-gray-600">
                  ${producto.precioUnitario.toFixed(2)}
                  {producto.descripcion && ` • ${producto.descripcion}`}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No hay productos que coincidan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
