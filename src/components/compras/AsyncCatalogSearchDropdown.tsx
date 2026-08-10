import { useEffect, useRef, useState } from "react";

interface SearchableCatalogItem {
  _id: string;
  nombre: string;
  descripcion?: string;
  [key: string]: unknown;
}

interface AsyncCatalogSearchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onSelectItem: (item: SearchableCatalogItem | null) => void;
  searchItems: (query: string) => Promise<SearchableCatalogItem[]>;
  placeholder?: string;
  emptyText?: string;
  renderItemDetail?: (item: SearchableCatalogItem) => string;
}

export default function AsyncCatalogSearchDropdown({
  value,
  onChange,
  onSelectItem,
  searchItems,
  placeholder = "Buscar...",
  emptyText = "No hay coincidencias",
  renderItemDetail,
}: AsyncCatalogSearchDropdownProps) {
  const [results, setResults] = useState<SearchableCatalogItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = String(value || "").trim();
      if (!query) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        const nextResults = await searchItems(query);
        setResults(nextResults || []);
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, searchItems]);

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

  const handleSelect = (item: SearchableCatalogItem) => {
    onChange(item.nombre);
    onSelectItem(item);
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    onSelectItem(null);
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

      {isOpen && value && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="px-4 py-3 text-gray-500 text-sm">Buscando...</div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-900">{item.nombre}</div>
                {renderItemDetail && (
                  <div className="text-sm text-gray-600">{renderItemDetail(item)}</div>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-gray-500 text-sm">{emptyText}</div>
          )}
        </div>
      )}
    </div>
  );
}