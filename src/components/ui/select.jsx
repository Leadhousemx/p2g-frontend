import { forwardRef, useMemo, useState, Children } from "react";
import clsx from "clsx";

// ---- Subcomponentes (stubs compatibles con shadcn) ----
export function SelectTrigger({ children, ...p }) {
  return <div {...p}>{children}</div>;
}
SelectTrigger.displayName = "SelectTrigger";

export function SelectValue({ placeholder, value, children, ...p }) {
  return (
    <span data-placeholder={placeholder} data-value={value} {...p}>
      {children ?? value ?? placeholder ?? ""}
    </span>
  );
}
SelectValue.displayName = "SelectValue";

export function SelectContent({ children, ...p }) {
  return <div {...p}>{children}</div>;
}
SelectContent.displayName = "SelectContent";

export function SelectItem({ value, children, ...p }) {
  return (
    <option value={value} {...p}>
      {children}
    </option>
  );
}
SelectItem.displayName = "SelectItem";

function extractMeta(children) {
  let placeholder = undefined;
  const items = [];

  Children.forEach(children, (child) => {
    if (!child) return;
    const typeName = child.type?.displayName;
    if (typeName === "SelectTrigger") {
      Children.forEach(child.props?.children, (grand) => {
        if (grand?.type?.displayName === "SelectValue") {
          placeholder = grand.props?.placeholder ?? placeholder;
        }
      });
    }
    if (typeName === "SelectContent") {
      Children.forEach(child.props?.children, (grand) => {
        if (!grand) return;
        if (grand.type?.displayName === "SelectItem") {
          items.push({
            value: grand.props?.value ?? "",
            label: grand.props?.children ?? String(grand.props?.value ?? ""),
          });
        }
      });
    }
  });
  return { placeholder, items };
}

export const Select = forwardRef(function Select(
  { value, defaultValue, onValueChange, className, size = "md", variant = "default", children, ...props },
  ref
) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const { placeholder, items } = useMemo(() => extractMeta(children), [children]);
  const base =
    "w-full rounded-2xl border bg-white text-gray-900 focus:outline-none focus:ring transition disabled:opacity-60 disabled:pointer-events-none";
  const variants = {
    default: "border-gray-300 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30",
    outline: "border-gray-300 bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200",
  };
  const sizes = { sm: "text-sm px-3 py-1.5", md: "text-sm px-3.5 py-2", lg: "text-base px-4 py-2.5" };
  return (
    <select
      ref={ref}
      value={current ?? ""}
      onChange={(e) => {
        const next = e.target.value;
        if (!controlled) setInternal(next);
        onValueChange?.(next);
        props.onChange?.(e);
      }}
      className={clsx(base, variants[variant] ?? variants.default, sizes[size] ?? sizes.md, className)}
      {...props}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {items.length > 0
        ? items.map((it, idx) => (
            <option key={`opt-${idx}`} value={it.value}>
              {it.label}
            </option>
          ))
        : Children.map(children, (c) => (c?.type === "option" ? c : null))}
    </select>
  );
});

export default Select;
