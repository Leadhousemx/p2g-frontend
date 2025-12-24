export function Select({ className = "", children, ...props }) {
  return <select className={`border rounded px-3 py-2 ${className}`} {...props}>{children}</select>;
}
