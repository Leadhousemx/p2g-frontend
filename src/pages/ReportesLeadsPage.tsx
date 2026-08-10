import { useEffect, useState } from "react";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import MobileEntityCard from "../components/common/MobileEntityCard";
import ReportFiltersBar from "../components/reportes/ReportFiltersBar";
import ReportKpiCard from "../components/reportes/ReportKpiCard";
import ReportState from "../components/reportes/ReportState";
import { getLeads, LeadsResponse, ReportQueryParams } from "../services/reportsService";
import { logger } from "../lib/logger";
import { useNegocios } from "../hooks/useNegocios";
import { exportReportToExcel } from "../utils/exportReportToExcel";

const defaultFilters: ReportQueryParams = {
  periodType: "monthly",
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
};

const CANALES_TABLE_COLUMNS = [
  { key: "canal", label: "Canal", align: "left" },
  { key: "cantidad", label: "Cantidad", align: "right" },
] as const;

const LEADS_TABLE_COLUMNS = [
  { key: "nombre", label: "Nombre", align: "left" },
  { key: "telefono", label: "Teléfono", align: "left" },
  { key: "fechaCreacion", label: "Fecha creación", align: "left" },
  { key: "canal", label: "Canal", align: "left" },
  { key: "estatus", label: "Estatus", align: "left" },
] as const;

function getAlignedCellClass(align: "left" | "right") {
  return align === "right" ? "text-right" : "text-left";
}

function normalizeCanalRow(row: any) {
  return {
    key: String(row?._id ?? row?.id ?? row?.canal ?? row?.nombre ?? `canal-${row?.cantidad ?? row?.total ?? "0"}`),
    canal: String(row?.canal ?? row?.nombre ?? "-"),
    cantidad: String(row?.cantidad ?? row?.total ?? "-"),
  };
}

function renderCanalesTable(rows: any[]) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="w-full bg-white text-sm">
        <thead className="border-b border-slate-200 bg-[#F9FAFB]">
          <tr>
            {CANALES_TABLE_COLUMNS.map((column) => (
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
              <td className="px-4 py-4 text-[#64748B]" colSpan={CANALES_TABLE_COLUMNS.length}>Sin datos de canales.</td>
            </tr>
          ) : (
            rows.map((row: any, idx: number) => {
              const normalizedRow = normalizeCanalRow(row);

              return (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  {CANALES_TABLE_COLUMNS.map((column) => (
                    <td key={column.key} className={`px-4 py-3 text-[#111827] ${getAlignedCellClass(column.align)}`}>
                      {normalizedRow[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderCanalMobileCard(row: any) {
  return (
    <MobileEntityCard title={row.canal} className="border-slate-200 shadow-sm">
      <div className="rounded-xl bg-slate-50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Cantidad</p>
        <p className="mt-1 text-sm font-semibold text-[#111827]">{row.cantidad}</p>
      </div>
    </MobileEntityCard>
  );
}

function normalizeLeadRow(row: any) {
  return {
    key: String(row?._id ?? row?.id ?? row?.telefono ?? row?.nombre ?? `lead-${row?.createdAt ?? row?.fechaCreacion ?? "sin-fecha"}`),
    nombre: String(row?.nombre ?? "-"),
    telefono: String(row?.telefono ?? "-"),
    fechaCreacion: String(row?.fechaCreacion ?? row?.createdAt ?? "-"),
    canal: String(row?.canal ?? "-"),
    estatus: String(row?.estatus ?? "-"),
  };
}

function renderLeadsTable(rows: any[]) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="w-full bg-white text-sm">
        <thead className="border-b border-slate-200 bg-[#F9FAFB]">
          <tr>
            {LEADS_TABLE_COLUMNS.map((column) => (
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
              <td className="px-4 py-4 text-[#64748B]" colSpan={LEADS_TABLE_COLUMNS.length}>Sin leads para mostrar.</td>
            </tr>
          ) : (
            rows.map((row: any, idx: number) => {
              const normalizedRow = normalizeLeadRow(row);

              return (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  {LEADS_TABLE_COLUMNS.map((column) => (
                    <td key={column.key} className={`px-4 py-3 text-[#111827] ${getAlignedCellClass(column.align)}`}>
                      {normalizedRow[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderLeadMobileMeta(row: any) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-[#334155]">
        {row.canal}
      </span>
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-[#334155]">
        {row.estatus}
      </span>
    </div>
  );
}

function renderLeadMobileCard(row: any) {
  return (
    <MobileEntityCard
      title={row.nombre}
      subtitle={row.telefono}
      meta={renderLeadMobileMeta(row)}
      className="border-slate-200 shadow-sm"
    >
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Fecha creación</dt>
          <dd className="mt-1 text-sm text-[#111827]">{row.fechaCreacion}</dd>
        </div>
      </dl>
    </MobileEntityCard>
  );
}

export default function ReportesLeadsPage() {
  const { negocios } = useNegocios();
  const [filters, setFilters] = useState<ReportQueryParams>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<LeadsResponse | null>(null);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getLeads(filters);
      setReport(data);
    } catch (err: any) {
      logger.error("Error cargando reporte de leads:", err);
      setError(err?.response?.data?.message || "No se pudo cargar el reporte de leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const canalesRows = Array.isArray(report?.resumenPorCanal)
    ? report.resumenPorCanal
    : Array.isArray(report?.resumenCanales)
      ? report.resumenCanales
      : Array.isArray((report as any)?.canales)
        ? (report as any).canales
        : [];

  const leadsRows = Array.isArray(report?.listaLeads)
    ? report.listaLeads
    : Array.isArray(report?.leads)
      ? report.leads
      : Array.isArray((report as any)?.items)
        ? (report as any).items
        : [];
  const normalizedCanalesRows = canalesRows.map((row) => normalizeCanalRow(row));
  const normalizedLeadsRows = leadsRows.map((row) => normalizeLeadRow(row));
  const negocioOptions = negocios.map((negocio) => ({ id: negocio._id, nombre: negocio.nombre }));

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      exportReportToExcel({
        fileName: `leads-${today}.xlsx`,
        reportTitle: 'Reporte de Leads',
        sheets: [
          {
            name: 'Canales',
            title: 'Resumen por Canal',
            columns: [
              { header: 'Canal', key: 'canal', width: 24 },
              { header: 'Cantidad', key: 'cantidad', width: 14, type: 'number' },
            ],
            rows: canalesRows.map((row: any) => ({
              canal: String(row?.canal ?? '-'),
              cantidad: Number(row?.cantidad ?? row?.count ?? 0),
            })),
          },
          {
            name: 'Leads',
            title: 'Leads del Periodo',
            columns: [
              { header: 'Nombre', key: 'nombre', width: 28 },
              { header: 'Teléfono', key: 'telefono', width: 18 },
              { header: 'Fecha Creación', key: 'fechaCreacion', width: 18 },
              { header: 'Canal', key: 'canal', width: 20 },
              { header: 'Estatus', key: 'estatus', width: 16 },
            ],
            rows: leadsRows.map((row: any) => ({
              nombre: String(row?.nombre ?? '-'),
              telefono: String(row?.telefono ?? '-'),
              fechaCreacion: String(row?.fechaCreacion ?? row?.createdAt ?? '-'),
              canal: String(row?.canal ?? '-'),
              estatus: String(row?.estatus ?? '-'),
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

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Reporte de leads</h1>
            <p className="text-sm text-[#64748B]">Consulta el volumen de leads del periodo, su canal principal y el detalle capturado por negocio.</p>
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading || (canalesRows.length === 0 && leadsRows.length === 0)}
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
          description="Ajusta el periodo y el negocio antes de recargar el reporte de leads."
          onChange={setFilters}
          onApply={loadReport}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ReportKpiCard title="# Leads del periodo" value={report?.kpis?.totalLeadsPeriodo ?? (report as any)?.leadsPeriodo} />
          <ReportKpiCard title="Canal principal" value={report?.kpis?.canalPrincipal ?? (report as any)?.canalPrincipal} />
          <ReportKpiCard title="# Por canal principal" value={report?.kpis?.cantidadCanalPrincipal ?? (report as any)?.cantidadCanalPrincipal} />
        </div>

        <ReportState loading={loading} error={error} />

        {!loading && !error && (
          <div className="space-y-4 pb-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#111827]">Resumen por canal</h2>
              <ResponsiveDataList
                items={normalizedCanalesRows}
                loading={false}
                getItemKey={(item) => item.key}
                renderDesktop={() => renderCanalesTable(normalizedCanalesRows)}
                renderMobileItem={(item) => renderCanalMobileCard(item)}
                mobileBreakpoint="md"
                emptyMessage="Sin datos de canales."
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#111827]">Leads del periodo</h2>
              <ResponsiveDataList
                items={normalizedLeadsRows}
                loading={false}
                getItemKey={(item) => item.key}
                renderDesktop={() => renderLeadsTable(normalizedLeadsRows)}
                renderMobileItem={(item) => renderLeadMobileCard(item)}
                mobileBreakpoint="lg"
                emptyMessage="Sin leads para mostrar."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
