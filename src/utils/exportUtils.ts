import type { Gasto } from "../components/gastos/GastosTable";

export function exportToExcel(gastos: Gasto[]) {
  // Fallback CSV
  const headers = ["Folio", "Fecha", "Concepto", "Evento", "Total"];
  const rows = gastos.map(g => [g.folio, g.fecha, g.concepto, g.evento || "", g.total]);
  let csv = headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gastos_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(gastos: Gasto[]) {
  // Fallback: print
  window.print();
}
