import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState, useRef, Fragment } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, X, Save, FileText, CheckCircle } from "lucide-react";
import { Dialog, Transition } from "@headlessui/react";
import CatalogTabs from "./CatalogTabs";
import NuevoCatalogoForm from "../catalogo/NuevoCatalogoForm";
import ItemsTable from "./ItemsTable";
import ResumenCostos from "./ResumenCostos";
import ClienteBuscarCrear from "./ClienteBuscarCrear";
import FormSection from "../common/forms/FormSection";
import FieldGrid from "../common/forms/FieldGrid";
import {
  Input,
  Label,
  Textarea,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Calendar,
} from "@/components/ui";
import { format } from "date-fns";
import { createCotizacion, previewCotizacion } from "../../services/cotizacionesService";
import { getPaquete, listPaquetes } from "../../services/paquetesService";
import { listCatalogo, createCatalogoItem } from "../../services/catalogoService";
import { createCliente } from "../../services/clientesService";
import { useNegocios } from "../../hooks/useNegocios";
import { generateCotizacionPDF } from "../../utils/generatePDF";
import { extractDateOnly, parseDateOnlyAsLocalDate, toLocalDateOnly } from "../../utils/dateOnly";
import { preventEnterFormSubmit } from "../../utils/formGuards";
import { logger } from "../../lib/logger";
import { buildClienteMedioPayload, clienteMedioSchemaFields, refineClienteMedio } from "../clientes/clienteMedio";
// Zod schema
const itemSchema = z.object({
  tipo: z.string().min(1, "Tipo requerido"),
  catalogoTipo: z.string().optional().default(""),
  nombre: z.string().min(1, "Nombre requerido"),
  cantidad: z.coerce.number().min(0, "0 o mayor"),
  precio: z.coerce.number().min(0, "0 o mayor"),
  applyDurationMultiplier: z.coerce.boolean().default(true),
});

const schema = z.object({
  folio: z.string().min(1),
  clienteId: z.string().optional().default(""),
  tipoEvento: z.string().min(1, "Tipo de evento requerido"),
  nombreEvento: z.string().min(2, "Nombre del evento requerido"),
  fechaEvento: z.date({ required_error: "Fecha del evento requerida" }),
  eventDurationDays: z.coerce.number().int("La duración debe ser un entero").min(1, "La duración mínima es 1 día").default(1),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora de inicio requerida (HH:MM)"),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/, "Hora de fin requerida (HH:MM)"),
  negocioId: z.string().min(1, "Negocio requerido"),
  paqueteId: z.string().optional().default(""),
  invitadosAdultos: z.number().int().min(0).optional().default(0),
  invitadosNinos: z.number().int().min(0).optional().default(0),
  direccion: z.string().optional().default(""),
  cliente: z.object({
    nombre: z.string().min(1, "Nombre del cliente requerido"),
    apellido: z.string().optional().default(""),
    telefono: z.string().min(1, "Teléfono requerido"),
    email: z.string().email("Email requerido"),
    ...clienteMedioSchemaFields,
    fechaNacimiento: z.string().optional(),
  }),
  items: z.preprocess(
    (value) =>
      Array.isArray(value)
        ? value.filter(
            (item) =>
              item &&
              Object.keys(item).length > 0 &&
              item?.nombre &&
              item?.precio !== undefined &&
              item?.cantidad !== undefined
          )
        : [],
    z.array(itemSchema).min(1, "Agrega al menos un item")
  ),
  incluyeIva: z.boolean().optional().default(false),
  ivaPorcentaje: z.number().min(0).max(100).optional().default(16),
  descuentoTipo: z.enum(["porcentaje", "monto"]).optional().default("monto"),
  descuento: z.number().min(0).optional().default(0),
  anticipo: z.number().min(0).optional().default(0),
  estado: z.enum(["Cotizado", "En revision", "No aceptada", "Contratado", "Cancelado"]).optional().default("Cotizado"),
  notas: z.string().optional().default(""),
}).superRefine((data, ctx) => refineClienteMedio(data?.cliente, ctx, ["cliente"]));

// Crear la fecha por defecto una sola vez
const todayDate = new Date();
todayDate.setHours(0, 0, 0, 0);

const defaultValues = {
  folio: "COT-001",
  clienteId: "",
  tipoEvento: "",
  nombreEvento: "",
  fechaEvento: todayDate,
  eventDurationDays: 1,
  horaInicio: "18:00",
  horaFin: "22:00",
  negocioId: "",
  paqueteId: "",
  invitadosAdultos: 0,
  invitadosNinos: 0,
  direccion: "",
  cliente: { nombre: "", apellido: "", telefono: "", email: "", medio: "", medioOtros: "", fechaNacimiento: "" },
  items: [],
  incluyeIva: false,
  ivaPorcentaje: 16,
  descuentoTipo: "monto",
  descuento: 0,
  anticipo: 0,
  estado: "Cotizado",
  notas: "",
};

function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function buildFechaEventoValue(fechaEvento) {
  return extractDateOnly(fechaEvento);
}

function clampDurationDays(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(1, Math.trunc(num));
}

function resolveInitialIncluyeIva(source) {
  return source?.incluyeIva === true || source?.ivaIncluido === true;
}

function resolveInitialIvaPorcentaje(source) {
  const direct = Number(source?.ivaPorcentaje ?? source?.ivaPct ?? source?.ivaRate);
  if (Number.isFinite(direct)) return Math.max(0, direct);

  const breakdownIva = Number(source?.breakdown?.ivaMonto ?? source?.ivaMonto);
  if (Number.isFinite(breakdownIva) && breakdownIva === 0) return 0;

  return 16;
}

function addDays(date, daysToAdd) {
  if (!isValidDate(date)) return null;
  const result = new Date(date);
  result.setDate(result.getDate() + daysToAdd);
  return result;
}

function formatDateLabel(date) {
  if (!isValidDate(date)) return "-";
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function mapElementoTipo(tipo) {
  const t = String(tipo || "").toLowerCase();
  if (t === "platillo" || t === "platillos") return "Platillo";
  if (t === "bebida" || t === "bebidas") return "Bebida";
  if (t === "personal") return "Personal";
  if (t === "paquete" || t === "paquetes") return "Paquete";
  return "Extra";
}

function mapCatalogoTipoToItemTipo(catalogoTipo) {
  const t = String(catalogoTipo || "").toLowerCase();
  if (t === "platillos") return "Platillo";
  if (t === "bebidas") return "Bebida";
  if (t === "personal") return "Personal";
  return "Extra";
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

function getEntityId(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
    if (typeof value.value === "string") return value.value;
  }
  return "";
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

export default function CotizacionForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onChange",
  });
  const { fields, append, remove, replace } = useFieldArray({
    control: methods.control,
    name: "items",
  });

  const { handleSubmit, watch, setValue, formState } = methods;
  const [saving, setSaving] = useState(false);
  const [savedFolio, setSavedFolio] = useState("");
  const [actionType, setActionType] = useState("borrador"); // "borrador" o "contratado"
  const actionTypeRef = useRef("borrador");
  const [paquetes, setPaquetes] = useState([]);
  const [paquetesLoading, setPaquetesLoading] = useState(true);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const duplicateInitialIvaPctRef = useRef(null);
  const [backendBreakdown, setBackendBreakdown] = useState(null);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  // Modal for new catalog item
  const [modalNuevoCatalogoOpen, setModalNuevoCatalogoOpen] = useState(false);
  const [nuevoCatalogoTipo, setNuevoCatalogoTipo] = useState("");
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const [recentCatalogItem, setRecentCatalogItem] = useState(null);
  const [duplicateNegocioInfo, setDuplicateNegocioInfo] = useState(null);

  // Ref para almacenar el tipo de descuento anterior
  const prevDescuentoTipoRef = useRef(null);

  // Hook para cargar negocios
  const { negocios = [], loading: negociosLoading, error: negociosError } = useNegocios();

  // Estados para tipos de evento
  const [tiposEvento, setTiposEvento] = useState([]);
  const [modalTipoEventoOpen, setModalTipoEventoOpen] = useState(false);
  const [nuevoTipoEvento, setNuevoTipoEvento] = useState("");
  const [savingTipoEvento, setSavingTipoEvento] = useState(false);
  const formRef = useRef(null);
  const detalleCotizacionRef = useRef(null);

  // WATCH (para selects controlados)
  const tipoEvento = watch("tipoEvento");
  const negocioId = watch("negocioId");
  const paqueteId = watch("paqueteId");
  const fechaEvento = watch("fechaEvento");
  const eventDurationDays = clampDurationDays(watch("eventDurationDays"));

  // Cálculos en tiempo real
  const items = watch("items");
  const incluyeIva = watch("incluyeIva");
  const ivaPorcentaje = watch("ivaPorcentaje");
  const descuentoTipo = watch("descuentoTipo");
  const descuentoValor = watch("descuento");
  const anticipo = watch("anticipo");

  const safeItems = Array.isArray(items) ? items : [];
  const safeIvaPorcentaje = Number.isFinite(Number(ivaPorcentaje)) ? Math.max(0, Number(ivaPorcentaje)) : 0;
  const safeDescuentoValor = Number.isFinite(Number(descuentoValor)) ? Number(descuentoValor) : 0;
  const safeAnticipo = Number.isFinite(Number(anticipo)) ? Number(anticipo) : 0;

  // Efecto para convertir valor de descuento cuando cambia el tipo
  useEffect(() => {
    // Si es la primera vez que se renderiza, guardar el tipo actual y salir
    if (prevDescuentoTipoRef.current === null) {
      prevDescuentoTipoRef.current = descuentoTipo;
      return;
    }

    // Si el tipo no cambió, solo actualizar ref y salir
    if (prevDescuentoTipoRef.current === descuentoTipo) {
      return;
    }

    // El tipo cambió, hacer la conversión
    const currentValor = methods.getValues("descuento") || 0;
    const prevTipo = prevDescuentoTipoRef.current;

    const subtotalForConversion = Number(backendBreakdown?.subtotalFinal ?? backendBreakdown?.subtotalByDays ?? backendBreakdown?.subtotalOneDay ?? 0);
    if (subtotalForConversion > 0 && currentValor > 0) {
      if (prevTipo === "porcentaje" && descuentoTipo === "monto") {
        // Convertir porcentaje a monto en pesos
        const nuevoMonto = (subtotalForConversion * currentValor) / 100;
        methods.setValue("descuento", Math.round(nuevoMonto));
      } else if (prevTipo === "monto" && descuentoTipo === "porcentaje") {
        // Convertir monto en pesos a porcentaje
        const nuevoPorcentaje = Math.min(100, (currentValor / subtotalForConversion) * 100);
        methods.setValue("descuento", Math.round(nuevoPorcentaje * 100) / 100);
      }
    }

    // Actualizar el ref con el tipo actual
    prevDescuentoTipoRef.current = descuentoTipo;
  }, [descuentoTipo, methods, backendBreakdown]);

  // Efecto para manejar la duplicación de cotización
  useEffect(() => {
    if (location.state?.isDuplicate && location.state?.duplicatedFrom) {
      const cotizacionOriginal = location.state.duplicatedFrom;
      setIsDuplicate(true);
      duplicateInitialIvaPctRef.current = resolveInitialIvaPorcentaje(cotizacionOriginal);

      const negocioIdOriginal =
        getEntityId(cotizacionOriginal?.negocioId) ||
        (cotizacionOriginal?.negocio && typeof cotizacionOriginal.negocio === "object"
          ? getEntityId(cotizacionOriginal.negocio)
          : "");
      const paqueteIdOriginal = getEntityId(cotizacionOriginal?.paqueteId) || getEntityId(cotizacionOriginal?.paquete);
      const negocioNombreOriginal =
        (typeof cotizacionOriginal?.negocio === "string" ? cotizacionOriginal.negocio : "") ||
        String(
          cotizacionOriginal?.negocio?.nombre ||
          cotizacionOriginal?.negocioId?.nombre ||
          cotizacionOriginal?.negocioNombre ||
          ""
        );
      const negocioTipoOriginal = String(
        cotizacionOriginal?.negocio?.tipo ||
        cotizacionOriginal?.negocioId?.tipo ||
        cotizacionOriginal?.tipoNegocio ||
        ""
      );

      setDuplicateNegocioInfo({
        id: negocioIdOriginal,
        nombre: negocioNombreOriginal,
        tipo: negocioTipoOriginal,
      });

      // Pre-llenar formulario con datos de la cotización duplicada
      const dataParaDuplicar = {
        clienteId: getEntityId(cotizacionOriginal?.clienteId) || getEntityId(cotizacionOriginal?.cliente) || "",
        tipoEvento: cotizacionOriginal?.tipoEvento || "",
        nombreEvento: cotizacionOriginal?.nombreEvento || "",
        fechaEvento: parseDateOnlyAsLocalDate(cotizacionOriginal?.eventStartDate || cotizacionOriginal?.fechaEvento) || new Date(),
        eventDurationDays: clampDurationDays(
          cotizacionOriginal?.eventDurationDays ?? cotizacionOriginal?.breakdown?.numberOfDays ?? 1
        ),
        horaInicio: cotizacionOriginal?.horaInicio || "18:00",
        horaFin: cotizacionOriginal?.horaFin || "22:00",
        negocioId: negocioIdOriginal || "",
        paqueteId: paqueteIdOriginal || "",
        invitadosAdultos: cotizacionOriginal?.invitadosAdultos || 0,
        invitadosNinos: cotizacionOriginal?.invitadosNinos || 0,
        direccion: cotizacionOriginal?.direccion || "",
        cliente: cotizacionOriginal?.cliente || { nombre: "", telefono: "", email: "", medio: "", medioOtros: "", fechaNacimiento: "" },
        items: (cotizacionOriginal?.items || []).map((item) => ({
          ...item,
          applyDurationMultiplier: item?.applyDurationMultiplier !== false,
        })),
        incluyeIva: resolveInitialIncluyeIva(cotizacionOriginal),
        ivaPorcentaje: resolveInitialIvaPorcentaje(cotizacionOriginal),
        descuentoTipo: cotizacionOriginal?.descuentoTipo || "monto",
        descuento: cotizacionOriginal?.descuento || 0,
        anticipo: cotizacionOriginal?.anticipo || 0,
        notas: cotizacionOriginal?.notas || "",
      };

      const { items: duplicatedItems = [], ...duplicatedFields } = dataParaDuplicar;

      Object.keys(duplicatedFields).forEach((key) => {
        setValue(key, duplicatedFields[key]);
      });

      replace(duplicatedItems);

      // Limpiar el state para evitar duplicaciones accidentales
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state, replace, setValue]);

  useEffect(() => {
    if (!isDuplicate) return;
    if (duplicateInitialIvaPctRef.current !== 0) return;
    if (safeIvaPorcentaje <= 0) return;
    if (!incluyeIva) return;

    setValue("incluyeIva", false, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [incluyeIva, isDuplicate, safeIvaPorcentaje, setValue]);

  useEffect(() => {
    const negocioId = String(duplicateNegocioInfo?.id || "").trim();
    const negocioNombre = String(duplicateNegocioInfo?.nombre || "").trim();
    if (!negocioId || negocioNombre || !Array.isArray(negocios) || negocios.length === 0) return;

    const match = negocios.find(
      (negocio) => String(negocio?._id || negocio?.id || "") === negocioId
    );

    if (!match) return;

    setDuplicateNegocioInfo((prev) => {
      if (!prev || String(prev.id || "") !== negocioId) return prev;
      return {
        ...prev,
        nombre: String(match?.nombre || prev.nombre || ""),
        tipo: String(match?.tipo || prev.tipo || ""),
      };
    });
  }, [duplicateNegocioInfo?.id, duplicateNegocioInfo?.nombre, negocios]);

  // Cargar tipos de evento desde el catálogo
  useEffect(() => {
    const loadTiposEvento = async () => {
      try {
        const response = await listCatalogo("tipoeventos", { activo: true, pageSize: 100 });
        const tipos = response.items.map(item => item.nombre);
        setTiposEvento(tipos);
      } catch (err) {
        logger.error("Error cargando tipos de evento:", err);
        setTiposEvento([]);
      }
    };
    loadTiposEvento();
  }, []);

  // Función para agregar nuevo tipo de evento
  const handleAgregarTipoEvento = async () => {
    if (!nuevoTipoEvento.trim()) {
      alert("Por favor, ingresa un nombre para el tipo de evento");
      return;
    }

    setSavingTipoEvento(true);
    try {
      await createCatalogoItem("tipoeventos", { nombre: nuevoTipoEvento.trim() });
      setTiposEvento(prev => [...prev, nuevoTipoEvento.trim()]);
      setValue("tipoEvento", nuevoTipoEvento.trim());
      setNuevoTipoEvento("");
      setModalTipoEventoOpen(false);
    } catch (err) {
      logger.error("Error creando tipo de evento:", err);
      alert("No se pudo crear el tipo de evento. Intenta nuevamente.");
    } finally {
      setSavingTipoEvento(false);
    }
  };
  useEffect(() => {
    if (previewUnavailable) return;
    if (!Array.isArray(safeItems) || safeItems.length === 0) {
      setBackendBreakdown(null);
      return;
    }

    const ivaPctForPayload = Math.max(0, safeIvaPorcentaje);
    const incluyeIvaForPayload = Boolean(incluyeIva);

    const payload = {
      tipoEvento: tipoEvento || "",
      nombreEvento: methods.getValues("nombreEvento") || "",
      fechaEvento: buildFechaEventoValue(methods.getValues("fechaEvento")),
      eventStartDate: buildFechaEventoValue(methods.getValues("fechaEvento")),
      eventDurationDays: clampDurationDays(methods.getValues("eventDurationDays")),
      horaInicio: methods.getValues("horaInicio") || "",
      horaFin: methods.getValues("horaFin") || "",
      negocioId: methods.getValues("negocioId") || "",
      direccion: methods.getValues("direccion") || "",
      invitadosAdultos: Math.max(0, Number(methods.getValues("invitadosAdultos") || 0)),
      invitadosNinos: Math.max(0, Number(methods.getValues("invitadosNinos") || 0)),
      incluyeIva: incluyeIvaForPayload,
      ivaPct: ivaPctForPayload,
      ivaPorcentaje: ivaPctForPayload,
      descuentoTipo: descuentoTipo || "monto",
      descuento: Math.max(0, Number(safeDescuentoValor || 0)),
      anticipo: Math.max(0, Number(safeAnticipo || 0)),
      cliente: {
        nombre: methods.getValues("cliente.nombre") || "Cliente",
        ...(methods.getValues("cliente.telefono") && { telefono: methods.getValues("cliente.telefono") }),
        ...(methods.getValues("cliente.email") && { email: methods.getValues("cliente.email") }),
      },
      items: safeItems.map((item) => ({
        tipo: mapElementoTipo(item?.tipo),
        nombre: String(item?.nombre || ""),
        cantidad: Math.max(0, Number(item?.cantidad || 0)),
        precio: Math.max(0, Number(item?.precio || 0)),
        applyDurationMultiplier: item?.applyDurationMultiplier !== false,
      })),
    };

    const timeout = setTimeout(async () => {
      try {
        const preview = await previewCotizacion(payload);
        if (!preview) {
          setPreviewUnavailable(true);
          return;
        }
        setBackendBreakdown(normalizeBackendBreakdown(preview));
      } catch (err) {
        logger.warn("No se pudo obtener preview de cotización", err);
      }
    }, 450);

    return () => clearTimeout(timeout);
  }, [
    previewUnavailable,
    safeItems,
    tipoEvento,
    incluyeIva,
    safeIvaPorcentaje,
    descuentoTipo,
    safeDescuentoValor,
    safeAnticipo,
    methods,
  ]);

  const clienteData = watch("cliente") || {};
  const previewTotal = Number(backendBreakdown?.total ?? 0);
  const canContratar = (previewTotal > 0 || safeItems.length > 0) && Boolean(String(clienteData?.nombre || "").trim());

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

    if (!paqueteId) return () => { active = false; };

    getPaquete(paqueteId)
      .then((paquete) => {
        if (!active) return;
        const elementos = Array.isArray(paquete?.elementos) ? paquete.elementos : [];
        const mapped = elementos.map((el) => ({
          tipo: mapElementoTipo(el?.tipo),
          nombre: el?.nombre || "",
          precio: Number(el?.precioPorMesa ?? el?.precio ?? 0),
          cantidad: Number(el?.cantidadMesas ?? el?.cantidad ?? 1),
          applyDurationMultiplier: true,
        }));

        replace(mapped);

        // Cargar el descuento del paquete si existe
        if (paquete?.descuentoTipo && paquete?.descuentoValor !== undefined && paquete?.descuentoValor !== null) {
          const descuentoValor = Number(paquete.descuentoValor);

          // Cargar el tipo de descuento del paquete
          setValue("descuentoTipo", paquete.descuentoTipo, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });

          // Cargar el valor del descuento
          setValue("descuento", descuentoValor, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }
      })
      .catch(() => {
        if (!active) return;
      });

    return () => {
      active = false;
    };
  }, [paqueteId, replace, setValue]);

  const onSubmit = async (data) => {
    const currentActionType = actionTypeRef.current || actionType;

    setSaving(true);
    try {
      const cleanedItems = Array.isArray(data.items)
        ? data.items.filter(
            (item) =>
              item &&
              Object.keys(item).length > 0 &&
              item?.nombre &&
              item?.precio !== undefined &&
              item?.cantidad !== undefined
          )
        : [];

      const mappedItems = cleanedItems.map((item) => ({
        tipo: mapElementoTipo(item?.tipo),
        nombre: String(item?.nombre || ""),
        cantidad: Math.max(0, Number(item?.cantidad) || 0),
        precio: Math.max(0, Number(item?.precio) || 0),
        applyDurationMultiplier: item?.applyDurationMultiplier !== false,
      }));

      if (mappedItems.length === 0) {
        alert("Agrega al menos un item para guardar la cotización.");
        return;
      }

      // Create client first
      let clienteId = data.clienteId || null;
      if (!clienteId) {
        try {
          const clientePayload = {
            nombre: data.cliente.nombre,
            ...(data.cliente.apellido && { apellidos: data.cliente.apellido }),
            ...(data.cliente.telefono && { telefono: data.cliente.telefono }),
            ...(data.cliente.email && { email: data.cliente.email }),
            ...buildClienteMedioPayload(data.cliente),
          };

          const clienteCreated = await createCliente(clientePayload);
          clienteId = clienteCreated?._id || clienteCreated?.id;

          if (!clienteId) {
            logger.warn("No se recibió ID al crear cliente");
          }
        } catch (clienteErr) {
          logger.error("Error creando cliente:", clienteErr);
          // Continue anyway, will save cliente inline
        }
      }

      const payload = {
        tipoEvento: data.tipoEvento,
        nombreEvento: data.nombreEvento,
        fechaEvento: buildFechaEventoValue(data.fechaEvento),
        eventStartDate: buildFechaEventoValue(data.fechaEvento),
        eventDurationDays: clampDurationDays(data.eventDurationDays),
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        negocioId: data.negocioId,
        direccion: data.direccion || "",
        invitadosAdultos: Math.max(0, Number(data.invitadosAdultos) || 0),
        invitadosNinos: Math.max(0, Number(data.invitadosNinos) || 0),
        notas: String(data.notas || "").trim(),
        incluyeIva: Boolean(data.incluyeIva),
        ivaPct: Math.max(0, Number.isFinite(Number(data.ivaPorcentaje)) ? Number(data.ivaPorcentaje) : 16),
        ivaPorcentaje: Math.max(0, Number.isFinite(Number(data.ivaPorcentaje)) ? Number(data.ivaPorcentaje) : 16),
        descuentoTipo: data.descuentoTipo || "monto",
        descuento: Math.max(0, Number(data.descuento) || 0),
        anticipo: Math.max(0, Number(data.anticipo) || 0),
        cliente: {
          nombre: data.cliente.nombre,
          ...(data.cliente.apellido && { apellido: data.cliente.apellido }),
          ...(data.cliente.telefono && { telefono: data.cliente.telefono }),
          ...(data.cliente.email && { email: data.cliente.email }),
        },
        items: mappedItems,
      };

      // Add paqueteId if selected
      if (data.paqueteId && data.paqueteId.trim() !== "") {
        payload.paqueteId = data.paqueteId;
      }

      // Add clienteId to payload if successfully created
      if (clienteId) {
        payload.clienteId = clienteId;
      }

      // Establecer estado según el tipo de acción
      if (currentActionType === "contratado") {
        payload.estado = "Contratado";
      } else {
        payload.estado = "Cotizado";
      }
      const createdResponse = await createCotizacion(payload);
      const saved = createdResponse?.cotizacion || createdResponse?.data?.cotizacion || createdResponse;
      setBackendBreakdown(normalizeBackendBreakdown(saved));
      setSavedFolio(saved?.folio || "");

      const mensaje = currentActionType === "contratado"
        ? `✅ Cotización contratada con éxito!\nFolio: ${saved?.folio || ""}`
        : `✅ Cotización guardada como borrador.\nFolio: ${saved?.folio || ""}`;

      alert(mensaje);

      // Redirigir a cotizaciones después de 500ms
      setTimeout(() => {
        navigate("/cotizaciones");
      }, 500);
    } catch (err) {
      logger.error("Error guardando cotización:", err);

      const status = err?.response?.status;
      const responseData = err?.response?.data;
      const msg = responseData?.msg || responseData?.message || "No se pudo guardar la cotización";

      if (status === 403 && msg?.includes("negocioId")) {
        alert(`❌ No tienes acceso a este negocio.\n\nDetalles: ${msg}`);
      } else if (status === 403) {
        alert(`❌ Acceso denegado.\n\nDetalles: ${msg}`);
      } else {
        alert(`❌ ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // helper para selects controlados + validación inmediata
  const setField = (name, value) => {
    setValue(name, value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const submitAs = (type) => {
    actionTypeRef.current = type;
    setActionType(type);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

  const handleGeneratePDF = async () => {
    try {
      const values = methods.getValues();
      const safeItemsForPdf = Array.isArray(values?.items) ? values.items : [];

      const pdfData = {
        folio: savedFolio || "Borrador",
        tipoEvento: values?.tipoEvento || "",
        nombreEvento: values?.nombreEvento || "",
        fechaEvento: buildFechaEventoValue(values?.fechaEvento),
        eventStartDate: buildFechaEventoValue(values?.fechaEvento),
        eventDurationDays: clampDurationDays(values?.eventDurationDays),
        horaInicio: values?.horaInicio || "",
        horaFin: values?.horaFin || "",
        negocioId: values?.negocioId || "",
        paqueteId: values?.paqueteId || "",
        direccion: values?.direccion || "",
        notas: values?.notas || "",
        invitadosAdultos: Number(values?.invitadosAdultos || 0),
        invitadosNinos: Number(values?.invitadosNinos || 0),
        cliente: {
          nombre: values?.cliente?.nombre || "",
          apellido: values?.cliente?.apellido || "",
          telefono: values?.cliente?.telefono || "",
          email: values?.cliente?.email || "",
        },
        items: safeItemsForPdf.map((item) => ({
          tipo: mapElementoTipo(item?.tipo),
          catalogoTipo: String(item?.catalogoTipo || ""),
          nombre: String(item?.nombre || ""),
          precio: Number(item?.precio || 0),
          cantidad: Number(item?.cantidad || 0),
          applyDurationMultiplier: item?.applyDurationMultiplier !== false,
        })),
        ivaPct: safeIvaPorcentaje,
        incluyeIva: Boolean(values?.incluyeIva),
        descuentoPct: values?.descuentoTipo === "porcentaje" ? safeDescuentoValor : 0,
        descuentoMonto: values?.descuentoTipo === "monto" ? safeDescuentoValor : Number(backendBreakdown?.descuentoTotal ?? 0),
        descuentoTipo: values?.descuentoTipo || "monto",
        anticipo: safeAnticipo,
        estado: values?.estado || "Cotizado",
        observaciones: values?.observaciones || "",
        subtotal: Number(backendBreakdown?.subtotalFinal ?? backendBreakdown?.subtotalByDays ?? backendBreakdown?.subtotalOneDay ?? 0),
        ivaMonto: Number(backendBreakdown?.ivaMonto ?? 0),
        descuentoTotal: Number(backendBreakdown?.descuentoTotal ?? 0),
        total: Number(backendBreakdown?.total ?? 0),
        saldo: Math.max(0, Number(backendBreakdown?.total ?? 0) - safeAnticipo),
        breakdown: backendBreakdown && typeof backendBreakdown === "object" ? { ...backendBreakdown } : undefined,
        _id: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await generateCotizacionPDF(pdfData);
    } catch (err) {
      logger.error("Error al generar PDF:", err);
      alert("No se pudo generar el PDF. Verifica que el navegador no bloquee ventanas emergentes.");
    }
  };

  const negocioIdValue = String(negocioId || "");
  const negocioSeleccionadoExisteEnLista = negocios.some(
    (negocio) => String(negocio?._id || negocio?.id || "") === negocioIdValue
  );
  const mostrarNegocioFallback =
    Boolean(negocioIdValue) &&
    !negocioSeleccionadoExisteEnLista &&
    duplicateNegocioInfo?.id === negocioIdValue;

  const fechaEventoText = (() => {
    if (!fechaEvento) return "";
    if (isValidDate(fechaEvento)) {
      try {
        return format(fechaEvento, "yyyy-MM-dd");
      } catch (e) {
        logger.error("[fechaEventoText] Error formateando:", e);
        return extractDateOnly(fechaEvento);
      }
    }
    return "";
  })();

  const eventEndDatePreview = addDays(fechaEvento, eventDurationDays - 1);
  const eventDateRangeLabel =
    eventDurationDays >= 2
      ? `Fecha del evento: del ${formatDateLabel(fechaEvento)} al ${formatDateLabel(eventEndDatePreview)}`
      : `Fecha: ${formatDateLabel(fechaEvento)}`;

  return (
    <FormProvider {...methods}>
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={preventEnterFormSubmit}
        className="mx-auto grid min-h-screen w-full max-w-7xl min-w-0 grid-cols-1 gap-4 bg-[#F4F6F9] px-4 py-4 sm:gap-6 sm:px-5 sm:py-5 lg:grid-cols-[minmax(0,2fr)_minmax(24rem,27.5rem)] lg:items-start lg:px-6 lg:py-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(25rem,28rem)]"
      >
        {/* Columna principal */}
        <div className="min-w-0 flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
              <span>Cotizaciones</span>
              <span>/</span>
              <span className="font-semibold text-[#2563eb]">{isDuplicate ? "Duplicar cotización" : "Nueva cotización"}</span>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold text-[#111827] sm:text-3xl">{isDuplicate ? "Duplicar cotización" : "Nueva cotización"}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="max-w-full text-xs border-slate-200 text-[#64748B]">Folio: {savedFolio || "Se genera al guardar"}</Badge>
                  <Badge className="max-w-full text-xs bg-slate-100 text-slate-700 hover:bg-slate-100">Estado: Borrador</Badge>
                  {isDuplicate && <Badge className="max-w-full text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">Duplicada</Badge>}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:max-w-[28rem] lg:justify-end">
                <button type="button" onClick={() => submitAs("borrador")} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-[#64748B] transition-colors hover:bg-slate-50 sm:w-auto">
                  <Save className="w-4 h-4" /> Guardar cotización
                </button>
                <button type="button" onClick={handleGeneratePDF} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-[#64748B] transition-colors hover:bg-slate-50 sm:w-auto">
                  <FileText className="w-4 h-4" /> PDF
                </button>
                <button type="button" onClick={() => submitAs("contratado")} disabled={!canContratar || saving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                  <CheckCircle className="w-4 h-4" /> Contratar
                </button>
              </div>
            </div>
          </div>

          <FormSection
            title="Datos del servicio"
            description="Información general del servicio"
            contentClassName="space-y-5"
          >
            <FieldGrid columns={2}>
              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Tipo de evento <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <select
                    className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
                    value={tipoEvento || ""}
                    onChange={(e) => setField("tipoEvento", e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {tiposEvento.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setModalTipoEventoOpen(true)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 transition-colors hover:bg-slate-50"
                    title="Agregar nuevo tipo de evento"
                  >
                    <Plus size={18} className="text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Nombre del evento <span className="text-red-500">*</span></Label>
                <Input className="h-11 rounded-xl border-slate-200" {...methods.register("nombreEvento")} />
              </div>
            </FieldGrid>

            <FieldGrid columns={3}>
              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Fecha del evento <span className="text-red-500">*</span></Label>
                <input
                  type="date"
                  value={fechaEventoText || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split("-").map(Number);
                      const newDate = new Date(year, month - 1, day);
                      setField("fechaEvento", newDate);
                    }
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  min={toLocalDateOnly(new Date())}
                />
                <p className="mt-1 text-xs text-[#64748B]">{eventDateRangeLabel}</p>
              </div>

              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Duración (días) <span className="text-red-500">*</span></Label>
                <Input
                  className="h-11 rounded-xl border-slate-200"
                  type="number"
                  min={1}
                  step={1}
                  {...methods.register("eventDurationDays", { valueAsNumber: true })}
                  onBlur={(e) => setField("eventDurationDays", clampDurationDays(e.target.value))}
                />
              </div>

              <div className="min-w-0 xl:col-span-1">
                <FieldGrid columns={2} className="gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-2">
                  <div>
                    <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Hora inicio <span className="text-red-500">*</span></Label>
                    <Input className="h-11 rounded-xl border-slate-200" type="time" {...methods.register("horaInicio")} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Hora fin <span className="text-red-500">*</span></Label>
                    <Input className="h-11 rounded-xl border-slate-200" type="time" {...methods.register("horaFin")} />
                  </div>
                </FieldGrid>
              </div>
            </FieldGrid>

            <FieldGrid columns={3}>
              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Negocio <span className="text-red-500">*</span></Label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  value={negocioIdValue}
                  onChange={(e) => setField("negocioId", e.target.value)}
                  disabled={negociosLoading}
                >
                  <option value="">Selecciona un negocio</option>
                  {negociosLoading && <option value="" disabled>Cargando negocios...</option>}
                  {mostrarNegocioFallback && (
                    <option value={negocioIdValue}>
                      {(duplicateNegocioInfo?.nombre || "Negocio original") + (duplicateNegocioInfo?.tipo ? ` (${duplicateNegocioInfo.tipo})` : "")}
                    </option>
                  )}
                  {negocios.map((negocio) => (
                    <option key={negocio._id || negocio.id} value={String(negocio._id || negocio.id)}>
                      {negocio.nombre} ({negocio.tipo})
                    </option>
                  ))}
                </select>
                {negociosError && <p className="mt-1 text-xs text-red-600">No se pudieron cargar negocios.</p>}
              </div>

              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Paquete</Label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  value={paqueteId || ""}
                  onChange={(e) => setField("paqueteId", e.target.value)}
                  disabled={paquetesLoading}
                >
                  <option value="">Ninguno</option>
                  {paquetes.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <FieldGrid columns={2} className="gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-2">
                  <div>
                    <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Invitados adultos</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200"
                      type="number"
                      min={0}
                      {...methods.register("invitadosAdultos", { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Invitados niños</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200"
                      type="number"
                      min={0}
                      {...methods.register("invitadosNinos", { valueAsNumber: true })}
                    />
                  </div>
                </FieldGrid>
              </div>
            </FieldGrid>

            <FieldGrid columns={1}>
              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Dirección / Lugar del evento</Label>
                <Input
                  className="h-11 rounded-xl border-slate-200"
                  placeholder="Ej: Calle Principal 123, Apartado 4B"
                  {...methods.register("direccion")}
                />
              </div>
            </FieldGrid>
          </FormSection>

          {/* Card: Cliente */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <p className="text-base font-semibold text-[#111827]">Cliente <span className="text-red-500">*</span></p>
            </CardHeader>
            <CardContent>
              <ClienteBuscarCrear />
            </CardContent>
          </Card>

          <FormSection title="Catálogos" contentClassName="min-w-0 space-y-4">
            <div className="min-w-0 overflow-hidden">
              <CatalogTabs
                onAddItem={(item) => append(item, { shouldFocus: false })}
                onNuevoItem={(tipo) => { setNuevoCatalogoTipo(tipo); setModalNuevoCatalogoOpen(true); }}
                recentCatalogItem={recentCatalogItem}
                refreshKey={catalogRefreshKey}
              />
            </div>
          </FormSection>

          {/* Card: Detalle de cotización */}
          <div ref={detalleCotizacionRef}>
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="text-base font-semibold text-[#111827]">Detalle de cotización <span className="text-red-500">*</span></CardHeader>
              <CardContent>
                <ItemsTable fields={fields} remove={remove} />
                <p className="text-xs text-[#64748B] mt-3">Agregar más desde Catálogos</p>
              </CardContent>
            </Card>
          </div>

          <FormSection
            title="Notas"
            description="Agrega condiciones, horarios, restricciones y cualquier aclaración relevante para la cotización."
          >
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Notas internas</Label>
              <Textarea
                className="min-h-[120px] rounded-xl border-slate-200 bg-white"
                maxLength={2000}
                placeholder="Agrega condiciones, horarios, restricciones, etc."
                {...methods.register("notas")}
              />
              <p className="text-xs text-[#64748B]">Este contenido acompaña la cotización sin alterar cálculos ni el detalle de conceptos.</p>
            </div>
          </FormSection>
        </div>

        {/* Sidebar derecha: Resumen de costos - Sticky */}
        <div className="min-w-0 max-w-full lg:min-w-[24rem]">
          <div className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <ResumenCostos
              breakdown={backendBreakdown}
              eventDurationDays={eventDurationDays}
              anticipo={safeAnticipo}
              setValue={setValue}
              formState={formState}
              saving={saving}
              canContratar={canContratar}
              onSaveDraft={() => submitAs("borrador")}
              onContratarClick={() => submitAs("contratado")}
              onPdfClick={handleGeneratePDF}
            />
          </div>
        </div>
      </form>

      {/* Modal para agregar nuevo tipo de evento */}
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
                            // Auto-add new item to cotización
                            if (normalizedCreatedItem && normalizedCreatedItem.nombre) {
                              append({
                                tipo: mapCatalogoTipoToItemTipo(nuevoCatalogoTipo),
                                nombre: normalizedCreatedItem.nombre,
                                precio: Number(normalizedCreatedItem.precio || 0),
                                cantidad: 1,
                                catalogoTipo: nuevoCatalogoTipo,
                                applyDurationMultiplier: true,
                              }, { shouldFocus: false });

                              setModalNuevoCatalogoOpen(false);
                              setRecentCatalogItem({
                                catalogoTipo: nuevoCatalogoTipo,
                                item: normalizedCreatedItem,
                              });
                              setCatalogRefreshKey((k) => k + 1);

                              requestAnimationFrame(() => {
                                detalleCotizacionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              });
                            } else {
                              alert("No se pudo agregar automáticamente el servicio a la cotización. Intenta nuevamente.");
                            }
                          }}
                        />
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                  </div>
                </div>
              </Dialog>
            </Transition>
      <Transition show={modalTipoEventoOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setModalTipoEventoOpen(false)}>
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
              <Dialog.Panel className="flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    Agregar Tipo de Evento
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={() => setModalTipoEventoOpen(false)}
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
                  <div>
                    <Label>Nombre del tipo de evento</Label>
                    <Input
                      type="text"
                      value={nuevoTipoEvento}
                      onChange={(e) => setNuevoTipoEvento(e.target.value)}
                      placeholder="Ej: Bautizo, Aniversario, etc."
                      className="mt-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAgregarTipoEvento();
                        }
                      }}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Este tipo de evento se guardará para uso futuro en nuevas cotizaciones.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setModalTipoEventoOpen(false);
                        setNuevoTipoEvento("");
                      }}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 sm:w-auto"
                      disabled={savingTipoEvento}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAgregarTipoEvento}
                      className="w-full rounded-lg bg-[#2563eb] px-4 py-2 text-sm text-white hover:bg-[#1d4ed8] disabled:opacity-50 sm:w-auto"
                      disabled={savingTipoEvento || !nuevoTipoEvento.trim()}
                    >
                      {savingTipoEvento ? "Guardando..." : "Agregar"}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </FormProvider>
  );
}
