export function Separator({ className = "", orientation = "horizontal" }) {
  return (
    <div
      className={
        (orientation === "vertical" ? "w-px h-full" : "h-px w-full") +
        " bg-gray-200 " +
        className
      }
    />
  );
}
export default Separator;
