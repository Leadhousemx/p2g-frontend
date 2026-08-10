interface Props {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyMessage?: string;
}

export default function ReportState({ loading = false, error = "", empty = false, emptyMessage = "Sin datos para mostrar." }: Props) {
  if (loading) {
    return <div className="px-5 py-10 text-center text-sm text-[#64748B] sm:px-6">Cargando reporte...</div>;
  }

  if (error) {
    return <div className="px-5 py-10 text-center text-sm text-red-600 sm:px-6">{error}</div>;
  }

  if (empty) {
    return <div className="px-5 py-10 text-center text-sm text-[#64748B] sm:px-6">{emptyMessage}</div>;
  }

  return null;
}
