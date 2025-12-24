export function Checkbox({ className="", ...p }) {
  return <input type="checkbox" className={"h-4 w-4 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb]/30 "+className} {...p} />;
}
export default Checkbox;
