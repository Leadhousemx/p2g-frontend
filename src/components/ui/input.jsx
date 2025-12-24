import { forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef(function Input(
  { className, variant = "default", size = "md", ...p },
  ref
) {
  const base =
    "w-full rounded-2xl border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring transition disabled:opacity-60 disabled:pointer-events-none";
  const variants = {
    default:
      "border-gray-300 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30",
    outline:
      "border-gray-300 bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200",
    error: "border-red-500 focus:ring-2 focus:ring-red-300",
    success: "border-green-500 focus:ring-2 focus:ring-green-300",
  };
  const sizes = {
    sm: "text-sm px-3 py-1.5",
    md: "text-sm px-3.5 py-2",
    lg: "text-base px-4 py-2.5",
  };

  return (
    <input
      ref={ref}
      className={clsx(
        base,
        variants[variant] ?? variants.default,
        sizes[size] ?? sizes.md,
        className
      )}
      {...p}
    />
  );
});

export default Input;
