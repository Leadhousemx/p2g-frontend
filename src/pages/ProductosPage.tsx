import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProductos } from "../hooks/useProductos";
import { AlertCircle, Plus } from "lucide-react";
import PageSkeleton from "../components/common/PageSkeleton";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import MobileEntityCard from "../components/common/MobileEntityCard";
import AdminEntityActionsMenu from "../components/common/AdminEntityActionsMenu";
import AppConfirmDialog from "../components/common/AppConfirmDialog";
import { Button, Input } from "@/components/ui";

function ProductosPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="border-t border-gray-200 bg-[#F9FAFB] px-5 py-4">
      <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              page === pageNumber
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {pageNumber}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProductosPage() {
  const navigate = useNavigate();
  const { productos, total, loading, error, list, remove } = useProductos();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showActivos, setShowActivos] = useState(true);
  const [productToDeactivate, setProductToDeactivate] = useState(null);

  const handleSearch = async () => {
    setPage(1);
    await list({
      search: search || undefined,
      page: 1,
      limit: 10,
      activos: showActivos,
    });
  };

  const handleClear = async () => {
    setSearch("");
    setPage(1);
    await list({
      page: 1,
      limit: 10,
      activos: showActivos,
    });
  };

  const handleToggleActivos = async (isActivos: boolean) => {
    setShowActivos(isActivos);
    setPage(1);
    await list({
      search: search || undefined,
      page: 1,
      limit: 10,
      activos: isActivos,
    });
  };

  const handlePageChange = async (newPage: number) => {
    setPage(newPage);
    await list({
      search: search || undefined,
      page: newPage,
      limit: 10,
      activos: showActivos,
    });
  };

  const handleDelete = async (id: string) => {
    const success = await remove(id);
    if (success) {
      await list({
        search: search || undefined,
        page,
        limit: 10,
        activos: showActivos,
      });
    }
  };

  useEffect(() => {
    list({
      page: 1,
      limit: 10,
      activos: showActivos,
    });
  }, []);

  const totalPages = Math.ceil(total / 10);

  if (loading && productos.length === 0) {
    return <PageSkeleton />;
  }

  const renderDesktop = () => (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Precio Unitario</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Descripción</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productos.map((producto) => (
              <tr key={producto._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{producto.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-600">${producto.precioUnitario.toFixed(2)}</td>
                <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-600">{producto.descripcion || "-"}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      producto.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {producto.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end">
                    <AdminEntityActionsMenu
                      onEdit={() => navigate(`/productos/${producto._id}/editar`)}
                      onDelete={producto.activo ? () => setProductToDeactivate(producto) : undefined}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ProductosPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );

  const renderMobileItem = (producto) => (
    <MobileEntityCard
      title={producto.nombre}
      subtitle={producto.descripcion || "Sin descripción registrada"}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#111827]">${producto.precioUnitario.toFixed(2)}</span>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              producto.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}
          >
            {producto.activo ? "Activo" : "Inactivo"}
          </span>
        </div>
      }
      actions={
        <AdminEntityActionsMenu
          onEdit={() => navigate(`/productos/${producto._id}/editar`)}
          onDelete={producto.activo ? () => setProductToDeactivate(producto) : undefined}
        />
      }
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Precio</dt>
          <dd className="text-right text-[#111827]">${producto.precioUnitario.toFixed(2)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Estado</dt>
          <dd className="text-right text-[#111827]">{producto.activo ? "Activo" : "Inactivo"}</dd>
        </div>
      </dl>
    </MobileEntityCard>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Link
          to="/productos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar producto por nombre..."
          />
          <Button onClick={handleSearch} className="w-full lg:w-auto">
            Buscar
          </Button>
          <Button onClick={handleClear} variant="outline" className="w-full lg:w-auto">
            Limpiar
          </Button>
        </div>
      </div>

      {/* Toggle Activos/Inactivos */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => handleToggleActivos(true)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showActivos
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Activos
        </button>
        <button
          onClick={() => handleToggleActivos(false)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !showActivos
              ? "bg-gray-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Inactivos
        </button>
      </div>

      <ResponsiveDataList
        items={productos}
        loading={loading}
        getItemKey={(producto) => producto._id}
        renderDesktop={renderDesktop}
        renderMobileItem={renderMobileItem}
        mobileBreakpoint="md"
        emptyMessage="No hay productos para mostrar"
        loadingView={<PageSkeleton />}
      />

      <div className="mt-4 md:hidden">
        <ProductosPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>

      <AppConfirmDialog
        open={!!productToDeactivate}
        onOpenChange={(open) => {
          if (!open) setProductToDeactivate(null);
        }}
        title="Desactivar producto"
        message={productToDeactivate ? <>¿Deseas desactivar <strong>{productToDeactivate.nombre}</strong>? No será eliminado, pero dejará de aparecer en búsquedas activas.</> : ""}
        confirmLabel="Desactivar"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          if (!productToDeactivate) return;
          await handleDelete(productToDeactivate._id);
          setProductToDeactivate(null);
        }}
      />
    </div>
  );
}
