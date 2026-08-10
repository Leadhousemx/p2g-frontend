// LEGACY FILE: current routed salons page resolves to src/pages/Salones.jsx.
// Keep out of new implementations unless the route is intentionally switched.
import React from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSalones } from "../hooks/useSalones";
import DashboardLayout from "../layouts/DashboardLayout";

export default function SalonesPage() {
  const {
    data,
    total,
    loading,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    remove,
  } = useSalones();

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Seguro que deseas borrar este salón?")) {
      await remove(id);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Salones</h1>
        <Button variant="success" asChild aria-label="Nuevo salón" title="Nuevo salón">
          <Link to="/salones/nuevo">
            <Plus className="mr-2 h-4 w-4" /> Nuevo salón
          </Link>
        </Button>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Input
          type="text"
          placeholder="Buscar salón..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Buscar salón"
          className="max-w-xs"
        />
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        {loading ? (
          <div className="animate-pulse text-gray-400 py-12 text-center">Cargando salones...</div>
        ) : data.length === 0 ? (
          <div className="text-gray-400 py-12 text-center">Aún no hay salones</div>
        ) : (
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
                    <td className="px-4 py-2 text-right flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        asChild
                        aria-label="Editar salón"
                        title="Editar salón"
                      >
                        <Link to={`/salones/${salon._id}/editar`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(salon._id)}
                        aria-label="Borrar salón"
                        title="Borrar salón"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Paginación */}
        {total > pageSize && (
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              Anterior
            </Button>
            <span className="px-2 py-1 text-sm text-gray-600">Página {page} de {Math.ceil(total / pageSize)}</span>
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
    </div>
  );
}
