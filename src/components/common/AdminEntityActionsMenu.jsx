import { MoreVertical, Eye, Pencil, Copy, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@radix-ui/react-dropdown-menu";

export default function AdminEntityActionsMenu({
  onView,
  onEdit,
  onDuplicate,
  extraItems = [],
  onDelete,
  align = "end",
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-lg p-2 transition hover:bg-gray-100" aria-label="Acciones">
          <MoreVertical size={18} className="text-[#64748B]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align={align}
          sideOffset={4}
          className="z-50 min-w-[160px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {onView ? (
            <DropdownMenuItem
              onSelect={onView}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-[#111827] outline-none hover:bg-[#F9FAFB]"
            >
              <Eye size={16} /> Ver
            </DropdownMenuItem>
          ) : null}
          {onEdit ? (
            <DropdownMenuItem
              onSelect={onEdit}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-[#111827] outline-none hover:bg-[#F9FAFB]"
            >
              <Pencil size={16} /> Editar
            </DropdownMenuItem>
          ) : null}
          {onDuplicate ? (
            <DropdownMenuItem
              onSelect={onDuplicate}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-[#111827] outline-none hover:bg-[#F9FAFB]"
            >
              <Copy size={16} /> Duplicar
            </DropdownMenuItem>
          ) : null}
          {extraItems.map((item, index) => {
            const ItemIcon = item.icon;

            return (
              <DropdownMenuItem
                key={item.key ?? index}
                onSelect={item.onSelect}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm outline-none ${
                  item.destructive
                    ? "text-red-600 hover:bg-red-50"
                    : "text-[#111827] hover:bg-[#F9FAFB]"
                }`}
              >
                {ItemIcon ? <ItemIcon size={16} /> : null}
                {item.label}
              </DropdownMenuItem>
            );
          })}
          {onDelete ? (
            <>
              <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />
              <DropdownMenuItem
                onSelect={onDelete}
                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-red-600 outline-none hover:bg-red-50"
              >
                <Trash2 size={16} /> Eliminar
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}