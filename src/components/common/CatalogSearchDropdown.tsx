import { useEffect, useRef, useState } from "react";

export interface CatalogSearchOption {
  id?: string;
  label: string;
  description?: string;
}

interface CatalogSearchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onSelectOption: (option: CatalogSearchOption | null) => void;
  searchFn: (query: string) => Promise<CatalogSearchOption[]>;
  placeholder?: string;
  emptyLabel?: string;
  createLabelPrefix?: string;
}

export default function CatalogSearchDropdown({
  value,
  onChange,
  onSelectOption,
  searchFn,
  placeholder = "Buscar...",
  emptyLabel = "No hay coincidencias",
  createLabelPrefix = "Crear",
}: CatalogSearchDropdownProps) {
  const [results, setResults] = useState<CatalogSearchOption[]>([]);
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
        const nextResults = await searchFn(query);
        setResults(Array.isArray(nextResults) ? nextResults : []);
      } finally {
        setLoading(false);
        setIsOpen(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, searchFn]);

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

  const normalizedValue = String(value || "").trim().toLowerCase();
  const exactMatch = results.some((item) => item.label.trim().toLowerCase() === normalizedValue);

  const handleSelect = (option: CatalogSearchOption | null) => {
    if (option) {
      onChange(option.label);
      onSelectOption(option);
    } else {
      onSelectOption(null);
    }

    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    onSelectOption(null);
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          onSelectOption(null);
        }}
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
          ) : (
            <>
              {results.map((option) => (
                <button
                  key={option.id || option.label}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  {option.description && (
                    <div className="text-sm text-gray-600">{option.description}</div>
                  )}
                </button>
              ))}

              {!exactMatch && normalizedValue && (
                <button
                  type="button"
                  onClick={() => handleSelect({ label: value.trim() })}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors text-emerald-700"
                >
                  {createLabelPrefix} "{value.trim()}"
                </button>
              )}

              {results.length === 0 && exactMatch === false && (
                <div className="px-4 py-3 text-gray-500 text-sm">{emptyLabel}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}