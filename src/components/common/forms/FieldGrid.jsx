import { cn } from "../../../lib/utils";

const gridColumns = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
};

export default function FieldGrid({
  children,
  columns = 2,
  className,
}) {
  return (
    <div className={cn("grid gap-4 sm:gap-5", gridColumns[columns] || gridColumns[2], className)}>
      {children}
    </div>
  );
}