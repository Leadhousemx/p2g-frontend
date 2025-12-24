import { forwardRef } from "react";
import clsx from "clsx";

export const Textarea = forwardRef(function Textarea({ className = "", ...p }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        "w-full rounded-2xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#2563eb]/30",
        className
      )}
      {...p}
    />
  );
});

export default Textarea;
