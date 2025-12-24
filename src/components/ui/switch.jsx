import clsx from "clsx"; import { useState } from "react";
export function Switch({ checked, defaultChecked=false, onChange, className="", ...p }){
  const [v,setV]=useState(defaultChecked); const isCtrl=checked!==undefined; const val=isCtrl?checked:v;
  return (
    <button role="switch" aria-checked={val}
      onClick={()=>{ const nv=!val; if(!isCtrl) setV(nv); onChange?.(nv); }}
      className={clsx("inline-flex h-6 w-11 items-center rounded-full transition", val?"bg-[#2563eb]":"bg-gray-300", className)} {...p}>
      <span className={clsx("h-5 w-5 rounded-full bg-white transition", val?"translate-x-5":"translate-x-1")}/>
    </button>
  );
}
export default Switch;
