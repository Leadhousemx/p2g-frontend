import * as React from "react";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-lg min-w-[320px] max-w-full p-0">
        {children}
      </div>
      <button
        className="fixed inset-0 w-full h-full cursor-default"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={() => onOpenChange(false)}
        style={{ background: "transparent", border: 0, position: "absolute" }}
      />
    </div>
  );
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}
export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}
export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold mb-2">{children}</h2>;
}
export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-600 mb-4">{children}</p>;
}
export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 mt-4">{children}</div>;
}
export function AlertDialogAction({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700" {...props}>{children}</button>;
}
export function AlertDialogCancel({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300" {...props}>{children}</button>;
}
