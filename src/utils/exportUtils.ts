import type { Cotizacion } from "../services/cotizacionesService";

export function exportCotizacionesToExcel(cotizaciones: Cotizacion[]) {
  const headers = ["Folio", "Evento", "Cliente", "Fecha", "Total", "Estado"];
  const rows = cotizaciones.map(c => [
    c.folio,
    c.nombreEvento,
    c.cliente.nombre,
    c.fechaEvento,
    c.total,
    c.estado
  ]);
  let csv = headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cotizaciones_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCotizacionesToPDF(cotizaciones: Cotizacion[]) {
  // Fallback: print
  window.print();
}
