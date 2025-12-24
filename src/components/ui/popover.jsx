export function Popover({ children }) {
  return <div className="relative inline-block">{children}</div>;
}

export function PopoverTrigger({ children, ...p }) {
  return <div {...p}>{children}</div>;
}

export function PopoverContent({ className = "", children, ...p }) {
  return (
    <div
      className={
        "absolute z-50 mt-2 rounded-2xl border bg-white p-3 shadow " +
        className
      }
      {...p}
    >
      {children}
    </div>
  );
}

export default Popover;
