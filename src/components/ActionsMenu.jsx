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
import { MoreVertical, FileEdit, Copy, Trash2, FileText } from "lucide-react";

export default function ActionsMenu({ onEdit, onDuplicate, onDelete, onPdf }) {
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
          <DropdownMenuItem onSelect={onEdit} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100">
            <FileEdit size={16} /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100">
            <Copy size={16} /> Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onPdf} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100">
            <FileText size={16} /> PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onDelete} className="flex items-center gap-2 px-3 py-2 text-red-600 cursor-pointer hover:bg-red-50">
            <Trash2 size={16} /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
