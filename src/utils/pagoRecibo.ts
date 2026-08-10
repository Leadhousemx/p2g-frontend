import { getConfig, type Configuracion } from "../services/configService";
import { getPagoReciboDetalle, type PagoReciboDetalleResponse, type PagoReciboEmpresa, type PagoReciboNegocio } from "../services/pagosService";
import { generatePagoReciboPDF } from "./generatePagoReciboPDF";

type NullableRecord = Record<string, unknown> | null | undefined;

export interface PagoReciboCliente {
  nombre?: string;
  telefono?: string;
  email?: string;
}

export interface PagoReciboCotizacion {
  _id?: string;
  folio?: string;
  nombreEvento?: string;
  fechaEvento?: string | Date;
  total?: number;
  monto?: number;
  anticipo?: number;
  saldo?: number;
  lugarEvento?: string;
  direccionEvento?: string;
  ubicacion?: string;
  salonNombre?: string;
  negocioNombre?: string;
  salon?: {
    nombre?: string;
  };
  cliente?: PagoReciboCliente;
  empresa?: {
    logoUrl?: string;
  };
}

export interface PagoReciboPago {
  _id?: string;
  folio?: string;
  fecha?: string | Date;
  createdAt?: string | Date;
  monto?: number;
  formaDePago?: string;
  cuenta?: string;
  referencia?: string;
  notas?: string;
  estado?: string;
  status?: string;
  deletedAt?: string | Date | null;
  cancelado?: boolean;
  canceladoAt?: string | Date | null;
  anulado?: boolean;
  anuladoAt?: string | Date | null;
  activo?: boolean;
  createdBy?: {
    nombre?: string;
    email?: string;
  };
}

interface GeneratePagoReciboOptions {
  pagoId: string;
  pago?: PagoReciboPago;
  cotizacion?: PagoReciboCotizacion | null;
  empresaConfig?: Configuracion | null;
  verificationUrl?: string;
}

interface PagoReciboResolvedError extends Error {
  status?: number;
  shouldHideAction?: boolean;
}

function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((toSafeNumber(value) + Number.EPSILON) * 100) / 100;
}

function getPagoSortDate(pago: PagoReciboPago) {
  const value = pago?.fecha || pago?.createdAt;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : new Date(0);
}

function getPagoKey(pago: PagoReciboPago) {
  return pago?._id || `${pago?.fecha || "-"}-${pago?.monto || 0}`;
}

function createPagoReciboError(message: string, status?: number, shouldHideAction = false): PagoReciboResolvedError {
  const error = new Error(message) as PagoReciboResolvedError;
  error.status = status;
  error.shouldHideAction = shouldHideAction;
  return error;
}

function getPagoStatusValue(pago: NullableRecord) {
  return String((pago?.estado || pago?.status || "") as string)
    .trim()
    .toLowerCase();
}

export function isPagoEligibleForRecibo(pago: PagoReciboPago | null | undefined) {
  if (!pago?._id) return false;
  if (pago.deletedAt || pago.canceladoAt || pago.anuladoAt) return false;
  if (pago.cancelado || pago.anulado || pago.activo === false) return false;

  const status = getPagoStatusValue(pago);
  if (!status) return true;

  return ![
    "cancelado",
    "cancelada",
    "cancelled",
    "eliminado",
    "eliminada",
    "deleted",
    "invalido",
    "inválido",
    "invalid",
    "anulado",
    "void",
  ].includes(status);
}

export function buildPagoNoRecibo(pago: PagoReciboPago, pagos: PagoReciboPago[] = []) {
  if (pago?.folio) return String(pago.folio);

  if (pago?._id && pagos.length <= 1) {
    return `REC-${String(pago._id).slice(-8).toUpperCase()}`;
  }

  const dt = getPagoSortDate(pago);
  const yyyymm = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}`;
  const pagosOrdenadosAsc = [...pagos].sort((a, b) => getPagoSortDate(a).getTime() - getPagoSortDate(b).getTime());
  const index = Math.max(0, pagosOrdenadosAsc.findIndex((entry) => getPagoKey(entry) === getPagoKey(pago)));
  return `REC-${yyyymm}-${String(index + 1).padStart(4, "0")}`;
}

export function getPagosAcumuladosHasta(pago: PagoReciboPago, pagos: PagoReciboPago[] = []) {
  const pagosOrdenadosAsc = [...pagos].sort((a, b) => getPagoSortDate(a).getTime() - getPagoSortDate(b).getTime());
  let sum = 0;

  for (const entry of pagosOrdenadosAsc) {
    if (!isPagoEligibleForRecibo(entry)) continue;
    sum += toSafeNumber(entry?.monto);
    if (getPagoKey(entry) === getPagoKey(pago)) break;
  }

  return roundMoney(Math.max(0, sum));
}

function resolveLugarEvento(cotizacion: PagoReciboCotizacion) {
  return (
    cotizacion?.salon?.nombre ||
    cotizacion?.negocioNombre ||
    cotizacion?.salonNombre ||
    cotizacion?.lugarEvento ||
    cotizacion?.direccionEvento ||
    cotizacion?.ubicacion ||
    "-"
  );
}

function resolveNegocioNombre(cotizacion?: PagoReciboCotizacion | null, negocio?: PagoReciboNegocio | null) {
  return (
    negocio?.nombre ||
    negocio?.salonNombre ||
    cotizacion?.negocioNombre ||
    cotizacion?.salon?.nombre ||
    cotizacion?.salonNombre ||
    undefined
  );
}

function normalizeEmpresaData(empresa?: PagoReciboEmpresa | null, fallback?: Configuracion | null) {
  if (!empresa && !fallback) {
    return null;
  }

  return {
    nombreComercial: empresa?.nombreComercial || empresa?.nombre || fallback?.nombreComercial,
    razonSocial: empresa?.razonSocial || fallback?.razonSocial,
    rfc: empresa?.rfc || fallback?.rfc,
    direccion: empresa?.direccion || fallback?.direccion,
    telefono: empresa?.telefono || fallback?.telefono,
    email: empresa?.email || fallback?.email,
    logoUrl: empresa?.logoUrl || fallback?.logoUrl,
  };
}

function mergeCotizacionRecibo(
  detalle?: PagoReciboDetalleResponse | null,
  fallbackCotizacion?: PagoReciboCotizacion | null,
) {
  const detalleCotizacion = detalle?.cotizacion;
  const negocioNombre = resolveNegocioNombre(detalleCotizacion, detalle?.negocio);

  return {
    ...fallbackCotizacion,
    ...detalleCotizacion,
    negocioNombre,
    lugarEvento:
      detalle?.negocio?.direccion ||
      detalle?.negocio?.ubicacion ||
      detalleCotizacion?.lugarEvento ||
      fallbackCotizacion?.lugarEvento,
    direccionEvento: detalleCotizacion?.direccionEvento || fallbackCotizacion?.direccionEvento,
    ubicacion: detalleCotizacion?.ubicacion || detalle?.negocio?.ubicacion || fallbackCotizacion?.ubicacion,
    salonNombre: detalleCotizacion?.salonNombre || detalle?.negocio?.salonNombre || fallbackCotizacion?.salonNombre,
    salon: detalleCotizacion?.salon || fallbackCotizacion?.salon,
    cliente: detalleCotizacion?.cliente || fallbackCotizacion?.cliente,
    empresa: detalleCotizacion?.empresa || fallbackCotizacion?.empresa,
  } satisfies PagoReciboCotizacion;
}

function getResumenNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolvePagoReciboError(error: any) {
  const status = Number(error?.response?.status || error?.status || 0);

  if (status === 404) {
    throw createPagoReciboError("Este pago ya no está disponible para emitir recibo.", status, true);
  }

  if (status === 401) {
    throw createPagoReciboError("Tu sesión expiró o ya no tienes acceso a este pago. Inicia sesión nuevamente.", status);
  }

  if (status === 403) {
    throw createPagoReciboError("No tienes permisos para emitir el recibo de este pago.", status);
  }

  throw createPagoReciboError("No se pudo obtener el detalle autorizado del pago para emitir el recibo.", status || undefined);
}

async function resolveEmpresaConfig(empresaConfig?: Configuracion | null) {
  if (empresaConfig) return empresaConfig;

  try {
    return await getConfig();
  } catch {
    return null;
  }
}

export async function generatePagoRecibo({
  pagoId,
  pago,
  cotizacion,
  empresaConfig,
  verificationUrl,
}: GeneratePagoReciboOptions) {
  if (!pagoId) {
    throw createPagoReciboError("No se encontró el identificador del pago para emitir el recibo.");
  }

  if (pago && !isPagoEligibleForRecibo(pago)) {
    throw new Error("El pago seleccionado no es válido para emitir recibo.");
  }

  let detalle: PagoReciboDetalleResponse;

  try {
    detalle = await getPagoReciboDetalle(pagoId);
  } catch (error: any) {
    resolvePagoReciboError(error);
  }

  const pagoDetalle = detalle?.pago || pago;
  const cotizacionDetalle = mergeCotizacionRecibo(detalle, cotizacion);

  if (!pagoDetalle || !isPagoEligibleForRecibo(pagoDetalle)) {
    throw createPagoReciboError("Este pago ya no está disponible para emitir recibo.", 404, true);
  }

  if (!cotizacionDetalle?._id && !cotizacionDetalle?.folio) {
    throw createPagoReciboError("No se recibió la cotización autorizada del pago para emitir el recibo.");
  }

  const resumen = detalle?.resumen || {};
  const totalServicio = roundMoney(
    getResumenNumber(resumen?.totalServicio) ??
      toSafeNumber(cotizacionDetalle?.total ?? cotizacionDetalle?.monto ?? 0),
  );
  const saldoAnterior = getResumenNumber(resumen?.saldoAnterior);
  const saldoPendiente = getResumenNumber(resumen?.saldoPendiente);

  if (saldoAnterior === null || saldoPendiente === null) {
    throw createPagoReciboError("No se recibió el resumen autorizado del pago para emitir el recibo.");
  }

  const empresaFallback = await resolveEmpresaConfig(empresaConfig);
  const empresa = normalizeEmpresaData(detalle?.empresa, empresaFallback);
  const pagoIdentificador = pagoDetalle?.folio || pagoDetalle?._id;

  await generatePagoReciboPDF({
    noRecibo: buildPagoNoRecibo(pagoDetalle, [pagoDetalle]),
    fechaEmision: new Date(),
    empresa: {
      nombreComercial: empresa?.nombreComercial,
      razonSocial: empresa?.razonSocial,
      rfc: empresa?.rfc,
      direccion: empresa?.direccion,
      telefono: empresa?.telefono,
      email: empresa?.email,
      logoUrl: empresa?.logoUrl || cotizacionDetalle?.empresa?.logoUrl,
    },
    cotizacion: {
      folio: cotizacionDetalle?.folio,
      nombreEvento: cotizacionDetalle?.nombreEvento,
      fechaEvento: cotizacionDetalle?.fechaEvento,
      lugarEvento: resolveLugarEvento(cotizacionDetalle),
      negocioNombre: cotizacionDetalle?.negocioNombre,
      cliente: {
        nombre: cotizacionDetalle?.cliente?.nombre,
        telefono: cotizacionDetalle?.cliente?.telefono,
        email: cotizacionDetalle?.cliente?.email,
      },
    },
    pago: {
      identificador: pagoIdentificador,
      fecha: pagoDetalle?.fecha,
      monto: toSafeNumber(pagoDetalle?.monto),
      formaDePago: pagoDetalle?.formaDePago,
      referencia: pagoDetalle?.referencia,
      cuenta: pagoDetalle?.cuenta,
      notas: pagoDetalle?.notas,
    },
    totalServicio,
    saldoAnterior: roundMoney(saldoAnterior),
    saldoPendiente: roundMoney(saldoPendiente),
    firmas: {
      clienteNombre: cotizacionDetalle?.cliente?.nombre,
      fechaPago: pagoDetalle?.fecha,
      empresaNombre: empresa?.nombreComercial || empresa?.razonSocial,
      usuarioAplicoNombre: pagoDetalle?.createdBy?.nombre || pagoDetalle?.createdBy?.email,
    },
    verificationUrl,
  });
}