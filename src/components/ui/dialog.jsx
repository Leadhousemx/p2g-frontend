import clsx from "clsx";

export function Dialog({ open = false, onOpenChange, children, className = "" }) {
  if (!open) return null;
  return (
    <div
      className={clsx("fixed inset-0 z-50 flex items-center justify-center bg-black/30", className)}
      onClick={() => onOpenChange?.(false)}
    >
      <div className="bg-white rounded-2xl shadow p-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DialogTrigger({ onClick, children, ...p }) {
  return (
    <button onClick={onClick} {...p}>
      {children}
    </button>
  );
}

export function DialogContent({ className = "", children, ...p }) {
  return (
    <div className={clsx("w-full max-w-lg", className)} {...p}>
      {children}
    </div>
  );
}

export default Dialog;
