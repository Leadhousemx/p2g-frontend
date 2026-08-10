import { Input, Button, Label } from "@/components/ui";
import { useFormContext } from "react-hook-form";
import { Plus, Search, Save } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { listClientes, createCliente } from "../../services/clientesService";
import { logger } from "../../lib/logger";
import {
  buildClienteMedioPayload,
  CLIENTE_MEDIO_OPTIONS,
  normalizeClienteMedioValues,
} from "../clientes/clienteMedio";

export default function ClienteBuscarCrear() {
  const { register, watch, setValue, formState: { errors } } = useFormContext();
  const [showNewClient, setShowNewClient] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingCliente, setSavingCliente] = useState(false);

  // Race-condition prevention: each search gets an ID; stale responses are discarded
  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);

  const clienteNombre = watch("cliente.nombre");
  const clienteApellido = watch("cliente.apellido");
  const clienteTelefono = watch("cliente.telefono");
  const clienteEmail = watch("cliente.email");
  const clienteMedio = watch("cliente.medio");
  const clienteMedioOtros = watch("cliente.medioOtros");

  const showInlineForm = showNewClient || Boolean(clienteNombre);
  const isNewClient = showNewClient && !watch("clienteId");

  // Debounced remote search — replaces the old local filter
  useEffect(() => {
    const term = search.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!term) {
      // Invalidate any in-flight request and reset state
      requestIdRef.current += 1;
      setSearchResults([]);
      setLoadingSearch(false);
      setHasSearched(false);
      return;
    }

    // Show loading immediately so the user knows something is happening
    setLoadingSearch(true);
    setHasSearched(false);

    debounceRef.current = setTimeout(() => {
      const currentId = ++requestIdRef.current;

      listClientes({ q: term, page: 1, pageSize: 20 })
        .then((response) => {
          if (requestIdRef.current !== currentId) return; // Discard stale response
          setSearchResults(Array.isArray(response?.clientes) ? response.clientes : []);
          setHasSearched(true);
          setLoadingSearch(false);
        })
        .catch((err) => {
          if (requestIdRef.current !== currentId) return;
          logger.error("Error buscando clientes:", err);
          setSearchResults([]);
          setHasSearched(true);
          setLoadingSearch(false);
        });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      requestIdRef.current += 1;
    };
  }, []);

  const selectCliente = (cliente) => {
    setValue("clienteId", cliente?._id || cliente?.id || "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("cliente.nombre", cliente?.nombre || "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("cliente.apellido", cliente?.apellidos || cliente?.apellido || "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("cliente.telefono", cliente?.telefono || "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("cliente.email", cliente?.email || "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    const normalizedMedio = normalizeClienteMedioValues(cliente?.medio, cliente?.medioOtros);
    setValue("cliente.medio", normalizedMedio.medio, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("cliente.medioOtros", normalizedMedio.medioOtros, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setShowNewClient(true);
    setSearch("");
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleSaveNewCliente = async () => {
    setSavingCliente(true);
    try {
      if (!clienteNombre || !clienteTelefono) {
        alert("❌ El nombre y teléfono son obligatorios para crear un cliente.");
        setSavingCliente(false);
        return;
      }

      const clienteMedioPayload = buildClienteMedioPayload({
        medio: clienteMedio,
        medioOtros: clienteMedioOtros,
      });

      if (clienteMedioPayload.medio === "Otros" && !clienteMedioPayload.medioOtros) {
        alert("❌ Especifica el medio cuando seleccionas 'Otros'.");
        setSavingCliente(false);
        return;
      }

      const newCliente = await createCliente({
        nombre: clienteNombre.trim(),
        ...(clienteApellido && { apellidos: clienteApellido.trim() }),
        telefono: clienteTelefono.trim(),
        ...(clienteEmail && { email: clienteEmail.trim() }),
        ...clienteMedioPayload,
      });

      setValue("clienteId", newCliente?._id || newCliente?.id || "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      alert("✅ Cliente creado correctamente. Ya está seleccionado en la cotización.");
      setShowNewClient(false);
    } catch (err) {
      logger.error("Error creando cliente:", err);
      alert(`❌ No se pudo crear el cliente: ${err?.response?.data?.message || err?.message}`);
    } finally {
      setSavingCliente(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            disabled={showNewClient}
            className="h-11 pl-10 rounded-xl border-slate-200"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl border-slate-200 sm:w-auto"
          onClick={() => setShowNewClient((prev) => !prev)}
        >
          <Plus className="w-4 h-4 mr-1" /> {showNewClient ? "Buscar" : "Nuevo"}
        </Button>
      </div>

      {search.trim() && (loadingSearch || hasSearched) && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loadingSearch ? (
            <div className="px-4 py-3 text-sm text-[#64748B]">Buscando clientes...</div>
          ) : hasSearched && searchResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#64748B]">No se encontraron clientes.</div>
          ) : searchResults.length > 0 ? (
            <ul className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
              {searchResults.map((cliente) => (
                <li key={cliente._id || cliente.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    onClick={() => selectCliente(cliente)}
                  >
                    <p className="break-words text-sm font-medium text-[#111827]">
                      {`${cliente.nombre || ""} ${cliente.apellidos || cliente.apellido || ""}`.trim() || "Sin nombre"}
                    </p>
                    <p className="mt-1 break-words text-xs text-[#64748B]">
                      {cliente.telefono || "Sin teléfono"} · {cliente.email || "Sin email"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {showInlineForm && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-slate-500 mb-2 block">Nombre *</Label>
              <Input placeholder="Nombre completo" className="h-11 rounded-xl border-slate-200" {...register("cliente.nombre")} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-slate-500 mb-2 block">Apellido</Label>
              <Input placeholder="Apellido" className="h-11 rounded-xl border-slate-200" {...register("cliente.apellido")} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-slate-500 mb-2 block">Teléfono *</Label>
              <Input placeholder="Teléfono" className="h-11 rounded-xl border-slate-200" {...register("cliente.telefono")} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-slate-500 mb-2 block">Email</Label>
              <Input placeholder="Email" className="h-11 rounded-xl border-slate-200" {...register("cliente.email")} />
            </div>
            <div className="md:col-span-2 xl:col-span-2">
              <Label htmlFor="cliente-medio" className="mb-2 block text-xs uppercase tracking-wide text-slate-500">¿Cómo nos conoció?</Label>
              <select
                id="cliente-medio"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-[#111827]"
                {...register("cliente.medio")}
                onChange={(e) => {
                  register("cliente.medio").onChange(e);
                  if (e.target.value !== "Otros") {
                    setValue("cliente.medioOtros", "", {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }
                }}
              >
                <option value="">Selecciona...</option>
                {CLIENTE_MEDIO_OPTIONS.map((medio) => (
                  <option key={medio} value={medio}>{medio}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#64748B]">Si seleccionas "Otros", debes especificar el medio.</p>
              {typeof errors?.cliente?.medio?.message === "string" ? <div className="mt-1 text-xs text-red-600">{errors.cliente.medio.message}</div> : null}
            </div>
            {clienteMedio === "Otros" ? (
              <div className="md:col-span-2 xl:col-span-2">
                <Label htmlFor="cliente-medio-otros" className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Especifique el medio *</Label>
                <Input id="cliente-medio-otros" placeholder="Ej: TikTok, LinkedIn, Podcast..." className="h-11 rounded-xl border-slate-200" {...register("cliente.medioOtros")} />
                {typeof errors?.cliente?.medioOtros?.message === "string" ? <div className="mt-1 text-xs text-red-600">{errors.cliente.medioOtros.message}</div> : null}
              </div>
            ) : null}
          </div>

          {isNewClient && (
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 w-full sm:w-auto"
                onClick={() => setShowNewClient(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                onClick={handleSaveNewCliente}
                disabled={savingCliente || !clienteNombre || !clienteTelefono}
              >
                <Save className="w-4 h-4 mr-1" />
                {savingCliente ? "Guardando..." : "Guardar cliente"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
