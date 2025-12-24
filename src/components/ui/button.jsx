import clsx from "clsx";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-2xl font-medium focus:outline-none focus:ring disabled:opacity-60 disabled:pointer-events-none transition";
  const variants = {
    primary: "bg-[#2563eb] text-white hover:bg-[#1d4ed8]",
    outline: "border border-gray-300 bg-white hover:bg-gray-50",
    ghost: "hover:bg-gray-100",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
  };
  const sizes = {
    sm: "text-sm px-2.5 py-1.5",
    md: "text-sm px-3.5 py-2",
    lg: "text-base px-4.5 py-2.5",
  };

  return (
    <button
      className={clsx(
        base,
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className
      )}
      {...props}
    />
  );
}

export default Button;

