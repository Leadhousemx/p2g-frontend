// Active responsive base for /salones after the rescue and responsive consolidation phases.
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import { AlertCircle, Plus } from "lucide-react";
import AdminEntityActionsMenu from "../components/common/AdminEntityActionsMenu";
import AppConfirmDialog from "../components/common/AppConfirmDialog";
import ContentShell from "../components/common/ContentShell";
import MobileEntityCard from "../components/common/MobileEntityCard";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import { useSalones } from "../hooks/useSalones";

export default function SalonesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data,
    total,
    loading,
    error,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    remove,
    refetch,
    applyMutationPreview,
    refreshAfterMutation,
  } = useSalones();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const refreshState = location.state?.salonesRefresh;
    if (!refreshState?.refreshKey) {
      return;
    }

    applyMutationPreview({
      salon: refreshState.salon,
      salonName: refreshState.salonName,
      focusInSearch: Boolean(refreshState.focusInSearch),
    });

    void refreshAfterMutation({
      salonId: refreshState.salonId,
      salonName: refreshState.salonName,
      focusInSearch: Boolean(refreshState.focusInSearch),
      preservePreview: true,
    }).finally(() => {
      navigate(location.pathname, { replace: true, state: null });
    });
  }, [applyMutationPreview, location.pathname, location.state, navigate, refreshAfterMutation]);

  const salonToDelete = deleteId ? data.find((salon) => salon._id === deleteId) ?? null : null;

  const handleDelete = async (id: string) => {
    const deleted = await remove(id);
    if (!deleted) {
      window.alert("No se pudo eliminar el salón. Intenta nuevamente.");
      return;
    }

    setDeleteId(null);
  };

  const renderRowActions = (salonId: string, align = "end") => (
    <AdminEntityActionsMenu
      align={align}
      onEdit={() => {
        navigate(`/salones/${salonId}/editar`);
      }}
      onDelete={() => {
        setDeleteId(salonId);
      }}
    />
  );

  const confirmDelete = async () => {
    if (!salonToDelete) return;

    setDeleting(true);
    try {
      await handleDelete(salonToDelete._id);
    } finally {
      setDeleting(false);
    }
  };

  const renderDesktop = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-xs font-semibold">Nombre del salón</th>
            <th className="px-4 py-2 text-xs font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((salon) => (
            <tr key={salon._id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{salon.nombre}</td>
              <td className="px-4 py-2 text-right">
                <div className="flex justify-end">
                  {renderRowActions(salon._id)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMobileItem = (salon) => (
    <MobileEntityCard
      title={salon.nombre}
      subtitle="Salón activo en el listado"
      actions={renderRowActions(salon._id, "end")}
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Nombre</dt>
          <dd className="text-right text-[#111827]">{salon.nombre}</dd>
        </div>
      </dl>
    </MobileEntityCard>
  );

  return (
    <ContentShell className="min-h-full bg-[#F4F6F9] py-4 sm:py-5 lg:py-6" padding="responsive">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">Salones</h1>
              <p className="max-w-3xl text-sm text-[#64748B] sm:text-base">
                Administra el listado de salones sobre la base funcional ya consolidada y prepara el módulo para la fase responsive completa.
              </p>
            </div>
            <Button variant="success" asChild aria-label="Nuevo salón" title="Nuevo salón" className="w-full sm:w-auto">
              <Link to="/salones/nuevo">
                <Plus className="mr-2 h-4 w-4" /> Nuevo salón
              </Link>
            </Button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <Input
                  type="text"
                  placeholder="Buscar salón..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Buscar salón"
                  className="w-full bg-white"
                />
              </div>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <span className="text-sm text-[#64748B]">{total} resultado{total === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-12 text-center text-sm text-[#64748B]">
              <div className="animate-pulse">Cargando salones...</div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-red-900">No se pudo cargar el listado</p>
                    <p className="text-sm">{error}</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => refetch()}>
                    Reintentar
                  </Button>
                </div>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-12 text-center text-sm text-[#64748B]">
              Aún no hay salones
            </div>
          ) : (
            <ResponsiveDataList
              items={data}
              loading={loading}
              getItemKey={(salon) => salon._id}
              renderDesktop={renderDesktop}
              renderMobileItem={renderMobileItem}
              mobileBreakpoint="md"
              emptyMessage="Aún no hay salones"
              loadingView={null}
              emptyView={null}
            />
          )}

          {total > pageSize && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                aria-label="Página anterior"
              >
                Anterior
              </Button>
              <span className="px-2 py-1 text-center text-sm text-gray-600">
                Página {page} de {Math.ceil(total / pageSize)}
              </span>
              <Button
                variant="secondary"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                aria-label="Página siguiente"
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>

        <AppConfirmDialog
          open={!!salonToDelete}
          onOpenChange={(open) => {
            if (!open) setDeleteId(null);
          }}
          title="Eliminar salón"
          message={salonToDelete ? <>¿Deseas eliminar a <strong>{salonToDelete.nombre}</strong>? Esta acción no se puede deshacer.</> : ""}
          confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
          cancelLabel="Cancelar"
          loading={deleting}
          confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
          onConfirm={confirmDelete}
        />
      </div>
    </ContentShell>
  );
}
