import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FormProvider, useForm, useFieldArray, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getCotizacionById, updateCotizacion, sendCotizacionNotification, previewCotizacion } from "../services/cotizacionesService";
import { getCliente } from "../services/clientesService";
import { getPaquete, listPaquetes } from "../services/paquetesService";
import { listCatalogo } from "../services/catalogoService";
import { useNegocios } from "../hooks/useNegocios";
import { generateCotizacionPDF } from "../utils/generatePDF";
import { preventEnterFormSubmit } from "../utils/formGuards";
import CatalogTabs from "../components/cotizacion/CatalogTabs";
import NuevoCatalogoForm from "../components/catalogo/NuevoCatalogoForm";
import DynamicLineItemsEditor from "../components/common/DynamicLineItemsEditor";
import {
  QUOTE_LINE_ITEM_ACTIONS_WIDTH,
  QUOTE_LINE_ITEM_DESKTOP_WIDTHS,
  QUOTE_LINE_ITEM_STEPPER_CLASS,
  QUOTE_LINE_ITEM_STEPPER_INPUT_CLASS,
  QUOTE_LINE_ITEM_SUMMARY_WIDTH,
} from "../components/cotizacion/quoteLineItemLayout";
import ResumenCostos from "../components/cotizacion/ResumenCostos";
import FormSection from "../components/common/forms/FormSection";
import FieldGrid from "../components/common/forms/FieldGrid";
import { addDaysToDateOnly, extractDateOnly } from "../utils/dateOnly";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X } from "lucide-react";
import { logger } from "../lib/logger";
import { normalizeQuotationStatus } from "../constants/quotationStatus";
function toDateISO(d) {
  return extractDateOnly(d);
}

function normalizeBackendBreakdown(source) {
  if (!source || typeof source !== "object") return null;

  const rawBreakdown = source?.breakdown && typeof source.breakdown === "object"
    ? source.breakdown
    : source;

  if (!rawBreakdown || typeof rawBreakdown !== "object") return null;

  const toNum = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return {
    ...rawBreakdown,
    subtotalFinal: toNum(
      source?.subtotal ??
      rawBreakdown?.subtotalFinal ??
      rawBreakdown?.subtotalByDays ??
      rawBreakdown?.subtotalOneDay
    ),
    descuentoTotal: toNum(source?.descuentoTotal ?? rawBreakdown?.descuentoTotal),
    ivaMonto: toNum(source?.ivaMonto ?? rawBreakdown?.ivaMonto),
    total: toNum(source?.total ?? rawBreakdown?.total),
  };
}

function toTimeHHMM(t) {
  if (!t) return "";
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  try {
    const dt = new Date(t);
    if (Number.isNaN(dt.getTime())) return "";
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

function clampDurationDays(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(1, Math.trunc(num));
}

function addDaysISO(dateISO, daysToAdd) {
  return addDaysToDateOnly(dateISO, daysToAdd);
}

function toDateRangeLabel(startISO, days, endDateFromApi) {
  if (!startISO) return "-";
  const safeDays = clampDurationDays(days);
  const start = toDateISO(startISO);
  const end = toDateISO(endDateFromApi) || addDaysISO(start, safeDays - 1);
  if (!start) return "-";
  if (safeDays >= 2) return `Fecha del evento: del ${start} al ${end}`;
  return `Fecha: ${start}`;
}

function n(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function round2(x) {
  return Math.round((n(x) + Number.EPSILON) * 100) / 100;
}

function resolveInitialIncluyeIva(source) {
  return source?.incluyeIva === true || source?.ivaIncluido === true;
}

function resolveInitialIvaPorcentaje(source) {
  const direct = Number(source?.ivaPorcentaje ?? source?.ivaPct ?? source?.ivaRate);
  if (Number.isFinite(direct)) return Math.max(0, direct);

  const backendIva = Number(source?.breakdown?.ivaMonto ?? source?.ivaMonto);
  if (Number.isFinite(backendIva) && backendIva === 0) return 0;

  return 16;
}

function mapElementoTipo(tipo) {
  const t = String(tipo || "").toLowerCase();
  if (t === "platillo" || t === "platillos") return "Platillo";
  if (t === "bebida" || t === "bebidas") return "Bebida";
  if (t === "personal") return "Personal";
  if (t === "mobiliario") return "Mobiliario";
  if (t === "audio") return "Audio";
  return "Otro";
}

function getDisplayTipoLabel(tipo) {
  const t = String(tipo || "").toLowerCase();
  if (t === "platillo" || t === "platillos") return "Catering";
  return tipo || "-";
}

const CATALOGO_TIPO_TO_SERVICIO = {
  platillos: "Platillo",
  bebidas: "Bebida",
  personal: "Personal",
  mobiliario: "Extra",
  audio: "Extra",
  otros: "Extra",
};

function extractTipoEvento(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if (typeof value.nombre === "string") return value.nombre;
    if (typeof value.label === "string") return value.label;
    if (typeof value.value === "string") return value.value;
  }
  return "";
}

function resolveCreatedCatalogItem(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.nombre !== undefined || payload.precio !== undefined) return payload;
  if (payload.item && typeof payload.item === "object") return payload.item;
  if (payload.data && typeof payload.data === "object") {
    if (payload.data.item && typeof payload.data.item === "object") return payload.data.item;
    return payload.data;
  }
  if (payload.result && typeof payload.result === "object") return payload.result;
  return null;
}

function getEstadoBadgeColor(estado) {
  switch (estado) {
    case "Contratado":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "Cotizado":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "En revision":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "No aceptada":
    case "Cancelado":
      return "bg-slate-100 text-slate-800 border-slate-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-300";
  }
}

const itemSchema = z.object({
  sourceItemId: z.string().optional().default(""),
  tipo: z.string().optional().default(""),
  catalogoTipo: z.string().optional().default(""),
  nombre: z.string().min(1, "Nombre requerido"),
  cantidad: z.coerce.number().min(0, "0 o mayor").default(1),
  precio: z.coerce.number().min(0, "0 o mayor").default(0),
  applyDurationMultiplier: z.coerce.boolean().default(true),
});

const schema = z.object({
  nombreEvento: z.string().min(1, "El nombre del evento es obligatorio"),
  tipoEvento: z.string().optional().default(""),
  fechaEvento: z.string().optional().default(""),
  eventDurationDays: z.coerce.number().int("Debe ser un entero").min(1, "Mínimo 1 día").default(1),
  horaInicio: z.string().optional().default(""),
  horaFin: z.string().optional().default(""),
  estado: z.enum(["Cotizado", "En revision", "No aceptada", "Contratado", "Cancelado"]).default("Cotizado"),

  negocioId: z.string().min(1, "El salón/negocio es obligatorio"),
  paqueteId: z.string().optional().default(""),

  clienteNombre: z.string().min(1, "El nombre del cliente es obligatorio"),
  clienteTelefono: z.string().optional().default(""),
  clienteEmail: z.string().optional().default(""),

  direccion: z.string().optional().default(""),
  notas: z.string().optional().default(""),
  observaciones: z.string().optional().default(""),

  invitadosAdultos: z.coerce.number().min(0, "Debe ser 0 o mayor").default(0),
  invitadosNinos: z.coerce.number().min(0, "Debe ser 0 o mayor").default(0),

  incluyeIva: z.coerce.boolean().default(false),
  ivaPorcentaje: z.coerce.number().min(0).max(100).default(16),
  descuento: z.coerce.number().min(0).default(0),
  descuentoTipo: z.enum(["porcentaje", "monto"]).default("monto"),
  anticipo: z.coerce.number().min(0).default(0),

  items: z.array(itemSchema).default([]),
});

function flattenErrors(errObj) {
  const out = [];
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node === "object") {
      if (node.message) out.push(node.message);
      Object.values(node).forEach(walk);
    }
  };
  walk(errObj);
  return out;
}

export default function CotizacionEditar() {
  // ...existing code...
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const [modalNuevoCatalogoOpen, setModalNuevoCatalogoOpen] = useState(false);
  const [nuevoCatalogoTipo, setNuevoCatalogoTipo] = useState("");
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cotizacion, setCotizacion] = useState(null);
  const [submitErrors, setSubmitErrors] = useState([]);
  const [paquetes, setPaquetes] = useState([]);
  const [paquetesLoading, setPaquetesLoading] = useState(true);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [previewBreakdown, setPreviewBreakdown] = useState(null);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [recentCatalogItem, setRecentCatalogItem] = useState(null);

  const { negocios = [] } = useNegocios();

  const defaultValues = useMemo(
    () => ({
      nombreEvento: "",
      tipoEvento: "",
      fechaEvento: "",
      eventDurationDays: 1,
      horaInicio: "",
      horaFin: "",
      estado: "Cotizado",
      negocioId: "",
      paqueteId: "",
      clienteNombre: "",
      clienteTelefono: "",
      clienteEmail: "",
      direccion: "",
      notas: "",
      observaciones: "",
      invitadosAdultos: 0,
      invitadosNinos: 0,
      incluyeIva: false,
      ivaPorcentaje: 16,
      descuento: 0,
      descuentoTipo: "monto",
      anticipo: 0,
      items: [],
    }),
    []
  );

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isDirty },
  } = methods;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "items",
  });

  const rawItems = useWatch({ control, name: "items" });
  const rawIva = useWatch({ control, name: "incluyeIva" });
  const rawIvaPct = useWatch({ control, name: "ivaPorcentaje" });
  const rawDesc = useWatch({ control, name: "descuento" });
  const rawAnticipo = useWatch({ control, name: "anticipo" });
  const rawFechaEvento = useWatch({ control, name: "fechaEvento" });
  const rawEventDurationDays = useWatch({ control, name: "eventDurationDays" });
  const rawPaqueteId = useWatch({ control, name: "paqueteId" });
  const estado = useWatch({ control, name: "estado" });

  const watchedItems = useMemo(() => rawItems || [], [rawItems]);
  const incluyeIva = useMemo(() => Boolean(rawIva), [rawIva]);
  const ivaPorcentaje = useMemo(() => n(rawIvaPct), [rawIvaPct]);
  const descuento = useMemo(() => n(rawDesc), [rawDesc]);
  const anticipo = useMemo(() => n(rawAnticipo), [rawAnticipo]);
  const eventDurationDays = useMemo(() => clampDurationDays(rawEventDurationDays), [rawEventDurationDays]);
  const showDurationToggle = eventDurationDays > 1;
  const paqueteId = useMemo(() => String(rawPaqueteId || ""), [rawPaqueteId]);
  const paqueteInitRef = useRef(false);
  const prevPaqueteIdRef = useRef("");

  const eventDateLabel = useMemo(
    () => toDateRangeLabel(rawFechaEvento, eventDurationDays, cotizacion?.eventEndDate),
    [rawFechaEvento, eventDurationDays, cotizacion?.eventEndDate]
  );

  const persistedBreakdown = useMemo(
    () => normalizeBackendBreakdown(cotizacion) || cotizacion?.breakdown || {},
    [cotizacion]
  );
  const shouldUsePreviewBreakdown = Boolean(isDirty && previewBreakdown && !previewUnavailable);
  const backendBreakdown = shouldUsePreviewBreakdown ? previewBreakdown : persistedBreakdown;
  const editorItems = fields.map((field, idx) => {
    const currentItem = watchedItems?.[idx] || {};
    const itemErr = errors?.items?.[idx];
    const applyDurationMultiplier = currentItem?.applyDurationMultiplier !== false;
    const lineDaysApplied = applyDurationMultiplier && eventDurationDays > 1 ? eventDurationDays : 1;
    const lineTotal = round2(n(currentItem?.cantidad) * n(currentItem?.precio) * lineDaysApplied);

    return {
      id: field.id,
      title: currentItem?.nombre || `Servicio ${idx + 1}`,
      subtitle: getDisplayTipoLabel(currentItem?.tipo),
      summary: {
        label: "Total",
        value: `$${lineTotal.toLocaleString()}`,
        helperText: lineDaysApplied > 1 ? `x ${lineDaysApplied} días` : "Cargo único",
      },
      raw: {
        currentItem,
        itemErr,
        applyDurationMultiplier,
      },
    };
  });

  const editorItemFields = [
    {
      key: "concepto",
      label: "Concepto",
      type: "readonly",
      hideOnMobile: true,
      desktopWidth: QUOTE_LINE_ITEM_DESKTOP_WIDTHS.concepto,
      renderValue: ({ item }) => (
        <div className="min-w-0">
          <p className="text-xs text-[#64748B]">{getDisplayTipoLabel(item.raw?.currentItem?.tipo)}</p>
          <p className="truncate text-sm font-semibold text-[#111827]">{item.raw?.currentItem?.nombre || "-"}</p>
        </div>
      ),
    },
    {
      key: "precio",
      label: "Precio",
      type: "currency",
      desktopWidth: QUOTE_LINE_ITEM_DESKTOP_WIDTHS.precio,
      desktopAlign: "right",
      desktopHeaderAlign: "right",
      mobilePriority: 1,
      renderField: ({ index }) => (
        <input
          type="number"
          step="0.01"
          className={`w-full rounded border px-3 py-2 text-right text-sm ${errors?.items?.[index]?.precio ? "border-red-500" : "border-slate-200"}`}
          {...register(`items.${index}.precio`)}
        />
      ),
      getError: (_, index) => errors?.items?.[index]?.precio?.message,
    },
    {
      key: "cantidad",
      label: "Cantidad",
      type: "number",
      desktopWidth: QUOTE_LINE_ITEM_DESKTOP_WIDTHS.cantidad,
      desktopAlign: "center",
      desktopHeaderAlign: "center",
      mobilePriority: 2,
      renderField: ({ item, index }) => {
        const currentAmount = n(item.raw?.currentItem?.cantidad);

        return (
          <div className={QUOTE_LINE_ITEM_STEPPER_CLASS}>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center text-[#64748B] transition-colors hover:bg-slate-100"
              onClick={() => {
                if (currentAmount > 0) {
                  setValue(`items.${index}.cantidad`, currentAmount - 1, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                }
              }}
            >
              −
            </button>
            <input
              type="number"
              min="0"
              step="1"
              className={QUOTE_LINE_ITEM_STEPPER_INPUT_CLASS}
              {...register(`items.${index}.cantidad`)}
            />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center text-[#64748B] transition-colors hover:bg-slate-100"
              onClick={() => {
                setValue(`items.${index}.cantidad`, currentAmount + 1, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
              }}
            >
              +
            </button>
          </div>
        );
      },
      getError: (_, index) => errors?.items?.[index]?.cantidad?.message,
    },
    ...(showDurationToggle
      ? [
          {
            key: "duracion",
            label: "Aplicar duración",
            type: "custom",
            desktopWidth: QUOTE_LINE_ITEM_DESKTOP_WIDTHS.duracion,
            desktopAlign: "center",
            desktopHeaderAlign: "center",
            mobilePriority: 3,
            mobileGridSpan: 2,
            renderField: ({ item, index }) => {
              const applyDurationMultiplier = item.raw?.applyDurationMultiplier !== false;

              return (
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      applyDurationMultiplier ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:bg-slate-100"
                    }`}
                    onClick={() => setValue(`items.${index}.applyDurationMultiplier`, true, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                  >
                    Por día
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      !applyDurationMultiplier ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:bg-slate-100"
                    }`}
                    onClick={() => setValue(`items.${index}.applyDurationMultiplier`, false, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                  >
                    Única vez
                  </button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      setSubmitErrors([]);
      try {
        const data = await getCotizacionById(id);
        if (!mounted) return;
        setCotizacion(data);
        setPreviewBreakdown(normalizeBackendBreakdown(data));

        const backendItems = Array.isArray(data?.items) ? data.items : [];
        const mappedItems = backendItems.map((it) => ({
          sourceItemId: it?.id || it?._id || "",
          tipo: it?.tipo || it?.categoria || "",
          nombre: it?.nombre || it?.descripcion || "",
          cantidad: n(it?.cantidad),
          precio: n(it?.precio),
          applyDurationMultiplier: it?.applyDurationMultiplier !== false,
        }));

        reset({
          nombreEvento: data?.nombreEvento || "",
          tipoEvento: extractTipoEvento(data?.tipoEvento),
          fechaEvento: toDateISO(data?.eventStartDate || data?.fechaEvento),
          eventDurationDays: clampDurationDays(data?.eventDurationDays ?? data?.breakdown?.numberOfDays ?? 1),
          horaInicio: toTimeHHMM(data?.horaInicio),
          horaFin: toTimeHHMM(data?.horaFin),
          estado: normalizeQuotationStatus(data?.estado) || "Cotizado",
          negocioId: typeof data?.negocio === 'object' ? (data?.negocio?._id || "") : (data?.negocioId || ""),
          paqueteId: typeof data?.paquete === 'object' ? (data?.paquete?._id || "") : (data?.paqueteId || ""),
          clienteNombre: typeof data?.cliente === 'object' ? (data?.cliente?.nombre || "") : "",
          clienteTelefono: typeof data?.cliente === 'object' ? (data?.cliente?.telefono || "") : "",
          clienteEmail: typeof data?.cliente === 'object' ? (data?.cliente?.email || "") : "",
          direccion: data?.direccion || data?.lugar || "",
          notas: String(data?.notas || "").trim(),
          observaciones: String(data?.observaciones || "").trim(),
          invitadosAdultos: n(data?.invitadosAdultos),
          invitadosNinos: n(data?.invitadosNinos),
          incluyeIva: resolveInitialIncluyeIva(data),
          ivaPorcentaje: resolveInitialIvaPorcentaje(data),
          descuentoTipo: data?.descuentoTipo || "monto",
          descuento: n(data?.descuento ?? 0),
          anticipo: n(data?.anticipo ?? 0),
          items: mappedItems,
        });

        const clienteIdToFetch = typeof data?.cliente === 'object'
          ? (data?.cliente?._id || "")
          : (data?.clienteId || "");

        if (clienteIdToFetch) {
          getCliente(clienteIdToFetch)
            .catch(() => {});
        }
      } catch (err) {
        const msg = err?.response?.data?.msg || err?.response?.data?.message || err?.message || "No se pudo cargar la cotización";
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, reset]);

  useEffect(() => {
    if (!cotizacion || previewUnavailable) return;
    if (!isDirty) {
      setPreviewBreakdown(normalizeBackendBreakdown(cotizacion));
      return;
    }
    if (!Array.isArray(watchedItems) || watchedItems.length === 0) {
      setPreviewBreakdown(normalizeBackendBreakdown(cotizacion));
      return;
    }

    const ivaPctForPayload = Math.max(0, n(ivaPorcentaje));
  const incluyeIvaForPayload = Boolean(incluyeIva);

    const payload = {
      tipoEvento: String(methods.getValues("tipoEvento") || ""),
      nombreEvento: String(methods.getValues("nombreEvento") || ""),
      horaInicio: String(methods.getValues("horaInicio") || ""),
      horaFin: String(methods.getValues("horaFin") || ""),
      estado: normalizeQuotationStatus(String(methods.getValues("estado") || cotizacion?.estado || "Cotizado")),
      cliente: {
        nombre: String(methods.getValues("clienteNombre") || "").trim(),
        ...(methods.getValues("clienteTelefono") && { telefono: String(methods.getValues("clienteTelefono")).trim() }),
        ...(methods.getValues("clienteEmail") && { email: String(methods.getValues("clienteEmail")).trim() }),
      },
      items: (watchedItems || []).map((it) => ({
        tipo: String(it?.tipo || ""),
        nombre: String(it?.nombre || ""),
        cantidad: Math.max(0, n(it?.cantidad)),
        precio: Math.max(0, n(it?.precio)),
        applyDurationMultiplier: it?.applyDurationMultiplier !== false,
      })),
      ...(methods.getValues("fechaEvento") && { fechaEvento: String(methods.getValues("fechaEvento")) }),
      ...(methods.getValues("fechaEvento") && { eventStartDate: String(methods.getValues("fechaEvento")) }),
      eventDurationDays,
      ...(methods.getValues("paqueteId") && { paqueteId: String(methods.getValues("paqueteId")) }),
      ...(methods.getValues("direccion") && { direccion: String(methods.getValues("direccion")).trim() }),
      ...(methods.getValues("notas") && { notas: String(methods.getValues("notas")).trim() }),
      ...(methods.getValues("observaciones") && { observaciones: String(methods.getValues("observaciones")).trim() }),
      invitadosAdultos: n(methods.getValues("invitadosAdultos")) || 0,
      invitadosNinos: n(methods.getValues("invitadosNinos")) || 0,
      incluyeIva: incluyeIvaForPayload,
      ivaPct: ivaPctForPayload,
      ivaPorcentaje: ivaPctForPayload,
      descuentoTipo: String(methods.getValues("descuentoTipo") || "monto"),
      descuento: n(descuento) || 0,
      anticipo: n(anticipo) || 0,
    };

    const timeout = setTimeout(async () => {
      try {
        const preview = await previewCotizacion(payload, id);
        if (!preview) {
          setPreviewUnavailable(true);
          return;
        }
        setPreviewBreakdown(normalizeBackendBreakdown(preview));
      } catch {
        // Se mantiene último breakdown conocido para evitar inconsistencias visuales.
      }
    }, 450);

    return () => clearTimeout(timeout);
  }, [
    cotizacion,
    previewUnavailable,
    watchedItems,
    incluyeIva,
    ivaPorcentaje,
    descuento,
    anticipo,
    eventDurationDays,
    isDirty,
    methods,
    id,
  ]);

  useEffect(() => {
    let active = true;
    setPaquetesLoading(true);

    listPaquetes({ activo: true, page: 1, pageSize: 200, sortBy: "nombre", sortDir: "asc" })
      .then((res) => {
        if (!active) return;
        setPaquetes(res?.paquetes || []);
      })
      .catch(() => {
        if (!active) return;
        setPaquetes([]);
      })
      .finally(() => {
        if (active) setPaquetesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadTiposEvento = async () => {
      try {
        const response = await listCatalogo("tipoeventos", { activo: true, pageSize: 100 });
        const tipos = response?.items?.map((item) => item.nombre) || [];
        if (active) {
          setTiposEvento(tipos.length > 0 ? tipos : []);
        }
      } catch {
        if (active) {
          setTiposEvento([]);
        }
      }
    };

    loadTiposEvento();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!paqueteInitRef.current) {
      paqueteInitRef.current = true;
      return () => {
        active = false;
      };
    }

    if (paqueteId === prevPaqueteIdRef.current) {
      return () => { active = false; };
    }

    prevPaqueteIdRef.current = paqueteId;

    if (!paqueteId) return () => { active = false; };

    getPaquete(paqueteId)
      .then((paquete) => {
        if (!active) return;
        const elementos = Array.isArray(paquete?.elementos) ? paquete.elementos : [];
        const mapped = elementos.map((el) => ({
          tipo: mapElementoTipo(el?.tipo),
          nombre: el?.nombre || "",
          cantidad: Number(el?.cantidadMesas ?? el?.cantidad ?? 1),
          precio: Number(el?.precioPorMesa ?? el?.precio ?? 0),
          applyDurationMultiplier: true,
        }));

        replace(mapped);
      })
      .catch(() => {
        if (!active) return;
      });

    return () => {
      active = false;
    };
  }, [paqueteId, replace]);

  const onSubmit = async (values) => {
    if (saving) return;
    setSaving(true);
    setError("");
    setSubmitErrors([]);

    try {
      // El negocioId no se puede cambiar en edición, no se envía al backend
      const ivaPctForPayload = Math.max(0, n(values?.ivaPorcentaje ?? 16));
      const incluyeIvaForPayload = Boolean(values?.incluyeIva);

      const payload = {
        tipoEvento: String(values?.tipoEvento || ""),
        nombreEvento: String(values?.nombreEvento || ""),
        horaInicio: String(values?.horaInicio || ""),
        horaFin: String(values?.horaFin || ""),
        estado: String(values?.estado || "Cotizado"),

        cliente: {
          nombre: String(values?.clienteNombre || "").trim(),
          ...(values?.clienteTelefono && { telefono: String(values.clienteTelefono).trim() }),
          ...(values?.clienteEmail && { email: String(values.clienteEmail).trim() }),
        },

        items: (values?.items || []).map((it) => ({
          tipo: String(it?.tipo || ""),
          nombre: String(it?.nombre || ""),
          cantidad: Math.max(0, n(it?.cantidad)),
          precio: Math.max(0, n(it?.precio)),
          applyDurationMultiplier: it?.applyDurationMultiplier !== false,
        })),

        ...(values?.fechaEvento && { fechaEvento: String(values.fechaEvento) }),
        ...(values?.fechaEvento && { eventStartDate: String(values.fechaEvento) }),
        eventDurationDays,
        ...(values?.paqueteId && { paqueteId: String(values.paqueteId) }),
        ...(values?.direccion && { direccion: String(values.direccion).trim() }),
        ...(values?.notas && { notas: String(values.notas).trim() }),
        ...(values?.observaciones && { observaciones: String(values.observaciones).trim() }),
        invitadosAdultos: n(values?.invitadosAdultos) || 0,
        invitadosNinos: n(values?.invitadosNinos) || 0,

        incluyeIva: incluyeIvaForPayload,
        ivaPct: ivaPctForPayload,
        ivaPorcentaje: ivaPctForPayload,
        descuentoTipo: String(values?.descuentoTipo || "monto"),
        descuento: n(values?.descuento) || 0,
        anticipo: n(values?.anticipo) || 0,
      };

      const updatedResponse = await updateCotizacion(id, payload);
      const updatedCot = updatedResponse?.cotizacion || updatedResponse?.data?.cotizacion || updatedResponse;
      if (updatedCot) {
        setCotizacion(updatedCot);
        setPreviewBreakdown(normalizeBackendBreakdown(updatedCot));
      }

      // Enviar notificación al cliente
      const clienteEmail = values?.clienteEmail?.trim();
      if (clienteEmail) {
        await sendCotizacionNotification(id, clienteEmail);
      }

      alert("✅ Cotización actualizada exitosamente. Se ha enviado un aviso al cliente.");
      navigate("/cotizaciones", { replace: true });
    } catch (err) {
      logger.error("Error actualizando cotización:", err);

      const msg = err?.response?.data?.msg || err?.response?.data?.message || err?.message || "No se pudo guardar la cotización";

      setError(`❌ ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = (formErrors) => {
    const msgs = flattenErrors(formErrors);
    setSubmitErrors(msgs.length ? msgs : ["Revisa los campos marcados en rojo."]);
  };

  const handleGeneratePDF = async () => {
    if (!cotizacion || saving) return;

    setSaving(true);
    setError("");
    setSubmitErrors([]);

    try {
      const currentValues = methods.getValues();

      const ivaPctForPayload = Math.max(0, n(currentValues?.ivaPorcentaje ?? 16));
      const incluyeIvaForPayload = Boolean(currentValues?.incluyeIva);

      const payload = {
        nombreEvento: currentValues?.nombreEvento || "",
        tipoEvento: currentValues?.tipoEvento || "",
        estado: currentValues?.estado || "Cotizado",
        direccion: currentValues?.direccion || "",
        notas: String(currentValues?.notas || "").trim(),
        observaciones: String(currentValues?.observaciones || "").trim(),
        invitadosAdultos: n(currentValues?.invitadosAdultos) || 0,
        invitadosNinos: n(currentValues?.invitadosNinos) || 0,
        incluyeIva: incluyeIvaForPayload,
        ivaPct: ivaPctForPayload,
        ivaPorcentaje: ivaPctForPayload,
        descuento: n(currentValues?.descuento) || 0,
        anticipo: n(currentValues?.anticipo) || 0,
        subtotal: n(backendBreakdown?.subtotalFinal ?? backendBreakdown?.subtotalByDays ?? backendBreakdown?.subtotalOneDay ?? cotizacion?.subtotal ?? 0),
        iva: n(backendBreakdown?.ivaMonto ?? cotizacion?.ivaMonto ?? 0),
        total: n(previewBreakdown?.total ?? cotizacion?.total ?? backendBreakdown?.total ?? 0),
        saldo: Math.max(0, n(previewBreakdown?.total ?? cotizacion?.total ?? backendBreakdown?.total ?? 0) - n(currentValues?.anticipo ?? 0)),
        items: (currentValues?.items || []).map((it) => ({
          tipo: String(it?.tipo || ""),
          catalogoTipo: String(it?.catalogoTipo || ""),
          nombre: String(it?.nombre || ""),
          cantidad: Math.max(0, n(it?.cantidad)),
          precio: Math.max(0, n(it?.precio)),
          applyDurationMultiplier: it?.applyDurationMultiplier !== false,
        })),
      };

      if (currentValues?.fechaEvento) {
        payload.fechaEvento = String(currentValues.fechaEvento);
        payload.eventStartDate = String(currentValues.fechaEvento);
      }
      payload.eventDurationDays = eventDurationDays;
      if (currentValues?.horaInicio) {
        payload.horaInicio = currentValues.horaInicio;
      }
      if (currentValues?.horaFin) {
        payload.horaFin = currentValues.horaFin;
      }
      if (currentValues?.paqueteId) {
        payload.paqueteId = String(currentValues.paqueteId);
      }

      const updatedResponse = await updateCotizacion(id, payload);
      const updatedCot = updatedResponse?.cotizacion || updatedResponse?.data?.cotizacion || updatedResponse;
      if (updatedCot) {
        setCotizacion(updatedCot);
        setPreviewBreakdown(normalizeBackendBreakdown(updatedCot));
      }
      const pdfData = { ...cotizacion, ...payload, ...(updatedCot || {}) };
      generateCotizacionPDF(pdfData);
      alert("✅ Cotización guardada y PDF descargado correctamente");
      setTimeout(() => {
        navigate("/cotizaciones", { replace: true });
      }, 500);
    } catch (err) {
      const msg = err?.response?.data?.msg || err?.response?.data?.message || err?.message || "No se pudo guardar o generar PDF";
      setError(msg);
      alert(`❌ ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F9] px-4 sm:px-6">
        <div className="text-[#64748B]">Cargando...</div>
      </div>
    );
  }

  if (error && !cotizacion) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] px-4 py-8 sm:px-6">
        <div className="max-w-md rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          {error}
        </div>
        <button
          onClick={() => navigate("/cotizaciones")}
          className="mt-4 rounded-lg bg-[#2563EB] px-4 py-2 text-white hover:bg-[#1d4ed8]"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        onKeyDown={preventEnterFormSubmit}
        className="min-h-screen min-w-0 bg-[#F4F6F9] pb-6 sm:pb-8"
      >
        {/* Header Sticky */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <nav className="flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
                  <button
                    type="button"
                    onClick={() => navigate("/cotizaciones")}
                    className="hover:text-[#111827] transition"
                  >
                    Cotizaciones
                  </button>
                  <span>/</span>
                  <span className="text-[#111827]">Detalles</span>
                </nav>
              </div>
              <div className="flex flex-wrap items-start gap-2 sm:items-center sm:justify-end sm:gap-3 lg:max-w-[24rem]">
                <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeColor(estado)}`}>
                  {estado}
                </span>
                {isDirty && (
                  <span className="inline-flex max-w-full items-center rounded-full border border-orange-300 bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                    Cambios sin guardar
                  </span>
                )}
              </div>
            </div>
            <h1 className="mb-3 break-words text-2xl font-bold text-[#111827] sm:text-3xl">
              Cotización {cotizacion?.folio || ""}
            </h1>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => navigate("/cotizaciones")}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-[#111827] transition hover:bg-slate-50 sm:w-auto"
              >
                ← Volver
              </button>
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-[#111827] transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
              >
                📄 PDF
              </button>
              <button
                type="submit"
                disabled={saving || !isDirty}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#2563EB] px-4 py-2 text-white transition hover:bg-[#1d4ed8] disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
          {submitErrors.length > 0 && (
            <div className="border-t border-red-200 bg-red-50 px-4 py-3 sm:px-6">
              <ul className="text-sm text-red-700 space-y-1">
                {submitErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Main Content - 2 Column Layout */}
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(26rem,30rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(27rem,31rem)]">
            {/* Left Column - Main Form */}
            <div className="min-w-0 space-y-4 sm:space-y-6">
              {/* Card: Cliente */}
              <FormSection title="Cliente">
                <FieldGrid columns={3}>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Nombre</label>
                    <input type="text" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("clienteNombre")} readOnly disabled />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Teléfono</label>
                    <input type="tel" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("clienteTelefono")} readOnly disabled />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Email</label>
                    <input type="email" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("clienteEmail")} readOnly disabled />
                  </div>
                </FieldGrid>
              </FormSection>

              {/* Card: Datos del Evento */}
              <FormSection title="Datos del servicio" contentClassName="space-y-5">
                <FieldGrid columns={2}>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Nombre del evento</label>
                    <input type="text" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("nombreEvento")} />
                    {errors.nombreEvento && <p className="text-xs text-red-600 mt-1">{errors.nombreEvento.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Tipo de evento</label>
                    <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("tipoEvento")}>
                      <option value="">Selecciona un tipo</option>
                      {tiposEvento.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </FieldGrid>

                <FieldGrid columns={3}>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Fecha de inicio</label>
                    <input type="date" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("fechaEvento")} />
                    <p className="text-xs text-[#64748B] mt-1">{eventDateLabel}</p>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Duración (días)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm"
                      {...register("eventDurationDays")}
                      onBlur={(e) => setValue("eventDurationDays", clampDurationDays(e.target.value), { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    />
                    {errors.eventDurationDays && <p className="text-xs text-red-600 mt-1">{errors.eventDurationDays.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Hora inicio</label>
                    <input type="time" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("horaInicio")} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Hora fin</label>
                    <input type="time" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("horaFin")} />
                  </div>
                </FieldGrid>

                <FieldGrid columns={3}>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Salón/Negocio</label>
                    <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-slate-50" {...register("negocioId")} disabled>
                      <option value="">Selecciona un salón</option>
                      {negocios.map((n) => (
                        <option key={n._id || n.id} value={n._id || n.id}>{n.nombre}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[#64748B] mt-1">No se puede cambiar el salón de una cotización existente.</p>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Paquete</label>
                    <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("paqueteId")} disabled={paquetesLoading}>
                      <option value="">Ninguno</option>
                      {paquetes.map((p) => (
                        <option key={p._id || p.id} value={p._id || p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Estado</label>
                    <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("estado")}>
                      <option value="Cotizado">Cotizado</option>
                      <option value="En revision">En revisión</option>
                      <option value="No aceptada">No aceptada</option>
                      <option value="Contratado">Contratado</option>
                    </select>
                  </div>
                </FieldGrid>

                <FieldGrid columns={3}>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Invitados adultos</label>
                    <input type="number" min="0" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("invitadosAdultos")} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Invitados niños</label>
                    <input type="number" min="0" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("invitadosNinos")} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Lugar/Dirección</label>
                    <input type="text" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" {...register("direccion")} placeholder="Dirección del servicio" />
                  </div>
                </FieldGrid>
              </FormSection>

              {/* Card: Catálogos */}
              <FormSection title="Catálogos" contentClassName="min-w-0 space-y-4">
                {/* CatalogTabs with full nueva cotización logic */}
                <div className="min-w-0 overflow-hidden">
                  <CatalogTabs
                    onAddItem={(item) => append(item, { shouldFocus: false })}
                    onNuevoItem={(tipo) => {
                      setNuevoCatalogoTipo(tipo);
                      setModalNuevoCatalogoOpen(true);
                    }}
                    recentCatalogItem={recentCatalogItem}
                    refreshKey={catalogRefreshKey}
                  />
                </div>

                {/* Modal para agregar nuevo catálogo item */}
                <Transition show={modalNuevoCatalogoOpen} as={Fragment}>
                  <Dialog as="div" className="relative z-50" onClose={() => setModalNuevoCatalogoOpen(false)}>
                    <Transition.Child
                      as={Fragment}
                      enter="ease-out duration-300"
                      enterFrom="opacity-0"
                      enterTo="opacity-100"
                      leave="ease-in duration-200"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <div className="fixed inset-0 bg-black/30" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                      <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-4">
                      <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                      >
                        <Dialog.Panel
                          className="flex max-h-[min(100dvh-1.5rem,48rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[min(100dvh-2rem,48rem)] sm:rounded-2xl"
                          onSubmitCapture={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
                            <Dialog.Title className="text-lg font-semibold text-gray-900">
                              Nuevo catálogo: {nuevoCatalogoTipo}
                            </Dialog.Title>
                            <button
                              type="button"
                              onClick={() => setModalNuevoCatalogoOpen(false)}
                              className="shrink-0 text-gray-400 hover:text-gray-600"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                            <NuevoCatalogoForm
                              tipo={nuevoCatalogoTipo}
                              embedded
                              onCancel={() => setModalNuevoCatalogoOpen(false)}
                              onSuccess={(createdItem) => {
                                const normalizedCreatedItem = resolveCreatedCatalogItem(createdItem);
                                if (normalizedCreatedItem && normalizedCreatedItem.nombre) {
                                  const tipoServicio = CATALOGO_TIPO_TO_SERVICIO[nuevoCatalogoTipo] || "Extra";
                                  append({
                                    tipo: tipoServicio,
                                    nombre: normalizedCreatedItem.nombre,
                                    precio: Number(normalizedCreatedItem.precio || 0),
                                    cantidad: 1,
                                    catalogoTipo: nuevoCatalogoTipo,
                                    applyDurationMultiplier: true,
                                  }, { shouldFocus: false });
                                  setRecentCatalogItem({
                                    catalogoTipo: nuevoCatalogoTipo,
                                    item: normalizedCreatedItem,
                                  });
                                } else {
                                  alert("No se pudo agregar automáticamente el servicio a la cotización. Intenta nuevamente.");
                                  return;
                                }
                                setModalNuevoCatalogoOpen(false);
                                setCatalogRefreshKey((k) => k + 1);
                              }}
                            />
                          </div>
                        </Dialog.Panel>
                      </Transition.Child>
                      </div>
                    </div>
                  </Dialog>
                </Transition>
              </FormSection>

              <DynamicLineItemsEditor
                items={editorItems}
                getItemKey={(item, index) => item.id || `servicio-${index}`}
                fields={editorItemFields}
                title="Servicios agregados"
                description="Ajusta precio, cantidad y aplicación por día sin salir de la cotización."
                emptyState={{
                  title: "No hay servicios",
                  description: "Agrega servicios desde los catálogos de arriba.",
                }}
                summaryColumnLabel="Total"
                actionsColumnLabel="Acciones"
                summaryColumnWidth={QUOTE_LINE_ITEM_SUMMARY_WIDTH}
                actionsColumnWidth={QUOTE_LINE_ITEM_ACTIONS_WIDTH}
                mobileBreakpoint="lg"
                actions={[
                  {
                    key: "remove",
                    label: "Eliminar",
                    tone: "danger",
                    onClick: (_, index) => remove(index, { shouldDirty: true }),
                  },
                ]}
              />

              <FormSection
                title="Notas y observaciones"
                description="Separa claramente la información interna del texto que sí verá el cliente en el PDF."
                contentClassName="space-y-5"
              >
                <FieldGrid columns={2} className="gap-4 lg:gap-5">
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Notas internas (solo staff)
                      </label>
                      <p className="text-xs text-[#64748B]">Estas notas solo son visibles para tu equipo.</p>
                    </div>
                    <textarea
                      rows={4}
                      className="min-h-[8.5rem] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#111827]"
                      {...register("notas")}
                      placeholder="Notas internas que no aparecerán en el PDF"
                    />
                  </div>

                  <div className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Observaciones (cliente)
                      </label>
                      <p className="text-xs text-[#64748B]">Aparecerá en el PDF de la cotización.</p>
                    </div>
                    <textarea
                      rows={4}
                      className="min-h-[8.5rem] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#111827]"
                      {...register("observaciones")}
                      placeholder="Información que se mostrará en el PDF"
                    />
                  </div>
                </FieldGrid>
              </FormSection>
            </div>

            {/* Right Column - Sticky Sidebar */}
            <div className="min-w-0 max-w-full lg:min-w-[26rem]">
              <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
                <ResumenCostos
                  breakdown={backendBreakdown}
                  eventDurationDays={eventDurationDays}
                  formState={methods.formState}
                  saving={saving}
                  setValue={setValue}
                  showActions={false}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
