import clsx from "clsx";

export function Badge({ variant = "default", className = "", children, ...p }) {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    primary: "bg-[#2563eb]/10 text-[#2563eb]",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    destructive: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant] ?? variants.default,
        className
      )}
      {...p}
    >
      {children}
    </span>
  );
}

export default Badge;
