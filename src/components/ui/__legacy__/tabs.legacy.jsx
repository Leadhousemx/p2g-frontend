import React from "react";
export function Tabs({ defaultValue, children, ...props }) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <div {...props}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { value, setValue })
          : child
      )}
    </div>
  );
}
export function TabsList({ children }) {
  return <div className="flex gap-2 mb-2">{children}</div>;
}
export function TabsTrigger({ value: tabValue, value: currentValue, setValue, children }) {
  const active = currentValue === tabValue;
  return (
    <button
      className={`px-4 py-2 rounded ${active ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-700'} font-medium`}
      onClick={() => setValue(tabValue)}
      type="button"
    >
      {children}
    </button>
  );
}
export function TabsContent({ value: tabValue, value: currentValue, children }) {
  return currentValue === tabValue ? <div>{children}</div> : null;
}
