import { useState, useMemo, useId, cloneElement, Children, useCallback } from "react";
import clsx from "clsx";

/**
 * API:
 * <Tabs defaultValue="tab1" value={value} onValueChange={setValue} className>
 *   <TabsList>
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="tab1">Contenido 1</TabsContent>
 *   <TabsContent value="tab2">Contenido 2</TabsContent>
 * </Tabs>
 */

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolled;
  const setValue = useCallback(
    (v) => {
      if (!isControlled) setUncontrolled(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange]
  );

  // Propaga el estado a triggers y filtra contenidos
  const enhanced = useMemo(() => {
    const contents = [];
    const lists = [];

    Children.forEach(children, (child) => {
      if (!child) return;
      // Detecta TabsList y TabsContent
      if (child.type?.displayName === "TabsList") {
        const mapped = Children.map(child.props.children, (t) => {
          if (!t) return t;
          if (t.type?.displayName === "TabsTrigger") {
            const v = t.props.value;

            return cloneElement(t, {
              "aria-selected": value === v,
              "data-state": value === v ? "active" : "inactive",
              onClick: (e) => {
                t.props.onClick?.(e);
                if (!e.defaultPrevented && v) setValue(v);
              },
            });
          }
          return t;
        });
        lists.push(cloneElement(child, {}, mapped));
      } else if (child.type?.displayName === "TabsContent") {
        contents.push(child);
      }
    });

    // Contenidos: solo renderiza el activo
    const visible = contents.filter((c) => c.props.value === value);

    return { lists, visible };
  }, [children, value, setValue]);

  return (
    <div className={clsx("w-full", className)}>
      {enhanced.lists}
      {enhanced.visible}
    </div>
  );
}

export function TabsList({ className, ...p }) {
  return (
    <div
      role="tablist"
      className={clsx(
        "inline-flex items-center gap-1 rounded-2xl bg-gray-100 p-1",
        className
      )}
      {...p}
    />
  );
}
TabsList.displayName = "TabsList";

export function TabsTrigger({ value, className, children, ...p }) {
  const id = useId();
  return (
    <button
      id={id}
      role="tab"
      data-value={value}
      className={clsx(
        "px-3 py-1.5 text-sm rounded-xl transition",
        "data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-[#2563eb]",
        "data-[state=inactive]:text-gray-600 hover:bg-white/60",
        className
      )}
      {...p}
    >
      {children}
    </button>
  );
}
TabsTrigger.displayName = "TabsTrigger";

export function TabsContent({ value, className, ...p }) {
  return (
    <div
      role="tabpanel"
      data-value={value}
      className={clsx("mt-3", className)}
      {...p}
    />
  );
}
TabsContent.displayName = "TabsContent";

// Export default por compatibilidad (opcional)
export default Tabs;
