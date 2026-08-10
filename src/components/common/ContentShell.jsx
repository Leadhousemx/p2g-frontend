import { cn } from "../../lib/utils";

const paddingVariants = {
  none: "",
  responsive: "px-4 sm:px-5 lg:px-6",
};

export default function ContentShell({
  as = "div",
  padding = "none",
  className,
  children,
  ...props
}) {
  const Component = as;
  return (
    <Component
      className={cn("w-full min-w-0", paddingVariants[padding] || paddingVariants.none, className)}
      {...props}
    >
      {children}
    </Component>
  );
}