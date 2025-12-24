import React from "react";
export function Calendar({ value, onChange, className="", ...p }){
  return <input type="date" className={"rounded-2xl border border-gray-300 px-3 py-2 "+className} value={value} onChange={(e)=>onChange?.(e.target.value)} {...p}/>;
}

export default Calendar;
