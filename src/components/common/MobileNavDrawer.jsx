import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import ResponsiveNavMenu from "./ResponsiveNavMenu";

export default function MobileNavDrawer({
  open,
  onClose,
  items,
  title = "Navegación",
  brand,
  restoreFocusRef,
}) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef?.current?.focus?.();
    };
  }, [open, onClose, restoreFocusRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" aria-hidden={!open}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        aria-label="Cerrar navegación"
        onClick={onClose}
      />

      <aside
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-2rem))] max-w-full flex-col bg-[#0F172A] text-gray-300 shadow-2xl"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
          <div className="min-w-0 flex-1">{brand}</div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-gray-200 transition hover:bg-white/10"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          <ResponsiveNavMenu items={items} onNavigate={onClose} compact />
        </nav>
      </aside>
    </div>
  );
}