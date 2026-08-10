import { useEffect, useMemo, useState } from "react";
import MobileEntityCard from "../components/common/MobileEntityCard";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import ReportFiltersBar from "../components/reportes/ReportFiltersBar";
import ReportKpiCard from "../components/reportes/ReportKpiCard";
import ReportState from "../components/reportes/ReportState";
import { Dialog, DialogContent } from "../components/ui";
import {
  getIngresosEgresos,
  getIngresosEgresosDetalle,
  IngresosEgresosDetalleConcepto,
  IngresosEgresosDetalleResponse,
  IngresosEgresosResponse,
  ReportQueryParams,
  ReportSortOrder,
} from "../services/reportsService";
import { logger } from "../lib/logger";
import { useNegocios } from "../hooks/useNegocios";
import { formatDateOnly } from "../utils/dateOnly";
import { exportReportToExcel, fetchAllDetailPages } from "../utils/exportReportToExcel";

const defaultFilters: ReportQueryParams = {
  periodType: "monthly",
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
};

type IngresosView = "all" | "ventas" | "abonos";
type EgresosView = "all" | "compras" | "operativos" | "fijos";

interface SummaryRow {
  rowIndex: number;
  key: string;
  concepto: string;
  referencia: string;
  monto: string;
  rawMonto: unknown;
  detailConcept: IngresosEgresosDetalleConcepto;
  detailTitle: string;
}

interface ReportMovimientoRow {
  rowIndex: number;
  key: string;
  fecha: string;
  tipo: string;
  referencia: string;
  tercero: string;
  evento: string;
  descripcion: string;
  monto: string;
  estado: string;
}

interface DetailModalState {
  open: boolean;
  concepto: IngresosEgresosDetalleConcepto | null;
  title: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: ReportSortOrder;
  loading: boolean;
  error: string;
  data: IngresosEgresosDetalleResponse | null;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DETAIL_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_DETAIL_PAGE_SIZE = 10;
const DEFAULT_DETAIL_SORT_BY = "fecha";
const DEFAULT_DETAIL_SORT_ORDER: ReportSortOrder = "desc";
const EXCLUDED_EGRESO_SUBTYPE = "abonoProveedor";

const INGRESOS_TABLE_COLUMNS = [
  { key: "concepto", label: "Concepto", align: "left" },
  { key: "referencia", label: "Referencia", align: "left" },
  { key: "monto", label: "Monto", align: "right" },
] as const;

const EGRESOS_TABLE_COLUMNS = [
  { key: "concepto", label: "Concepto", align: "left" },
  { key: "referencia", label: "Referencia", align: "left" },
  { key: "monto", label: "Monto", align: "right" },
] as const;

const MOVIMIENTOS_TABLE_COLUMNS = [
  { key: "fecha", label: "Fecha", align: "left" },
  { key: "tipo", label: "Tipo", align: "left" },
  { key: "referencia", label: "Referencia", align: "left" },
  { key: "tercero", label: "Tercero", align: "left" },
  { key: "evento", label: "Evento", align: "left" },
  { key: "descripcion", label: "Descripción", align: "left" },
  { key: "monto", label: "Monto", align: "right" },
  { key: "estado", label: "Estado", align: "left" },
] as const;

function getMovimientoColumnWidthClass(key: typeof MOVIMIENTOS_TABLE_COLUMNS[number]["key"]) {
  switch (key) {
    case "fecha":
      return "min-w-[120px]";
    case "tipo":
      return "min-w-[150px]";
    case "referencia":
      return "min-w-[180px]";
    case "tercero":
      return "min-w-[180px]";
    case "evento":
      return "min-w-[190px]";
    case "descripcion":
      return "min-w-[320px]";
    case "monto":
      return "min-w-[130px]";
    case "estado":
      return "min-w-[140px]";
    default:
      return "min-w-[140px]";
  }
}

function getMovimientoCellClass(key: typeof MOVIMIENTOS_TABLE_COLUMNS[number]["key"]) {
  switch (key) {
    case "fecha":
    case "monto":
    case "estado":
      return "whitespace-nowrap";
    case "descripcion":
      return "whitespace-normal break-words leading-6 text-slate-700";
    default:
      return "whitespace-normal break-words leading-5";
  }
}

function getAlignedCellClass(align: "left" | "right") {
  return align === "right" ? "text-right" : "text-left";
}

function formatCurrencyValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.replace(/[$,\s]/g, ""))
      : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return typeof value === "string" ? value : null;
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.replace(/[$,\s]/g, ""))
      : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function toKpiValue(value: unknown): string | null {
  const formattedValue = formatCurrencyValue(value);
  if (formattedValue !== null) {
    return formattedValue;
  }

  return null;
}

function formatDateValue(value: unknown): string {
  if (!value || typeof value !== "string") {
    return "-";
  }

  const formatted = formatDateOnly(value, "es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return formatted === "-" ? value : formatted;
}

function formatPeriodLabel(periodo: IngresosEgresosDetalleResponse["periodo"] | IngresosEgresosResponse["periodo"] | undefined, fallback: ReportQueryParams): string {
  const tipo = periodo?.tipo ?? fallback.periodType;
  const year = Number(periodo?.año ?? fallback.year);

  if (tipo === "monthly") {
    const monthIndex = Number(periodo?.mes ?? fallback.month ?? 1) - 1;
    return `${MONTH_NAMES[monthIndex] || "Periodo"} ${year}`;
  }

  if (tipo === "semiannual") {
    const semester = Number(periodo?.mes ? Number(periodo.mes) <= 6 ? 1 : 2 : fallback.semester ?? 1);
    return `Semestre ${semester} ${year}`;
  }

  return `Año ${year}`;
}

function getFriendlySubtypeLabel(value: unknown): string {
  switch (String(value ?? "").trim()) {
    case "venta":
      return "Venta";
    case "abonoCliente":
      return "Abono cliente";
    case "compra":
      return "Compra";
    case "abonoProveedor":
      return "Abono proveedor";
    case "gastoOperativo":
      return "Gasto operativo";
    case "gastoFijo":
      return "Gasto fijo";
    default:
      return String(value ?? "-");
  }
}

function createSummaryRow(
  prefix: string,
  index: number,
  concepto: string,
  referencia: string,
  rawMonto: unknown,
  detailConcept: IngresosEgresosDetalleConcepto,
  detailTitle: string
): SummaryRow {
  return {
    rowIndex: index,
    key: `${prefix}-${detailConcept}`,
    concepto,
    referencia,
    monto: formatCurrencyValue(rawMonto) ?? "-",
    rawMonto,
    detailConcept,
    detailTitle,
  };
}

function isExcludedEgresoMovimiento(row: any): boolean {
  return String(row?.subtipo ?? row?.tipoMovimiento ?? row?.tipo ?? "").trim() === EXCLUDED_EGRESO_SUBTYPE;
}

function sanitizeDetalleResponse(data: IngresosEgresosDetalleResponse | null): IngresosEgresosDetalleResponse | null {
  if (!data) {
    return data;
  }

  if (!["totalEgresos", "movimientosResumen"].includes(String(data.concepto ?? ""))) {
    return data;
  }

  const removedItems = (data.items || []).filter(isExcludedEgresoMovimiento);
  if (removedItems.length === 0) {
    return data;
  }

  const removedAmount = removedItems.reduce((sum, item) => sum + (parseNumericValue(item?.monto) ?? 0), 0);
  const nextTotal = parseNumericValue(data.total);

  return {
    ...data,
    total: nextTotal === null ? data.total : nextTotal - removedAmount,
    count: Math.max(0, Number(data.count || 0) - removedItems.length),
    items: (data.items || []).filter((item) => !isExcludedEgresoMovimiento(item)),
  };
}

function getAdjustedEgresosTotal(report: IngresosEgresosResponse | null): unknown {
  const compras = parseNumericValue(report?.egresos?.soloCompras) ?? 0;
  const gastosOperativos = parseNumericValue(report?.egresos?.soloGastosOperativos) ?? 0;
  const gastosFijos = parseNumericValue(report?.egresos?.soloGastosFijos) ?? 0;

  if (
    report?.egresos?.soloCompras !== undefined
    || report?.egresos?.soloGastosOperativos !== undefined
    || report?.egresos?.soloGastosFijos !== undefined
  ) {
    return compras + gastosOperativos + gastosFijos;
  }

  const rawTotal = parseNumericValue(report?.egresos?.total ?? report?.totals?.egresosTotal ?? report?.kpis?.egresosTotales ?? report?.egresosTotales);
  const abonosProveedor = parseNumericValue(report?.egresos?.soloAbonosProveedores);
  if (rawTotal === null) {
    return report?.egresos?.total ?? report?.totals?.egresosTotal ?? report?.kpis?.egresosTotales ?? report?.egresosTotales;
  }

  return rawTotal - (abonosProveedor ?? 0);
}

function getAdjustedBalance(report: IngresosEgresosResponse | null): unknown {
  const ingresosTotal = parseNumericValue(report?.totals?.ingresosTotal ?? report?.kpis?.ingresosTotales ?? report?.ingresosTotales ?? report?.ingresos?.total);
  const egresosTotal = parseNumericValue(getAdjustedEgresosTotal(report));

  if (ingresosTotal !== null && egresosTotal !== null) {
    return ingresosTotal - egresosTotal;
  }

  const rawBalance = parseNumericValue(report?.totals?.balance ?? report?.kpis?.balanceGeneral ?? report?.balanceGeneral);
  const abonosProveedor = parseNumericValue(report?.egresos?.soloAbonosProveedores);

  if (rawBalance !== null) {
    return rawBalance + (abonosProveedor ?? 0);
  }

  return report?.totals?.balance ?? report?.kpis?.balanceGeneral ?? report?.balanceGeneral;
}

function handleActionableKeyDown(event: React.KeyboardEvent<HTMLElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function pickArray(payload: any, keys: string[]): any[] {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function renderIngresosTable(rows: SummaryRow[], onRowClick?: (row: SummaryRow) => void) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="w-full bg-white text-sm">
        <thead className="border-b border-slate-200 bg-[#F9FAFB]">
          <tr>
            {INGRESOS_TABLE_COLUMNS.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] ${getAlignedCellClass(column.align)}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-4 text-[#64748B]" colSpan={INGRESOS_TABLE_COLUMNS.length}>Sin detalle de ingresos para mostrar.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.key}
                className={`border-b border-slate-100 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-slate-50/50" : ""}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => handleActionableKeyDown(event, () => onRowClick(row)) : undefined}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {INGRESOS_TABLE_COLUMNS.map((column) => (
                  <td key={column.key} className={`px-4 py-3 text-[#111827] ${getAlignedCellClass(column.align)}`}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderIngresoMobileCard(row: SummaryRow, onRowClick?: (row: SummaryRow) => void) {
  const content = (
    <MobileEntityCard
      title={row.concepto}
      subtitle={row.referencia}
      className="border-slate-200 shadow-sm"
    >
      <div className="rounded-xl bg-slate-50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Monto</p>
        <p className="mt-1 text-sm font-semibold text-[#111827]">{row.monto}</p>
      </div>
    </MobileEntityCard>
  );

  if (!onRowClick) {
    return content;
  }

  return (
    <button type="button" className="w-full text-left" onClick={() => onRowClick(row)}>
      {content}
    </button>
  );
}

function renderEgresosTable(rows: SummaryRow[], onRowClick?: (row: SummaryRow) => void) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="w-full bg-white text-sm">
        <thead className="border-b border-slate-200 bg-[#F9FAFB]">
          <tr>
            {EGRESOS_TABLE_COLUMNS.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] ${getAlignedCellClass(column.align)}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-4 text-[#64748B]" colSpan={EGRESOS_TABLE_COLUMNS.length}>Sin detalle de egresos para mostrar.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.key}
                className={`border-b border-slate-100 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-slate-50/50" : ""}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => handleActionableKeyDown(event, () => onRowClick(row)) : undefined}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {EGRESOS_TABLE_COLUMNS.map((column) => (
                  <td key={column.key} className={`px-4 py-3 text-[#111827] ${getAlignedCellClass(column.align)}`}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderEgresoMobileCard(row: SummaryRow, onRowClick?: (row: SummaryRow) => void) {
  const content = (
    <MobileEntityCard
      title={row.concepto}
      subtitle={row.referencia}
      className="border-slate-200 shadow-sm"
    >
      <div className="rounded-xl bg-slate-50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Monto</p>
        <p className="mt-1 text-sm font-semibold text-[#111827]">{row.monto}</p>
      </div>
    </MobileEntityCard>
  );

  if (!onRowClick) {
    return content;
  }

  return (
    <button type="button" className="w-full text-left" onClick={() => onRowClick(row)}>
      {content}
    </button>
  );
}

function normalizeMovimientoRow(row: any, index: number) {
  return {
    rowIndex: index,
    key: String(row?._id ?? row?.id ?? row?.sourceId ?? row?.referencia ?? `movimiento-${index}`),
    fecha: formatDateValue(row?.fecha),
    tipo: getFriendlySubtypeLabel(row?.subtipo ?? row?.tipoMovimiento ?? row?.tipo),
    referencia: String(row?.referencia ?? row?.parentFolio ?? "-"),
    tercero: String(row?.terceroNombre ?? "-"),
    evento: String(row?.eventoNombre ?? "-"),
    descripcion: String(row?.descripcion ?? row?.origen ?? row?.origenModelo ?? "-"),
    monto: formatCurrencyValue(row?.monto ?? row?.total) ?? "-",
    estado: String(row?.estado ?? (row?.vigente === false ? "No vigente" : "-")),
  };
}

function renderMovimientosTable(rows: ReportMovimientoRow[]) {
  return (
    <div className="overflow-x-auto overflow-y-visible rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-[1480px] bg-white text-sm">
        <thead className="border-b border-slate-200 bg-[#F8FAFC]">
          <tr>
            {MOVIMIENTOS_TABLE_COLUMNS.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-[#64748B] ${getAlignedCellClass(column.align)} ${getMovimientoColumnWidthClass(column.key)}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-4 text-[#64748B]" colSpan={MOVIMIENTOS_TABLE_COLUMNS.length}>Sin movimientos para mostrar.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                {MOVIMIENTOS_TABLE_COLUMNS.map((column) => (
                  <td key={column.key} className={`px-4 py-3.5 align-top text-[#111827] ${getAlignedCellClass(column.align)} ${getMovimientoColumnWidthClass(column.key)} ${getMovimientoCellClass(column.key)}`}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderMovimientoMobileMeta(row: ReturnType<typeof normalizeMovimientoRow>) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-[#334155]">
      {row.tipo}
    </span>
  );
}

function renderMovimientoMobileCard(row: ReturnType<typeof normalizeMovimientoRow>) {
  return (
    <MobileEntityCard
      title={row.referencia}
      subtitle={row.fecha}
      meta={renderMovimientoMobileMeta(row)}
      className="border-slate-200 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Tercero</p>
          <p className="mt-1 text-sm text-[#111827]">{row.tercero}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Evento</p>
          <p className="mt-1 text-sm text-[#111827]">{row.evento}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Monto</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{row.monto}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Estado</p>
          <p className="mt-1 text-sm text-[#111827]">{row.estado}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Descripción</p>
          <p className="mt-1 text-sm text-[#111827]">{row.descripcion}</p>
        </div>
      </div>
    </MobileEntityCard>
  );
}

function ReportPagination({
  page,
  pageSize,
  totalPages,
  totalItems,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
      <div>
        {totalItems > 0 ? `Página ${page} de ${Math.max(1, totalPages)} · ${totalItems} registros` : "Sin registros"}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-[#64748B]" htmlFor="report-detail-page-size">Filas por página:</label>
        <select
          id="report-detail-page-size"
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-[#111827]"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {DETAIL_PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={!hasPrevPage}
        >
          Anterior
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(Math.min(Math.max(1, totalPages), page + 1))}
          disabled={!hasNextPage}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export default function ReportesIngresosEgresosPage() {
  const { negocios } = useNegocios();
  const [filters, setFilters] = useState<ReportQueryParams>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportQueryParams>(defaultFilters);
  const [ingresosView, setIngresosView] = useState<IngresosView>("all");
  const [egresosView, setEgresosView] = useState<EgresosView>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<IngresosEgresosResponse | null>(null);
  const [movimientosPage, setMovimientosPage] = useState(1);
  const [movimientosPageSize, setMovimientosPageSize] = useState(DEFAULT_DETAIL_PAGE_SIZE);
  const [movimientosLoading, setMovimientosLoading] = useState(false);
  const [movimientosError, setMovimientosError] = useState("");
  const [movimientosData, setMovimientosData] = useState<IngresosEgresosDetalleResponse | null>(null);
  const [detailModal, setDetailModal] = useState<DetailModalState>({
    open: false,
    concepto: null,
    title: "",
    page: 1,
    pageSize: DEFAULT_DETAIL_PAGE_SIZE,
    sortBy: DEFAULT_DETAIL_SORT_BY,
    sortOrder: DEFAULT_DETAIL_SORT_ORDER,
    loading: false,
    error: "",
    data: null,
  });
  const [exporting, setExporting] = useState(false);

  const closeDetailModal = () => {
    setDetailModal((current) => ({
      ...current,
      open: false,
      concepto: null,
      title: "",
      loading: false,
      error: "",
      data: null,
      page: 1,
      pageSize: DEFAULT_DETAIL_PAGE_SIZE,
      sortBy: DEFAULT_DETAIL_SORT_BY,
      sortOrder: DEFAULT_DETAIL_SORT_ORDER,
    }));
  };

  const loadReport = async (targetFilters: ReportQueryParams) => {
    try {
      setLoading(true);
      setError("");
      const data = await getIngresosEgresos(targetFilters);
      setReport(data);
    } catch (err: any) {
      logger.error("Error cargando reporte ingresos-egresos:", err);
      setError(err?.response?.data?.message || "No se pudo cargar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    let cancelled = false;

    const loadMovimientosResumen = async () => {
      try {
        setMovimientosLoading(true);
        setMovimientosError("");
        const data = await getIngresosEgresosDetalle({
          ...appliedFilters,
          concepto: "movimientosResumen",
          page: movimientosPage,
          pageSize: movimientosPageSize,
          sortBy: DEFAULT_DETAIL_SORT_BY,
          sortOrder: DEFAULT_DETAIL_SORT_ORDER,
        });

        if (!cancelled) {
          setMovimientosData(sanitizeDetalleResponse(data));
        }
      } catch (err: any) {
        logger.error("Error cargando movimientos resumen:", err);
        if (!cancelled) {
          setMovimientosData(null);
          setMovimientosError(err?.response?.data?.message || "No se pudo cargar movimientos resumen.");
        }
      } finally {
        if (!cancelled) {
          setMovimientosLoading(false);
        }
      }
    };

    loadMovimientosResumen();

    return () => {
      cancelled = true;
    };
  }, [appliedFilters, movimientosPage, movimientosPageSize]);

  useEffect(() => {
    if (!detailModal.open || !detailModal.concepto) {
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      try {
        setDetailModal((current) => ({ ...current, loading: true, error: "" }));
        const data = await getIngresosEgresosDetalle({
          ...appliedFilters,
          concepto: detailModal.concepto,
          page: detailModal.page,
          pageSize: detailModal.pageSize,
          sortBy: detailModal.sortBy,
          sortOrder: detailModal.sortOrder,
        });

        if (!cancelled) {
          setDetailModal((current) => ({ ...current, data: sanitizeDetalleResponse(data), loading: false, error: "" }));
        }
      } catch (err: any) {
        logger.error("Error cargando detalle de ingresos-egresos:", err);
        if (!cancelled) {
          setDetailModal((current) => ({
            ...current,
            data: null,
            loading: false,
            error: err?.response?.data?.message || "No se pudo cargar el detalle.",
          }));
        }
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [appliedFilters, detailModal.open, detailModal.concepto, detailModal.page, detailModal.pageSize, detailModal.sortBy, detailModal.sortOrder]);

  useEffect(() => {
    closeDetailModal();
  }, [filters.periodType, filters.year, filters.month, filters.semester, filters.negocioId]);

  const ingresosRows = useMemo<SummaryRow[]>(() => {
    if (!report) return [];

    const allRows = [
      createSummaryRow("ingreso", 0, "Total ingresos", "Periodo", report?.ingresos?.total ?? report?.totals?.ingresosTotal ?? report?.kpis?.ingresosTotales ?? report?.ingresosTotales, "totalIngresos", "Total ingresos"),
      createSummaryRow("ingreso", 1, "Solo ventas", "Periodo", report?.ingresos?.soloVentas, "soloVentas", "Solo ventas"),
      createSummaryRow("ingreso", 2, "Solo abonos", "Periodo", report?.ingresos?.soloAbonos, "soloAbonos", "Solo abonos"),
    ].filter((item) => item.rawMonto !== undefined && item.rawMonto !== null);

    if (ingresosView === "ventas") return allRows.filter((item) => item.detailConcept === "soloVentas");
    if (ingresosView === "abonos") return allRows.filter((item) => item.detailConcept === "soloAbonos");
    return allRows;
  }, [report, ingresosView]);

  const egresosRows = useMemo<SummaryRow[]>(() => {
    if (!report) return [];

    const allRows = [
      createSummaryRow("egreso", 0, "Total egresos", "Periodo", getAdjustedEgresosTotal(report), "totalEgresos", "Total egresos"),
      createSummaryRow("egreso", 1, "Solo compras", "Periodo", report?.egresos?.soloCompras, "soloCompras", "Solo compras"),
      createSummaryRow("egreso", 2, "Solo gastos operativos", "Periodo", report?.egresos?.soloGastosOperativos, "soloGastosOperativos", "Solo gastos operativos"),
      createSummaryRow("egreso", 3, "Solo gastos fijos", "Periodo", report?.egresos?.soloGastosFijos, "soloGastosFijos", "Solo gastos fijos"),
    ].filter((item) => item.rawMonto !== undefined && item.rawMonto !== null);

    if (egresosView === "compras") return allRows.filter((item) => item.detailConcept === "soloCompras");
    if (egresosView === "operativos") return allRows.filter((item) => item.detailConcept === "soloGastosOperativos");
    if (egresosView === "fijos") return allRows.filter((item) => item.detailConcept === "soloGastosFijos");
    return allRows;
  }, [report, egresosView]);

  const normalizedIngresosRows = ingresosRows;
  const normalizedEgresosRows = egresosRows;
  const normalizedMovimientosRows = useMemo(() => {
    return (movimientosData?.items || []).map((row, index) => normalizeMovimientoRow(row, index));
  }, [movimientosData]);
  const normalizedDetailRows = useMemo(() => {
    return (detailModal.data?.items || []).map((row, index) => normalizeMovimientoRow(row, index));
  }, [detailModal.data]);
  const negocioOptions = negocios.map((negocio) => ({ id: negocio._id, nombre: negocio.nombre }));

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const periodLabel = formatPeriodLabel(report?.periodo, appliedFilters);
      const today = new Date().toISOString().split('T')[0];

      const allMovimientos = await fetchAllDetailPages(
        ({ page, pageSize }) =>
          getIngresosEgresosDetalle({
            ...appliedFilters,
            concepto: 'movimientosResumen',
            page,
            pageSize,
            sortBy: DEFAULT_DETAIL_SORT_BY,
            sortOrder: DEFAULT_DETAIL_SORT_ORDER,
          }).then((data) => sanitizeDetalleResponse(data) ?? { items: [], totalPages: 1 }),
        200,
      );

      exportReportToExcel({
        fileName: `ingresos-egresos-${today}.xlsx`,
        reportTitle: 'Ingresos y Egresos',
        periodLabel,
        sheets: [
          {
            name: 'Ingresos',
            title: 'Detalle de Ingresos',
            columns: [
              { header: 'Concepto', key: 'concepto', width: 30 },
              { header: 'Referencia', key: 'referencia', width: 20 },
              { header: 'Monto', key: 'rawMonto', width: 18, type: 'currency' },
            ],
            rows: ingresosRows.map((r) => ({ concepto: r.concepto, referencia: r.referencia, rawMonto: r.rawMonto })),
          },
          {
            name: 'Egresos',
            title: 'Detalle de Egresos',
            columns: [
              { header: 'Concepto', key: 'concepto', width: 30 },
              { header: 'Referencia', key: 'referencia', width: 20 },
              { header: 'Monto', key: 'rawMonto', width: 18, type: 'currency' },
            ],
            rows: egresosRows.map((r) => ({ concepto: r.concepto, referencia: r.referencia, rawMonto: r.rawMonto })),
          },
          {
            name: 'Movimientos',
            title: 'Movimientos Resumen',
            columns: [
              { header: 'Fecha', key: 'fecha', width: 14 },
              { header: 'Tipo', key: 'tipo', width: 22 },
              { header: 'Referencia', key: 'referencia', width: 24 },
              { header: 'Tercero', key: 'tercero', width: 26 },
              { header: 'Evento', key: 'evento', width: 26 },
              { header: 'Descripción', key: 'descripcion', width: 36 },
              { header: 'Monto', key: 'monto', width: 16, type: 'currency' },
              { header: 'Estado', key: 'estado', width: 16 },
            ],
            rows: (allMovimientos as any[]).map((item) => ({
              fecha: String(item?.fecha ?? '-'),
              tipo: getFriendlySubtypeLabel(item?.subtipo ?? item?.tipoMovimiento ?? item?.tipo),
              referencia: String(item?.referencia ?? item?.parentFolio ?? '-'),
              tercero: String(item?.terceroNombre ?? '-'),
              evento: String(item?.eventoNombre ?? '-'),
              descripcion: String(item?.descripcion ?? item?.origen ?? item?.origenModelo ?? '-'),
              monto: item?.monto ?? item?.total ?? 0,
              estado: String(item?.estado ?? (item?.vigente === false ? 'No vigente' : '-')),
            })),
          },
        ],
      });
    } catch (err) {
      logger.error('Error exportando Excel:', err);
      alert('No se pudo generar el Excel. Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  const handleApplyFilters = () => {
    setMovimientosPage(1);
    closeDetailModal();
    setAppliedFilters(filters);
  };

  const openDetailModal = (row: SummaryRow) => {
    setDetailModal({
      open: true,
      concepto: row.detailConcept,
      title: row.detailTitle,
      page: 1,
      pageSize: DEFAULT_DETAIL_PAGE_SIZE,
      sortBy: DEFAULT_DETAIL_SORT_BY,
      sortOrder: DEFAULT_DETAIL_SORT_ORDER,
      loading: true,
      error: "",
      data: null,
    });
  };

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Ingresos y egresos</h1>
            <p className="text-sm text-[#64748B]">Consulta el balance del periodo, revisa el detalle de ingresos y egresos y resume los movimientos capturados por negocio.</p>
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading || (!report)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {exporting ? 'Generando Excel...' : 'Exportar Excel'}
          </button>
        </div>

        <ReportFiltersBar
          filters={filters}
          loading={loading}
          negocios={negocioOptions}
          title="Filtros del reporte"
          description="Ajusta el periodo y el negocio antes de recargar el reporte de ingresos y egresos."
          onChange={setFilters}
          onApply={handleApplyFilters}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ReportKpiCard title="Ingresos totales" value={toKpiValue(report?.totals?.ingresosTotal ?? report?.kpis?.ingresosTotales ?? report?.ingresosTotales)} />
          <ReportKpiCard title="Egresos totales" value={toKpiValue(getAdjustedEgresosTotal(report))} />
          <ReportKpiCard title="Balance general" value={toKpiValue(getAdjustedBalance(report))} />
        </div>

        <ReportState loading={loading} error={error} />

        {!loading && !error && (
          <div className="space-y-4 pb-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#111827]">Detalle de Ingresos</h2>
                <select
                  value={ingresosView}
                  onChange={(e) => setIngresosView(e.target.value as IngresosView)}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-[#111827] sm:w-auto"
                >
                  <option value="all">Todos</option>
                  <option value="ventas">Solo ventas del periodo</option>
                  <option value="abonos">Solo abonos del periodo</option>
                </select>
              </div>
              <ResponsiveDataList
                items={normalizedIngresosRows}
                loading={false}
                getItemKey={(item) => item.key}
                renderDesktop={() => renderIngresosTable(normalizedIngresosRows, openDetailModal)}
                renderMobileItem={(item) => renderIngresoMobileCard(item, openDetailModal)}
                mobileBreakpoint="lg"
                emptyMessage="Sin detalle de ingresos para mostrar."
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#111827]">Detalle de Egresos</h2>
                <select
                  value={egresosView}
                  onChange={(e) => setEgresosView(e.target.value as EgresosView)}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-[#111827] sm:w-auto"
                >
                  <option value="all">Todos</option>
                  <option value="compras">Solo compras del periodo</option>
                  <option value="operativos">Solo gastos operativos</option>
                  <option value="fijos">Solo gastos fijos</option>
                </select>
              </div>
              <ResponsiveDataList
                items={normalizedEgresosRows}
                loading={false}
                getItemKey={(item) => item.key}
                renderDesktop={() => renderEgresosTable(normalizedEgresosRows, openDetailModal)}
                renderMobileItem={(item) => renderEgresoMobileCard(item, openDetailModal)}
                mobileBreakpoint="lg"
                emptyMessage="Sin detalle de egresos para mostrar."
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#111827]">Movimientos resumen</h2>
              {movimientosError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{movimientosError}</div>
              ) : (
                <>
                  <ResponsiveDataList
                    items={normalizedMovimientosRows}
                    loading={movimientosLoading}
                    getItemKey={(item) => item.key}
                    renderDesktop={() => renderMovimientosTable(normalizedMovimientosRows)}
                    renderMobileItem={(item) => renderMovimientoMobileCard(item)}
                    mobileBreakpoint="lg"
                    emptyMessage="Sin movimientos para mostrar."
                  />
                  {!movimientosLoading && movimientosData ? (
                    <div className="mt-4">
                      <ReportPagination
                        page={movimientosData.page}
                        pageSize={movimientosData.pageSize}
                        totalPages={movimientosData.totalPages}
                        totalItems={movimientosData.count}
                        hasNextPage={movimientosData.hasNextPage}
                        hasPrevPage={movimientosData.hasPrevPage}
                        onPageChange={setMovimientosPage}
                        onPageSizeChange={(pageSize) => {
                          setMovimientosPage(1);
                          setMovimientosPageSize(pageSize);
                        }}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={detailModal.open} onOpenChange={(open) => {
        if (!open) {
          closeDetailModal();
        }
      }} className="items-start overflow-y-auto px-3 py-4 sm:px-6 sm:py-8">
        <DialogContent className="w-full max-w-[min(1200px,calc(100vw-1.5rem))] p-0">
          <div className="flex max-h-[min(92vh,860px)] min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <h2 className="text-xl font-semibold text-[#111827] sm:text-2xl">{detailModal.title}</h2>
                <p className="mt-1.5 text-sm text-[#64748B]">{formatPeriodLabel(detailModal.data?.periodo, appliedFilters)}</p>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                className="shrink-0 rounded-xl p-2.5 text-[#111827] transition hover:bg-slate-100"
                aria-label="Cerrar detalle"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Periodo</p>
                  <p className="mt-1.5 text-sm font-medium leading-6 text-[#111827]">{formatPeriodLabel(detailModal.data?.periodo, appliedFilters)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Total</p>
                  <p className="mt-1.5 text-sm font-medium leading-6 text-[#111827]">{toKpiValue(detailModal.data?.total) ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Count</p>
                  <p className="mt-1.5 text-sm font-medium leading-6 text-[#111827]">{detailModal.data?.count ?? 0}</p>
                </div>
              </div>

              {detailModal.error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{detailModal.error}</div>
              ) : (
                <div className="min-h-0 space-y-4">
                  <ResponsiveDataList
                    items={normalizedDetailRows}
                    loading={detailModal.loading}
                    getItemKey={(item) => item.key}
                    renderDesktop={() => renderMovimientosTable(normalizedDetailRows)}
                    renderMobileItem={(item) => renderMovimientoMobileCard(item)}
                    mobileBreakpoint="lg"
                    emptyMessage="Sin movimientos para mostrar."
                  />
                  {!detailModal.loading && detailModal.data ? (
                    <ReportPagination
                      page={detailModal.data.page}
                      pageSize={detailModal.data.pageSize}
                      totalPages={detailModal.data.totalPages}
                      totalItems={detailModal.data.count}
                      hasNextPage={detailModal.data.hasNextPage}
                      hasPrevPage={detailModal.data.hasPrevPage}
                      onPageChange={(page) => setDetailModal((current) => ({ ...current, page }))}
                      onPageSizeChange={(pageSize) => setDetailModal((current) => ({ ...current, page: 1, pageSize }))}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
