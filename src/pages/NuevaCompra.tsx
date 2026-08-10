import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { AlertCircle, Loader, Plus, Save, XCircle } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import DynamicLineItemsEditor from "../components/common/DynamicLineItemsEditor";
import type { DynamicLineItemField, DynamicLineItemRecord } from "../components/common/DynamicLineItemsEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import ProductoSearchDropdown from "../components/compras/ProductoSearchDropdown";
import AsyncCatalogSearchDropdown from "../components/compras/AsyncCatalogSearchDropdown";
import { useProveedores } from "../hooks/useProveedores";
import type { Producto } from "../services/productsService";
import type { Proveedor } from "../services/proveedoresService";
import type { ServicioOperativo } from "../services/serviciosOperativosService";
import type { GastoFijoCatalogo } from "../services/gastosFijosCatalogService";
import { getCotizacionEventOptionLabel, type Cotizacion } from "../services/cotizacionesService";
import { createCompra, getCompra, getNextFolio } from "../services/comprasService";
import type { Compra } from "../services/comprasService";
import { createGastoOperativo, getNextFolioGastoOperativo } from "../services/gastosOperativosService";
import {
  createRegistroGastoFijo,
  getNextFolioRegistroGastoFijo,
} from "../services/registrosGastosFijosService";
import { listCotizacionesContratadas } from "../services/cotizacionesService";
import { searchServiciosOperativos } from "../services/serviciosOperativosService";
import { searchGastosFijosCatalogo } from "../services/gastosFijosCatalogService";
import { preventEnterFormSubmit } from "../utils/formGuards";
import { logger } from "../lib/logger";
import {
  calculateCompraItemSubtotal,
} from "../utils/compraItemUtils";
import { extractValidationErrors, getErrorMessage } from "../utils/validationErrorUtils";
import { toLocalDateOnly } from "../utils/dateOnly";

type RegistroTipo = "compras" | "operacion" | "gastos_fijos";
const NUEVA_COMPRA_DRAFT_STORAGE_KEY = "nuevaCompraDraft";

interface CompraItemForm {
  productoNombre: string;
  productoId: string;
  precioUnitario: number;
  cantidad: number | undefined;
}

interface OperacionItemForm {
  nombreServicio: string;
  servicioId: string;
  cantidad: number | undefined;
  precio: number;
}

interface GastoFijoItemForm {
  nombreGastoFijo: string;
  gastoFijoId: string;
  precio: number;
}

interface LineEditorItemRaw {
  fieldId: string;
  index: number;
  isLastItem: boolean;
}

interface CompraLineEditorItem extends DynamicLineItemRecord {
  productoNombre: string;
  productoId: string;
  precioUnitario: number;
  cantidad: number | undefined;
  raw: LineEditorItemRaw;
}

interface OperacionLineEditorItem extends DynamicLineItemRecord {
  nombreServicio: string;
  servicioId: string;
  cantidad: number | undefined;
  precio: number;
  raw: LineEditorItemRaw;
}

interface GastoFijoLineEditorItem extends DynamicLineItemRecord {
  nombreGastoFijo: string;
  gastoFijoId: string;
  precio: number;
  raw: LineEditorItemRaw;
}

interface NuevaCompraFormValues {
  registroTipo: RegistroTipo;
  fecha: string;
  metodoPago: "Efectivo" | "Transferencia" | "Cheque" | "Tarjeta" | "Otro";
  documentoTipo: "Factura" | "Recibo" | "Nota" | "Remisión" | "Orden de Compra" | "Otro";
  documentoFolio: string;
  proveedorId: string;
  formaPago: "Contado" | "Crédito" | "Anticipo";
  anticipo: number;
  descuento: number;
  tipoCompra: "general" | "evento";
  tipoGasto: "general" | "evento";
  eventoId: string;
  eventoNombre: string;
  compraItems: CompraItemForm[];
  operacionItems: OperacionItemForm[];
  gastoFijoItems: GastoFijoItemForm[];
}

interface DuplicateCompraPayload {
  compraId?: string;
  snapshot?: Partial<Compra> | null;
}
interface NuevaCompraDraftSnapshot {
  values: NuevaCompraFormValues;
  cantidadInputsCompra: Record<string, string>;
  cantidadInputsOperacion: Record<string, string>;
  precioInputsCompra: Record<string, string>;
  precioInputsOperacion: Record<string, string>;
  precioInputsGastoFijo: Record<string, string>;
  nuevoProveedorNombre: string;
}

const REGISTRO_META: Record<RegistroTipo, { label: string; description: string; folioLabel: string }> = {
  compras: {
    label: "Compras",
    description: "Mantiene el flujo actual de compras con proveedor, documento y forma de pago.",
    folioLabel: "Folio de compra",
  },
  operacion: {
    label: "Operación",
    description: "Guarda gastos operativos en su módulo independiente con servicios operativos.",
    folioLabel: "Folio operativo",
  },
  gastos_fijos: {
    label: "Gastos fijos",
    description: "Registra cargos transaccionales contra el catálogo de gastos fijos.",
    folioLabel: "Folio de gasto fijo",
  },
};

const DOCUMENTO_TYPES = ["Factura", "Recibo", "Nota", "Remisión", "Orden de Compra", "Otro"] as const;
const METODOS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Otro"] as const;
const FORMAS_PAGO = ["Contado", "Crédito", "Anticipo"] as const;
const COMPRA_DECIMAL_SOFT_PATTERN = /^\d*(?:\.\d*)?$/;
const COMPRA_MAX_DECIMALS = 4;

function normalizeCompraDecimalInput(value: unknown): string {
  return String(value ?? "").replace(/,/g, ".").trim();
}

function hasUpToFourDecimals(value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }

  const fixed = value.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
  const decimals = fixed.split(".")[1] || "";
  return decimals.length <= COMPRA_MAX_DECIMALS;
}

function isCompraDecimalInputValid(value: string): boolean {
  const normalized = normalizeCompraDecimalInput(value);
  if (!COMPRA_DECIMAL_SOFT_PATTERN.test(normalized)) {
    return false;
  }

  const decimals = normalized.split(".")[1] || "";
  return decimals.length <= COMPRA_MAX_DECIMALS;
}

function parseCompraDecimalInput(value: unknown): number | undefined {
  const normalized = normalizeCompraDecimalInput(value);
  if (!normalized || normalized === ".") {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeCompraDecimalOnBlur(value: string): string {
  const normalized = normalizeCompraDecimalInput(value);

  if (normalized === ".") {
    return "";
  }

  if (normalized.endsWith(".")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function formatCompraDecimalInput(value: unknown): string {
  const parsed = parseCompraDecimalInput(value);
  if (parsed === undefined) {
    return "";
  }

  return parsed.toFixed(COMPRA_MAX_DECIMALS).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function getCantidadValidationMessage(value: string): string {
  const normalized = normalizeCompraDecimalInput(value);

  if (normalized.startsWith("-")) {
    return "La cantidad no puede ser negativa.";
  }

  if (!COMPRA_DECIMAL_SOFT_PATTERN.test(normalized)) {
    return "Ingresa una cantidad valida.";
  }

  return "La cantidad admite hasta 4 decimales.";
}

function getPrecioValidationMessage(value: string, label: string): string {
  const normalized = normalizeCompraDecimalInput(value);

  if (normalized.startsWith("-")) {
    return `El ${label} no puede ser negativo.`;
  }

  if (!COMPRA_DECIMAL_SOFT_PATTERN.test(normalized)) {
    return `Ingresa un ${label} valido.`;
  }

  return `El ${label} admite hasta 4 decimales.`;
}

function isRegistroTipo(value: string | null): value is RegistroTipo {
  return value === "compras" || value === "operacion" || value === "gastos_fijos";
}

function getDefaultRegistroTipo(search: string): RegistroTipo {
  const params = new URLSearchParams(search);
  const requestedType = params.get("tipo");
  return isRegistroTipo(requestedType) ? requestedType : "compras";
}

function getOperacionSubtotal(item?: OperacionItemForm): number {
  return calculateCompraItemSubtotal(item?.precio, item?.cantidad);
}

function getGastoFijoSubtotal(item?: GastoFijoItemForm): number {
  return Number(item?.precio || 0);
}

function getCatalogItemPrice(item: { precio?: unknown } | null | undefined): number | undefined {
  const parsed = Number(item?.precio);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeBackendField(field: string, registroTipo: RegistroTipo): string {
  const normalized = String(field || "").replace(/\[(\d+)\]/g, ".$1");
  if (!normalized) return normalized;

  if (normalized === "proveedor") return "proveedorId";
  if (normalized.startsWith("items.")) {
    const prefix =
      registroTipo === "compras"
        ? "compraItems"
        : registroTipo === "operacion"
          ? "operacionItems"
          : "gastoFijoItems";
    return normalized.replace(/^items/, prefix);
  }

  return normalized;
}

function getEventoNombre(cotizaciones: Cotizacion[], eventoId: string): string {
  const selected = cotizaciones.find((cotizacion) => cotizacion._id === eventoId);
  return selected?.nombreEvento || "";
}

function buildDuplicatedCompraDefaults(duplicatedCompra?: Partial<Compra> | null): NuevaCompraFormValues {
  const duplicatedItems = Array.isArray(duplicatedCompra?.items) && duplicatedCompra.items.length
    ? duplicatedCompra.items.map((item) => ({
        productoNombre: item.productoNombre || "",
        productoId: item.productoId || "",
        precioUnitario: Number(item.precioUnitario || 0),
        cantidad: Number(item.cantidad || 0),
      }))
    : [{ productoNombre: "", productoId: "", precioUnitario: 0, cantidad: 1 }];

  return {
    registroTipo: "compras",
    fecha: duplicatedCompra?.fecha ? String(duplicatedCompra.fecha).split("T")[0] : toLocalDateOnly(new Date()),
    metodoPago: duplicatedCompra?.metodoPago || "Transferencia",
    documentoTipo: duplicatedCompra?.documentoTipo || "Factura",
    documentoFolio: duplicatedCompra?.documentoFolio || "",
    proveedorId: duplicatedCompra?.proveedorId || "",
    formaPago: duplicatedCompra?.formaPago || "Contado",
    anticipo: Number(duplicatedCompra?.anticipo || 0),
    descuento: Number(duplicatedCompra?.descuento || 0),
    tipoCompra: duplicatedCompra?.tipoCompra || "general",
    tipoGasto: "general",
    eventoId: duplicatedCompra?.eventoId || "",
    eventoNombre: duplicatedCompra?.eventoNombre || "",
    compraItems: duplicatedItems,
    operacionItems: [{ nombreServicio: "", servicioId: "", cantidad: 1, precio: 0 }],
    gastoFijoItems: [{ nombreGastoFijo: "", gastoFijoId: "", precio: 0 }],
  };
}

export default function NuevaCompra() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialType = useMemo(() => getDefaultRegistroTipo(location.search), [location.search]);
  const { proveedores, list: reloadProveedores } = useProveedores({ loadAll: true });

  const [eventos, setEventos] = useState<Cotizacion[]>([]);
  const [eventosLoading, setEventosLoading] = useState(false);
  const [eventosError, setEventosError] = useState("");
  const [folioByType, setFolioByType] = useState<Record<RegistroTipo, string>>({
    compras: "",
    operacion: "",
    gastos_fijos: "",
  });
  const [folioLoading, setFolioLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cantidadInputsCompra, setCantidadInputsCompra] = useState<Record<string, string>>({});
  const [cantidadInputsOperacion, setCantidadInputsOperacion] = useState<Record<string, string>>({});
  const [precioInputsCompra, setPrecioInputsCompra] = useState<Record<string, string>>({});
  const [precioInputsOperacion, setPrecioInputsOperacion] = useState<Record<string, string>>({});
  const [precioInputsGastoFijo, setPrecioInputsGastoFijo] = useState<Record<string, string>>({});
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState("");

  const form = useForm<NuevaCompraFormValues>({
    mode: "onTouched",
    defaultValues: {
      registroTipo: initialType,
      fecha: toLocalDateOnly(new Date()),
      metodoPago: "Transferencia",
      documentoTipo: "Factura",
      documentoFolio: "",
      proveedorId: "",
      formaPago: "Contado",
      anticipo: 0,
      descuento: 0,
      tipoCompra: "general",
      tipoGasto: "general",
      eventoId: "",
      eventoNombre: "",
      compraItems: [{ productoNombre: "", productoId: "", precioUnitario: 0, cantidad: 1 }],
      operacionItems: [{ nombreServicio: "", servicioId: "", cantidad: 1, precio: 0 }],
      gastoFijoItems: [{ nombreGastoFijo: "", gastoFijoId: "", precio: 0 }],
    },
  });

  const { control, formState, getValues, handleSubmit, register, setError, clearErrors, setValue } = form;
  const errors: any = formState.errors;

  const registroTipo = useWatch({ control, name: "registroTipo" }) as RegistroTipo;
  const metodoPago = useWatch({ control, name: "metodoPago" });
  const documentoTipo = useWatch({ control, name: "documentoTipo" });
  const formaPago = useWatch({ control, name: "formaPago" });
  const tipoCompra = useWatch({ control, name: "tipoCompra" });
  const tipoGasto = useWatch({ control, name: "tipoGasto" });
  const eventoId = useWatch({ control, name: "eventoId" });
  const proveedorId = useWatch({ control, name: "proveedorId" });
  const descuentoWatch = useWatch({ control, name: "descuento" });
  const compraItemsWatch = useWatch({ control, name: "compraItems" }) || [];
  const operacionItemsWatch = useWatch({ control, name: "operacionItems" }) || [];
  const gastoFijoItemsWatch = useWatch({ control, name: "gastoFijoItems" }) || [];

  const compraFieldArray = useFieldArray({ control, name: "compraItems" });
  const operacionFieldArray = useFieldArray({ control, name: "operacionItems" });
  const gastoFijoFieldArray = useFieldArray({ control, name: "gastoFijoItems" });

  const compraTotal = useMemo(
    () => compraItemsWatch.reduce((sum, item) => sum + calculateCompraItemSubtotal(item?.precioUnitario, item?.cantidad), 0),
    [compraItemsWatch]
  );
  const operacionTotal = useMemo(
    () => operacionItemsWatch.reduce((sum, item) => sum + getOperacionSubtotal(item), 0),
    [operacionItemsWatch]
  );
  const gastoFijoTotal = useMemo(
    () => gastoFijoItemsWatch.reduce((sum, item) => sum + getGastoFijoSubtotal(item), 0),
    [gastoFijoItemsWatch]
  );

  const descuentoCompra = useMemo(() => {
    const parsed = Number(descuentoWatch);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return parsed;
  }, [descuentoWatch]);

  const totalCompraConDescuento = useMemo(
    () => Math.max(0, compraTotal - Math.min(compraTotal, descuentoCompra)),
    [compraTotal, descuentoCompra]
  );

  const totalActual = registroTipo === "compras" ? totalCompraConDescuento : registroTipo === "operacion" ? operacionTotal : gastoFijoTotal;
  const folioActual = folioByType[registroTipo];
  const needsEventoOptions = tipoCompra === "evento" || tipoGasto === "evento";

  const selectedProveedor = useMemo<Proveedor | null>(() => {
    return proveedores.find((proveedor) => proveedor._id === proveedorId) || null;
  }, [proveedores, proveedorId]);

  const updateUrlType = (nextType: RegistroTipo) => {
    const params = new URLSearchParams(location.search);
    params.set("tipo", nextType);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true, state: location.state });
  };

  const loadFolio = async (type: RegistroTipo) => {
    if (folioByType[type]) return;

    setFolioLoading(true);
    try {
      const nextFolio =
        type === "compras"
          ? await getNextFolio()
          : type === "operacion"
            ? await getNextFolioGastoOperativo()
            : await getNextFolioRegistroGastoFijo();

      setFolioByType((previous) => ({
        ...previous,
        [type]: nextFolio,
      }));
    } catch (error) {
      logger.error("Error loading folio preview:", error);
    } finally {
      setFolioLoading(false);
    }
  };

  useEffect(() => {
    void loadFolio(registroTipo);
  }, [registroTipo]);

  const loadEventos = async () => {
    setEventosLoading(true);
    setEventosError("");
    try {
      const data = await listCotizacionesContratadas({ includeClosed: false });
      setEventos(data);
    } catch (error) {
      setEventos([]);
      setEventosError("No se pudieron cargar los eventos contratados.");
      logger.error("Error loading contracted quotations:", error);
    } finally {
      setEventosLoading(false);
    }
  };

  useEffect(() => {
    void loadEventos();
  }, []);

  useEffect(() => {
    if (!needsEventoOptions || eventosLoading || eventos.length > 0) {
      return;
    }

    void loadEventos();
  }, [needsEventoOptions]);
  useEffect(() => {
    const storedDraft = sessionStorage.getItem(NUEVA_COMPRA_DRAFT_STORAGE_KEY);
    if (!storedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(storedDraft) as Partial<NuevaCompraDraftSnapshot>;
      if (parsed?.values) {
        form.reset(parsed.values as NuevaCompraFormValues);
      }

      setCantidadInputsCompra(parsed?.cantidadInputsCompra || {});
      setCantidadInputsOperacion(parsed?.cantidadInputsOperacion || {});
      setPrecioInputsCompra(parsed?.precioInputsCompra || {});
      setPrecioInputsOperacion(parsed?.precioInputsOperacion || {});
      setPrecioInputsGastoFijo(parsed?.precioInputsGastoFijo || {});
      setNuevoProveedorNombre(String(parsed?.nuevoProveedorNombre || ""));
      setSubmitError("");
      clearErrors();
    } catch (error) {
      logger.error("Error restoring NuevaCompra draft:", error);
    } finally {
      sessionStorage.removeItem(NUEVA_COMPRA_DRAFT_STORAGE_KEY);
    }
  }, [clearErrors, form]);

  useEffect(() => {
    const state = (location.state || {}) as { nuevoProveedorId?: string; nuevoProveedorNombre?: string };
    if (!state.nuevoProveedorId) return;

    setValue("registroTipo", "compras", { shouldDirty: true, shouldTouch: true });
    setValue("proveedorId", state.nuevoProveedorId, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setNuevoProveedorNombre(state.nuevoProveedorNombre || "");
    void reloadProveedores({ page: 1, pageSize: 1000 });
    navigate(`${location.pathname}?tipo=compras`, { replace: true, state: null });
  }, [location.state]);

  useEffect(() => {
    const storedDuplicate = sessionStorage.getItem("duplicateCompra");
    if (!storedDuplicate) {
      return;
    }

    const hydrateDuplicateCompra = async () => {
      try {
        const parsed = JSON.parse(storedDuplicate) as DuplicateCompraPayload | Compra;
        const payload = (parsed && typeof parsed === "object" && "compraId" in parsed)
          ? (parsed as DuplicateCompraPayload)
          : { compraId: (parsed as Compra)?._id, snapshot: parsed as Compra };

        const compraId = String(payload.compraId || payload.snapshot?._id || "").trim();
        let duplicatedCompra: Partial<Compra> | null = payload.snapshot || null;

        if (compraId) {
          try {
            duplicatedCompra = await getCompra(compraId);
          } catch (error) {
            logger.error("Error loading full compra for duplicate flow:", error);
          }
        }

        if (!duplicatedCompra) {
          return;
        }

        form.reset(buildDuplicatedCompraDefaults(duplicatedCompra));

        setCantidadInputsCompra({});
        setCantidadInputsOperacion({});
        setPrecioInputsCompra({});
        setPrecioInputsOperacion({});
        setPrecioInputsGastoFijo({});
        setSubmitError("");
        clearErrors();

        if (duplicatedCompra?.proveedorId) {
          await reloadProveedores({ page: 1, pageSize: 1000 });
        }

        navigate(`${location.pathname}?tipo=compras`, { replace: true, state: null });
      } catch (error) {
        logger.error("Error hydrating duplicated compra:", error);
      } finally {
        sessionStorage.removeItem("duplicateCompra");
      }
    };

    void hydrateDuplicateCompra();
  }, [clearErrors, form, location.pathname, navigate, reloadProveedores]);

  useEffect(() => {
    if (tipoCompra !== "evento") {
      setValue("eventoId", "");
      setValue("eventoNombre", "");
    }
  }, [tipoCompra, setValue]);

  useEffect(() => {
    if (tipoGasto !== "evento") {
      setValue("eventoId", "");
      setValue("eventoNombre", "");
    }
  }, [tipoGasto, setValue]);

  useEffect(() => {
    if (formaPago !== "Anticipo") {
      setValue("anticipo", 0);
    }
  }, [formaPago, setValue]);

  useEffect(() => {
    setCantidadInputsCompra((previous) => {
      const next: Record<string, string> = {};
      compraFieldArray.fields.forEach((field, index) => {
        next[field.id] = previous[field.id] ?? formatCompraDecimalInput(getValues(`compraItems.${index}.cantidad`));
      });
      return next;
    });
  }, [compraFieldArray.fields, getValues]);

  useEffect(() => {
    setCantidadInputsOperacion((previous) => {
      const next: Record<string, string> = {};
      operacionFieldArray.fields.forEach((field, index) => {
        next[field.id] = previous[field.id] ?? formatCompraDecimalInput(getValues(`operacionItems.${index}.cantidad`));
      });
      return next;
    });
  }, [operacionFieldArray.fields, getValues]);

  useEffect(() => {
    setPrecioInputsCompra((previous) => {
      const next: Record<string, string> = {};
      compraFieldArray.fields.forEach((field, index) => {
        next[field.id] = previous[field.id] ?? formatCompraDecimalInput(getValues(`compraItems.${index}.precioUnitario`));
      });
      return next;
    });
  }, [compraFieldArray.fields, getValues]);

  useEffect(() => {
    setPrecioInputsOperacion((previous) => {
      const next: Record<string, string> = {};
      operacionFieldArray.fields.forEach((field, index) => {
        next[field.id] = previous[field.id] ?? formatCompraDecimalInput(getValues(`operacionItems.${index}.precio`));
      });
      return next;
    });
  }, [operacionFieldArray.fields, getValues]);

  useEffect(() => {
    setPrecioInputsGastoFijo((previous) => {
      const next: Record<string, string> = {};
      gastoFijoFieldArray.fields.forEach((field, index) => {
        next[field.id] = previous[field.id] ?? formatCompraDecimalInput(getValues(`gastoFijoItems.${index}.precio`));
      });
      return next;
    });
  }, [gastoFijoFieldArray.fields, getValues]);

  const handleRegistroTipoChange = (nextType: RegistroTipo) => {
    if (nextType === registroTipo) return;
    setSubmitError("");
    clearErrors();
    setValue("registroTipo", nextType, { shouldDirty: true, shouldTouch: true });
    updateUrlType(nextType);
  };

  const handleCantidadChange = (
    collection: "compraItems" | "operacionItems",
    index: number,
    fieldId: string,
    rawValue: string
  ) => {
    const normalized = normalizeCompraDecimalInput(rawValue);
    const setLocalState = collection === "compraItems" ? setCantidadInputsCompra : setCantidadInputsOperacion;
    const fieldName = `${collection}.${index}.cantidad` as const;

    setLocalState((previous) => ({
      ...previous,
      [fieldId]: normalized,
    }));

    if (!normalized || normalized === ".") {
      clearErrors(fieldName as any);
      setValue(fieldName as any, undefined, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    const cantidad = parseCompraDecimalInput(normalized);

    if (!isCompraDecimalInputValid(normalized)) {
      setError(fieldName as any, {
        type: "manual",
        message: getCantidadValidationMessage(normalized),
      });
      setValue(fieldName as any, cantidad, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    if (cantidad === undefined) {
      setValue(fieldName as any, undefined, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    clearErrors(fieldName as any);
    setValue(fieldName as any, cantidad, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
  };

  const handleCantidadBlur = (
    collection: "compraItems" | "operacionItems",
    index: number,
    fieldId: string
  ) => {
    const currentInputs = collection === "compraItems" ? cantidadInputsCompra : cantidadInputsOperacion;
    const setLocalState = collection === "compraItems" ? setCantidadInputsCompra : setCantidadInputsOperacion;
    const fieldName = `${collection}.${index}.cantidad` as const;
    const normalized = sanitizeCompraDecimalOnBlur(currentInputs[fieldId] || "");

    setLocalState((previous) => ({
      ...previous,
      [fieldId]: normalized,
    }));

    const cantidad = parseCompraDecimalInput(normalized);

    if (cantidad === undefined) {
      setError(fieldName as any, {
        type: "manual",
        message: "La cantidad debe ser mayor a 0.",
      });
      setValue(fieldName as any, undefined, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    if (!isCompraDecimalInputValid(normalized)) {
      setError(fieldName as any, {
        type: "manual",
        message: getCantidadValidationMessage(normalized),
      });
      setValue(fieldName as any, cantidad, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    clearErrors(fieldName as any);
    setValue(fieldName as any, cantidad, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
    setLocalState((previous) => ({
      ...previous,
      [fieldId]: formatCompraDecimalInput(cantidad),
    }));
  };

  const handlePrecioChange = (
    collection: "compraItems" | "operacionItems" | "gastoFijoItems",
    index: number,
    fieldId: string,
    rawValue: string
  ) => {
    const normalized = normalizeCompraDecimalInput(rawValue);
    const setLocalState =
      collection === "compraItems"
        ? setPrecioInputsCompra
        : collection === "operacionItems"
          ? setPrecioInputsOperacion
          : setPrecioInputsGastoFijo;
    const fieldName = `${collection}.${index}.${collection === "compraItems" ? "precioUnitario" : "precio"}` as const;
    const label = collection === "compraItems" ? "precio unitario" : "precio";

    setLocalState((previous) => ({
      ...previous,
      [fieldId]: normalized,
    }));

    if (!normalized || normalized === ".") {
      clearErrors(fieldName as any);
      setValue(fieldName as any, undefined, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    const precio = parseCompraDecimalInput(normalized);

    if (!isCompraDecimalInputValid(normalized)) {
      setError(fieldName as any, {
        type: "manual",
        message: getPrecioValidationMessage(normalized, label),
      });
      setValue(fieldName as any, precio, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    if (precio === undefined) {
      setValue(fieldName as any, undefined, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    clearErrors(fieldName as any);
    setValue(fieldName as any, precio, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
  };

  const handlePrecioBlur = (
    collection: "compraItems" | "operacionItems" | "gastoFijoItems",
    index: number,
    fieldId: string
  ) => {
    const currentInputs =
      collection === "compraItems"
        ? precioInputsCompra
        : collection === "operacionItems"
          ? precioInputsOperacion
          : precioInputsGastoFijo;
    const setLocalState =
      collection === "compraItems"
        ? setPrecioInputsCompra
        : collection === "operacionItems"
          ? setPrecioInputsOperacion
          : setPrecioInputsGastoFijo;
    const fieldName = `${collection}.${index}.${collection === "compraItems" ? "precioUnitario" : "precio"}` as const;
    const label = collection === "compraItems" ? "precio unitario" : "precio";
    const normalized = sanitizeCompraDecimalOnBlur(currentInputs[fieldId] || "");

    setLocalState((previous) => ({
      ...previous,
      [fieldId]: normalized,
    }));

    const precio = parseCompraDecimalInput(normalized);

    if (precio === undefined) {
      setError(fieldName as any, {
        type: "manual",
        message: collection === "compraItems" ? "El precio unitario debe ser mayor o igual a 0." : "Captura un precio mayor a 0.",
      });
      setValue(fieldName as any, undefined, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    if (!isCompraDecimalInputValid(normalized)) {
      setError(fieldName as any, {
        type: "manual",
        message: getPrecioValidationMessage(normalized, label),
      });
      setValue(fieldName as any, precio, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      return;
    }

    clearErrors(fieldName as any);
    setValue(fieldName as any, precio, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
    setLocalState((previous) => ({
      ...previous,
      [fieldId]: formatCompraDecimalInput(precio),
    }));
  };

  const applyServerFieldErrors = (error: unknown, type: RegistroTipo) => {
    const validationFields = extractValidationErrors(error);
    validationFields.forEach((field) => {
      const target = normalizeBackendField(field.field, type);
      if (!target) return;
      setError(target as any, {
        type: "server",
        message: field.message || `Revisa el campo ${field.label.toLowerCase()}.`,
      });
    });
  };

  const validateActiveForm = (values: NuevaCompraFormValues): boolean => {
    clearErrors();
    setSubmitError("");
    let isValid = true;

    if (!values.fecha) {
      setError("fecha", { type: "manual", message: "La fecha es obligatoria." });
      isValid = false;
    }

    if (!values.metodoPago) {
      setError("metodoPago", { type: "manual", message: "Selecciona un método de pago." });
      isValid = false;
    }

    if (values.registroTipo === "compras") {
      if (!values.documentoTipo) {
        setError("documentoTipo", { type: "manual", message: "Selecciona un tipo de documento." });
        isValid = false;
      }
      if (!String(values.documentoFolio || "").trim()) {
        setError("documentoFolio", { type: "manual", message: "Captura el folio del documento." });
        isValid = false;
      }
      if (!values.proveedorId) {
        setError("proveedorId", { type: "manual", message: "Selecciona un proveedor." });
        isValid = false;
      }
      if (values.formaPago === "Anticipo") {
        if (!Number.isFinite(Number(values.anticipo)) || Number(values.anticipo) <= 0) {
          setError("anticipo", { type: "manual", message: "Captura un anticipo mayor a 0." });
          isValid = false;
        }
        if (Number(values.anticipo) > totalCompraConDescuento) {
          setError("anticipo", { type: "manual", message: "El anticipo no puede exceder el total del gasto." });
          isValid = false;
        }
      }
      if (!Number.isFinite(Number(values.descuento)) || Number(values.descuento) < 0) {
        setError("descuento", { type: "manual", message: "El descuento debe ser un monto mayor o igual a 0." });
        isValid = false;
      } else if (Number(values.descuento) > compraTotal) {
        setError("descuento", { type: "manual", message: "El descuento no puede ser mayor al subtotal de productos." });
        isValid = false;
      }
      if (values.tipoCompra === "evento" && !values.eventoId) {
        setError("eventoId", { type: "manual", message: "Selecciona un evento contratado." });
        isValid = false;
      } else if (values.tipoCompra === "evento" && !eventos.some((evento) => evento._id === values.eventoId)) {
        setError("eventoId", { type: "manual", message: "El evento seleccionado ya no admite movimientos nuevos." });
        isValid = false;
      }
      if (!values.compraItems.length) {
        setError("compraItems", { type: "manual", message: "Agrega al menos un artículo." });
        isValid = false;
      }

      values.compraItems.forEach((item, index) => {
        if (!String(item.productoNombre || "").trim()) {
          setError(`compraItems.${index}.productoNombre` as any, {
            type: "manual",
            message: "Selecciona o captura un producto.",
          });
          isValid = false;
        }
        if (!Number.isFinite(Number(item.precioUnitario)) || Number(item.precioUnitario) < 0) {
          setError(`compraItems.${index}.precioUnitario` as any, {
            type: "manual",
            message: "El precio unitario no puede ser negativo.",
          });
          isValid = false;
        }
        if (!Number.isFinite(Number(item.cantidad)) || Number(item.cantidad) <= 0) {
          setError(`compraItems.${index}.cantidad` as any, {
            type: "manual",
            message: "La cantidad debe ser mayor a 0.",
          });
          isValid = false;
        } else if (!hasUpToFourDecimals(Number(item.cantidad))) {
          setError(`compraItems.${index}.cantidad` as any, {
            type: "manual",
            message: "La cantidad admite hasta 4 decimales.",
          });
          isValid = false;
        }
        if (!hasUpToFourDecimals(Number(item.precioUnitario))) {
          setError(`compraItems.${index}.precioUnitario` as any, {
            type: "manual",
            message: "El precio unitario admite hasta 4 decimales.",
          });
          isValid = false;
        }
      });
    }

    if (values.registroTipo === "operacion") {
      if (values.tipoGasto === "evento" && !values.eventoId) {
        setError("eventoId", { type: "manual", message: "Selecciona un evento contratado." });
        isValid = false;
      } else if (values.tipoGasto === "evento" && !eventos.some((evento) => evento._id === values.eventoId)) {
        setError("eventoId", { type: "manual", message: "El evento seleccionado ya no admite movimientos nuevos." });
        isValid = false;
      }
      if (!values.operacionItems.length) {
        setError("operacionItems", { type: "manual", message: "Agrega al menos un servicio." });
        isValid = false;
      }

      values.operacionItems.forEach((item, index) => {
        if (!String(item.nombreServicio || "").trim()) {
          setError(`operacionItems.${index}.nombreServicio` as any, {
            type: "manual",
            message: "Selecciona o captura un servicio operativo.",
          });
          isValid = false;
        }
        if (!Number.isFinite(Number(item.cantidad)) || Number(item.cantidad) <= 0) {
          setError(`operacionItems.${index}.cantidad` as any, {
            type: "manual",
            message: "La cantidad debe ser mayor a 0.",
          });
          isValid = false;
        } else if (!hasUpToFourDecimals(Number(item.cantidad))) {
          setError(`operacionItems.${index}.cantidad` as any, {
            type: "manual",
            message: "La cantidad admite hasta 4 decimales.",
          });
          isValid = false;
        }
        if (!Number.isFinite(Number(item.precio)) || Number(item.precio) <= 0) {
          setError(`operacionItems.${index}.precio` as any, {
            type: "manual",
            message: "Captura un precio mayor a 0.",
          });
          isValid = false;
        } else if (!hasUpToFourDecimals(Number(item.precio))) {
          setError(`operacionItems.${index}.precio` as any, {
            type: "manual",
            message: "El precio admite hasta 4 decimales.",
          });
          isValid = false;
        }
      });
    }

    if (values.registroTipo === "gastos_fijos") {
      if (!values.gastoFijoItems.length) {
        setError("gastoFijoItems", { type: "manual", message: "Agrega al menos un gasto fijo." });
        isValid = false;
      }

      values.gastoFijoItems.forEach((item, index) => {
        if (!String(item.nombreGastoFijo || "").trim()) {
          setError(`gastoFijoItems.${index}.nombreGastoFijo` as any, {
            type: "manual",
            message: "Selecciona o captura un gasto fijo.",
          });
          isValid = false;
        }
        if (!Number.isFinite(Number(item.precio)) || Number(item.precio) <= 0) {
          setError(`gastoFijoItems.${index}.precio` as any, {
            type: "manual",
            message: "Captura un precio mayor a 0.",
          });
          isValid = false;
        } else if (!hasUpToFourDecimals(Number(item.precio))) {
          setError(`gastoFijoItems.${index}.precio` as any, {
            type: "manual",
            message: "El precio admite hasta 4 decimales.",
          });
          isValid = false;
        }
      });
    }

    return isValid;
  };

  const onSubmit = async (values: NuevaCompraFormValues) => {
    if (!validateActiveForm(values)) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      if (values.registroTipo === "compras") {
        const compraPayload = {
          fecha: values.fecha,
          documentoTipo: values.documentoTipo,
          documentoFolio: values.documentoFolio,
          proveedorId: values.proveedorId,
          formaPago: values.formaPago,
          anticipo: values.formaPago === "Anticipo" ? Number(values.anticipo || 0) : 0,
          descuento: Number(values.descuento || 0),
          total: totalCompraConDescuento,
          metodoPago: values.metodoPago,
          tipoCompra: values.tipoCompra,
          ...(values.tipoCompra === "evento"
            ? {
                eventoId: values.eventoId,
                eventoNombre: getEventoNombre(eventos, values.eventoId),
              }
            : {}),
          items: values.compraItems.map((item) => ({
            productoNombre: item.productoNombre,
            ...(item.productoId ? { productoId: item.productoId } : {}),
            precioUnitario: Number(item.precioUnitario || 0),
            cantidad: Number(item.cantidad || 0),
            subtotal: calculateCompraItemSubtotal(item.precioUnitario, item.cantidad),
          })),
        };
        await createCompra(compraPayload);
      }

      if (values.registroTipo === "operacion") {
        await createGastoOperativo({
          fecha: values.fecha,
          metodoPago: values.metodoPago,
          tipoGasto: values.tipoGasto,
          ...(values.tipoGasto === "evento"
            ? {
                eventoId: values.eventoId,
              }
            : {}),
          items: values.operacionItems.map((item) => ({
            nombreServicio: item.nombreServicio,
            ...(item.servicioId ? { servicioId: item.servicioId } : {}),
            cantidad: Number(item.cantidad || 0),
            precio: Number(item.precio || 0),
          })),
        });
      }

      if (values.registroTipo === "gastos_fijos") {
        await createRegistroGastoFijo({
          fecha: values.fecha,
          metodoPago: values.metodoPago,
          items: values.gastoFijoItems.map((item) => ({
            nombreGastoFijo: item.nombreGastoFijo,
            ...(item.gastoFijoId ? { gastoFijoId: item.gastoFijoId } : {}),
            precio: Number(item.precio || 0),
          })),
        });
      }

      sessionStorage.removeItem(NUEVA_COMPRA_DRAFT_STORAGE_KEY);
      navigate("/compras");
    } catch (error) {
      logger.error("Error creating expense record:", error);
      applyServerFieldErrors(error, values.registroTipo);
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const goToNuevoProveedor = () => {
    const draftSnapshot: NuevaCompraDraftSnapshot = {
      values: getValues(),
      cantidadInputsCompra,
      cantidadInputsOperacion,
      precioInputsCompra,
      precioInputsOperacion,
      precioInputsGastoFijo,
      nuevoProveedorNombre,
    };

    sessionStorage.setItem(NUEVA_COMPRA_DRAFT_STORAGE_KEY, JSON.stringify(draftSnapshot));
    navigate("/proveedores/nuevo", {
      state: {
        returnTo: `${location.pathname}?tipo=${registroTipo}`,
      },
    });
  };

  const appendCompraItem = () => {
    compraFieldArray.append({ productoNombre: "", productoId: "", precioUnitario: 0, cantidad: 1 });
  };

  const appendOperacionItem = () => {
    operacionFieldArray.append({ nombreServicio: "", servicioId: "", cantidad: 1, precio: 0 });
  };

  const appendGastoFijoItem = () => {
    gastoFijoFieldArray.append({ nombreGastoFijo: "", gastoFijoId: "", precio: 0 });
  };

  const compraEditorItems: CompraLineEditorItem[] = compraFieldArray.fields.map((field, index) => {
    const item = compraItemsWatch[index] || getValues(`compraItems.${index}`) || {};
    const nombre = String(item?.productoNombre || "").trim();

    return {
      ...item,
      id: field.id,
      title: nombre || `Artículo ${index + 1}`,
      subtitle: nombre ? "Artículo de compra" : "Pendiente por capturar",
      raw: {
        fieldId: field.id,
        index,
        isLastItem: index === compraFieldArray.fields.length - 1,
      },
    };
  });

  const operacionEditorItems: OperacionLineEditorItem[] = operacionFieldArray.fields.map((field, index) => {
    const item = operacionItemsWatch[index] || getValues(`operacionItems.${index}`) || {};
    const nombre = String(item?.nombreServicio || "").trim();

    return {
      ...item,
      id: field.id,
      title: nombre || `Servicio ${index + 1}`,
      subtitle: nombre ? "Servicio operativo" : "Pendiente por capturar",
      raw: {
        fieldId: field.id,
        index,
        isLastItem: index === operacionFieldArray.fields.length - 1,
      },
    };
  });

  const gastoFijoEditorItems: GastoFijoLineEditorItem[] = gastoFijoFieldArray.fields.map((field, index) => {
    const item = gastoFijoItemsWatch[index] || getValues(`gastoFijoItems.${index}`) || {};
    const nombre = String(item?.nombreGastoFijo || "").trim();

    return {
      ...item,
      id: field.id,
      title: nombre || `Concepto ${index + 1}`,
      subtitle: nombre ? "Concepto de gasto fijo" : "Pendiente por capturar",
      raw: {
        fieldId: field.id,
        index,
        isLastItem: index === gastoFijoFieldArray.fields.length - 1,
      },
    };
  });

  const compraItemFields: Array<DynamicLineItemField<CompraLineEditorItem>> = [
    {
      key: "productoNombre",
      label: "Producto",
      type: "custom",
      desktopWidth: "minmax(0, 2.4fr)",
      mobilePriority: 0,
      mobileGridSpan: 2,
      renderField: ({ index, item }) => (
        <ProductoSearchDropdown
          value={form.watch(`compraItems.${index}.productoNombre`) || ""}
          onChange={(value) => {
            setValue(`compraItems.${index}.productoNombre`, value, { shouldDirty: true, shouldValidate: true });
            if (!value) {
              setValue(`compraItems.${index}.productoId`, "", { shouldDirty: true });
            }
          }}
          onSelectProducto={(producto: Producto | null) => {
            setValue(`compraItems.${index}.productoId`, producto?._id || "", { shouldDirty: true });
            if (producto) {
              setValue(`compraItems.${index}.precioUnitario`, Number(producto.precioUnitario || 0), {
                shouldDirty: true,
                shouldValidate: true,
              });
              setPrecioInputsCompra((previous) => ({
                ...previous,
                [item.raw.fieldId]: formatCompraDecimalInput(producto.precioUnitario),
              }));
            } else {
              setValue(`compraItems.${index}.precioUnitario`, undefined as any, {
                shouldDirty: true,
                shouldValidate: false,
              });
              setPrecioInputsCompra((previous) => ({
                ...previous,
                [item.raw.fieldId]: "",
              }));
            }
          }}
          placeholder="Ej: Harina de trigo"
        />
      ),
      getError: (_item, index) => errors.compraItems?.[index]?.productoNombre?.message as string | undefined,
    },
    {
      key: "cantidad",
      label: "Cantidad",
      type: "number",
      desktopWidth: "120px",
      desktopAlign: "center",
      desktopHeaderAlign: "center",
      mobilePriority: 1,
      renderField: ({ item, index }) => (
        <Input
          id={`compraItems.${index}.cantidad`}
          type="text"
          inputMode="decimal"
          value={cantidadInputsCompra[item.raw.fieldId] ?? formatCompraDecimalInput(getValues(`compraItems.${index}.cantidad`))}
          onChange={(event) => handleCantidadChange("compraItems", index, item.raw.fieldId, event.target.value)}
          onBlur={() => handleCantidadBlur("compraItems", index, item.raw.fieldId)}
          placeholder="0"
        />
      ),
      getError: (_item, index) => errors.compraItems?.[index]?.cantidad?.message as string | undefined,
    },
    {
      key: "precioUnitario",
      label: "Precio unitario",
      type: "currency",
      desktopWidth: "140px",
      desktopAlign: "right",
      desktopHeaderAlign: "right",
      mobilePriority: 2,
      renderField: ({ item, index }) => (
        <Input
          id={`compraItems.${index}.precioUnitario`}
          type="text"
          inputMode="decimal"
          value={precioInputsCompra[item.raw.fieldId] ?? formatCompraDecimalInput(getValues(`compraItems.${index}.precioUnitario`))}
          onChange={(event) => handlePrecioChange("compraItems", index, item.raw.fieldId, event.target.value)}
          onBlur={() => handlePrecioBlur("compraItems", index, item.raw.fieldId)}
          placeholder="0"
        />
      ),
      getError: (_item, index) => errors.compraItems?.[index]?.precioUnitario?.message as string | undefined,
    },
    {
      key: "subtotal",
      label: "Subtotal",
      type: "readonly",
      desktopWidth: "140px",
      desktopAlign: "right",
      desktopHeaderAlign: "right",
      mobilePriority: 3,
      renderValue: ({ index }) => (
        <Input
          value={calculateCompraItemSubtotal(getValues(`compraItems.${index}.precioUnitario`), getValues(`compraItems.${index}.cantidad`)).toFixed(2)}
          readOnly
          className="bg-gray-100 cursor-not-allowed text-right"
        />
      ),
    },
  ];

  const operacionItemFields: Array<DynamicLineItemField<OperacionLineEditorItem>> = [
    {
      key: "nombreServicio",
      label: "Servicio",
      type: "custom",
      desktopWidth: "minmax(0, 2.4fr)",
      mobilePriority: 0,
      mobileGridSpan: 2,
      renderField: ({ index }) => (
        <AsyncCatalogSearchDropdown
          value={operacionItemsWatch[index]?.nombreServicio || ""}
          onChange={(value) => {
            setValue(`operacionItems.${index}.nombreServicio`, value, { shouldDirty: true, shouldValidate: true });
            if (!value) {
              setValue(`operacionItems.${index}.servicioId`, "", { shouldDirty: true });
              setValue(`operacionItems.${index}.precio`, undefined, { shouldDirty: true, shouldValidate: true });
              setPrecioInputsOperacion((previous) => ({
                ...previous,
                [operacionFieldArray.fields[index]?.id || ""]: "",
              }));
            }
          }}
          onSelectItem={(selectedItem) => {
            const selected = selectedItem as ServicioOperativo | null;
            setValue(`operacionItems.${index}.servicioId`, selected?._id || "", { shouldDirty: true });
            const selectedPrice = getCatalogItemPrice(selected);

            if (selectedPrice !== undefined) {
              setValue(`operacionItems.${index}.precio`, selectedPrice, { shouldDirty: true, shouldValidate: true });
              setPrecioInputsOperacion((previous) => ({
                ...previous,
                [operacionFieldArray.fields[index]?.id || ""]: formatCompraDecimalInput(selectedPrice),
              }));
            }
          }}
          searchItems={searchServiciosOperativos as any}
          placeholder="Ej: Flete local"
          emptyText="No hay servicios que coincidan"
          renderItemDetail={(catalogItem) => {
            const detailParts = [String(catalogItem.descripcion || "").trim()];
            const selectedPrice = getCatalogItemPrice(catalogItem as ServicioOperativo);

            if (selectedPrice !== undefined) {
              detailParts.push(`$${selectedPrice.toFixed(2)}`);
            }

            return detailParts.filter(Boolean).join(" • ");
          }}
        />
      ),
      getError: (_item, index) => errors.operacionItems?.[index]?.nombreServicio?.message as string | undefined,
    },
    {
      key: "cantidad",
      label: "Cantidad",
      type: "number",
      desktopWidth: "120px",
      desktopAlign: "center",
      desktopHeaderAlign: "center",
      mobilePriority: 1,
      renderField: ({ item, index }) => (
        <Input
          id={`operacionItems.${index}.cantidad`}
          type="text"
          inputMode="decimal"
          value={cantidadInputsOperacion[item.raw.fieldId] ?? formatCompraDecimalInput(getValues(`operacionItems.${index}.cantidad`))}
          onChange={(event) => handleCantidadChange("operacionItems", index, item.raw.fieldId, event.target.value)}
          onBlur={() => handleCantidadBlur("operacionItems", index, item.raw.fieldId)}
          placeholder="0"
        />
      ),
      getError: (_item, index) => errors.operacionItems?.[index]?.cantidad?.message as string | undefined,
    },
    {
      key: "precio",
      label: "Precio",
      type: "currency",
      desktopWidth: "140px",
      desktopAlign: "right",
      desktopHeaderAlign: "right",
      mobilePriority: 2,
      renderField: ({ item, index }) => (
        <Input
          id={`operacionItems.${index}.precio`}
          type="text"
          inputMode="decimal"
          value={precioInputsOperacion[item.raw.fieldId] ?? formatCompraDecimalInput(getValues(`operacionItems.${index}.precio`))}
          onChange={(event) => handlePrecioChange("operacionItems", index, item.raw.fieldId, event.target.value)}
          onBlur={() => handlePrecioBlur("operacionItems", index, item.raw.fieldId)}
          placeholder="0"
        />
      ),
      getError: (_item, index) => errors.operacionItems?.[index]?.precio?.message as string | undefined,
    },
    {
      key: "total",
      label: "Total",
      type: "readonly",
      desktopWidth: "140px",
      desktopAlign: "right",
      desktopHeaderAlign: "right",
      mobilePriority: 3,
      renderValue: ({ index }) => (
        <Input
          value={getOperacionSubtotal(getValues(`operacionItems.${index}`)).toFixed(2)}
          readOnly
          className="bg-gray-100 cursor-not-allowed text-right"
        />
      ),
    },
  ];

  const gastoFijoItemFields: Array<DynamicLineItemField<GastoFijoLineEditorItem>> = [
    {
      key: "nombreGastoFijo",
      label: "Gasto fijo",
      type: "custom",
      desktopWidth: "minmax(0, 2.4fr)",
      mobilePriority: 0,
      mobileGridSpan: 2,
      renderField: ({ index }) => (
        <AsyncCatalogSearchDropdown
          value={gastoFijoItemsWatch[index]?.nombreGastoFijo || ""}
          onChange={(value) => {
            setValue(`gastoFijoItems.${index}.nombreGastoFijo`, value, { shouldDirty: true, shouldValidate: true });
            if (!value) {
              setValue(`gastoFijoItems.${index}.gastoFijoId`, "", { shouldDirty: true });
              setValue(`gastoFijoItems.${index}.precio`, undefined, { shouldDirty: true, shouldValidate: true });
              setPrecioInputsGastoFijo((previous) => ({
                ...previous,
                [gastoFijoFieldArray.fields[index]?.id || ""]: "",
              }));
            }
          }}
          onSelectItem={(selectedItem) => {
            const selected = selectedItem as GastoFijoCatalogo | null;
            setValue(`gastoFijoItems.${index}.gastoFijoId`, selected?._id || "", { shouldDirty: true });
            const selectedPrice = getCatalogItemPrice(selected);

            if (selectedPrice !== undefined) {
              setValue(`gastoFijoItems.${index}.precio`, selectedPrice, { shouldDirty: true, shouldValidate: true });
              setPrecioInputsGastoFijo((previous) => ({
                ...previous,
                [gastoFijoFieldArray.fields[index]?.id || ""]: formatCompraDecimalInput(selectedPrice),
              }));
            }
          }}
          searchItems={searchGastosFijosCatalogo as any}
          placeholder="Ej: Renta mensual"
          emptyText="No hay gastos fijos que coincidan"
          renderItemDetail={(catalogItem) => {
            const detailParts = [String(catalogItem.descripcion || "").trim()];
            const selectedPrice = getCatalogItemPrice(catalogItem as GastoFijoCatalogo);

            if (selectedPrice !== undefined) {
              detailParts.push(`$${selectedPrice.toFixed(2)}`);
            }

            return detailParts.filter(Boolean).join(" • ");
          }}
        />
      ),
      getError: (_item, index) => errors.gastoFijoItems?.[index]?.nombreGastoFijo?.message as string | undefined,
    },
    {
      key: "precio",
      label: "Precio",
      type: "currency",
      desktopWidth: "160px",
      desktopAlign: "right",
      desktopHeaderAlign: "right",
      mobilePriority: 1,
      renderField: ({ item, index }) => (
        <Input
          id={`gastoFijoItems.${index}.precio`}
          type="text"
          inputMode="decimal"
          value={precioInputsGastoFijo[item.raw.fieldId] ?? formatCompraDecimalInput(getValues(`gastoFijoItems.${index}.precio`))}
          onChange={(event) => handlePrecioChange("gastoFijoItems", index, item.raw.fieldId, event.target.value)}
          onBlur={() => handlePrecioBlur("gastoFijoItems", index, item.raw.fieldId)}
          placeholder="0"
        />
      ),
      getError: (_item, index) => errors.gastoFijoItems?.[index]?.precio?.message as string | undefined,
    },
    {
      key: "total",
      label: "Total",
      type: "readonly",
      desktopWidth: "140px",
      desktopAlign: "right",
      desktopHeaderAlign: "right",
      mobilePriority: 2,
      renderValue: ({ index }) => (
        <Input
          value={getGastoFijoSubtotal(getValues(`gastoFijoItems.${index}`)).toFixed(2)}
          readOnly
          className="bg-gray-100 cursor-not-allowed text-right"
        />
      ),
    },
  ];

  const compraItemsErrorMessage = typeof errors.compraItems?.message === "string" ? (errors.compraItems.message as string) : undefined;
  const operacionItemsErrorMessage = typeof errors.operacionItems?.message === "string" ? (errors.operacionItems.message as string) : undefined;
  const gastoFijoItemsErrorMessage = typeof errors.gastoFijoItems?.message === "string" ? (errors.gastoFijoItems.message as string) : undefined;

  return (
    <div className="space-y-4">
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">No se pudo guardar</h3>
            <p className="text-red-700 text-sm">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={preventEnterFormSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <section className="space-y-3">
          <div className="flex justify-end">
            <Link to="/compras">
              <Button variant="outline">
                <XCircle className="w-4 h-4" />
                Cancelar
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(REGISTRO_META) as RegistroTipo[]).map((type) => {
              const isSelected = registroTipo === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleRegistroTipoChange(type)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-slate-900">{REGISTRO_META[type].label}</div>
                  <p className="text-sm text-slate-600 mt-1">{REGISTRO_META[type].description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{REGISTRO_META[registroTipo].folioLabel}</p>
            <div className="mt-2 flex items-center gap-2">
              {folioLoading && !folioActual ? <Loader className="w-4 h-4 animate-spin text-blue-600" /> : null}
              <p className="font-mono text-lg font-semibold text-slate-900">{folioActual || "Pendiente"}</p>
            </div>
          </div>
          <div>
            <Label htmlFor="fecha">Fecha *</Label>
            <Input id="fecha" type="date" {...register("fecha")} />
            {errors.fecha && <p className="text-sm text-red-600 mt-1">{errors.fecha.message as string}</p>}
          </div>
          <div>
            <Label htmlFor="metodoPago">Método de pago *</Label>
            <Select value={metodoPago} onValueChange={(value) => setValue("metodoPago", value as any, { shouldDirty: true, shouldValidate: true })}>
              <SelectTrigger id="metodoPago">
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                {METODOS_PAGO.map((metodo) => (
                  <SelectItem key={metodo} value={metodo}>
                    {metodo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.metodoPago && <p className="text-sm text-red-600 mt-1">{errors.metodoPago.message as string}</p>}
          </div>
        </section>

        {registroTipo === "compras" && (
          <section className="space-y-6 border-t pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="documentoTipo">Tipo de documento *</Label>
                <Select value={documentoTipo} onValueChange={(value) => setValue("documentoTipo", value as any, { shouldDirty: true, shouldValidate: true })}>
                  <SelectTrigger id="documentoTipo">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENTO_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.documentoTipo && <p className="text-sm text-red-600 mt-1">{errors.documentoTipo.message as string}</p>}
              </div>
              <div>
                <Label htmlFor="documentoFolio">Número de documento *</Label>
                <Input id="documentoFolio" {...register("documentoFolio")} placeholder="Ej: F-1024" />
                {errors.documentoFolio && <p className="text-sm text-red-600 mt-1">{errors.documentoFolio.message as string}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <Label htmlFor="proveedorId">Proveedor *</Label>
                <Select value={proveedorId || ""} onValueChange={(value) => setValue("proveedorId", value, { shouldDirty: true, shouldValidate: true })}>
                  <SelectTrigger id="proveedorId">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProveedor && !proveedores.some((proveedor) => proveedor._id === selectedProveedor._id) && (
                      <SelectItem value={selectedProveedor._id}>{selectedProveedor.nombreComercial}</SelectItem>
                    )}
                    {!selectedProveedor && proveedorId && nuevoProveedorNombre && (
                      <SelectItem value={proveedorId}>{nuevoProveedorNombre}</SelectItem>
                    )}
                    {proveedores.map((proveedor) => (
                      <SelectItem key={proveedor._id} value={proveedor._id}>
                        {proveedor.nombreComercial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.proveedorId && <p className="text-sm text-red-600 mt-1">{errors.proveedorId.message as string}</p>}
              </div>
              <Button type="button" variant="outline" onClick={goToNuevoProveedor}>
                <Plus className="w-4 h-4" />
                Nuevo proveedor
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="formaPago">Forma de pago *</Label>
                <Select value={form.getValues("formaPago")} onValueChange={(value) => setValue("formaPago", value as any, { shouldDirty: true, shouldValidate: true })}>
                  <SelectTrigger id="formaPago">
                    <SelectValue placeholder="Selecciona una forma" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGO.map((forma) => (
                      <SelectItem key={forma} value={forma}>
                        {forma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.formaPago && <p className="text-sm text-red-600 mt-1">{errors.formaPago.message as string}</p>}
              </div>
              {formaPago === "Anticipo" && (
                <div>
                  <Label htmlFor="anticipo">Anticipo *</Label>
                  <Input
                    id="anticipo"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("anticipo", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {errors.anticipo && <p className="text-sm text-red-600 mt-1">{errors.anticipo.message as string}</p>}
                </div>
              )}
              <div>
                <Label htmlFor="tipoCompra">Destino del gasto</Label>
                <Select value={tipoCompra} onValueChange={(value) => setValue("tipoCompra", value as any, { shouldDirty: true, shouldValidate: true })}>
                  <SelectTrigger id="tipoCompra">
                    <SelectValue placeholder="Selecciona un destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tipoCompra === "evento" && (
              <div>
                <Label htmlFor="eventoId">Evento contratado *</Label>
                <Select
                  value={eventoId || ""}
                  onValueChange={(value) => {
                    setValue("eventoId", value, { shouldDirty: true, shouldValidate: true });
                    setValue("eventoNombre", getEventoNombre(eventos, value));
                  }}
                  disabled={eventosLoading}
                >
                  <SelectTrigger id="eventoId">
                    <SelectValue placeholder={eventosLoading ? "Cargando eventos..." : "Selecciona un evento contratado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {eventos.map((evento) => (
                      <SelectItem key={evento._id} value={evento._id}>
                          {getCotizacionEventOptionLabel(evento)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.eventoId && <p className="text-sm text-red-600 mt-1">{errors.eventoId.message as string}</p>}
                {!errors.eventoId && eventosError && <p className="text-sm text-red-600 mt-1">{eventosError}</p>}
                {!eventosLoading && !eventosError && eventos.length === 0 && (
                  <p className="text-sm text-amber-700 mt-1">No hay cotizaciones contratadas activas disponibles.</p>
                )}
              </div>
            )}

            <section className="space-y-4 border-t pt-6">
              <DynamicLineItemsEditor
                items={compraEditorItems}
                getItemKey={(item) => item.id || item.raw.fieldId}
                fields={compraItemFields}
                title="Artículos"
                description="Usa productos como fuente de autocomplete y conserva el contrato actual de compras."
                emptyState={{
                  title: "No hay artículos",
                  description: "Agrega al menos un artículo para continuar.",
                  actionLabel: "Agregar artículo",
                }}
                addAction={{
                  label: (
                    <>
                      <Plus className="w-4 h-4" />
                      Agregar artículo
                    </>
                  ),
                }}
                onAddItem={appendCompraItem}
                onRemoveItem={compraFieldArray.remove}
                errorMessage={compraItemsErrorMessage}
                actionsColumnLabel="Acciones"
                renderItemActions={(item) =>
                  item.raw.isLastItem ? (
                    <Button type="button" variant="outline" size="sm" onClick={appendCompraItem}>
                      <Plus className="w-4 h-4" />
                      Agregar otro
                    </Button>
                  ) : null
                }
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-700">Subtotal productos</span>
                    <span className="font-semibold text-slate-900">${compraTotal.toFixed(2)}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                    <Label htmlFor="descuento" className="font-medium text-slate-700">Descuento</Label>
                    <div>
                      <Input
                        id="descuento"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        {...register("descuento", {
                          setValueAs: (value) => {
                            if (value === "" || value === null || value === undefined) {
                              return 0;
                            }
                            const parsed = Number(value);
                            return Number.isFinite(parsed) ? parsed : Number.NaN;
                          },
                        })}
                        placeholder="0.00"
                        className="text-right"
                      />
                      {errors.descuento ? (
                        <p className="mt-1 text-sm text-red-600">{errors.descuento.message as string}</p>
                      ) : descuentoCompra > compraTotal ? (
                        <p className="mt-1 text-sm text-red-600">El descuento no puede ser mayor al subtotal de productos.</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                    <span className="font-semibold text-slate-900">Total compra</span>
                    <span className="font-bold text-slate-900">${totalCompraConDescuento.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </section>
          </section>
        )}

        {registroTipo === "operacion" && (
          <section className="space-y-6 border-t pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="tipoGasto">Destino del gasto</Label>
                <Select value={tipoGasto} onValueChange={(value) => setValue("tipoGasto", value as any, { shouldDirty: true, shouldValidate: true })}>
                  <SelectTrigger id="tipoGasto">
                    <SelectValue placeholder="Selecciona un destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tipoGasto === "evento" && (
                <div>
                  <Label htmlFor="eventoOperacion">Evento contratado *</Label>
                  <Select
                    value={eventoId || ""}
                    onValueChange={(value) => {
                      setValue("eventoId", value, { shouldDirty: true, shouldValidate: true });
                      setValue("eventoNombre", getEventoNombre(eventos, value));
                    }}
                    disabled={eventosLoading}
                  >
                    <SelectTrigger id="eventoOperacion">
                      <SelectValue placeholder={eventosLoading ? "Cargando eventos..." : "Selecciona un evento contratado"} />
                    </SelectTrigger>
                    <SelectContent>
                      {eventos.map((evento) => (
                        <SelectItem key={evento._id} value={evento._id}>
                          {getCotizacionEventOptionLabel(evento)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.eventoId && <p className="text-sm text-red-600 mt-1">{errors.eventoId.message as string}</p>}
                  {!errors.eventoId && eventosError && <p className="text-sm text-red-600 mt-1">{eventosError}</p>}
                  {!eventosLoading && !eventosError && eventos.length === 0 && (
                    <p className="text-sm text-amber-700 mt-1">No hay cotizaciones contratadas activas disponibles.</p>
                  )}
                </div>
              )}
            </div>

            <section className="space-y-4 border-t pt-6">
              <DynamicLineItemsEditor
                items={operacionEditorItems}
                getItemKey={(item) => item.id || item.raw.fieldId}
                fields={operacionItemFields}
                title="Servicios operativos"
                description="El autocomplete consulta el catálogo de servicios operativos."
                emptyState={{
                  title: "No hay servicios operativos",
                  description: "Agrega al menos un servicio para continuar.",
                  actionLabel: "Agregar servicio",
                }}
                addAction={{
                  label: (
                    <>
                      <Plus className="w-4 h-4" />
                      Agregar servicio
                    </>
                  ),
                }}
                onAddItem={appendOperacionItem}
                onRemoveItem={operacionFieldArray.remove}
                errorMessage={operacionItemsErrorMessage}
                actionsColumnLabel="Acciones"
                renderItemActions={(item) =>
                  item.raw.isLastItem ? (
                    <Button type="button" variant="outline" size="sm" onClick={appendOperacionItem}>
                      <Plus className="w-4 h-4" />
                      Agregar otro
                    </Button>
                  ) : null
                }
              />
            </section>
          </section>
        )}

        {registroTipo === "gastos_fijos" && (
          <section className="space-y-6 border-t pt-6">
            <section className="space-y-4">
              <DynamicLineItemsEditor
                items={gastoFijoEditorItems}
                getItemKey={(item) => item.id || item.raw.fieldId}
                fields={gastoFijoItemFields}
                title="Conceptos de gasto fijo"
                description="El autocomplete consulta el catálogo de gastos fijos y registra la transacción en su módulo real."
                emptyState={{
                  title: "No hay conceptos",
                  description: "Agrega al menos un concepto para continuar.",
                  actionLabel: "Agregar concepto",
                }}
                addAction={{
                  label: (
                    <>
                      <Plus className="w-4 h-4" />
                      Agregar concepto
                    </>
                  ),
                }}
                onAddItem={appendGastoFijoItem}
                onRemoveItem={gastoFijoFieldArray.remove}
                errorMessage={gastoFijoItemsErrorMessage}
                actionsColumnLabel="Acciones"
                renderItemActions={(item) =>
                  item.raw.isLastItem ? (
                    <Button type="button" variant="outline" size="sm" onClick={appendGastoFijoItem}>
                      <Plus className="w-4 h-4" />
                      Agregar otro
                    </Button>
                  ) : null
                }
              />
            </section>
          </section>
        )}

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-right">
            <p className="text-sm text-blue-700">Total estimado</p>
            <p className="text-3xl font-bold text-blue-900">${totalActual.toFixed(2)}</p>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Link to="/compras">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {submitting ? "Guardando..." : "Guardar gasto"}
          </Button>
        </div>
      </form>
    </div>
  );
}