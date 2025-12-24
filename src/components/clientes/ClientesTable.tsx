import ClienteRating from "./ClienteRating";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  calificacion: 'bad' | 'neutral' | 'good';
}

interface Props {
  clientes: Cliente[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  filters: { nombre: string; email: string; telefono: string };
}

export default function ClientesTable({ clientes, loading, page, pageSize, total, onPageChange, filters }: Props) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const totalPages = Math.ceil(total / pageSize);

  if (loading) return <div className="p-8"><div className="animate-pulse h-8 bg-gray-200 rounded mb-2 w-1/2"/><div className="animate-pulse h-8 bg-gray-200 rounded mb-2 w-full"/><div className="animate-pulse h-8 bg-gray-200 rounded mb-2 w-3/4"/></div>;
  if (!clientes.length) return <div className="text-center text-gray-500 p-8">No hay clientes que coincidan con tu búsqueda</div>;

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#2563eb] text-white">
              <th className="px-4 py-3 text-left font-semibold cursor-pointer">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold cursor-pointer">Apellidos</th>
              <th className="px-4 py-3 text-left font-semibold">Teléfono</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-center font-semibold">Calificación</th>
              <th className="px-4 py-3 text-center font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/50">
                <td className="px-4 py-2 whitespace-nowrap">{c.nombre}</td>
                <td className="px-4 py-2 whitespace-nowrap">{c.apellidos}</td>
                <td className="px-4 py-2 whitespace-nowrap">{c.telefono}</td>
                <td className="px-4 py-2 whitespace-nowrap">{c.email}</td>
                <td className="px-4 py-2 text-center"><ClienteRating value={c.calificacion} /></td>
                <td className="px-4 py-2 text-center">
                  <Button size="sm" variant="outline" className="mr-2" title="Editar" aria-label="Editar" onClick={() => navigate(`/clientes/${c.id}/editar`)}><Pencil size={16} /></Button>
                  <Button size="sm" variant="outline" title="Borrar" aria-label="Borrar" onClick={() => setDeleteId(c.id)}><Trash2 size={16} /></Button>
                  {deleteId === c.id && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                      <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="mb-4">¿Seguro que deseas borrar este cliente?</div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
                          <Button size="sm" variant="destructive" onClick={() => {/* onDelete(c.id) */ setDeleteId(null);}}>Borrar</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Paginación */}
      <div className="flex justify-end items-center gap-2 mt-4">
        <Button size="sm" variant="outline" disabled={page === 1} onClick={() => onPageChange(page - 1)}>&lt;</Button>
        <span>Página {page} de {totalPages}</span>
        <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>&gt;</Button>
      </div>
    </div>
  );
}
