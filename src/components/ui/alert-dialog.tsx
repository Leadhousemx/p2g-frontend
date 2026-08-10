import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

type AlertDialogContextValue = {
  onOpenChange: (open: boolean) => void;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusDialog = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusDialog);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const dialogNode = (
    <AlertDialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          className="absolute inset-0 bg-black/50"
          aria-label="Cerrar diálogo"
          onClick={() => onOpenChange(false)}
        />
        <div className="relative z-10 flex min-h-full items-center justify-center p-4">
          <div ref={dialogRef} role="alertdialog" aria-modal="true" tabIndex={-1} className="w-full max-w-[calc(100vw-2rem)] outline-none">
            {children}
          </div>
        </div>
      </div>
    </AlertDialogContext.Provider>
  );

  return typeof document !== "undefined" ? createPortal(dialogNode, document.body) : dialogNode;
}

export function AlertDialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-md sm:p-6", className)}>{children}</div>;
}
export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}
export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-lg font-bold text-[#111827]">{children}</h2>;
}
export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 text-sm leading-6 text-[#64748B]">{children}</div>;
}
export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>;
}
export function AlertDialogAction({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto", className)} {...props}>{children}</button>;
}
export function AlertDialogCancel({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(AlertDialogContext);

  return (
    <button
      className={cn("inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto", className)}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          context?.onOpenChange(false);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
