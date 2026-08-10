import * as XLSX from 'xlsx';

export type ExcelColType = 'text' | 'currency' | 'number' | 'date' | 'percentage';

export interface ExcelColDef {
  header: string;
  key: string;
  width?: number;
  type?: ExcelColType;
}

export interface ExcelSheetDef {
  name: string;
  title?: string;
  columns: ExcelColDef[];
  rows: Record<string, unknown>[];
}

export interface ExportReportConfig {
  fileName: string;
  reportTitle: string;
  periodLabel?: string;
  filtersSummary?: string;
  sheets: ExcelSheetDef[];
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:']/g, '').substring(0, 31) || 'Hoja';
}

function toNumericForExport(value: unknown): number {
  if (value === null || value === undefined || value === '' || value === '-') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = Number(value.replace(/[$,\s]/g, ''));
    return Number.isFinite(cleaned) ? cleaned : 0;
  }
  return 0;
}

export function exportReportToExcel(config: ExportReportConfig): void {
  const workbook = XLSX.utils.book_new();

  const exportTimestamp = new Date().toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  for (const sheet of config.sheets) {
    const aoa: (string | number | null)[][] = [];

    // Meta header rows
    aoa.push([config.reportTitle]);
    aoa.push([sheet.title || sheet.name]);
    aoa.push([`Exportado: ${exportTimestamp}`]);
    if (config.periodLabel) aoa.push([`Periodo: ${config.periodLabel}`]);
    if (config.filtersSummary) aoa.push([`Filtros: ${config.filtersSummary}`]);
    aoa.push([]); // blank separator

    const metaRows = aoa.length;

    // Column headers
    aoa.push(sheet.columns.map((c) => c.header));

    // Data rows
    if (sheet.rows.length === 0) {
      aoa.push(['Sin datos para los filtros seleccionados']);
    } else {
      for (const row of sheet.rows) {
        aoa.push(
          sheet.columns.map((col) => {
            const val = row[col.key];
            if (col.type === 'currency' || col.type === 'number') {
              return toNumericForExport(val);
            }
            return val !== null && val !== undefined ? String(val) : '';
          }),
        );
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths
    ws['!cols'] = sheet.columns.map((col) => ({ wch: col.width ?? 20 }));

    // Freeze panes: freeze meta rows + column header row
    ws['!freeze'] = { xSplit: 0, ySplit: metaRows + 1 };

    // Number formats for currency/number columns
    if (sheet.rows.length > 0) {
      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
      sheet.columns.forEach((col, ci) => {
        if (col.type !== 'currency' && col.type !== 'number' && col.type !== 'percentage') return;
        for (let ri = metaRows + 1; ri <= range.e.r; ri++) {
          const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
          const cell = ws[addr];
          if (!cell) continue;
          cell.t = 'n';
          if (col.type === 'currency') cell.z = '"$"#,##0.00';
          else if (col.type === 'percentage') cell.z = '0.00"%"';
        }
      });
    }

    XLSX.utils.book_append_sheet(workbook, ws, sanitizeSheetName(sheet.name));
  }

  XLSX.writeFile(workbook, config.fileName);
}

export async function fetchAllDetailPages<T extends { items: unknown[]; totalPages: number }>(
  fetchFn: (params: { page: number; pageSize: number }) => Promise<T>,
  pageSize = 200,
): Promise<unknown[]> {
  const first = await fetchFn({ page: 1, pageSize });
  const all = [...(first.items ?? [])];
  const total = Math.max(1, first.totalPages ?? 1);
  for (let p = 2; p <= total; p++) {
    const next = await fetchFn({ page: p, pageSize });
    all.push(...(next.items ?? []));
  }
  return all;
}
