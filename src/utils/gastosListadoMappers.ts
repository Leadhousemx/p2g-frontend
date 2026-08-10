import type { Compra } from "../services/comprasService";
import type { GastoListadoApiItem } from "../services/gastosService";
import type { GastoOperativo } from "../services/gastosOperativosService";
import type { RegistroGastoFijo } from "../services/registrosGastosFijosService";
import type { GastoListadoItem } from "../types/gastosListado";
import { extractDateOnly } from "./dateOnly";

function toSafeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveCompraDescription(compra: Compra): string {
  if (String(compra.proveedorNombre || "").trim()) {
    return compra.proveedorNombre;
  }

  const documentoTipo = String(compra.documentoTipo || "").trim();
  const documentoFolio = String(compra.documentoFolio || "").trim();
  return [documentoTipo, documentoFolio].filter(Boolean).join(" ") || "Compra";
}

function resolveOperacionDescription(gastoOperativo: GastoOperativo): string {
  const firstItem = gastoOperativo.items?.[0];
  const firstLabel = String(firstItem?.nombreServicio || "").trim();
  return firstLabel || "Servicios operativos";
}

function resolveGastoFijoDescription(registro: RegistroGastoFijo): string {
  const firstItem = registro.items?.[0];
  const firstLabel = String(firstItem?.nombreGastoFijo || "").trim();
  return firstLabel || "Gastos fijos";
}

function normalizeDateString(value?: string): string {
  if (!value) {
    return "";
  }

  return extractDateOnly(value) || String(value).slice(0, 10);
}

export function mapCompraToGastoListadoItem(compra: Compra): GastoListadoItem {
  return {
    id: `compra:${compra._id}`,
    origenId: compra._id,
    tipoRegistro: "compra",
    folio: compra.folio,
    fecha: compra.fecha,
    total: toSafeNumber(compra.totalCompra ?? compra.total ?? compra.monto),
    metodoPago: compra.metodoPago,
    estadoPago: compra.estadoPago || "Pendiente",
    descripcionPrincipal: resolveCompraDescription(compra),
    proveedorNombre: compra.proveedorNombre,
    documentoTipo: compra.documentoTipo,
    documentoFolio: compra.documentoFolio,
    eventoNombre: compra.eventoNombre,
    raw: compra,
  };
}

export function mapGastoOperativoToGastoListadoItem(gastoOperativo: GastoOperativo): GastoListadoItem {
  return {
    id: `operativo:${gastoOperativo._id}`,
    origenId: gastoOperativo._id,
    tipoRegistro: "operativo",
    folio: gastoOperativo.folio,
    fecha: gastoOperativo.fecha,
    total: toSafeNumber(gastoOperativo.total),
    metodoPago: gastoOperativo.metodoPago,
    estadoPago: "No aplica",
    descripcionPrincipal: resolveOperacionDescription(gastoOperativo),
    eventoNombre: gastoOperativo.eventoNombre,
    raw: gastoOperativo,
  };
}

export function mapRegistroGastoFijoToGastoListadoItem(registro: RegistroGastoFijo): GastoListadoItem {
  return {
    id: `fijo:${registro._id}`,
    origenId: registro._id,
    tipoRegistro: "fijo",
    folio: registro.folio,
    fecha: registro.fecha,
    total: toSafeNumber(registro.total),
    metodoPago: registro.metodoPago,
    estadoPago: "No aplica",
    descripcionPrincipal: resolveGastoFijoDescription(registro),
    raw: registro,
  };
}

function normalizeTipoRegistro(value: unknown): GastoListadoItem["tipoRegistro"] {
  if (value === "compra") return "compra";
  if (value === "operativo" || value === "operacion") return "operativo";
  return "fijo";
}

function resolveDescripcionPrincipal(item: GastoListadoApiItem): string {
  if (normalizeTipoRegistro(item?.tipoRegistro) === "compra") {
    const proveedor = String(item?.proveedorNombre || "").trim();
    if (proveedor) return proveedor;
    const documentoTipo = String(item?.documentoTipo || "").trim();
    const documentoFolio = String(item?.documentoFolio || "").trim();
    return [documentoTipo, documentoFolio].filter(Boolean).join(" ") || "Compra";
  }

  const firstItem = Array.isArray(item?.items) ? item.items[0] : undefined;
  const operativoNombre = String((firstItem as any)?.nombreServicio || "").trim();
  const fijoNombre = String((firstItem as any)?.nombreGastoFijo || "").trim();
  return operativoNombre || fijoNombre || item?.eventoNombre || item?.subtipoRegistro || "Gasto";
}

export function mapApiGastoToListadoItem(item: GastoListadoApiItem): GastoListadoItem {
  const tipoRegistro = normalizeTipoRegistro(item?.tipoRegistro);
  const origenId = String(item?._id || item?.id || "");

  return {
    id: `${tipoRegistro}:${origenId}`,
    origenId,
    tipoRegistro,
    subtipoRegistro: String(item?.subtipoRegistro || "").trim() || undefined,
    proveedorId: String(item?.proveedorId || "").trim() || undefined,
    folio: String(item?.folio || ""),
    fecha: String(item?.fecha || item?.createdAt || ""),
    total: toSafeNumber(item?.totalCompra ?? item?.total ?? item?.monto),
    metodoPago: item?.metodoPago,
    estadoPago: (String(item?.estadoPago || "").trim() as GastoListadoItem["estadoPago"]) || "No aplica",
    descripcionPrincipal: resolveDescripcionPrincipal(item),
    proveedorNombre: String(item?.proveedorNombre || "").trim() || undefined,
    documentoTipo: String(item?.documentoTipo || "").trim() || undefined,
    documentoFolio: String(item?.documentoFolio || "").trim() || undefined,
    eventoNombre: String(item?.eventoNombre || "").trim() || undefined,
    sourceEndpoint: String(item?.sourceEndpoint || "").trim() || undefined,
    raw: item,
  };
}