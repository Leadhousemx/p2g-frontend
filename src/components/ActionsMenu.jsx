// src/components/ActionsMenu.jsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Eye, FileEdit, Copy, Trash2, FileText, Lock, Ban } from "lucide-react";

export default function ActionsMenu({ onView, onEdit, onDuplicate, onDelete, onPdf, onCerrarEvento, onCancelarEvento }) {
  // Ensure all props are functions or undefined to prevent render errors
  const safeOnView = typeof onView === "function" ? onView : undefined;
  const safeOnEdit = typeof onEdit === "function" ? onEdit : undefined;
  const safeOnDuplicate = typeof onDuplicate === "function" ? onDuplicate : undefined;
  const safeOnDelete = typeof onDelete === "function" ? onDelete : undefined;
  const safeOnPdf = typeof onPdf === "function" ? onPdf : undefined;
  const safeOnCerrarEvento = typeof onCerrarEvento === "function" ? onCerrarEvento : undefined;
  const safeOnCancelarEvento = typeof onCancelarEvento === "function" ? onCancelarEvento : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 rounded-full hover:bg-gray-100" aria-label="Acciones">
          <MoreVertical size={20} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" sideOffset={4} className="z-50 min-w-[160px] bg-white border rounded-lg shadow-lg py-1">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {safeOnView && (
            <DropdownMenuItem onSelect={safeOnView} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100">
              <Eye size={16} /> Ver
            </DropdownMenuItem>
          )}
          {safeOnEdit && (
            <DropdownMenuItem onSelect={safeOnEdit} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100">
              <FileEdit size={16} /> Editar
            </DropdownMenuItem>
          )}
          {safeOnDuplicate && (
            <DropdownMenuItem onSelect={safeOnDuplicate} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100">
              <Copy size={16} /> Duplicar
            </DropdownMenuItem>
          )}
          {safeOnPdf && (
            <DropdownMenuItem onSelect={safeOnPdf} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100">
              <FileText size={16} /> PDF
            </DropdownMenuItem>
          )}
          {safeOnCerrarEvento && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={safeOnCerrarEvento} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 text-amber-700">
                <Lock size={16} /> Cerrar evento
              </DropdownMenuItem>
            </>
          )}
          {safeOnCancelarEvento && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={safeOnCancelarEvento} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-orange-50 text-orange-700">
                <Ban size={16} /> Evento cancelado
              </DropdownMenuItem>
            </>
          )}
          {safeOnDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={safeOnDelete} className="flex items-center gap-2 px-3 py-2 text-red-600 cursor-pointer hover:bg-red-50">
                <Trash2 size={16} /> Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
